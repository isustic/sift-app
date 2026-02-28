# Upload Page Layout & Global Search Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix overlapping layout elements on upload page and implement SQL-based global search across all dataset rows.

**Architecture:**
1. Replace dataset tabs with dropdown selector (matches report page pattern)
2. Move column toggles to collapsible popover to eliminate wrapping
3. Add new `search_rows` Tauri command for SQL-based full-dataset search
4. Replace client-side filtering with backend search API

**Tech Stack:** Rust (Tauri), React 19, TypeScript, TanStack Table, SQLite

---

## Task 1: Add `search_rows` Tauri Command

**Files:**
- Modify: `src-tauri/src/commands/data.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Add search_rows function to data.rs**

Add this function to `src-tauri/src/commands/data.rs`:

```rust
use crate::db::{get_dataset_table_name, sanitize_col_name};

#[tauri::command]
pub fn search_rows(
    state: tauri::State<DbState>,
    dataset_id: i64,
    query: String,
    page: i64,
    page_size: i64,
) -> Result<PagedRows, String> {
    let conn = state.0.lock().unwrap();

    // Get dataset info
    let table_name = get_dataset_table_name(&conn, dataset_id)?;

    // Get columns for this dataset
    let mut col_stmt = conn.prepare(
        "SELECT name, col_type FROM columns WHERE dataset_id = ? ORDER BY display_order"
    ).map_err(|e| e.to_string())?;

    let columns: Vec<(String, String)> = col_stmt
        .query_map([dataset_id], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    if columns.is_empty() {
        return Ok(PagedRows {
            rows: vec![],
            total: 0,
            page,
            page_size,
        });
    }

    // Build WHERE clause with LIKE for each text column
    let like_pattern = format!("%{}%", query.replace('%', "\\%").replace('_', "\\_"));
    let where_clauses: Vec<String> = columns
        .iter()
        .filter(|(_, col_type)| col_type == "TEXT")
        .map(|(col_name, _)| {
            let safe_col = sanitize_col_name(col_name);
            format!("{} LIKE ?", safe_col)
        })
        .collect();

    let (sql, total_sql) = if where_clauses.is_empty() {
        // No text columns - return all rows with pagination
        (
            format!(
                "SELECT * FROM {} LIMIT ? OFFSET ?",
                sanitize_col_name(&table_name)
            ),
            format!(
                "SELECT COUNT(*) FROM {}",
                sanitize_col_name(&table_name)
            )
        )
    } else {
        let where_clause = where_clauses.join(" OR ");
        let params = vec![&like_pattern as &dyn ToSql; where_clauses.len()];
        (
            format!(
                "SELECT * FROM {} WHERE {} LIMIT ? OFFSET ?",
                sanitize_col_name(&table_name),
                where_clause
            ),
            format!(
                "SELECT COUNT(*) FROM {} WHERE {}",
                sanitize_col_name(&table_name),
                where_clause
            )
        )
    };

    // Get total count
    let total: i64 = if where_clauses.is_empty() || query.is_empty() {
        conn.query_row(&total_sql, [], |row| row.get(0))
            .map_err(|e| e.to_string())?
    } else {
        let mut stmt = conn.prepare(&total_sql).map_err(|e| e.to_string())?;
        let params: Vec<&str> = vec![&like_pattern; where_clauses.len()];
        let params: Vec<&dyn ToSql> = params.iter().map(|p| p as &dyn ToSql).collect();
        stmt.query_row(&params[..], |row| row.get(0))
            .map_err(|e| e.to_string())?
    };

    // Get paginated rows
    let offset = page * page_size;
    let rows: Vec<Row> = if where_clauses.is_empty() || query.is_empty() {
        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([page_size, offset], |row| {
            let mut data = std::collections::HashMap::new();
            for (i, col) in columns.iter().enumerate() {
                let value: Option<String> = row.get(i).ok();
                data.insert(col.0.clone(), value.map(|v| v.into()));
            }
            Ok(Row { data })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
        rows
    } else {
        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let mut like_params: Vec<&dyn ToSql> = vec![&like_pattern as &dyn ToSql; where_clauses.len()];
        like_params.push(&page_size);
        like_params.push(&offset);

        let rows = stmt.query_map(&like_params[..], |row| {
            let mut data = std::collections::HashMap::new();
            for (i, col) in columns.iter().enumerate() {
                let value: Option<String> = row.get(i).ok();
                data.insert(col.0.clone(), value.map(|v| v.into()));
            }
            Ok(Row { data })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
        rows
    };

    Ok(PagedRows { rows, total, page, page_size })
}
```

**Step 2: Export the new function**

Add to `src-tauri/src/commands/mod.rs`:

```rust
pub mod data;
pub use data::{search_rows, /* existing exports... */};
```

**Step 3: Register the command in lib.rs**

Add to the invoke_handler in `src-tauri/src/lib.rs`:

```rust
.invoke_handler([
    // ... existing commands
    search_rows,
])
```

**Step 4: Commit**

```bash
cd /Users/isustic/Desktop/epp-app/frontend
git add ../src-tauri/src/commands/data.rs ../src-tauri/src/commands/mod.rs ../src-tauri/src/lib.rs
git commit -m "feat: add search_rows command for full-dataset search"
```

---

## Task 2: Create ColumnVisibilityPopover Component

**Files:**
- Create: `components/Upload/ColumnVisibilityPopover.tsx`

**Step 1: Create the component**

Create `components/Upload/ColumnVisibilityPopover.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Check, X, Columns } from "lucide-react";

interface Column {
    name: string;
    col_type: string;
}

interface ColumnVisibilityPopoverProps {
    columns: Column[];
    hiddenCols: Set<string>;
    onToggle: (name: string) => void;
    onShowAll: () => void;
    onHideAll: () => void;
}

export function ColumnVisibilityPopover({
    columns,
    hiddenCols,
    onToggle,
    onShowAll,
    onHideAll,
}: ColumnVisibilityPopoverProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");

    const filteredCols = columns.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    const visibleCount = columns.length - hiddenCols.size;

    return (
        <div className="relative">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                className="h-8 gap-1.5 border-border/50 hover:border-primary/50"
            >
                <Columns size={13} />
                Columns ({visibleCount}/{columns.length})
            </Button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Popover */}
                    <div className="absolute right-0 top-full mt-1 w-64 bg-card border border-border/50 rounded-lg shadow-lg z-50 animate-fade-in">
                        {/* Header */}
                        <div className="p-3 border-b border-border/50 space-y-2">
                            <Input
                                placeholder="Filter columns…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-8 text-xs bg-background/60 border-border/50"
                            />
                            <div className="flex gap-1">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="flex-1 h-7 text-xs"
                                    onClick={onShowAll}
                                >
                                    <Eye size={12} className="mr-1" /> All
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="flex-1 h-7 text-xs"
                                    onClick={onHideAll}
                                >
                                    <EyeOff size={12} className="mr-1" /> None
                                </Button>
                            </div>
                        </div>

                        {/* Column list */}
                        <div className="max-h-64 overflow-auto p-2">
                            {filteredCols.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-4">
                                    No columns match "{search}"
                                </p>
                            ) : (
                                <div className="space-y-0.5">
                                    {filteredCols.map((col) => {
                                        const isHidden = hiddenCols.has(col.name);
                                        return (
                                            <button
                                                key={col.name}
                                                onClick={() => onToggle(col.name)}
                                                className={cn(
                                                    "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors",
                                                    isHidden
                                                        ? "text-muted-foreground hover:bg-muted/40"
                                                        : "text-foreground bg-primary/5"
                                                )}
                                            >
                                                {isHidden ? (
                                                    <X size={12} className="shrink-0 opacity-50" />
                                                ) : (
                                                    <Check size={12} className="shrink-0 text-primary" />
                                                )}
                                                <span className="truncate">{col.name}</span>
                                                <span className="ml-auto text-[10px] text-muted-foreground opacity-60">
                                                    {col.col_type === "INTEGER" ? "#" :
                                                     col.col_type === "REAL" ? "1.2" :
                                                     col.col_type === "TEXT" ? "Abc" : "?"}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
```

**Step 2: Commit**

```bash
git add components/Upload/ColumnVisibilityPopover.tsx
git commit -m "feat: add ColumnVisibilityPopover component"
```

---

## Task 3: Redesign Upload Page Header with Dataset Selector

**Files:**
- Modify: `app/upload/page.tsx:140-173`

**Step 1: Replace the header section**

Replace the header div in `app/upload/page.tsx` (lines 140-173) with:

```tsx
{/* Header */}
<div className="h-14 px-6 flex items-center justify-between gap-4 border-b border-border/50 bg-card/30 backdrop-blur-sm">
    <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Database className="w-4 h-4 text-amber-500" />
        </div>
        <div>
            <h1 className="text-sm font-semibold">Raw Data Explorer</h1>
            <p className="text-[10px] text-muted-foreground">
                {activeDataset ? `${activeDataset.row_count.toLocaleString()} rows · ${columns.length} columns` : "No dataset"}
            </p>
        </div>
    </div>

    {/* Dataset selector dropdown */}
    {datasets.length > 0 && (
        <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Dataset</span>
            <select
                value={String(activeDataset?.id ?? "")}
                onChange={(e) => {
                    const ds = datasets.find(d => d.id === Number(e.target.value));
                    if (ds) {
                        setActiveDataset(ds);
                        setPage(0);
                        setGlobalSearch("");
                    }
                }}
                className="bg-background/60 border border-border/50 rounded-md px-3 py-1.5 text-xs outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all hover:border-border"
            >
                {datasets.map((ds) => (
                    <option key={ds.id} value={String(ds.id)}>
                        {ds.name} ({(ds.row_count / 1000).toFixed(1)}k rows)
                    </option>
                ))}
            </select>
        </div>
    )}
</div>
```

**Step 2: Remove unused imports**

Remove `ChevronLeft, ChevronRight` from the import statement if they were only used for the old tab design.

**Step 3: Commit**

```bash
git add app/upload/page.tsx
git commit -m "refactor: replace dataset tabs with dropdown selector"
```

---

## Task 4: Redesign Controls Bar with Column Popover

**Files:**
- Modify: `app/upload/page.tsx:194-259`

**Step 1: Add import for ColumnVisibilityPopover**

Add to the imports in `app/upload/page.tsx`:

```tsx
import { ColumnVisibilityPopover } from "@/components/Upload/ColumnVisibilityPopover";
```

**Step 2: Replace the controls bar section**

Replace the controls bar div (lines 194-259) with:

```tsx
{/* Controls bar */}
<div className="h-12 px-4 flex items-center gap-3 border-b border-border/50 bg-card/20">
    {/* Global search */}
    <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
            placeholder="Search across all rows…"
            value={globalSearch}
            onChange={(e) => {
                setGlobalSearch(e.target.value);
                setPage(0);
            }}
            className="pl-8 h-8 text-xs bg-background/60 border-border/50 focus-visible:border-primary/50 focus-visible:ring-primary/20"
        />
        {globalSearch && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-data">
                {filteredRows.length} matches
            </span>
        )}
    </div>

    <div className="w-px h-5 bg-border/50" />

    {/* Column visibility popover */}
    <ColumnVisibilityPopover
        columns={columns}
        hiddenCols={hiddenCols}
        onToggle={toggleCol}
        onShowAll={() => setHiddenCols(new Set())}
        onHideAll={() => setHiddenCols(new Set(columns.map(c => c.name)))}
    />

    <div className="ml-auto flex items-center gap-2">
        <UploadZone onSuccess={loadDatasets} />
    </div>
</div>
```

**Step 3: Commit**

```bash
git add app/upload/page.tsx
git commit -m "refactor: replace column toggles with popover"
```

---

## Task 5: Implement Backend Search Integration

**Files:**
- Modify: `app/upload/page.tsx`

**Step 1: Add state for search mode**

Update the state declarations in `app/upload/page.tsx`:

```tsx
const [isSearching, setIsSearching] = useState(false);
const [searchTotal, setSearchTotal] = useState(0);
```

**Step 2: Create search effect**

Add this effect after the existing `loadRows` effect:

```tsx
// Search effect - debounced
useEffect(() => {
    if (!activeDataset || !globalSearch.trim()) {
        // Reset to normal rows when search is empty
        if (globalSearch === "" && searchTotal > 0) {
            setSearchTotal(0);
            loadRows();
        }
        return;
    }

    const timer = setTimeout(async () => {
        setIsSearching(true);
        try {
            const paged = await invoke<PagedRows>("search_rows", {
                datasetId: activeDataset.id,
                query: globalSearch,
                page,
                pageSize: PAGE_SIZE,
            });
            setRowData(paged.rows);
            setSearchTotal(paged.total);
            // Keep columns in sync
            if (columns.length === 0) {
                const cols = await invoke<ColumnMeta[]>("get_columns", { datasetId: activeDataset.id });
                setColumns(cols);
            }
        } catch (err) {
            console.error("Search error:", err);
        } finally {
            setIsSearching(false);
        }
    }, 300);

    return () => clearTimeout(timer);
}, [globalSearch, page, activeDataset]);
```

**Step 3: Update filteredRows to use searchTotal**

Replace the `filteredRows` useMemo with:

```tsx
// When searching, use rowData directly (already filtered by backend)
// When not searching, also use rowData
const filteredRows = rowData;
```

**Step 4: Update pagination info**

Update the displayEnd calculation (around line 135):

```tsx
const totalPages = Math.ceil(searchTotal > 0 ? searchTotal / PAGE_SIZE : total / PAGE_SIZE);
const displayStart = page * PAGE_SIZE + 1;
const displayEnd = Math.min((page + 1) * PAGE_SIZE, searchTotal > 0 ? searchTotal : total);
```

**Step 5: Update empty state message**

Update the empty state in the table (around line 324):

```tsx
{filteredRows.length === 0 && !isSearching && (
    <div className="flex flex-col items-center justify-center h-64 text-center">
        <Search className="w-10 h-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">
            {globalSearch ? "No matching rows found" : "No data available"}
        </p>
    </div>
)}

{isSearching && (
    <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-3" />
        <p className="text-sm text-muted-foreground">Searching…</p>
    </div>
)}
```

**Step 6: Update pagination footer text**

Update the pagination footer text (around line 333):

```tsx
<span className="text-[10px] text-muted-foreground font-data">
    {filteredRows.length > 0
        ? `${displayStart.toLocaleString()}-${displayEnd.toLocaleString()} of ${(searchTotal > 0 ? searchTotal : total).toLocaleString()} rows`
        : "No rows"
    }
    {globalSearch && searchTotal > 0 && ` · ${searchTotal.toLocaleString()} matches`}
</span>
```

**Step 7: Clear search on dataset change**

Update the dataset onChange handler in the header (added in Task 3):

```tsx
onChange={(e) => {
    const ds = datasets.find(d => d.id === Number(e.target.value));
    if (ds) {
        setActiveDataset(ds);
        setPage(0);
        setGlobalSearch("");
        setSearchTotal(0);
    }
}}
```

**Step 8: Commit**

```bash
git add app/upload/page.tsx
git commit -m "feat: integrate backend search with debouncing"
```

---

## Task 6: Handle Edge Cases

**Files:**
- Modify: `app/upload/page.tsx`

**Step 1: Add special character escaping to search**

In the Rust `search_rows` function, update the like_pattern construction to properly escape:

```rust
// In search_rows function, replace the like_pattern line:
let like_pattern = format!("%{}%", query
    .replace('\\', "\\\\")
    .replace('%', "\\%")
    .replace('_', "\\_")
);
```

**Step 2: Add ESCAPE clause to LIKE queries**

Update the WHERE clause construction in data.rs:

```rust
// Replace the format string for LIKE clauses:
let where_clauses: Vec<String> = columns
    .iter()
    .filter(|(_, col_type)| col_type == "TEXT")
    .map(|(col_name, _)| {
        let safe_col = sanitize_col_name(col_name);
        format!("{} LIKE ? ESCAPE '\\'", safe_col)
    })
    .collect();
```

**Step 3: Test and commit**

```bash
cd /Users/isustic/Desktop/epp-app/frontend
npm run tauri build
# Test with special characters: %, _, \
git add ../src-tauri/src/commands/data.rs
git commit -m "fix: escape special characters in search"
```

---

## Task 7: Final Testing & Polish

**Files:**
- Test entire application

**Step 1: Test layout at various screen sizes**

```bash
npm run tauri dev
```

Verify:
- [ ] No overlapping at 1280px width
- [ ] Dataset dropdown works with 10+ datasets
- [ ] Column popover opens/closes correctly
- [ ] Search input doesn't cause layout shift

**Step 2: Test search functionality**

- [ ] Search returns correct results
- [ ] Pagination works with search results
- [ ] Clearing search resets to full dataset
- [ ] Debounce prevents excessive API calls
- [ ] Special characters work correctly

**Step 3: Test column visibility**

- [ ] Show/hide individual columns
- [ ] Show All / Hide All buttons
- [ ] Column filter within popover
- [ ] State persists during search

**Step 4: Performance check**

- [ ] Search on 100K+ row dataset is responsive
- [ ] No lag when typing in search
- [ ] Table scrolls smoothly

**Step 5: Final commit**

```bash
git add .
git commit -m "polish: final adjustments for upload page fixes"
```

---

## Summary

This plan:
1. Adds SQL-based `search_rows` Tauri command
2. Creates `ColumnVisibilityPopover` component
3. Replaces dataset tabs with dropdown selector
4. Replaces column toggles with popover
5. Implements debounced backend search
6. Handles edge cases (special chars, empty results)
7. Tests layout and functionality

Estimated completion: 7 tasks, ~30-45 minutes

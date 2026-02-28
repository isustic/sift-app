# Upload Page Layout & Global Search Design

**Date:** 2026-02-27
**Status:** Approved

## Overview

Fix overlapping layout issues on the upload page and implement SQL-based global search that works across all rows in a dataset.

## Problems

1. **Overlapping elements** - Dataset tabs, column toggles, and header elements wrap/squash on normal screen sizes
2. **Page-limited search** - Current search only filters the 100 rows loaded in memory, not the full dataset
3. **Scalability** - Adding more datasets or columns makes the layout worse

## Solution: Compact Header + SQL-Based Search

### Layout Redesign

#### Header Changes
- **Replace dataset tabs** with a dropdown selector (similar to report page)
- Use the existing `StyledSelect` component from report page
- frees up horizontal space for other elements

#### Controls Bar Changes
- **Move column toggles** into a collapsible popover/dialog
- Add a "Columns" button that opens a popover with checkboxes for each column
- Eliminates the wrapping column button row
- Consistent with common data grid patterns (e.g., GitHub, Linear)

### SQL-Based Search

#### Backend Changes
Add new Tauri command in `src-tauri/src/commands/data.rs`:

```rust
#[tauri::command]
fn search_rows(
    state: tauri::State<DbState>,
    dataset_id: i64,
    query: String,
    limit: i64,
    offset: i64,
) -> Result<PagedRows>
```

- Performs `LIKE %query%` search across ALL text columns
- Returns paginated results with total count
- Uses bound parameters for safety

#### Frontend Changes
- Replace client-side filtering with backend search
- Search input debounced (300ms) to avoid excessive API calls
- Show total match count in results
- Pagination works against filtered result set

## Components

### ColumnVisibilityPopover
New component in `components/Upload/ColumnVisibilityPopover.tsx`:
- Dropdown/popover triggered by "Columns" button
- Checkboxes for each column
- "Show All" / "Hide All" quick actions
- Search within column names (for datasets with many columns)

### Enhanced Search Bar
- Keep current search input position
- Add loading state indicator
- Show match count
- Clear button to reset search

## Data Flow

1. User types in search input
2. After 300ms debounce, invoke `search_rows` command
3. Backend executes SQL with LIKE across all columns
4. Frontend receives paginated results
5. Table updates with filtered data
6. Pagination controls work against filtered set

## SQL Query Pattern

```sql
SELECT * FROM {table_name}
WHERE {column1} LIKE ? OR {column2} LIKE ? OR ...
LIMIT ? OFFSET ?
```

Each LIKE clause uses the same bound parameter value.

## Edge Cases

- **No results**: Show empty state with "No matches found" message
- **Empty query**: Show all rows (behaves like `get_rows`)
- **Large datasets**: Pagination keeps response times reasonable
- **Special characters**: Escape LIKE wildcards in user input

## Success Criteria

- [ ] No overlapping elements on screens ≥ 1280px wide
- [ ] Search works across entire dataset (not just current page)
- [ ] Column visibility control doesn't wrap or break layout
- [ ] Dataset selector scales to 10+ datasets
- [ ] Search performance acceptable on 100K+ row datasets

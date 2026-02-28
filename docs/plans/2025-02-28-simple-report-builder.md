# Simple Report Builder Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a step-by-step visual query builder that lets non-technical users create reports from SQLite datasets without writing SQL.

**Architecture:** Single-page wizard with progressive disclosure. Left sidebar for step navigation, right panel for active step configuration. Frontend builds a simplified JSON query schema, Rust backend generates SQL with column whitelisting. State managed in React, persisted across step navigation.

**Tech Stack:** React 19, TypeScript, Next.js 16, Tauri v2 (Rust), SQLite, Tailwind CSS, shadcn/ui

---

## Task 1: Create Backend Query Schema

**Files:**
- Create: `src-tauri/src/queries.rs` (new module)
- Modify: `src-tauri/src/commands/mod.rs`

**Step 1: Create new queries module with simplified schema**

Create `src-tauri/src/queries.rs`:

```rust
use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SimpleQuery {
    pub dataset_id: i64,
    pub display_columns: Vec<String>,
    pub group_by: Vec<String>,
    pub calculations: Vec<Calculation>,
    pub filters: Vec<Filter>,
    pub sort_by: Vec<SortColumn>,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct Calculation {
    pub function: String,  // "sum", "count", "avg", "min", "max"
    pub column: String,
    pub alias: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct Filter {
    pub column: String,
    pub operator: String,
    pub value: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct SortColumn {
    pub column: String,
    pub descending: bool,
}

// Map simple function names to SQL
impl Calculation {
    pub fn to_sql_function(&self) -> String {
        match self.function.to_lowercase().as_str() {
            "sum" => "SUM",
            "count" => "COUNT",
            "avg" => "AVG",
            "min" => "MIN",
            "max" => "MAX",
            _ => "SUM", // default fallback
        }.to_string()
    }
}

// Map simple operators to SQL
impl Filter {
    pub fn to_sql_operator(&self) -> &'static str {
        match self.operator.as_str() {
            "is" => "=",
            "is not" => "!=",
            "contains" => "LIKE",
            "starts with" => "LIKE",
            "ends with" => "LIKE",
            "equals" => "=",
            "not equal" => "!=",
            "greater than" => ">",
            "less than" => "<",
            "before" => "<",
            "after" => ">",
            _ => "=",
        }
    }

    // Transform value for LIKE operators
    pub fn transform_value(&self) -> String {
        match self.operator.as_str() {
            "contains" => format!("%{}%", self.value),
            "starts with" => format!("{}%", self.value),
            "ends with" => format!("%{}", self.value),
            _ => self.value.clone(),
        }
    }
}
```

**Step 2: Add module to commands/mod.rs**

Add to `src-tauri/src/commands/mod.rs`:

```rust
pub mod queries;
pub use queries::{SimpleQuery, Calculation, Filter, SortColumn};
```

**Step 3: Verify compilation**

Run: `cd frontend/src-tauri && cargo check`

Expected: No errors, module compiles successfully

**Step 4: Commit**

```bash
git add src-tauri/src/queries.rs src-tauri/src/commands/mod.rs
git commit -m "feat: add simplified query schema for report builder"
```

---

## Task 2: Rewrite run_report Command

**Files:**
- Modify: `src-tauri/src/commands/report.rs`

**Step 1: Backup existing report.rs**

```bash
cp src-tauri/src/commands/report.rs src-tauri/src/commands/report.rs.backup
```

**Step 2: Rewrite run_report with new schema**

Replace content of `src-tauri/src/commands/report.rs`:

```rust
use crate::db::DbState;
use crate::commands::queries::{SimpleQuery, Filter, SortColumn};
use crate::db::schema::sanitize_col_name;
use rusqlite::params;
use tauri::State;

/// Get valid column names for a dataset
fn get_valid_columns(conn: &rusqlite::Connection, dataset_id: i64) -> Result<Vec<String>, String> {
    let mut stmt = conn
        .prepare("SELECT name FROM columns WHERE dataset_id = ?1 ORDER BY display_order")
        .map_err(|e| e.to_string())?;
    let names = stmt
        .query_map(params![dataset_id], |r| r.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<String>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(names)
}

/// Validate column exists in allowed set
fn validate_col(name: &str, allowed: &[String]) -> Result<String, String> {
    let safe = sanitize_col_name(name);
    if allowed.iter().any(|a| sanitize_col_name(a) == safe) {
        Ok(safe)
    } else {
        Err(format!("Column '{name}' is not valid for this dataset"))
    }
}

#[tauri::command]
pub fn run_report(
    query: SimpleQuery,
    db: State<'_, DbState>,
) -> Result<Vec<serde_json::Value>, String> {
    let conn = db.0.lock().map_err(|_| "DB lock error")?;

    // Get table name for dataset
    let table_name: String = conn
        .query_row(
            "SELECT table_name FROM datasets WHERE id = ?1",
            params![query.dataset_id],
            |r| r.get(0),
        )
        .map_err(|e| format!("Dataset not found: {e}"))?;

    let valid_cols = get_valid_columns(&conn, query.dataset_id)?;
    let safe_table = sanitize_col_name(&table_name);

    // Build SELECT clause
    let mut select_parts: Vec<String> = Vec::new();
    let mut group_cols: Vec<String> = Vec::new();

    let has_grouping = !query.group_by.is_empty();

    if has_grouping {
        // Add grouping columns
        for col in &query.group_by {
            let safe = validate_col(col, &valid_cols)?;
            select_parts.push(format!("\"{safe}\""));
            group_cols.push(format!("\"{safe}\""));
        }

        // Add calculations
        use crate::commands::queries::Calculation;
        for calc in &query.calculations {
            let safe_col = validate_col(&calc.column, &valid_cols)?;
            let safe_alias = sanitize_col_name(&calc.alias);
            let fn_name = calc.to_sql_function();
            select_parts.push(format!("{fn_name}(\"{safe_col}\") AS \"{safe_alias}\""));
        }

        // If only dimensions and no calculations, add COUNT
        if query.calculations.is_empty() {
            select_parts.push("COUNT(*) AS \"count\"".to_string());
        }
    } else {
        // No grouping - display columns directly
        let cols_to_show = if query.display_columns.is_empty() {
            &valid_cols
        } else {
            &query.display_columns
        };

        for col in cols_to_show {
            let safe = validate_col(col, &valid_cols)?;
            select_parts.push(format!("\"{safe}\""));
        }
    }

    if select_parts.is_empty() {
        return Err("No columns selected for display".into());
    }

    let mut sql = format!(
        "SELECT {} FROM \"{}\"",
        select_parts.join(", "),
        safe_table
    );

    // Build WHERE clause
    let mut bind_values: Vec<String> = Vec::new();
    let mut where_parts: Vec<String> = Vec::new();

    for filter in &query.filters {
        let safe_col = validate_col(&filter.column, &valid_cols)?;
        let sql_op = filter.to_sql_operator();
        let placeholder = format!("?{}", bind_values.len() + 1);
        where_parts.push(format!("\"{safe_col}\" {} {placeholder}", sql_op));
        bind_values.push(filter.transform_value());
    }

    if !where_parts.is_empty() {
        sql.push_str(&format!(" WHERE {}", where_parts.join(" AND ")));
    }

    // GROUP BY clause
    if has_grouping && !group_cols.is_empty() {
        sql.push_str(&format!(" GROUP BY {}", group_cols.join(", ")));
    }

    // ORDER BY clause
    if !query.sort_by.is_empty() {
        let sort_parts: Vec<String> = query.sort_by.iter()
            .map(|s| {
                let safe_col = validate_col(&s.column, &valid_cols)?;
                Ok(format!("\"{}\"{}", safe_col, if s.descending { " DESC" } else { "" }))
            })
            .collect::<Result<Vec<_>, String>>()?;
        sql.push_str(&format!(" ORDER BY {}", sort_parts.join(", ")));
    }

    // LIMIT clause
    if let Some(limit) = query.limit {
        if limit > 0 {
            sql.push_str(&format!(" LIMIT {}", limit));
        }
    }

    // Execute query
    let mut stmt = conn.prepare(&sql).map_err(|e| format!("SQL error: {e}"))?;
    let col_count = stmt.column_count();
    let col_names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();

    let result_rows = stmt
        .query_map(rusqlite::params_from_iter(bind_values.iter()), |row| {
            let mut map = serde_json::Map::new();
            for i in 0..col_count {
                let val: rusqlite::types::Value = row.get(i)?;
                let json_val = match val {
                    rusqlite::types::Value::Null => serde_json::Value::Null,
                    rusqlite::types::Value::Integer(n) => serde_json::Value::Number(n.into()),
                    rusqlite::types::Value::Real(f) => {
                        serde_json::Value::Number(serde_json::Number::from_f64(f).unwrap_or(0.into()))
                    }
                    rusqlite::types::Value::Text(s) => serde_json::Value::String(s),
                    rusqlite::types::Value::Blob(_) => serde_json::Value::String("[blob]".into()),
                };
                map.insert(col_names[i].clone(), json_val);
            }
            Ok(serde_json::Value::Object(map))
        })
        .map_err(|e| format!("Query error: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Row error: {e}"))?;

    Ok(result_rows)
}

// Keep old templates command working (will migrate to new schema later)
#[tauri::command]
pub fn save_template(
    name: String,
    dataset_id: Option<i64>,
    config_json: String,
    db: State<'_, DbState>,
) -> Result<i64, String> {
    let conn = db.0.lock().map_err(|_| "DB lock error")?;
    conn.execute(
        "INSERT INTO report_templates (name, dataset_id, config_json, created_at) VALUES (?1, ?2, ?3, datetime('now'))",
        params![name, dataset_id, config_json],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn list_templates(
    dataset_id: Option<i64>,
    db: State<'_, DbState>,
) -> Result<Vec<serde_json::Value>, String> {
    let conn = db.0.lock().map_err(|_| "DB lock error")?;
    let sql = if dataset_id.is_some() {
        "SELECT id, name, dataset_id, config_json FROM report_templates WHERE dataset_id = ?1"
    } else {
        "SELECT id, name, dataset_id, config_json FROM report_templates"
    };

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let templates = stmt.query_map(
        if let Some(id) = dataset_id { params![id] } else { params![] },
        |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, i64>(0)?,
                "name": row.get::<_, String>(1)?,
                "dataset_id": row.get::<_, Option<i64>>(2)?,
                "config_json": row.get::<_, String>(3)?,
            }))
        }
    ).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(templates)
}

#[tauri::command]
pub fn delete_template(
    id: i64,
    db: State<'_, DbState>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|_| "DB lock error")?;
    conn.execute("DELETE FROM report_templates WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn load_template(
    id: i64,
    db: State<'_, DbState>,
) -> Result<String, String> {
    let conn = db.0.lock().map_err(|_| "DB lock error")?;
    let config_json: String = conn.query_row(
        "SELECT config_json FROM report_templates WHERE id = ?1",
        params![id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    Ok(config_json)
}
```

**Step 3: Verify compilation**

Run: `cd frontend/src-tauri && cargo check`

Expected: No compilation errors

**Step 4: Commit**

```bash
git add src-tauri/src/commands/report.rs
git commit -m "feat: rewrite run_report for simplified query schema"
```

---

## Task 3: Frontend Type Definitions

**Files:**
- Create: `types/report.ts`

**Step 1: Create type definitions**

Create `types/report.ts`:

```typescript
// Query state types
export interface SimpleQuery {
  datasetId: number;
  displayColumns: string[];
  groupBy: string[];
  calculations: Calculation[];
  filters: Filter[];
  sortBy: SortColumn[];
  limit: number | null;
}

export interface Calculation {
  function: "sum" | "count" | "avg" | "min" | "max";
  column: string;
  alias: string;
}

export interface Filter {
  column: string;
  operator: string;
  value: string;
}

export interface SortColumn {
  column: string;
  descending: boolean;
}

// Metadata types
export interface Dataset {
  id: number;
  name: string;
}

export interface ColumnMeta {
  id: number;
  name: string;
  col_type: string;  // "INTEGER", "REAL", "TEXT"
}

export interface Template {
  id: number;
  name: string;
  dataset_id: number | null;
  config_json: string;
}

// UI State
export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6;

export interface StepState {
  currentStep: StepNumber;
  canGoNext: boolean;
  canGoBack: boolean;
}

// Result types
export interface ReportResult {
  rows: Record<string, unknown>[];
  queryTime: number;
  rowCount: number;
}
```

**Step 2: Commit**

```bash
git add types/report.ts
git commit -m "feat: add type definitions for report builder"
```

---

## Task 4: Query Preview Utility

**Files:**
- Create: `lib/query-preview.ts`

**Step 1: Create query preview generator**

Create `lib/query-preview.ts`:

```typescript
import { SimpleQuery, ColumnMeta } from "@/types/report";

interface OperatorMap {
  [key: string]: string;
}

const OPERATOR_WORDS: OperatorMap = {
  "is": "equals",
  "is not": "does not equal",
  "contains": "contains",
  "starts with": "starts with",
  "ends with": "ends with",
  "equals": "equals",
  "not equal": "does not equal",
  "greater than": "greater than",
  "less than": "less than",
  "before": "before",
  "after": "after",
};

const FUNCTION_WORDS: { [key: string]: string } = {
  "sum": "Total of",
  "count": "Count of",
  "avg": "Average of",
  "min": "Minimum of",
  "max": "Maximum of",
};

export function buildQueryPreview(
  query: SimpleQuery,
  columns: ColumnMeta[]
): string {
  const parts: string[] = ["Show"];

  // Determine what we're showing
  const hasGrouping = query.groupBy.length > 0;

  if (hasGrouping) {
    // Show grouping columns first
    const groupCols = query.groupBy.join(", ");
    parts.push(groupCols);

    // Add calculations
    if (query.calculations.length > 0) {
      const calcText = query.calculations
        .map(c => `${FUNCTION_WORDS[c.function] || c.function} ${c.alias}`)
        .join(", ");
      parts.push(calcText);
    } else {
      parts.push("count");
    }
  } else {
    // No grouping - just display columns
    const displayCols = query.displayColumns.length > 0
      ? query.displayColumns.join(", ")
      : columns.map(c => c.name).join(", ");
    parts.push(displayCols);
  }

  // Grouping
  if (hasGrouping) {
    parts.push(`grouped by ${query.groupBy.join(", ")}`);
  }

  // Filters
  if (query.filters.length > 0) {
    const filterText = query.filters
      .map(f => {
        const op = OPERATOR_WORDS[f.operator] || f.operator;
        return `${f.column} ${op} ${f.value}`;
      })
      .join(" and ");
    parts.push(`where ${filterText}`);
  }

  // Sort
  if (query.sortBy.length > 0) {
    const sortText = query.sortBy
      .map(s => `${s.column} (${s.descending ? "descending" : "ascending"})`)
      .join(", then by ");
    parts.push(`sorted by ${sortText}`);
  }

  // Limit
  if (query.limit) {
    parts.push(`limited to ${query.limit} rows`);
  }

  return parts.join(", ") + ".";
}

export function getColumnType(column: string, columns: ColumnMeta[]): "text" | "number" | "date" {
  const col = columns.find(c => c.name === column);
  if (!col) return "text";

  const type = col.col_type.toUpperCase();
  if (type === "INTEGER" || type === "REAL") return "number";
  if (column.toLowerCase().includes("date") || column.toLowerCase().includes("time")) return "date";
  return "text";
}

export function getOperatorsForType(columnType: "text" | "number" | "date"): Array<{ value: string; label: string }> {
  switch (columnType) {
    case "text":
      return [
        { value: "is", label: "is" },
        { value: "is not", label: "is not" },
        { value: "contains", label: "contains" },
        { value: "starts with", label: "starts with" },
        { value: "ends with", label: "ends with" },
      ];
    case "number":
      return [
        { value: "equals", label: "equals" },
        { value: "not equal", label: "not equal" },
        { value: "greater than", label: "greater than" },
        { value: "less than", label: "less than" },
      ];
    case "date":
      return [
        { value: "is", label: "is" },
        { value: "before", label: "before" },
        { value: "after", label: "after" },
      ];
  }
}

export function getAggregationOptions(): Array<{ value: string; label: string }> {
  return [
    { value: "sum", label: "Total of..." },
    { value: "count", label: "Count of..." },
    { value: "avg", label: "Average of..." },
    { value: "min", label: "Minimum of..." },
    { value: "max", label: "Maximum of..." },
  ];
}
```

**Step 2: Commit**

```bash
git add lib/query-preview.ts
git commit -m "feat: add query preview and helper utilities"
```

---

## Task 5: Step Navigation Component

**Files:**
- Create: `components/report/StepNavigation.tsx`

**Step 1: Create step navigation sidebar**

Create `components/report/StepNavigation.tsx`:

```typescript
import { cn } from "@/lib/utils";

interface Step {
  number: number;
  title: string;
  completed: boolean;
  current: boolean;
}

interface StepNavigationProps {
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick: (step: number) => void;
}

const STEPS = [
  { number: 1, title: "Columns" },
  { number: 2, title: "Group By" },
  { number: 3, title: "Calculate" },
  { number: 4, title: "Filters" },
  { number: 5, title: "Sort" },
  { number: 6, title: "Run" },
];

export function StepNavigation({ currentStep, completedSteps, onStepClick }: StepNavigationProps) {
  return (
    <nav className="w-48 shrink-0 border-r border-border/50 bg-card/20 p-4">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        Steps
      </h2>
      <ol className="space-y-1">
        {STEPS.map((step) => {
          const isCompleted = completedSteps.has(step.number);
          const isCurrent = currentStep === step.number;
          const isClickable = isCompleted || isCurrent || step.number < currentStep;

          return (
            <li key={step.number}>
              <button
                onClick={() => isClickable && onStepClick(step.number)}
                disabled={!isClickable}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2",
                  isCurrent && "bg-primary text-primary-foreground font-medium",
                  isCompleted && !isCurrent && "bg-muted/50 text-muted-foreground hover:bg-muted",
                  !isClickable && "opacity-40 cursor-not-allowed"
                )}
              >
                <span
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-xs",
                    isCurrent && "bg-primary-foreground text-primary",
                    isCompleted && !isCurrent && "bg-muted-foreground text-background",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? "✓" : step.number}
                </span>
                {step.title}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

**Step 2: Commit**

```bash
git add components/report/StepNavigation.tsx
git commit -m "feat: add step navigation component"
```

---

## Task 6: Query Preview Component

**Files:**
- Create: `components/report/QueryPreview.tsx`

**Step 1: Create query preview display**

Create `components/report/QueryPreview.tsx`:

```typescript
import { cn } from "@/lib/utils";

interface QueryPreviewProps {
  preview: string;
  className?: string;
}

export function QueryPreview({ preview, className }: QueryPreviewProps) {
  return (
    <div className={cn(
      "px-6 py-3 bg-muted/30 border-t border-border/50",
      className
    )}>
      <div className="flex items-start gap-2 text-sm">
        <span className="text-muted-foreground shrink-0">Preview:</span>
        <p className="text-foreground">{preview}</p>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/report/QueryPreview.tsx
git commit -m "feat: add query preview component"
```

---

## Task 7: Step 1 - Column Selector

**Files:**
- Create: `components/report/steps/Step1_Columns.tsx`

**Step 1: Create column selector step**

Create `components/report/steps/Step1_Columns.tsx`:

```typescript
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColumnMeta } from "@/types/report";

interface Step1ColumnsProps {
  columns: ColumnMeta[];
  selectedColumns: string[];
  onColumnsChange: (columns: string[]) => void;
}

export function Step1_Columns({ columns, selectedColumns, onColumnsChange }: Step1ColumnsProps) {
  const toggleColumn = (columnName: string) => {
    if (selectedColumns.includes(columnName)) {
      onColumnsChange(selectedColumns.filter(c => c !== columnName));
    } else {
      onColumnsChange([...selectedColumns, columnName]);
    }
  };

  const selectAll = () => {
    onColumnsChange(columns.map(c => c.name));
  };

  const selectNone = () => {
    onColumnsChange([]);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">What data do you want to see?</h3>
        <p className="text-sm text-muted-foreground">
          Select the columns you want to include in your report.
        </p>
      </div>

      <div className="flex gap-2 text-sm">
        <button
          onClick={selectAll}
          className="text-primary hover:underline"
        >
          Select all
        </button>
        <span className="text-muted-foreground">•</span>
        <button
          onClick={selectNone}
          className="text-primary hover:underline"
        >
          Select none
        </button>
        <span className="text-muted-foreground">•</span>
        <span className="text-muted-foreground">
          {selectedColumns.length} of {columns.length} selected
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {columns.map((column) => {
          const isSelected = selectedColumns.includes(column.name);
          return (
            <button
              key={column.id}
              onClick={() => toggleColumn(column.name)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 hover:bg-muted"
              )}
            >
              <Check className={cn("w-4 h-4", !isSelected && "opacity-0")} />
              <span className="truncate">{column.name}</span>
              <span className="text-xs opacity-60 ml-auto">{column.col_type}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/report/steps/Step1_Columns.tsx
git commit -m "feat: add Step 1 column selector"
```

---

## Task 8: Step 2 - Group By Selector

**Files:**
- Create: `components/report/steps/Step2_GroupBy.tsx`

**Step 1: Create group by step**

Create `components/report/steps/Step2_GroupBy.tsx`:

```typescript
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColumnMeta } from "@/types/report";

interface Step2GroupByProps {
  columns: ColumnMeta[];
  selectedGroups: string[];
  displayColumns: string[];
  onGroupsChange: (groups: string[]) => void;
}

export function Step2_GroupBy({
  columns,
  selectedGroups,
  displayColumns,
  onGroupsChange
}: Step2GroupByProps) {
  const toggleGroup = (columnName: string) => {
    if (selectedGroups.includes(columnName)) {
      onGroupsChange(selectedGroups.filter(g => g !== columnName));
    } else {
      onGroupsChange([...selectedGroups, columnName]);
    }
  };

  // Columns that can be grouped (exclude those already in display)
  const availableColumns = columns.filter(c => !selectedGroups.includes(c.name));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Group your data</h3>
        <p className="text-sm text-muted-foreground">
          Grouping combines rows with the same values. For example, group by
          {" "}Region to see one row per region instead of every single sale.
        </p>
      </div>

      {selectedGroups.length > 0 && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-md">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Grouping by ({selectedGroups.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedGroups.map(group => (
              <button
                key={group}
                onClick={() => toggleGroup(group)}
                className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded text-sm"
              >
                {group}
                <span className="hover:text-red-300">×</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Add grouping column
        </p>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
          {availableColumns.map((column) => {
            return (
              <button
                key={column.id}
                onClick={() => toggleGroup(column.name)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors",
                  "bg-muted/50 hover:bg-muted"
                )}
              >
                <span className="truncate">{column.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => onGroupsChange([])}
        className={cn(
          "text-sm transition-colors",
          selectedGroups.length > 0 ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/50"
        )}
      >
        No grouping (show all rows)
      </button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/report/steps/Step2_GroupBy.tsx
git commit -m "feat: add Step 2 group by selector"
```

---

## Task 9: Step 3 - Calculations Builder

**Files:**
- Create: `components/report/steps/Step3_Calculations.tsx`

**Step 1: Create calculations step**

Create `components/report/steps/Step3_Calculations.tsx`:

```typescript
import { Plus, Trash2 } from "lucide-react";
import { ColumnMeta, Calculation } from "@/types/report";
import { getAggregationOptions } from "@/lib/query-preview";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Step3CalculationsProps {
  columns: ColumnMeta[];
  calculations: Calculation[];
  onCalculationsChange: (calculations: Calculation[]) => void;
}

export function Step3_Calculations({
  columns,
  calculations,
  onCalculationsChange
}: Step3CalculationsProps) {
  const aggOptions = getAggregationOptions();

  const addCalculation = () => {
    const numericCols = columns.filter(c => c.col_type === "INTEGER" || c.col_type === "REAL");
    if (numericCols.length === 0) return;

    const newCalc: Calculation = {
      function: "sum",
      column: numericCols[0].name,
      alias: `Total ${numericCols[0].name}`,
    };
    onCalculationsChange([...calculations, newCalc]);
  };

  const updateCalculation = (index: number, updates: Partial<Calculation>) => {
    const newCalcs = [...calculations];
    newCalcs[index] = { ...newCalcs[index], ...updates };
    onCalculationsChange(newCalcs);
  };

  const removeCalculation = (index: number) => {
    onCalculationsChange(calculations.filter((_, i) => i !== index));
  };

  const numericColumns = columns.filter(c => c.col_type === "INTEGER" || c.col_type === "REAL");

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Add calculations</h3>
        <p className="text-sm text-muted-foreground">
          Calculations let you summarize grouped data. Choose what you want
          to calculate and which column to use.
        </p>
      </div>

      {calculations.length === 0 ? (
        <div className="p-6 border-2 border-dashed border-border rounded-md text-center">
          <p className="text-sm text-muted-foreground mb-3">
            No calculations added yet
          </p>
          <Button
            onClick={addCalculation}
            size="sm"
            variant="outline"
            disabled={numericColumns.length === 0}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add calculation
          </Button>
          {numericColumns.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              No numeric columns available for calculations
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {calculations.map((calc, index) => (
            <div key={index} className="p-3 bg-muted/10 border border-border/30 rounded-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Calculation {index + 1}</span>
                <Button
                  onClick={() => removeCalculation(index)}
                  size="sm"
                  variant="ghost"
                  className="h-7 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-[1fr,1fr] gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Function</label>
                  <Select
                    value={calc.function}
                    onValueChange={(value) =>
                      updateCalculation(index, {
                        function: value as Calculation["function"],
                      })
                    }
                  >
                    <SelectTrigger size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {aggOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Column</label>
                  <Select
                    value={calc.column}
                    onValueChange={(value) => {
                      updateCalculation(index, { column: value });
                      // Update alias if it hasn't been customized
                      if (calc.alias === `Total ${calc.column}` || calc.alias === `${calc.function} ${calc.column}`) {
                        const funcLabel = aggOptions.find(a => a.value === calc.function)?.label || calc.function;
                        updateCalculation(index, {
                          column: value,
                          alias: `${funcLabel.replace("...", "")} ${value}`,
                        });
                      }
                    }}
                  >
                    <SelectTrigger size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {numericColumns.map((col) => (
                        <SelectItem key={col.id} value={col.name}>
                          {col.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-3">
                <label className="text-xs text-muted-foreground">Display name</label>
                <Input
                  value={calc.alias}
                  onChange={(e) => updateCalculation(index, { alias: e.target.value })}
                  placeholder="Total Sales"
                  className="h-8"
                />
              </div>
            </div>
          ))}

          <Button
            onClick={addCalculation}
            size="sm"
            variant="outline"
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add another calculation
          </Button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/report/steps/Step3_Calculations.tsx
git commit -m "feat: add Step 3 calculations builder"
```

---

## Task 10: Step 4 - Filter Builder

**Files:**
- Create: `components/report/steps/Step4_Filters.tsx`

**Step 1: Create filter builder step**

Create `components/report/steps/Step4_Filters.tsx`:

```typescript
import { Plus, Trash2, X } from "lucide-react";
import { ColumnMeta, Filter } from "@/types/report";
import { getOperatorsForType, getColumnType } from "@/lib/query-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Step4FiltersProps {
  columns: ColumnMeta[];
  filters: Filter[];
  onFiltersChange: (filters: Filter[]) => void;
}

export function Step4_Filters({ columns, filters, onFiltersChange }: Step4FiltersProps) {
  const addFilter = () => {
    if (columns.length === 0) return;
    const colType = getColumnType(columns[0].name, columns);
    const operators = getOperatorsForType(colType);

    const newFilter: Filter = {
      column: columns[0].name,
      operator: operators[0].value,
      value: "",
    };
    onFiltersChange([...filters, newFilter]);
  };

  const updateFilter = (index: number, updates: Partial<Filter>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };

    // Update operator when column changes (to match type)
    if (updates.column) {
      const colType = getColumnType(updates.column, columns);
      const operators = getOperatorsForType(colType);
      if (!operators.some(o => o.value === newFilters[index].operator)) {
        newFilters[index].operator = operators[0].value;
      }
    }

    onFiltersChange(newFilters);
  };

  const removeFilter = (index: number) => {
    onFiltersChange(filters.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Filter your data</h3>
        <p className="text-sm text-muted-foreground">
          Only show rows that match your conditions. All conditions are combined
          with {" "}AND {" "} (all must be true).
        </p>
      </div>

      {filters.length === 0 ? (
        <div className="p-6 border-2 border-dashed border-border rounded-md text-center">
          <p className="text-sm text-muted-foreground mb-3">
            No filters added - showing all data
          </p>
          <Button onClick={addFilter} size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-1" />
            Add condition
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Where</span>
          </div>

          {filters.map((filter, index) => {
            const colType = getColumnType(filter.column, columns);
            const operators = getOperatorsForType(colType);

            return (
              <div key={index} className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground pt-2">
                  {index === 0 ? "" : "AND"}
                </span>

                <div className="flex-1 grid grid-cols-[1fr,auto,1fr,auto] gap-2 items-start">
                  <Select
                    value={filter.column}
                    onValueChange={(value) => updateFilter(index, { column: value })}
                  >
                    <SelectTrigger size="sm">
                      <SelectValue placeholder="Column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col.id} value={col.name}>
                          {col.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filter.operator}
                    onValueChange={(value) => updateFilter(index, { operator: value })}
                  >
                    <SelectTrigger size="sm" className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {operators.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    value={filter.value}
                    onChange={(e) => updateFilter(index, { value: e.target.value })}
                    placeholder="Value"
                    className="h-8"
                  />

                  <Button
                    onClick={() => removeFilter(index)}
                    size="sm"
                    variant="ghost"
                    className="h-8 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          <Button
            onClick={addFilter}
            size="sm"
            variant="outline"
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add condition
          </Button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/report/steps/Step4_Filters.tsx
git commit -m "feat: add Step 4 filter builder"
```

---

## Task 11: Step 5 - Sort and Limit

**Files:**
- Create: `components/report/steps/Step5_Sort.tsx`

**Step 1: Create sort/limit step**

Create `components/report/steps/Step5_Sort.tsx`:

```typescript
import { Plus, Trash2, ArrowUpDown } from "lucide-react";
import { ColumnMeta, SortColumn } from "@/types/report";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Step5SortProps {
  columns: ColumnMeta[];
  sortBy: SortColumn[];
  limit: number | null;
  onSortByChange: (sortBy: SortColumn[]) => void;
  onLimitChange: (limit: number | null) => void;
  groupBy: string[];
  calculations: Array<{ alias: string }>;
}

export function Step5_Sort({
  columns,
  sortBy,
  limit,
  onSortByChange,
  onLimitChange,
  groupBy,
  calculations,
}: Step5SortProps) {
  // Available columns: either grouping columns + calculation aliases, or all columns
  const availableColumns = groupBy.length > 0
    ? [...groupBy, ...calculations.map(c => c.alias)]
    : columns.map(c => c.name);

  const addSortLevel = () => {
    if (availableColumns.length === 0) return;

    const newSort: SortColumn = {
      column: availableColumns[0],
      descending: true,
    };
    onSortByChange([...sortBy, newSort]);
  };

  const updateSort = (index: number, updates: Partial<SortColumn>) => {
    const newSort = [...sortBy];
    newSort[index] = { ...newSort[index], ...updates };
    onSortByChange(newSort);
  };

  const removeSort = (index: number) => {
    onSortByChange(sortBy.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Sort your results</h3>
        <p className="text-sm text-muted-foreground">
          Choose how to order your results. You can add multiple levels of sorting.
        </p>
      </div>

      <div className="space-y-3">
        {sortBy.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No sorting applied - results will be in default order
          </p>
        ) : (
          sortBy.map((sort, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0">
                {index === 0 ? "Sort by" : "Then by"}
              </span>

              <Select
                value={sort.column}
                onValueChange={(value) => updateSort(index, { column: value })}
              >
                <SelectTrigger size="sm" className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableColumns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={sort.descending ? "desc" : "asc"}
                onValueChange={(value) => updateSort(index, { descending: value === "desc" })}
              >
                <SelectTrigger size="sm" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">
                    {availableColumns.includes(sort.column) && calculations.some(c => c.alias === sort.column)
                      ? "Largest first"
                      : groupBy.includes(sort.column)
                        ? "Z to A"
                        : "Descending"}
                  </SelectItem>
                  <SelectItem value="asc">
                    {availableColumns.includes(sort.column) && calculations.some(c => c.alias === sort.column)
                      ? "Smallest first"
                      : groupBy.includes(sort.column)
                        ? "A to Z"
                        : "Ascending"}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={() => removeSort(index)}
                size="sm"
                variant="ghost"
                className="h-8 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}

        {sortBy.length < availableColumns.length && (
          <Button
            onClick={addSortLevel}
            size="sm"
            variant="outline"
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add sort level
          </Button>
        )}
      </div>

      <div className="pt-3 border-t border-border/50">
        <label className="text-sm font-medium">Maximum rows to show</label>
        <p className="text-xs text-muted-foreground mb-2">
          Leave empty to show all results
        </p>
        <Input
          type="number"
          min="1"
          value={limit ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            onLimitChange(val === "" ? null : Math.max(1, parseInt(val, 10) || 1));
          }}
          placeholder="All results"
          className="max-w-48"
        />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/report/steps/Step5_Sort.tsx
git commit -m "feat: add Step 5 sort and limit"
```

---

## Task 12: Step 6 - Results Display

**Files:**
- Create: `components/report/steps/Step6_Results.tsx`

**Step 1: Create results display step**

Create `components/report/steps/Step6_Results.tsx`:

```typescript
import { Clock, Database, ArrowLeft, Funnel, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Step6ResultsProps {
  rows: Record<string, unknown>[];
  loading: boolean;
  error: string | null;
  queryTime?: number;
  onEditQuery: () => void;
  onRefineFilters: () => void;
  onExport: () => void;
}

export function Step6_Results({
  rows,
  loading,
  error,
  queryTime,
  onEditQuery,
  onRefineFilters,
  onExport,
}: Step6ResultsProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Running your query...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="text-destructive text-4xl mb-3">⚠️</div>
          <h3 className="text-lg font-medium mb-2">Something went wrong</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={onEditQuery} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to query builder
          </Button>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <Database className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-medium mb-2">No results found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Your query didn't return any data. Try removing some filters or changing your grouping.
          </p>
          <Button onClick={onRefineFilters} variant="outline">
            <Funnel className="w-4 h-4 mr-1" />
            Refine filters
          </Button>
        </div>
      </div>
    );
  }

  const columns = Object.keys(rows[0]);

  // Format cell value for display
  const formatValue = (val: unknown): string => {
    if (val === null) return "—";
    if (typeof val === "number") {
      // Check if it looks like a currency value
      if (Math.abs(val) >= 1000 || (Math.abs(val) < 1 && val !== 0)) {
        return val.toLocaleString("en-US", { maximumFractionDigits: 2 });
      }
      return String(val);
    }
    return String(val);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Success header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Database className="w-4 h-4" />
            <span>{rows.length} rows</span>
          </div>
          {queryTime && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{queryTime}ms</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={onRefineFilters} size="sm" variant="outline">
            <Funnel className="w-4 h-4 mr-1" />
            Refine filters
          </Button>
          <Button onClick={onEditQuery} size="sm" variant="outline">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Edit query
          </Button>
          <Button onClick={onExport} size="sm">
            <Download className="w-4 h-4 mr-1" />
            Export to Excel
          </Button>
        </div>
      </div>

      {/* Results table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-border/30 hover:bg-muted/20"
              >
                {columns.map((col) => (
                  <td key={col} className="px-4 py-2 text-sm">
                    {formatValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/report/steps/Step6_Results.tsx
git commit -m "feat: add Step 6 results display"
```

---

## Task 13: Main Report Builder Container

**Files:**
- Modify: `app/report/page.tsx`

**Step 1: Replace report page with new builder**

Replace `app/report/page.tsx`:

```typescript
"use client";

import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, BookOpen, Trash2, Database, ChevronRight, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";

// Types
import type {
  SimpleQuery,
  Dataset,
  ColumnMeta,
  Template,
  StepNumber,
  Filter,
  Calculation,
  SortColumn,
} from "@/types/report";

// Components
import { StepNavigation } from "@/components/report/StepNavigation";
import { QueryPreview } from "@/components/report/QueryPreview";
import { Step1_Columns } from "@/components/report/steps/Step1_Columns";
import { Step2_GroupBy } from "@/components/report/steps/Step2_GroupBy";
import { Step3_Calculations } from "@/components/report/steps/Step3_Calculations";
import { Step4_Filters } from "@/components/report/steps/Step4_Filters";
import { Step5_Sort } from "@/components/report/steps/Step5_Sort";
import { Step6_Results } from "@/components/report/steps/Step6_Results";

// Utilities
import { buildQueryPreview } from "@/lib/query-preview";

export default function ReportPage() {
  // Dataset state
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<number | null>(null);
  const [columns, setColumns] = useState<ColumnMeta[]>([]);

  // Query state
  const [query, setQuery] = useState<SimpleQuery>({
    datasetId: 0,
    displayColumns: [],
    groupBy: [],
    calculations: [],
    filters: [],
    sortBy: [],
    limit: null,
  });

  // Navigation state
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Results state
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryTime, setQueryTime] = useState<number>();

  // Templates state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");

  // Load datasets on mount
  useEffect(() => {
    invoke<Dataset[]>("list_datasets").then((ds) => {
      setDatasets(ds);
      if (ds.length > 0) setActiveDatasetId(ds[0].id);
    });
  }, []);

  // Load columns when dataset changes
  useEffect(() => {
    if (!activeDatasetId) return;

    invoke<ColumnMeta[]>("get_columns", { datasetId: activeDatasetId }).then((cols) => {
      setColumns(cols);
      // Reset and initialize query with this dataset
      setQuery({
        datasetId: activeDatasetId,
        displayColumns: cols.map(c => c.name),
        groupBy: [],
        calculations: [],
        filters: [],
        sortBy: [],
        limit: null,
      });
      setCurrentStep(1);
      setCompletedSteps(new Set());
      setResults([]);
      setError(null);
    });

    loadTemplates();
  }, [activeDatasetId]);

  const loadTemplates = async () => {
    try {
      const tmpl = await invoke<Template[]>("list_templates", { datasetId: activeDatasetId });
      setTemplates(tmpl);
    } catch (e) {
      console.error("Failed to load templates:", e);
    }
  };

  // Query preview
  const queryPreview = useMemo(() => {
    if (!activeDatasetId) return "";
    return buildQueryPreview(query, columns);
  }, [query, columns, activeDatasetId]);

  // Step validation
  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case 1:
        return query.displayColumns.length > 0;
      case 2:
        return true; // Can always proceed (grouping is optional)
      case 3:
        return query.calculations.length > 0 || query.groupBy.length === 0;
      case 4:
        return true; // Filters are optional
      case 5:
        return true; // Sort is optional
      default:
        return false;
    }
  }, [currentStep, query]);

  const handleNext = () => {
    if (canGoNext && currentStep < 6) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep((currentStep + 1) as StepNumber);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as StepNumber);
    }
  };

  const handleStepClick = (step: number) => {
    if (completedSteps.has(step) || step < currentStep) {
      setCurrentStep(step as StepNumber);
    }
  };

  const runReport = async () => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();

    try {
      const rows = await invoke<Record<string, unknown>[]>("run_report", {
        query: {
          ...query,
          datasetId: activeDatasetId,
        },
      });

      setQueryTime(Math.round(performance.now() - startTime));
      setResults(rows);
      setCurrentStep(6);
      setCompletedSteps((prev) => new Set([...prev, 5]));
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    if (results.length === 0) return;

    const reportCols = results.length > 0 ? Object.keys(results[0]) : [];
    await invoke("export_report", { rows: results, columns: reportCols });
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) return;

    try {
      await invoke("save_template", {
        name: templateName.trim(),
        datasetId: activeDatasetId,
        configJson: JSON.stringify(query),
      });
      setTemplateName("");
      setShowSaveTemplate(false);
      loadTemplates();
    } catch (e) {
      setError("Error saving template: " + String(e));
    }
  };

  const loadTemplate = async (template: Template) => {
    try {
      const config: SimpleQuery = JSON.parse(template.config_json);
      setQuery(config);
      setCompletedSteps(new Set([1, 2, 3, 4, 5]));
      setCurrentStep(5);
    } catch (e) {
      setError("Error loading template: " + String(e));
    }
  };

  const deleteTemplate = async (id: number) => {
    try {
      await invoke("delete_template", { id });
      loadTemplates();
    } catch (e) {
      setError("Error deleting template: " + String(e));
    }
  };

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1_Columns
            columns={columns}
            selectedColumns={query.displayColumns}
            onColumnsChange={(cols) => setQuery({ ...query, displayColumns: cols })}
          />
        );
      case 2:
        return (
          <Step2_GroupBy
            columns={columns}
            selectedGroups={query.groupBy}
            displayColumns={query.displayColumns}
            onGroupsChange={(groups) => setQuery({ ...query, groupBy: groups })}
          />
        );
      case 3:
        return (
          <Step3_Calculations
            columns={columns}
            calculations={query.calculations}
            onCalculationsChange={(calcs) => setQuery({ ...query, calculations: calcs })}
          />
        );
      case 4:
        return (
          <Step4_Filters
            columns={columns}
            filters={query.filters}
            onFiltersChange={(filters) => setQuery({ ...query, filters })}
          />
        );
      case 5:
        return (
          <Step5_Sort
            columns={columns}
            sortBy={query.sortBy}
            limit={query.limit}
            onSortByChange={(sortBy) => setQuery({ ...query, sortBy })}
            onLimitChange={(limit) => setQuery({ ...query, limit })}
            groupBy={query.groupBy}
            calculations={query.calculations}
          />
        );
      case 6:
        return (
          <Step6_Results
            rows={results}
            loading={loading}
            error={error}
            queryTime={queryTime}
            onEditQuery={() => setCurrentStep(1)}
            onRefineFilters={() => setCurrentStep(4)}
            onExport={exportReport}
          />
        );
    }
  };

  return (
    <div className="flex h-full bg-background/50">
      {/* Left sidebar - Dataset & Templates */}
      <aside className="w-64 shrink-0 border-r border-border/50 bg-card/20 p-4 flex flex-col gap-4">
        {/* Dataset selector */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <Database className="w-3 h-3" />
            Dataset
          </label>
          <Select
            value={String(activeDatasetId ?? "")}
            onValueChange={(v) => setActiveDatasetId(Number(v))}
          >
            <SelectTrigger size="sm">
              <SelectValue placeholder="Select dataset" />
            </SelectTrigger>
            <SelectContent>
              {datasets.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Templates */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <BookOpen className="w-3 h-3" />
              Saved Reports
            </label>
            <button
              onClick={() => setShowSaveTemplate((v) => !v)}
              className="text-primary hover:opacity-70 transition-opacity"
            >
              <Save size={13} />
            </button>
          </div>

          {showSaveTemplate && (
            <div className="flex gap-1.5 p-2 rounded-md bg-primary/5 border border-primary/20">
              <Input
                className="flex-1 h-7 text-xs bg-background/60 border-border/50"
                placeholder="Report name…"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveTemplate()}
              />
              <Button size="sm" className="h-7 px-3 text-xs" onClick={saveTemplate}>Save</Button>
            </div>
          )}

          {templates.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 py-2">No saved reports</p>
          ) : (
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {templates.map((t) => (
                <div key={t.id} className="group flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-muted/40 transition-colors">
                  <button
                    className="flex-1 text-left text-xs truncate flex items-center gap-1.5"
                    onClick={() => loadTemplate(t)}
                  >
                    <BookOpen size={11} className="text-muted-foreground shrink-0" />
                    <span className="truncate">{t.name}</span>
                  </button>
                  <button
                    onClick={() => deleteTemplate(t.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-0.5"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Steps navigation */}
      <StepNavigation
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Step content */}
        <div className="flex-1 overflow-auto p-6">
          {renderStep()}
        </div>

        {/* Query preview */}
        {currentStep < 6 && <QueryPreview preview={queryPreview} />}

        {/* Action buttons */}
        {currentStep < 6 && (
          <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>

            {currentStep === 5 ? (
              <Button onClick={runReport} disabled={!canGoNext || loading}>
                Run Report
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={!canGoNext}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `cd frontend && npm run build`

Expected: Build succeeds without errors

**Step 3: Commit**

```bash
git add app/report/page.tsx
git commit -m "feat: implement main report builder container"
```

---

## Task 14: Clean Up Old Components

**Files:**
- Delete: `components/report/IntentSelector.tsx`
- Delete: `components/report/RawDataConfig.tsx`
- Delete: `components/report/SummaryConfig.tsx`
- Delete: `components/report/TrendsConfig.tsx`
- Delete: `components/report/AdvancedConfig.tsx`
- Delete: `components/report/ResultsPanel.tsx`

**Step 1: Remove old components**

```bash
rm components/report/IntentSelector.tsx
rm components/report/RawDataConfig.tsx
rm components/report/SummaryConfig.tsx
rm components/report/TrendsConfig.tsx
rm components/report/AdvancedConfig.tsx
rm components/report/ResultsPanel.tsx
```

**Step 2: Verify build**

Run: `cd frontend && npm run build`

Expected: Build succeeds

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove old report components"
```

---

## Task 15: Final Testing

**Files:**
- Test: All components

**Step 1: Run development server**

Run: `cd frontend && npm run tauri dev`

**Step 2: Test each step**

1. Select a dataset
2. Test Step 1: Select/deselect columns
3. Test Step 2: Add/remove grouping
4. Test Step 3: Add calculations (verify they only appear with grouping)
5. Test Step 4: Add filters (test text, number, date operators)
6. Test Step 5: Add sorting and limits
7. Run report and verify results

**Step 3: Test templates**

1. Create a query
2. Save as template
3. Load template
4. Delete template

**Step 4: Test export**

1. Run a report
2. Export to Excel
3. Verify file content

**Step 5: Edge cases**

1. Try to proceed without selecting columns (should be blocked)
2. Add grouping without calculations (should auto-add COUNT)
3. Run query with no matching data (should show friendly message)
4. Test with very large result sets

**Step 6: Final commit**

```bash
git add -A
git commit -m "test: verify report builder functionality"
```

---

## Summary

This implementation plan creates a step-by-step visual query builder for non-technical users. The key improvements over the old system:

1. **Simplified schema**: `SimpleQuery` instead of complex mode-based approach
2. **Progressive disclosure**: Only show relevant options for each step
3. **Plain language**: No SQL terminology in the UI
4. **Clear preview**: Always shows what the query will do in English
5. **Easy refinement**: Quick actions to modify filters without rebuilding

Total estimated implementation time: ~15-20 tasks following TDD principles with frequent commits.

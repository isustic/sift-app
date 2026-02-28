# Simple Report Builder Design

**Date:** 2025-02-28
**Status:** Approved for Implementation

## Overview

A step-by-step visual query builder for non-technical users to create reports from SQLite datasets without writing SQL. The design uses progressive disclosure to avoid overwhelming users with options.

## Problem Statement

The current report builder has multiple issues:
- **UI confusing**: Too many modes (raw, summary, trends, advanced) and options visible at once
- **SQL/query issues**: Users can't build the queries they need
- **Missing features**: Can't do certain types of queries

## Solution: Step-by-Step Wizard

A guided wizard that walks users through query construction one step at a time, with plain language instead of SQL terminology.

## Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────┐  ┌──────────────────────────────────────┐  │
│  │   Steps Panel   │  │         Configuration Area            │  │
│  │                 │  │                                       │  │
│  │  1. Columns     │  │  [Dynamic content based on step]      │  │
│  │  2. Group By    │  │                                       │  │
│  │  3. Calculate   │  │                                       │  │
│  │  4. Filters     │  │                                       │  │
│  │  5. Sort        │  │                                       │  │
│  │  6. Run         │  │                                       │  │
│  └─────────────────┘  └──────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Query Preview: Plain English description of query        │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Step Details

### Step 1: "What data do you want to see?" (Columns)
- Multi-select checkboxes for all available columns
- Minimum validation: at least one column must be selected
- No SQL terminology

### Step 2: "Group your data" (Group By)
- Explanation of what grouping does
- Option to select grouping columns or "None"
- If "None" selected → Skip Step 3 (no aggregations needed)
- Selected grouping columns removed from display columns to avoid duplication

### Step 3: "Add calculations" (Aggregations)
- Only shown if grouping was selected
- Plain language labels: "Total of...", "Count of...", "Average of..."
- Maps to SQL: SUM, COUNT, AVG, MIN, MAX
- User can add multiple calculations

### Step 4: "Filter the data" (WHERE clause)
- Dynamic filter builder with AND/OR
- Operators based on column type:
  - Text: "is", "is not", "contains", "starts with", "ends with"
  - Number: "equals", "not equal", "greater than", "less than", "between"
  - Date: "is", "before", "after", "between"

### Step 5: "Sort your results"
- Multi-level sorting support
- "Largest first" / "Smallest first" / "A to Z" / "Z to A"
- Optional row limit

### Step 6: "Run Report" (Results)
- Data table display
- Query time and row count
- "Refine Filters" quick action
- Export to Excel button
- Save as template button

## Query Preview

Always-visible plain English description:
> "Show Region and Total Sales, grouped by Region, where Year equals 2024, sorted by Total Sales (largest first)"

## Backend Schema

```rust
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimpleQuery {
    pub dataset_id: i64,
    pub display_columns: Vec<String>,    // Step 1
    pub group_by: Vec<String>,            // Step 2
    pub calculations: Vec<Calculation>,   // Step 3
    pub filters: Vec<Filter>,             // Step 4
    pub sort_by: Vec<SortColumn>,         // Step 5
    pub limit: Option<i64>,               // Step 5
}

#[derive(Debug, Deserialize)]
pub struct Calculation {
    pub function: String,  // "sum", "count", "avg", "min", "max"
    pub column: String,
    pub alias: String,     // Display name
}

#[derive(Debug, Deserialize)]
pub struct SortColumn {
    pub column: String,
    pub descending: bool,
}
```

## SQL Generation Logic

1. **SELECT clause**:
   - No grouping: `display_columns`
   - With grouping: `group_by columns + calculations`

2. **FROM clause**: Dataset table

3. **WHERE clause**: All filters ANDed together

4. **GROUP BY clause**: (only if group_by not empty)

5. **ORDER BY clause**: All sort_by columns

6. **LIMIT clause**: If specified

## Frontend State Management

```typescript
interface QueryState {
  datasetId: number | null;
  displayColumns: string[];
  groupBy: string[];
  calculations: Calculation[];
  filters: Filter[];
  sortBy: SortColumn[];
  limit: number | null;
  currentStep: number;
}
```

## Component Structure

```
components/report/
├── ReportBuilder.tsx          # Main container
├── Steps/
│   ├── Step1_Columns.tsx
│   ├── Step2_GroupBy.tsx
│   ├── Step3_Calculations.tsx
│   ├── Step4_Filters.tsx
│   ├── Step5_Sort.tsx
│   └── Step6_Results.tsx
├── QueryPreview.tsx
└── StepNavigation.tsx
```

## Error Handling

- Validate columns against whitelist before building SQL
- Show user-friendly errors (no SQL traces)
- Common edge cases handled gracefully (empty results, timeouts, etc.)

## Templates

- Save queries with name for later reuse
- Stored in existing `report_templates` table
- New JSON format (simplified schema)

## Migration Notes

- Old templates will be marked as "legacy"
- User can recreate old templates using new builder

## Implementation Checklist

### Frontend
- [ ] Create new report page with wizard layout
- [ ] Implement Step 1: Column selector
- [ ] Implement Step 2: Group by selector
- [ ] Implement Step 3: Calculations builder
- [ ] Implement Step 4: Filter builder
- [ ] Implement Step 5: Sort/Limit
- [ ] Implement Step 6: Results display
- [ ] Create query preview component
- [ ] Create step navigation sidebar
- [ ] Add save/load template functionality
- [ ] Add export to Excel
- [ ] Remove old report components

### Backend
- [ ] Update `ReportQuery` struct to `SimpleQuery`
- [ ] Modify `run_report` command to use new schema
- [ ] Update SQL generation logic
- [ ] Update template save/load for new format
- [ ] Add error message translation

### Testing
- [ ] Test each step independently
- [ ] Test step navigation and state persistence
- [ ] Test query generation for all combinations
- [ ] Test save/load templates
- [ ] Test error handling

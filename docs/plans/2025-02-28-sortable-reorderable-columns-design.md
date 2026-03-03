# Sortable & Reorderable Columns Design

**Date:** 2025-02-28
**Status:** Approved

## Overview

Add click-to-sort and drag-to-reorder functionality to the report results table in Step6_Results. Both features persist to saved reports through the existing query state.

## Features

### 1. Click-to-Sort
- Click column header to toggle sort: ASC → DESC → none
- Visual indicator (↑/↓) shows active sort column and direction
- Re-runs query with new `sortBy` parameter
- Persists to saved reports

### 2. Drag-to-Reorder
- Drag column headers to reorder columns
- Entire column header is draggable (grab cursor on hover)
- Updates `query.displayColumns`
- Persists to saved reports

## Dependencies

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Component Changes

### Step6_Results.tsx

**New Props:**
```typescript
interface Step6ResultsProps {
  // ... existing props
  onSortChange?: (column: string, direction: 'asc' | 'desc' | null) => void
  onColumnReorder?: (newColumnOrder: string[]) => void
  currentSort?: { column: string | null; direction: 'asc' | 'desc' | null }
}
```

**Changes:**
- Wrap column headers with `useSortable`
- Add click handler for sorting (toggle ASC → DESC → none)
- Wrap table header in `DndContext` for drag-and-drop
- Add sort arrow icons to column headers
- Add grab cursor on hover

### report/page.tsx

**New State:**
```typescript
const [columnSort, setColumnSort] = useState<{ column: string | null; direction: 'asc' | 'desc' | null }>({
  column: null,
  direction: null
})
```

**New Handlers:**
```typescript
const handleColumnSort = (column: string, direction: 'asc' | 'desc' | null) => {
  setColumnSort({ column, direction })
  if (direction) {
    updateQuery({
      sortBy: [{ column, descending: direction === 'desc' }]
    })
  } else {
    updateQuery({ sortBy: [] })
  }
  handleRunReport()
}

const handleColumnReorder = (newOrder: string[]) => {
  updateQuery({ displayColumns: newOrder })
}
```

## Visual Design

Column headers show:
- Sort indicator (↑/↓) when actively sorted
- Grab cursor on hover
- Semi-transparent ghost during drag

```
┌─────────────────────────────────────────────────┐
│ [✓] │ Product ▲  │ Region  │ Qty      │ Sales │
│      │ (grab)    │ (grab)  │ (grab)   │(grab) │
├─────────────────────────────────────────────────┤
│ [✓] │ Widget A   │ East    │ 150      │ $4,500 │
│ [ ]  │ Widget B   │ West    │ 200      │ $6,000 │
└─────────────────────────────────────────────────┘
```

## Data Flow

**Sorting:**
```
User clicks column → onSortChange(column, direction) →
query.sortBy updated → handleRunReport() →
New results displayed → Save template persists sortBy
```

**Reordering:**
```
User drags column → onColumnReorder(newOrder) →
query.displayColumns updated → Table re-renders →
Save template persists displayColumns
```

## Type Definitions

Add to `types/report.ts`:
```typescript
export interface ColumnSort {
  column: string | null
  direction: 'asc' | 'desc' | null
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `frontend/package.json` | Add @dnd-kit dependencies |
| `frontend/types/report.ts` | Add ColumnSort interface |
| `frontend/components/report/steps/Step6_Results.tsx` | Add sort/dnd logic, visual indicators |
| `frontend/app/report/page.tsx` | Add handlers, pass to Step6_Results |

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Sort on non-numeric column | Alphabetical sort |
| Sort on null/empty values | Treated as empty strings |
| Drag to same position | No change |
| Reorder while sorted | Sort preserved, columns reordered |
| Large result set | Server-side sort, existing performance |

## Notes

- Uses same `query.sortBy` mechanism as Step 5 (Sort & Limit)
- Single-column sort only from headers (Step 5 supports multi-level)
- Drag events are local, only sort triggers query re-run

# Sortable & Reorderable Columns Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add click-to-sort and drag-to-reorder functionality to the report results table, with both features persisting to saved reports.

**Architecture:**
- Use @dnd-kit for drag-and-drop column reordering
- Column sorting re-runs the query server-side (shares existing sortBy mechanism)
- Column order updates displayColumns in query state
- Both features persist through existing template save/load system

**Tech Stack:**
- @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- React hooks (useState, useCallback)
- Existing Tauri command: run_report

---

## Task 1: Install @dnd-kit Dependencies

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install dependencies**

Run: `cd frontend && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

Expected: Packages added to package.json and node_modules

**Step 2: Commit**

```bash
cd frontend
git add package.json package-lock.json
git commit -m "feat: add @dnd-kit dependencies for column drag-reorder"
```

---

## Task 2: Add ColumnSort Type Definition

**Files:**
- Modify: `frontend/types/report.ts`

**Step 1: Add ColumnSort interface**

At the end of `types/report.ts`, add:

```typescript
// UI State for column-level sort (used in results view)
export interface ColumnSort {
  column: string | null
  direction: 'asc' | 'desc' | null
}
```

**Step 2: Commit**

```bash
git add frontend/types/report.ts
git commit -m "feat: add ColumnSort type for results table sorting"
```

---

## Task 3: Update Step6_Results Props Interface

**Files:**
- Modify: `frontend/components/report/steps/Step6_Results.tsx`

**Step 1: Add new props to interface**

Update the `Step6ResultsProps` interface (around line 20-28) to:

```typescript
interface Step6ResultsProps {
  result: ReportResult | null
  isLoading: boolean
  error: string | null
  onExport: () => void
  onRefine: () => void
  onEdit: () => void
  columns: string[]
  // New props for sort and reorder
  onSortChange?: (column: string, direction: 'asc' | 'desc' | null) => void
  onColumnReorder?: (newColumnOrder: string[]) => void
  currentSort?: { column: string | null; direction: 'asc' | 'desc' | null }
}
```

**Step 2: Update component function signature**

Update the destructuring (around line 30-38) to:

```typescript
export function Step6_Results({
  result,
  isLoading,
  error,
  onExport,
  onRefine,
  onEdit,
  columns,
  onSortChange,
  onColumnReorder,
  currentSort
}: Step6ResultsProps) {
```

**Step 3: Commit**

```bash
git add frontend/components/report/steps/Step6_Results.tsx
git commit -m "feat: add sort and reorder props to Step6_Results"
```

---

## Task 4: Add Sort State and Handlers to Step6_Results

**Files:**
- Modify: `frontend/components/report/steps/Step6_Results.tsx`

**Step 1: Add imports for @dnd-kit and icons**

Add to imports at top (around line 10-18):

```typescript
import {
  DownloadIcon,
  RefreshCwIcon,
  Settings2Icon,
  LoaderIcon,
  FileWarningIcon,
  CheckCircle2Icon,
  ClockIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  GripVerticalIcon
} from "lucide-react"
```

**Step 2: Add @dnd-kit imports**

Add after the lucide-react imports:

```typescript
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
```

**Step 3: Create SortableColumnHeader component**

Add before the main `Step6_Results` function:

```typescript
interface SortableColumnHeaderProps {
  column: string
  currentSort: { column: string | null; direction: 'asc' | 'desc' | null }
  onSortChange?: (column: string, direction: 'asc' | 'desc' | null) => void
}

function SortableColumnHeader({ column, currentSort, onSortChange }: SortableColumnHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isSorted = currentSort.column === column
  const sortDirection = isSorted ? currentSort.direction : null

  const handleClick = () => {
    if (!onSortChange) return

    if (!isSorted) {
      // First click: sort ASC
      onSortChange(column, 'asc')
    } else if (sortDirection === 'asc') {
      // Second click: sort DESC
      onSortChange(column, 'desc')
    } else {
      // Third click: remove sort
      onSortChange(column, null)
    }
  }

  return (
    <th
      ref={setNodeRef}
      style={style}
      className="px-3 py-2 text-left font-medium cursor-pointer hover:bg-muted/50 transition-colors select-none"
    >
      <div
        className="flex items-center gap-1"
        onClick={handleClick}
      >
        <span className="flex-1">{column}</span>
        <div className="flex items-center gap-0.5">
          {isSorted && sortDirection === 'asc' && (
            <ChevronUpIcon className="h-3.5 w-3.5 text-primary" />
          )}
          {isSorted && sortDirection === 'desc' && (
            <ChevronDownIcon className="h-3.5 w-3.5 text-primary" />
          )}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVerticalIcon className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </th>
  )
}
```

**Step 4: Commit**

```bash
git add frontend/components/report/steps/Step6_Results.tsx
git commit -m "feat: add SortableColumnHeader component with sort and drag handlers"
```

---

## Task 5: Add DnD Sensors and Handler to Step6_Results

**Files:**
- Modify: `frontend/components/report/steps/Step6_Results.tsx`

**Step 1: Add sensors after the selectedRows state**

After `const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())` (around line 39), add:

```typescript
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id && onColumnReorder) {
      const oldIndex = columns.indexOf(active.id as string)
      const newIndex = columns.indexOf(over.id as string)
      const newColumns = arrayMove(columns, oldIndex, newIndex)
      onColumnReorder(newColumns)
    }
  }
```

**Step 5: Commit**

```bash
git add frontend/components/report/steps/Step6_Results.tsx
git commit -m "feat: add dnd sensors and drag end handler"
```

---

## Task 6: Update Table Header to Use Sortable Headers

**Files:**
- Modify: `frontend/components/report/steps/Step6_Results.tsx`

**Step 1: Wrap table header in DndContext and use SortableContext**

Replace the entire `<thead>` section (around line 162-180) with:

```typescript
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="w-10 p-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={someSelected ? (input) => {
                      if (input) input.indeterminate = true
                    } : undefined}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-border"
                  />
                </th>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={columns}
                    strategy={verticalListSortingStrategy}
                  >
                    {columns.map((col) => (
                      <SortableColumnHeader
                        key={col}
                        column={col}
                        currentSort={currentSort || { column: null, direction: null }}
                        onSortChange={onSortChange}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </tr>
            </thead>
```

**Step 2: Commit**

```bash
git add frontend/components/report/steps/Step6_Results.tsx
git commit -m "feat: integrate sortable column headers in results table"
```

---

## Task 7: Add Sort Handlers to report/page.tsx

**Files:**
- Modify: `frontend/app/report/page.tsx`

**Step 1: Add column sort state**

After the result columns state (around line 82), add:

```typescript
  // Column sort state (for results table inline sort)
  const [columnSort, setColumnSort] = useState<{ column: string | null; direction: 'asc' | 'desc' | null }>({
    column: null,
    direction: null
  })
```

**Step 2: Add handleColumnSort function**

Add after the `handleLimitChange` function (around line 262):

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

    // Re-run the report with new sort
    setIsLoading(true)
    setError(null)

    invoke<Record<string, unknown>[]>("run_report", {
      query: {
        datasetId: activeDatasetId,
        displayColumns: query.displayColumns,
        groupBy: query.groupBy,
        calculations: query.calculations.map((c) => ({
          function: c.function,
          column: c.column,
          alias: c.alias,
        })),
        filters: query.filters.map((f) => ({
          column: f.column,
          operator: f.operator,
          value: f.value,
        })),
        sortBy: direction ? [{ column, descending: direction === 'desc' }] : [],
        limit: query.limit,
      },
    })
      .then((rows) => {
        const startTime = performance.now()
        const cols = rows.length > 0 ? Object.keys(rows[0]) : []

        setResult({
          rows,
          queryTime: Math.round(performance.now() - startTime),
          rowCount: rows.length,
        })
        setResultColumns(cols)
        setCompletedSteps((prev) => new Set(prev).add("run"))
      })
      .catch((err) => {
        setError(String(err))
      })
      .finally(() => {
        setIsLoading(false)
      })
  }
```

**Step 3: Add handleColumnReorder function**

Add after `handleColumnSort`:

```typescript
  const handleColumnReorder = (newColumnOrder: string[]) => {
    updateQuery({ displayColumns: newColumnOrder })
  }
```

**Step 4: Pass handlers to Step6_Results**

Find the Step6_Results component usage (around line 768-781) and update props:

```typescript
            {currentStep === "run" && (
              <Step6_Results
                result={result}
                isLoading={isLoading}
                error={error}
                onExport={handleExport}
                onRefine={() => setCurrentStep("filters")}
                onEdit={() => {
                  setCurrentStep("columns")
                  setCompletedSteps(new Set())
                  setResult(null)
                }}
                columns={resultColumns}
                onSortChange={handleColumnSort}
                onColumnReorder={handleColumnReorder}
                currentSort={columnSort}
              />
            )}
```

**Step 5: Reset column sort when leaving results step**

Update the `handleEdit` function to also reset column sort:

```typescript
                onEdit={() => {
                  setCurrentStep("columns")
                  setCompletedSteps(new Set())
                  setResult(null)
                  setColumnSort({ column: null, direction: null })
                }}
```

**Step 6: Commit**

```bash
git add frontend/app/report/page.tsx
git commit -m "feat: add column sort and reorder handlers"
```

---

## Task 8: Update Query Preview to Show Inline Sort

**Files:**
- Modify: `frontend/lib/query-preview.ts` (if it exists)

**Step 1: Check if query preview needs updating**

The query preview should already pick up the `sortBy` from the query state, so no changes should be needed. Verify by checking `lib/query-preview.ts`.

If the file doesn't exist or doesn't handle sortBy, we may need to add it.

**Step 2: Commit (if changes made)**

```bash
git add frontend/lib/query-preview.ts
git commit -m "feat: update query preview to show inline sort"
```

---

## Task 9: Testing

**Step 1: Manual testing checklist**

1. Start the app: `cd frontend && npm run tauri dev`
2. Navigate to Report Builder
3. Run any report to get results
4. Test click-to-sort:
   - Click a column header → should show ↑ icon and re-sort ASC
   - Click again → should show ↓ icon and re-sort DESC
   - Click again → should remove sort and icons
5. Test drag-to-reorder:
   - Drag a column header to a new position
   - Column order should update immediately
   - Save the report as a template
   - Load the template → column order should be preserved
6. Test combined:
   - Sort by a column
   - Reorder columns
   - Save as template
   - Load template → both sort and column order preserved

**Step 2: Edge case testing**

1. Try sorting on text columns → should work alphabetically
2. Try sorting on numeric columns → should work numerically
3. Try sorting when results are empty → should be no-op
4. Try dragging to same position → should be no-op

**Step 3: Commit any bug fixes**

```bash
git commit -am "fix: address issues found during testing"
```

---

## Task 10: Final Polish

**Step 1: Verify linting passes**

Run: `cd frontend && npm run lint`

Fix any linting errors.

**Step 2: Build to verify no type errors**

Run: `cd frontend && npm run build`

Fix any build errors.

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete sortable and reorderable columns feature"
```

---

## Summary

This implementation adds:
1. Click column headers to sort ASC/DESC/remove (persists to saved reports)
2. Drag column headers to reorder (persists to saved reports)
3. Visual feedback: sort arrows, grab cursor, drag ghost effect
4. Uses @dnd-kit for accessible, performant drag-and-drop
5. Leverages existing `sortBy` and `displayColumns` query state

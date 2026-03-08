"use client"

import { useState, useRef, useEffect } from "react"
import { ReportResult } from "@/types/report"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DownloadIcon,
  RefreshCwIcon,
  Settings2Icon,
  LoaderIcon,
  FileWarningIcon,
  CheckCircle2Icon,
  ClockIcon,
  Save,
  ChevronUpIcon,
  ChevronDownIcon,
  BarChart3
} from "lucide-react"
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

interface Step6ResultsProps {
  result: ReportResult | null
  isLoading: boolean
  error: string | null
  onExport: () => void
  onRefine: () => void
  onEdit: () => void
  onSave: (name: string) => void
  columns: string[]
  onSortChange?: (column: string, direction: 'asc' | 'desc' | null) => void
  onColumnReorder?: (newColumnOrder: string[]) => void
  currentSort?: { column: string | null; direction: 'asc' | 'desc' | null }
  onAddChart?: () => void
  chartEnabled?: boolean
}

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
    cursor: 'grab',
  }

  const isSorted = currentSort.column === column
  const sortDirection = isSorted ? currentSort.direction : null

  const handleClick = () => {
    if (!onSortChange) return

    if (!isSorted) {
      onSortChange(column, 'asc')
    } else if (sortDirection === 'asc') {
      onSortChange(column, 'desc')
    } else {
      onSortChange(column, null)
    }
  }

  return (
    <th
      ref={setNodeRef}
      style={style}
      className="px-3 py-2 text-left font-medium hover:bg-muted/50 transition-colors select-none min-w-[120px] whitespace-nowrap"
      {...attributes}
      {...listeners}
    >
      <div
        className="flex items-center gap-1"
        onClick={(e) => {
          e.stopPropagation()
          handleClick()
        }}
      >
        <span className="flex-1">{column}</span>
        {isSorted && sortDirection === 'asc' && (
          <ChevronUpIcon className="h-3.5 w-3.5 text-primary" />
        )}
        {isSorted && sortDirection === 'desc' && (
          <ChevronDownIcon className="h-3.5 w-3.5 text-primary" />
        )}
      </div>
    </th>
  )
}

export function Step6_Results({
  result,
  isLoading,
  error,
  onExport,
  onRefine,
  onEdit,
  onSave,
  columns,
  onSortChange,
  onColumnReorder,
  currentSort,
  onAddChart,
  chartEnabled = false,
}: Step6ResultsProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [reportName, setReportName] = useState("")
  const reportNameInputRef = useRef<HTMLInputElement>(null)

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

  // Focus the input when dialog opens
  useEffect(() => {
    if (showSaveDialog) {
      reportNameInputRef.current?.focus()
    }
  }, [showSaveDialog])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] gap-4">
        <LoaderIcon className="h-12 w-12 text-primary animate-spin" />
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-1">Running your report...</h3>
          <p className="text-sm text-muted-foreground">
            This may take a moment for large datasets
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] gap-4">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <FileWarningIcon className="h-8 w-8 text-destructive" />
        </div>
        <div className="text-center max-w-md">
          <h3 className="text-lg font-semibold mb-1">Report error</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {error}
          </p>
          <Button onClick={onRefine} variant="outline">
            <Settings2Icon className="h-4 w-4 mr-2" />
            Adjust report settings
          </Button>
        </div>
      </div>
    )
  }

  // No results state
  if (!result || result.rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] gap-4">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <CheckCircle2Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center max-w-md">
          <h3 className="text-lg font-semibold mb-1">No results found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Your query returned no matching data. Try adjusting your filters or selections.
          </p>
          <div className="flex gap-2">
            <Button onClick={onRefine} variant="outline">
              <Settings2Icon className="h-4 w-4 mr-2" />
              Adjust filters
            </Button>
            <Button onClick={onEdit} variant="outline">
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Edit report
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Success with results
  const toggleRow = (index: number) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedRows(newSelected)
  }

  const toggleAll = () => {
    if (selectedRows.size === result.rows.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(result.rows.map((_, i) => i)))
    }
  }

  const allSelected = selectedRows.size === result.rows.length
  const someSelected = selectedRows.size > 0 && !allSelected

  const handleSaveReport = () => {
    if (reportName.trim()) {
      onSave(reportName.trim())
      setReportName("")
      setShowSaveDialog(false)
    }
  }

  const openSaveDialog = () => {
    setShowSaveDialog(true)
  }

  const formatValue = (value: unknown, columnName?: string): string => {
    if (value === null || value === undefined) return ""

    // Check if this is a date column (by name pattern) - MUST be specific to avoid converting product codes
    const colNameLower = columnName?.toLowerCase() || ""
    const isDateColumn = colNameLower === "data" ||
      colNameLower.includes("date") ||
      colNameLower.includes("time") ||
      colNameLower.includes("fecha") ||
      colNameLower === "datums"  // German

    // Only convert to date if it's actually a date column
    if (typeof value === "number") {
      const numValue = Number(value)
      const dateStr = value.toString()

      // First check: YYYYMMDD format (8 digits, valid range)
      if (dateStr.length === 8 && numValue >= 19000101 && numValue <= 21000101) {
        // Only convert if it's a date column
        if (isDateColumn) {
          const year = dateStr.substring(0, 4)
          const month = dateStr.substring(4, 6)
          const day = dateStr.substring(6, 8)
          return `${year}-${month}-${day}`
        }
      }

      // Excel serial date conversion - ONLY for date columns
      // Excel serial dates are typically 30000-60000 for years 1982-2078
      if (isDateColumn && numValue >= 30000 && numValue < 70000) {
        const excelSerial = Math.floor(numValue)
        const daysSince1900 = excelSerial - 2  // Correct for Excel leap year bug

        // Calculate the date from days since 1900-01-01
        let remainingDays = daysSince1900
        let year = 1900
        const daysIn4Years = 365 * 4 + 1  // Including one leap year

        const years4 = Math.floor(remainingDays / daysIn4Years)
        remainingDays -= years4 * daysIn4Years
        year += years4 * 4

        // Add remaining years
        while (remainingDays >= 366) {
          const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
          const daysInThisYear = isLeapYear ? 366 : 365
          if (remainingDays < daysInThisYear) break
          remainingDays -= daysInThisYear
          year++
        }

        const dayOfYear = remainingDays
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
        const daysInMonths = isLeapYear
          ? [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
          : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

        let month = 0
        let dayOfMonth = dayOfYear
        for (let i = 0; i < daysInMonths.length; i++) {
          if (dayOfMonth < daysInMonths[i]) {
            month = i
            break
          }
          dayOfMonth -= daysInMonths[i]
        }

        const monthStr = String(month + 1).padStart(2, '0')
        const dayStr = String(dayOfMonth + 1).padStart(2, '0')
        return `${year}-${monthStr}-${dayStr}`
      }

      // Regular numbers (product codes, quantities) - return as plain string
      return value.toString()
    }

    // Handle string values
    if (typeof value === "string") {
      // Check if it's YYYYMMDD format (only for date columns)
      if (isDateColumn) {
        const num = parseInt(value, 10)
        if (!isNaN(num) && num >= 19000101 && num <= 21000101 && value.length === 8) {
          const year = value.substring(0, 4)
          const month = value.substring(4, 6)
          const day = value.substring(6, 8)
          return `${year}-${month}-${day}`
        }
      }
    }

    return String(value)
  }

  const resultsContent = (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2Icon className="h-5 w-5 text-green-600" />
            Report results
          </h3>
          <p className="text-sm text-muted-foreground">
            {result.rowCount} row{result.rowCount !== 1 ? "s" : ""} returned
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1.5">
            <ClockIcon className="h-3 w-3" />
            {result.queryTime}ms
          </Badge>
          {onAddChart && (
            <Button onClick={onAddChart} size="sm" variant={chartEnabled ? "default" : "outline"} className="gap-2">
              <BarChart3 className="h-4 w-4" />
              {chartEnabled ? "Chart added" : "Add chart"}
            </Button>
          )}
          <Button onClick={onExport} size="sm" className="gap-2">
            <DownloadIcon className="h-4 w-4" />
            Export to Excel
          </Button>
        </div>
      </div>

      <Separator />

      {/* Results table */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={columns}
          strategy={verticalListSortingStrategy}
        >
          <ScrollArea className="h-[500px] rounded-md border">
            <div className="min-w-full">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="w-10 p-3 min-w-[40px]">
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
                    {columns.map((col) => (
                      <SortableColumnHeader
                        key={col}
                        column={col}
                        currentSort={currentSort || { column: null, direction: null }}
                        onSortChange={onSortChange}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className={`
                        border-t transition-colors
                        ${selectedRows.has(rowIndex) ? "bg-primary/5" : "hover:bg-muted/30"}
                      `}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(rowIndex)}
                          onChange={() => toggleRow(rowIndex)}
                          className="h-4 w-4 rounded border-border"
                        />
                      </td>
                      {columns.map((col) => (
                        <td key={col} className="px-3 py-2 min-w-[120px] whitespace-nowrap">
                          {formatValue(row[col], col)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </SortableContext>
      </DndContext>

      {/* Selection notice */}
      {selectedRows.size > 0 && (
        <Alert>
          <AlertDescription className="text-xs">
            {selectedRows.size} row{selectedRows.size !== 1 ? "s" : ""} selected for export
          </AlertDescription>
        </Alert>
      )}

      <Separator />

      {/* Action buttons */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {result.rowCount} row{result.rowCount !== 1 ? "s" : ""} in {result.queryTime}ms
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button onClick={onRefine} variant="outline" size="sm">
              <Settings2Icon className="h-4 w-4 mr-2" />
              Refine
            </Button>
            <Button onClick={onEdit} variant="outline" size="sm">
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
          <div className="w-px h-6 bg-border" />
          <Button onClick={openSaveDialog} variant="outline" size="sm" className="gap-2">
            <Save className="h-4 w-4" />
            Save report
          </Button>
        </div>
      </div>
    </div>
  )

  // Save Report Dialog
  return (
    <>
      {resultsContent}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Report</DialogTitle>
            <DialogDescription>
              Give this report a name to save it for later use.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              ref={reportNameInputRef}
              placeholder="Enter report name…"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveReport()}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveReport} disabled={!reportName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

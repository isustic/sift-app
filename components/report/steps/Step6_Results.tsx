"use client"

import { useState } from "react"
import { ReportResult } from "@/types/report"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  DownloadIcon,
  RefreshCwIcon,
  Settings2Icon,
  LoaderIcon,
  FileWarningIcon,
  CheckCircle2Icon,
  ClockIcon
} from "lucide-react"

interface Step6ResultsProps {
  result: ReportResult | null
  isLoading: boolean
  error: string | null
  onExport: () => void
  onRefine: () => void
  onEdit: () => void
  columns: string[]
}

export function Step6_Results({
  result,
  isLoading,
  error,
  onExport,
  onRefine,
  onEdit,
  columns
}: Step6ResultsProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())

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
          <h3 className="text-lg font-semibold mb-1">Report Error</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {error}
          </p>
          <Button onClick={onRefine} variant="outline">
            <Settings2Icon className="h-4 w-4 mr-2" />
            Adjust Report Settings
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
              Adjust Filters
            </Button>
            <Button onClick={onEdit} variant="outline">
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Edit Report
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

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return ""
    if (typeof value === "number") {
      // Format numbers with thousand separators
      return value.toLocaleString()
    }
    return String(value)
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2Icon className="h-5 w-5 text-green-600" />
            Report Results
          </h3>
          <p className="text-sm text-muted-foreground">
            {result.rowCount} row{result.rowCount !== 1 ? "s" : ""} returned
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <ClockIcon className="h-3 w-3" />
            {result.queryTime}ms
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Results table */}
      <ScrollArea className="h-[380px] rounded-md border">
        <div className="w-full">
          <table className="w-full text-sm">
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
                {columns.map((col) => (
                  <th key={col} className="px-3 py-2 text-left font-medium">
                    {col}
                  </th>
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
                    <td key={col} className="px-3 py-2">
                      {formatValue(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollArea>

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
        <div className="flex items-center gap-2">
          <Button onClick={onRefine} variant="outline" size="sm">
            <Settings2Icon className="h-4 w-4 mr-2" />
            Refine
          </Button>
          <Button onClick={onEdit} variant="outline" size="sm">
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button onClick={onExport} size="sm">
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export {selectedRows.size > 0 ? `(${selectedRows.size})` : "All"}
          </Button>
        </div>
      </div>
    </div>
  )
}

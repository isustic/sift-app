"use client"

import { ColumnMeta } from "@/types/report"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { CheckIcon, SquareIcon } from "lucide-react"

interface Step1ColumnsProps {
  columns: ColumnMeta[]
  selectedColumns: string[]
  onColumnToggle: (column: string) => void
  onSelectAll: () => void
  onSelectNone: () => void
}

export function Step1_Columns({
  columns,
  selectedColumns,
  onColumnToggle,
  onSelectAll,
  onSelectNone
}: Step1ColumnsProps) {
  const allSelected = columns.length > 0 && selectedColumns.length === columns.length
  const someSelected = selectedColumns.length > 0 && !allSelected

  const getTypeColor = (type: string) => {
    const t = type.toUpperCase()
    if (t === "INTEGER") return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
    if (t === "REAL") return "bg-green-500/10 text-green-700 dark:text-green-400"
    return "bg-purple-500/10 text-purple-700 dark:text-purple-400"
  }

  const getTypeLabel = (type: string) => {
    return type.toUpperCase()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Select Columns</h3>
          <p className="text-sm text-muted-foreground">
            Choose which columns to include in your report
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {selectedColumns.length} of {columns.length} selected
        </Badge>
      </div>

      <Separator />

      {/* Bulk Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSelectAll}
          disabled={allSelected}
        >
          <CheckIcon className="h-4 w-4 mr-1" />
          Select All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onSelectNone}
          disabled={selectedColumns.length === 0}
        >
          <SquareIcon className="h-4 w-4 mr-1" />
          Select None
        </Button>
      </div>

      {/* Column List */}
      <ScrollArea className="h-[400px] rounded-md border">
        <div className="p-2 space-y-1">
          {columns.length === 0 ? (
            <div className="flex items-center justify-center h-[360px] text-muted-foreground">
              No columns available
            </div>
          ) : (
            columns.map((column) => {
              const isSelected = selectedColumns.includes(column.name)
              return (
                <div
                  key={column.id}
                  className={`
                    flex items-center gap-3 rounded-md px-3 py-2.5
                    transition-colors cursor-pointer
                    ${isSelected
                      ? "bg-primary/5 hover:bg-primary/10"
                      : "hover:bg-accent/50"
                    }
                  `}
                  onClick={() => onColumnToggle(column.name)}
                >
                  <Checkbox
                    checked={isSelected}
                    onChange={() => onColumnToggle(column.name)}
                  />
                  <span className="flex-1 font-medium text-sm">
                    {column.name}
                  </span>
                  <Badge variant="outline" className={getTypeColor(column.col_type)}>
                    {getTypeLabel(column.col_type)}
                  </Badge>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* Footer hint */}
      <div className="text-xs text-muted-foreground">
        {selectedColumns.length === 0
          ? "Select at least one column to continue"
          : selectedColumns.length === 1
          ? "1 column selected"
          : `${selectedColumns.length} columns selected`}
      </div>
    </div>
  )
}

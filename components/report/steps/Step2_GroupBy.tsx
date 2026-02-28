"use client"

import { useState } from "react"
import { ColumnMeta } from "@/types/report"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { XIcon, PlusIcon, DivideIcon } from "lucide-react"

interface Step2GroupByProps {
  columns: ColumnMeta[]
  selectedColumns: string[]
  groupBy: string[]
  onAddGroupColumn: (column: string) => void
  onRemoveGroupColumn: (column: string) => void
}

export function Step2_GroupBy({
  columns,
  selectedColumns,
  groupBy,
  onAddGroupColumn,
  onRemoveGroupColumn
}: Step2GroupByProps) {
  const [selectedColumn, setSelectedColumn] = useState<string>("")

  // Filter out columns already used for grouping
  const availableColumns = columns.filter(
    col => !groupBy.includes(col.name) && selectedColumns.includes(col.name)
  )

  const handleAddColumn = () => {
    if (selectedColumn && !groupBy.includes(selectedColumn)) {
      onAddGroupColumn(selectedColumn)
      setSelectedColumn("")
    }
  }

  const hasGroups = groupBy.length > 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Group Data</h3>
          <p className="text-sm text-muted-foreground">
            Add at least one column to group your data
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {hasGroups ? `${groupBy.length} group${groupBy.length > 1 ? "s" : ""}` : "No grouping"}
        </Badge>
      </div>

      <Separator />

      {/* Add Group Column */}
      <div className="space-y-3">
        <label className="text-sm font-medium">
          {hasGroups ? "Add another grouping level" : "Select a column to group by"}
        </label>

        <div className="flex items-center gap-2">
          <Select
            value={selectedColumn}
            onValueChange={setSelectedColumn}
            disabled={availableColumns.length === 0}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={
                availableColumns.length === 0
                  ? "No more columns available"
                  : "Choose a column"
              } />
            </SelectTrigger>
            <SelectContent>
              {availableColumns.map((col) => (
                <SelectItem key={col.id} value={col.name}>
                  {col.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleAddColumn}
            disabled={!selectedColumn}
            variant="outline"
            className="gap-1"
          >
            <PlusIcon className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {/* Selected Groups */}
      {hasGroups && (
        <>
          <Separator />
          <div className="space-y-3">
            <label className="text-sm font-medium">
              Grouping hierarchy ({groupBy.length})
            </label>

            <div className="flex flex-wrap gap-2">
              {groupBy.map((column, index) => (
                <Badge
                  key={column}
                  variant="secondary"
                  className="pl-3 pr-2 py-1.5 gap-2 text-sm"
                >
                  <span className="flex items-center gap-1.5">
                    {index > 0 && <span className="text-muted-foreground text-xs">then</span>}
                    <span>{index + 1}.</span>
                    <span className="font-medium">{column}</span>
                  </span>
                  <button
                    onClick={() => onRemoveGroupColumn(column)}
                    className="rounded-sm hover:bg-destructive/20 hover:text-destructive transition-colors"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              {groupBy.length === 1
                ? "Data will be aggregated by this column"
                : `Data will be grouped first by ${groupBy[0]}, then by ${groupBy.slice(1).join(", ")}`}
            </p>
          </div>
        </>
      )}

      {!hasGroups && (
        <div className="rounded-md border border-dashed border-border/50 p-6 text-center">
          <DivideIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mb-1">
            Add a grouping column above to continue
          </p>
          <p className="text-xs text-muted-foreground">
            At least one grouping column is required to proceed
          </p>
        </div>
      )}

      {/* Footer hint */}
      {selectedColumns.length === 0 && (
        <div className="text-xs text-muted-foreground">
          Select columns in the previous step first
        </div>
      )}
    </div>
  )
}

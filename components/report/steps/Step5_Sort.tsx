"use client"

import { useState } from "react"
import { SortColumn, ColumnMeta } from "@/types/report"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { PlusIcon, Trash2Icon, ArrowUpIcon, ArrowDownIcon, ArrowUpDownIcon } from "lucide-react"

interface Step5SortProps {
  columns: ColumnMeta[]
  displayColumns: string[]
  groupBy: string[]
  calculations: Array<{ function: string; column: string; alias: string }>
  sortBy: SortColumn[]
  onAddSort: (sort: SortColumn) => void
  onRemoveSort: (index: number) => void
  onToggleDirection: (index: number) => void
  limit: number | null
  onLimitChange: (limit: number | null) => void
}

export function Step5_Sort({
  columns,
  displayColumns,
  groupBy,
  calculations,
  sortBy,
  onAddSort,
  onRemoveSort,
  onToggleDirection,
  limit,
  onLimitChange
}: Step5SortProps) {
  const [selectedColumn, setSelectedColumn] = useState<string>("")
  const [descending, setDescending] = useState<boolean>(false)

  // Determine available columns based on state
  const getAvailableColumns = () => {
    // When grouped, available for sort: group columns + calculation aliases
    if (groupBy.length > 0) {
      const groupCols = columns.filter(c => groupBy.includes(c.name))
      return [
        ...groupCols.map(c => ({ name: c.name, type: "column" })),
        ...calculations.map(c => ({ name: c.alias, type: "calculation" }))
      ]
    }
    // When not grouped, any displayed column
    return columns
      .filter(c => displayColumns.includes(c.name))
      .map(c => ({ name: c.name, type: "column" }))
  }

  const availableColumns = getAvailableColumns()

  // Filter out columns already sorted
  const sortedColumnNames = sortBy.map(s => s.column)
  const availableForSelect = availableColumns.filter(c => !sortedColumnNames.includes(c.name))

  const handleAddSort = () => {
    if (!selectedColumn) return

    const sort: SortColumn = {
      column: selectedColumn,
      descending
    }

    onAddSort(sort)

    // Reset form
    setSelectedColumn("")
    setDescending(false)
  }

  const canAdd = selectedColumn

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Sort & Limit</h3>
          <p className="text-sm text-muted-foreground">
            Control the order and number of results
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {sortBy.length} level{sortBy.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <Separator />

      {/* Add Sort Level */}
      <div className="space-y-3">
        <label className="text-sm font-medium">
          {sortBy.length === 0 ? "Add your first sort level" : "Add another sort level"}
        </label>

        <div className="grid grid-cols-[1fr,100px,auto] gap-2 items-end">
          {/* Column Selector */}
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">Column</span>
            <Select
              value={selectedColumn}
              onValueChange={setSelectedColumn}
              disabled={availableForSelect.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  availableForSelect.length === 0
                    ? "No more columns"
                    : "Choose column"
                } />
              </SelectTrigger>
              <SelectContent>
                {availableForSelect.map((col) => (
                  <SelectItem key={col.name} value={col.name}>
                    <div className="flex items-center gap-2">
                      <span>{col.name}</span>
                      {col.type === "calculation" && (
                        <Badge variant="outline" className="text-xs">
                          Calculation
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Direction Selector */}
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">Order</span>
            <Select
              value={descending ? "desc" : "asc"}
              onValueChange={(v) => setDescending(v === "desc")}
              disabled={!selectedColumn}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">
                  <div className="flex items-center gap-2">
                    <ArrowUpIcon className="h-3.5 w-3.5" />
                    Ascending
                  </div>
                </SelectItem>
                <SelectItem value="desc">
                  <div className="flex items-center gap-2">
                    <ArrowDownIcon className="h-3.5 w-3.5" />
                    Descending
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Add Button */}
          <Button
            onClick={handleAddSort}
            disabled={!canAdd}
            variant="outline"
            className="gap-1"
          >
            <PlusIcon className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {/* Sort Levels List */}
      {sortBy.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <label className="text-sm font-medium">
              Sort hierarchy ({sortBy.length})
            </label>

            <div className="space-y-2">
              {sortBy.map((sort, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-md border bg-card p-3"
                >
                  <Badge variant="secondary" className="w-6 h-6 flex items-center justify-center p-0">
                    {index + 1}
                  </Badge>
                  <span className="font-medium text-sm flex-1">
                    {sort.column}
                  </span>
                  <Button
                    onClick={() => onToggleDirection(index)}
                    size="sm"
                    variant="ghost"
                    className="gap-1.5"
                  >
                    {sort.descending ? (
                      <>
                        <ArrowDownIcon className="h-3.5 w-3.5" />
                        Desc
                      </>
                    ) : (
                      <>
                        <ArrowUpIcon className="h-3.5 w-3.5" />
                        Asc
                      </>
                    )}
                  </Button>
                  {index < sortBy.length - 1 && (
                    <span className="text-xs text-muted-foreground">then</span>
                  )}
                  <div className="flex-1" />
                  <Button
                    onClick={() => onRemoveSort(index)}
                    size="icon-xs"
                    variant="ghost"
                  >
                    <Trash2Icon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* No sorting state */}
      {sortBy.length === 0 && (
        <div className="rounded-md border border-dashed border-border/50 p-6 text-center">
          <ArrowUpDownIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mb-1">
            No sorting applied
          </p>
          <p className="text-xs text-muted-foreground">
            Results will be in natural order
          </p>
        </div>
      )}

      <Separator />

      {/* Row Limit */}
      <div className="space-y-3">
        <label className="text-sm font-medium">
          Limit results
        </label>

        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-[200px]">
            <Input
              type="number"
              min="1"
              value={limit ?? ""}
              onChange={(e) => {
                const val = e.target.value
                onLimitChange(val === "" ? null : Math.max(1, parseInt(val) || 1))
              }}
              placeholder="No limit"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            rows maximum
          </span>
          {limit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onLimitChange(null)}
            >
              Clear
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {limit
            ? `Report will show up to ${limit.toLocaleString()} rows`
            : "All matching rows will be returned"}
        </p>
      </div>
    </div>
  )
}

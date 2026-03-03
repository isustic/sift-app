"use client"

import { useState } from "react"
import { Filter, ColumnMeta } from "@/types/report"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { PlusIcon, Trash2Icon, FilterIcon } from "lucide-react"
import { getColumnType, getOperatorsForType } from "@/lib/query-preview"

interface Step4FiltersProps {
  columns: ColumnMeta[]
  filters: Filter[]
  onAddFilter: (filter: Filter) => void
  onRemoveFilter: (index: number) => void
}

export function Step4_Filters({
  columns,
  filters,
  onAddFilter,
  onRemoveFilter
}: Step4FiltersProps) {
  const [selectedColumn, setSelectedColumn] = useState<string>("")
  const [operator, setOperator] = useState<string>("")
  const [value, setValue] = useState<string>("")

  // Get column type for operator options
  const columnType = selectedColumn ? getColumnType(selectedColumn, columns) : "text"
  const operatorOptions = getOperatorsForType(columnType)

  // Reset operator when column changes (to ensure valid operator for type)
  const handleColumnChange = (col: string) => {
    setSelectedColumn(col)
    setOperator("")
    setValue("")
  }

  const handleAddFilter = () => {
    if (!selectedColumn || !operator || !value.trim()) return

    const filter: Filter = {
      column: selectedColumn,
      operator,
      value: value.trim()
    }

    onAddFilter(filter)

    // Reset form
    setSelectedColumn("")
    setOperator("")
    setValue("")
  }

  const canAdd = selectedColumn && operator && value.trim()

  const getOperatorLabel = (op: string) => {
    return operatorOptions.find(o => o.value === op)?.label || op
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Filter data</h3>
          <p className="text-sm text-muted-foreground">
            Add at least one filter to narrow your results
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {filters.length} filter{filters.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <Separator />

      {/* Add Filter Form */}
      <div className="space-y-3">
        <label className="text-sm font-medium">
          {filters.length === 0 ? "Add your first filter" : "Add another filter"}
        </label>

        <div className="flex flex-col gap-3">
          {/* Column Selector */}
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">Column</span>
            <Select value={selectedColumn} onValueChange={handleColumnChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col.id} value={col.name}>
                    <div className="flex items-center gap-2">
                      <span>{col.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {col.col_type}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Operator Selector */}
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">Operator</span>
            <Select
              value={operator}
              onValueChange={setOperator}
              disabled={!selectedColumn}
            >
              <SelectTrigger>
                <SelectValue placeholder="is" />
              </SelectTrigger>
              <SelectContent>
                {operatorOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Value Input */}
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">Value</span>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter value..."
              disabled={!selectedColumn || !operator}
              onKeyDown={(e) => e.key === "Enter" && canAdd && handleAddFilter()}
            />
          </div>

          {/* Add Button */}
          <Button
            onClick={handleAddFilter}
            disabled={!canAdd}
            variant="outline"
            className="h-9 gap-1.5 bg-primary/10 border-primary/30 text-primary font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm transition-all w-fit"
          >
            <PlusIcon className="h-4 w-4" />
            Add filter
          </Button>
        </div>
      </div>

      {/* Filters List */}
      {filters.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Applied filters ({filters.length})
              </label>
              <span className="text-xs text-muted-foreground">
                All conditions must be met (AND)
              </span>
            </div>

            <ScrollArea className="h-[280px] rounded-md border">
              <div className="p-2 space-y-2">
                {filters.map((filter, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-md border bg-card p-3"
                  >
                    <span className="font-medium text-sm">{filter.column}</span>
                    <Badge variant="secondary" className="text-xs">
                      {getOperatorLabel(filter.operator)}
                    </Badge>
                    <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">
                      &quot;{filter.value}&quot;
                    </span>
                    <div className="flex-1" />
                    <Button
                      onClick={() => onRemoveFilter(index)}
                      size="icon-xs"
                      variant="ghost"
                    >
                      <Trash2Icon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </>
      )}

      {/* No filters state */}
      {filters.length === 0 && (
        <div className="rounded-md border border-dashed border-border/50 p-6 text-center">
          <FilterIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mb-1">
            Add a filter above to continue
          </p>
          <p className="text-xs text-muted-foreground">
            At least one filter is required to proceed
          </p>
        </div>
      )}

      {/* Footer hint */}
      {filters.length > 1 && (
        <div className="text-xs text-muted-foreground">
          Filters are combined with AND logic - all conditions must be met
        </div>
      )}
    </div>
  )
}

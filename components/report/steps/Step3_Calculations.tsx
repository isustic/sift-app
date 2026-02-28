"use client"

import { useState, useEffect } from "react"
import { Calculation, ColumnMeta } from "@/types/report"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { PlusIcon, Trash2Icon, SigmaIcon } from "lucide-react"
import { getAggregationOptions } from "@/lib/query-preview"

interface Step3CalculationsProps {
  columns: ColumnMeta[]
  calculations: Calculation[]
  onAddCalculation: (calc: Calculation) => void
  onRemoveCalculation: (index: number) => void
  hasGrouping: boolean
}

export function Step3_Calculations({
  columns,
  calculations,
  onAddCalculation,
  onRemoveCalculation,
  hasGrouping
}: Step3CalculationsProps) {
  const [functionType, setFunctionType] = useState<string>("sum")
  const [selectedColumn, setSelectedColumn] = useState<string>("")
  const [alias, setAlias] = useState<string>("")

  // Only numeric columns for calculations
  const numericColumns = columns.filter(col => {
    const type = col.col_type.toUpperCase()
    return type === "INTEGER" || type === "REAL"
  })

  const aggregationOptions = getAggregationOptions()

  // Generate default alias when function or column changes
  useEffect(() => {
    if (functionType && selectedColumn) {
      const fnLabel = aggregationOptions.find(o => o.value === functionType)?.label.split(" ")[0] || functionType
      setAlias(`${fnLabel}_${selectedColumn}`)
    }
  }, [functionType, selectedColumn, aggregationOptions])

  const handleAddCalculation = () => {
    if (!selectedColumn || !functionType) return

    const calc: Calculation = {
      function: functionType as Calculation["function"],
      column: selectedColumn,
      alias: alias.trim() || `${functionType}_${selectedColumn}`
    }

    onAddCalculation(calc)

    // Reset form
    setFunctionType("sum")
    setSelectedColumn("")
    setAlias("")
  }

  const canAdd = selectedColumn && functionType && alias.trim()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Add Calculations</h3>
          <p className="text-sm text-muted-foreground">
            {hasGrouping
              ? "Add at least one calculation to aggregate your data"
              : "Calculations are available when using grouping"}
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {calculations.length} calculation{calculations.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <Separator />

      {!hasGrouping ? (
        <div className="rounded-md border border-dashed border-border/50 p-6 text-center">
          <SigmaIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mb-1">
            Grouping required for calculations
          </p>
          <p className="text-xs text-muted-foreground">
            Add grouping in the previous step to enable aggregations
          </p>
        </div>
      ) : (
        <>
          {/* Add Calculation Form */}
          <div className="space-y-3">
            <label className="text-sm font-medium">
              {calculations.length === 0 ? "Add your first calculation" : "Add another calculation"}
            </label>

            <div className="grid grid-cols-[180px,1fr,200px,auto] gap-2 items-end">
              {/* Function Selector */}
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Function</span>
                <Select value={functionType} onValueChange={setFunctionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {aggregationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Column Selector */}
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Column</span>
                <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {numericColumns.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No numeric columns available
                      </div>
                    ) : (
                      numericColumns.map((col) => (
                        <SelectItem key={col.id} value={col.name}>
                          {col.name}
                          <span className="text-muted-foreground text-xs ml-2">
                            ({col.col_type.toLowerCase()})
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Alias Input */}
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Display name</span>
                <Input
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="Calculation name"
                  onKeyDown={(e) => e.key === "Enter" && canAdd && handleAddCalculation()}
                />
              </div>

              {/* Add Button */}
              <Button
                onClick={handleAddCalculation}
                disabled={!canAdd}
                variant="outline"
                className="gap-1"
              >
                <PlusIcon className="h-4 w-4" />
                Add
              </Button>
            </div>
          </div>

          {/* Calculations List */}
          {calculations.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  Calculations ({calculations.length})
                </label>

                <ScrollArea className="h-[240px] rounded-md border">
                  <div className="p-2 space-y-2">
                    {calculations.map((calc, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 rounded-md border bg-card p-3"
                      >
                        <Badge variant="secondary" className="font-mono text-xs">
                          {calc.function.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">of</span>
                        <span className="font-medium text-sm">{calc.column}</span>
                        <span className="text-muted-foreground">as</span>
                        <span className="font-medium text-sm">{calc.alias}</span>
                        <div className="flex-1" />
                        <Button
                          onClick={() => onRemoveCalculation(index)}
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

          {/* No numeric columns warning */}
          {numericColumns.length === 0 && (
            <div className="rounded-md border border-dashed border-border/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                No numeric columns available for calculations
              </p>
            </div>
          )}

          {/* No calculations warning when grouping is active */}
          {numericColumns.length > 0 && calculations.length === 0 && (
            <div className="rounded-md border border-dashed border-border/50 p-4 text-center">
              <SigmaIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Add a calculation above to continue
              </p>
              <p className="text-xs text-muted-foreground">
                At least one calculation is required when using grouping
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

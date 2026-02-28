import { Layers, Calculator, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { ColumnMeta } from "@/types/report";

export interface FilterConfig {
  column: string;
  operator: string;
  value: string;
}

export interface MetricConfig {
  column: string;
  function: string;
  alias: string;
}

interface SummaryConfigProps {
  columns: ColumnMeta[];
  dimensions: string[];
  onDimensionsChange: (dims: string[]) => void;
  metrics: MetricConfig[];
  onMetricsChange: (metrics: MetricConfig[]) => void;
  filters: FilterConfig[];
  onFiltersChange: (filters: FilterConfig[]) => void;
}

const OPERATORS = [
  { value: "=", label: "Equal" },
  { value: "!=", label: "Not Equal" },
  { value: ">", label: "Greater Than" },
  { value: "<", label: "Less Than" },
  { value: ">=", label: "Greater or Equal" },
  { value: "<=", label: "Less or Equal" },
  { value: "LIKE", label: "Contains" },
];

const AGG_FUNCTIONS = [
  { value: "SUM", label: "Sum" },
  { value: "COUNT", label: "Count" },
  { value: "AVG", label: "Average" },
  { value: "MIN", label: "Min" },
  { value: "MAX", label: "Max" },
];

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export function SummaryConfig({
  columns,
  dimensions,
  onDimensionsChange,
  metrics,
  onMetricsChange,
  filters,
  onFiltersChange,
}: SummaryConfigProps) {
  const numericColumns = columns.filter((c) => c.col_type === "REAL" || c.col_type === "INTEGER");

  const addDimension = () => {
    const available = columns.find((c) => !dimensions.includes(c.name));
    if (available) onDimensionsChange([...dimensions, available.name]);
  };

  const updateDimension = (index: number, value: string) => {
    const newDims = [...dimensions];
    newDims[index] = value;
    onDimensionsChange(newDims);
  };

  const removeDimension = (index: number) => {
    onDimensionsChange(dimensions.filter((_, i) => i !== index));
  };

  const addMetric = () => {
    const col = numericColumns[0]?.name || columns[0]?.name || "";
    onMetricsChange([...metrics, { column: col, function: "SUM", alias: `${col}_sum` }]);
  };

  const updateMetric = (index: number, updates: Partial<MetricConfig>) => {
    const newMetrics = [...metrics];
    newMetrics[index] = { ...newMetrics[index], ...updates };
    onMetricsChange(newMetrics);
  };

  const removeMetric = (index: number) => {
    onMetricsChange(metrics.filter((_, i) => i !== index));
  };

  const addFilter = () => {
    onFiltersChange([...filters, { column: columns[0]?.name ?? "", operator: "=", value: "" }]);
  };

  const updateFilter = (index: number, updates: Partial<FilterConfig>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    onFiltersChange(newFilters);
  };

  const removeFilter = (index: number) => {
    onFiltersChange(filters.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Dimensions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            <Layers className="w-3 h-3" />
            Group By (Dimensions)
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs text-primary hover:bg-primary/10"
            onClick={addDimension}
            disabled={columns.length === dimensions.length}
          >
            <Plus size={12} className="mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-1.5">
          {dimensions.length === 0 ? (
            <p className="text-xs text-muted-foreground/50 py-2 italic">No grouping</p>
          ) : (
            dimensions.map((d, i) => (
              <div key={i} className="flex gap-1.5 items-center">
                <Select
                  value={d || "__none__"}
                  onValueChange={(v) => updateDimension(i, v === "__none__" ? "" : v)}
                >
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-6 h-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeDimension(i)}
                >
                  <X size={12} />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            <Calculator className="w-3 h-3" />
            Metrics (Aggregations)
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs text-primary hover:bg-primary/10"
            onClick={addMetric}
          >
            <Plus size={12} className="mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-2">
          {metrics.length === 0 ? (
            <p className="text-xs text-muted-foreground/50 py-2 italic">No metrics defined</p>
          ) : (
            metrics.map((m, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-muted/30 border border-border/40 space-y-2">
                <div className="flex gap-1.5">
                  <Select
                    value={m.column || "__none__"}
                    onValueChange={(v) => updateMetric(i, { column: v === "__none__" ? "" : v })}
                  >
                    <SelectTrigger size="sm" className="flex-[2]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((c) => (
                        <SelectItem key={c.name} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={m.function || "__none__"}
                    onValueChange={(v) => updateMetric(i, { function: v === "__none__" ? "" : v })}
                  >
                    <SelectTrigger size="sm" className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGG_FUNCTIONS.map((fn) => (
                        <SelectItem key={fn.value} value={fn.value}>
                          {fn.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-6 h-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeMetric(i)}
                  >
                    <X size={12} />
                  </Button>
                </div>
                <Input
                  className="w-full h-7 text-xs bg-background/60 border-border/50"
                  placeholder="Column alias…"
                  value={m.alias}
                  onChange={(e) => updateMetric(i, { alias: e.target.value })}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            <Filter className="w-3 h-3" />
            Filters
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs text-primary hover:bg-primary/10"
            onClick={addFilter}
          >
            <Plus size={12} className="mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-2">
          {filters.length === 0 ? (
            <p className="text-xs text-muted-foreground/50 py-2 italic">No filters applied</p>
          ) : (
            filters.map((f, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-muted/30 border border-border/40 space-y-2">
                <div className="flex gap-1.5">
                  <Select
                    value={f.column || "__none__"}
                    onValueChange={(v) => updateFilter(i, { column: v === "__none__" ? "" : v })}
                  >
                    <SelectTrigger size="sm" className="flex-[2]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((c) => (
                        <SelectItem key={c.name} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={f.operator || "__none__"}
                    onValueChange={(v) => updateFilter(i, { operator: v === "__none__" ? "" : v })}
                  >
                    <SelectTrigger size="sm" className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-6 h-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeFilter(i)}
                  >
                    <X size={12} />
                  </Button>
                </div>
                <Input
                  className="w-full h-7 text-xs bg-background/60 border-border/50"
                  placeholder="Filter value…"
                  value={f.value}
                  onChange={(e) => updateFilter(i, { value: e.target.value })}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

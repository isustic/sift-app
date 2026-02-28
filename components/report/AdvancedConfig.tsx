import { SlidersHorizontal, Layers, Calculator, Calendar, Filter, ArrowUpDown } from "lucide-react";
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

interface AdvancedConfigProps {
  columns: ColumnMeta[];
  selectedColumns: string[];
  onToggleColumn: (col: string) => void;
  filters: FilterConfig[];
  onFiltersChange: (filters: FilterConfig[]) => void;
  dimensions: string[];
  onDimensionsChange: (dims: string[]) => void;
  metrics: MetricConfig[];
  onMetricsChange: (metrics: MetricConfig[]) => void;
  dateColumn: string;
  onDateColumnChange: (val: string) => void;
  dateBucket: string;
  onDateBucketChange: (val: string) => void;
  sortBy: string;
  onSortByChange: (val: string) => void;
  sortDesc: boolean;
  onSortDescChange: (val: boolean) => void;
  limit: string;
  onLimitChange: (val: string) => void;
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

const DATE_BUCKETS = [
  { value: "__none__", label: "None" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
];

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export function AdvancedConfig({
  columns,
  selectedColumns,
  onToggleColumn,
  filters,
  onFiltersChange,
  dimensions,
  onDimensionsChange,
  metrics,
  onMetricsChange,
  dateColumn,
  onDateColumnChange,
  dateBucket,
  onDateBucketChange,
  sortBy,
  onSortByChange,
  sortDesc,
  onSortDescChange,
  limit,
  onLimitChange,
}: AdvancedConfigProps) {
  const numericColumns = columns.filter((c) => c.col_type === "REAL" || c.col_type === "INTEGER");

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

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
        <p className="text-[11px] text-muted-foreground">
          <span className="font-medium text-primary">Advanced Mode:</span> All options unlocked.
          Combine dimensions, metrics, date bucketing, and filters.
        </p>
      </div>

      {/* Column Visibility (for raw data mode) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            <SlidersHorizontal className="w-3 h-3" />
            Columns (for raw data)
          </div>
          <button
            onClick={() => columns.forEach(c => onToggleColumn(c.name))}
            className="text-[10px] text-primary hover:underline"
          >
            Toggle all
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {columns.map((col) => (
            <button
              key={col.name}
              onClick={() => onToggleColumn(col.name)}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] transition-colors",
                selectedColumns.includes(col.name)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {col.name}
            </button>
          ))}
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
            <p className="text-xs text-muted-foreground/50 py-2 italic">No filters</p>
          ) : (
            filters.map((f, i) => (
              <div key={i} className="p-2 rounded-md bg-muted/20 border border-border/30 space-y-1.5">
                <div className="flex gap-1">
                  <Select value={f.column || "__none__"} onValueChange={(v) => updateFilter(i, { column: v === "__none__" ? "" : v })}>
                    <SelectTrigger size="sm" className="flex-[2] h-7">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((c) => (
                        <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={f.operator || "__none__"} onValueChange={(v) => updateFilter(i, { operator: v === "__none__" ? "" : v })}>
                    <SelectTrigger size="sm" className="flex-1 h-7">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map((op) => (
                        <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-6 h-6 p-0"
                    onClick={() => removeFilter(i)}
                  >
                    <X size={11} />
                  </Button>
                </div>
                <Input
                  className="h-7 text-xs"
                  placeholder="Value…"
                  value={f.value}
                  onChange={(e) => updateFilter(i, { value: e.target.value })}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Dimensions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            <Layers className="w-3 h-3" />
            Group By
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
        <div className="space-y-1">
          {dimensions.length === 0 ? (
            <p className="text-xs text-muted-foreground/50 py-1 italic">No grouping</p>
          ) : (
            dimensions.map((d, i) => (
              <div key={i} className="flex gap-1 items-center">
                <Select value={d || "__none__"} onValueChange={(v) => updateDimension(i, v === "__none__" ? "" : v)}>
                  <SelectTrigger size="sm" className="flex-1 h-7">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((c) => (
                      <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-6 h-6 p-0"
                  onClick={() => removeDimension(i)}
                >
                  <X size={11} />
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
            Metrics
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
        <div className="space-y-1.5">
          {metrics.length === 0 ? (
            <p className="text-xs text-muted-foreground/50 py-1 italic">No metrics</p>
          ) : (
            metrics.map((m, i) => (
              <div key={i} className="p-2 rounded-md bg-muted/20 border border-border/30 space-y-1.5">
                <div className="flex gap-1">
                  <Select value={m.column || "__none__"} onValueChange={(v) => updateMetric(i, { column: v === "__none__" ? "" : v })}>
                    <SelectTrigger size="sm" className="flex-[2] h-7">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((c) => (
                        <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={m.function || "__none__"} onValueChange={(v) => updateMetric(i, { function: v === "__none__" ? "" : v })}>
                    <SelectTrigger size="sm" className="flex-1 h-7">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGG_FUNCTIONS.map((fn) => (
                        <SelectItem key={fn.value} value={fn.value}>{fn.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-6 h-6 p-0"
                    onClick={() => removeMetric(i)}
                  >
                    <X size={11} />
                  </Button>
                </div>
                <Input
                  className="h-7 text-xs"
                  placeholder="Alias…"
                  value={m.alias}
                  onChange={(e) => updateMetric(i, { alias: e.target.value })}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Date Bucketing */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          <Calendar className="w-3 h-3" />
          Date Bucketing
        </div>
        <div className="flex gap-2">
          <Select value={dateColumn || "__none__"} onValueChange={(v) => onDateColumnChange(v === "__none__" ? "" : v)}>
            <SelectTrigger size="sm" className="flex-1 h-8">
              <SelectValue placeholder="Date column" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {columns.map((c) => (
                <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateBucket || "__none__"} onValueChange={(v) => onDateBucketChange(v === "__none__" ? "" : v)} disabled={!dateColumn}>
            <SelectTrigger size="sm" className="flex-1 h-8">
              <SelectValue placeholder="Interval" />
            </SelectTrigger>
            <SelectContent>
              {DATE_BUCKETS.map((b) => (
                <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sort & Limit */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          <ArrowUpDown className="w-3 h-3" />
          Sort and Limit
        </div>
        <div className="flex gap-2">
          <Select value={sortBy || "__none__"} onValueChange={(v) => onSortByChange(v === "__none__" ? "" : v)}>
            <SelectTrigger size="sm" className="flex-1 h-8">
              <SelectValue placeholder="Sort column" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No sorting</SelectItem>
              {columns.map((c) => (
                <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortDesc ? "desc" : "asc"} onValueChange={(v) => onSortDescChange(v === "desc")} disabled={!sortBy}>
            <SelectTrigger size="sm" className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">A→Z</SelectItem>
              <SelectItem value="desc">Z→A</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input
          className="h-8 text-xs"
          type="number"
          placeholder="Row limit"
          value={limit}
          onChange={(e) => onLimitChange(e.target.value)}
          min="1"
        />
      </div>
    </div>
  );
}

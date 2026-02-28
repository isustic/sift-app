import { Filter, ArrowUpDown, SlidersHorizontal } from "lucide-react";
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

interface RawDataConfigProps {
  columns: ColumnMeta[];
  selectedColumns: string[];
  onToggleColumn: (col: string) => void;
  filters: FilterConfig[];
  onFiltersChange: (filters: FilterConfig[]) => void;
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

export function RawDataConfig({
  columns,
  selectedColumns,
  onToggleColumn,
  filters,
  onFiltersChange,
  sortBy,
  onSortByChange,
  sortDesc,
  onSortDescChange,
  limit,
  onLimitChange,
}: RawDataConfigProps) {
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
      {/* Column Visibility */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          <SlidersHorizontal className="w-3 h-3" />
          Display Columns
        </div>
        <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
          {selectedColumns.length === 0 ? (
            <button
              onClick={() => columns.forEach(c => onToggleColumn(c.name))}
              className="text-xs text-primary hover:underline"
            >
              Select all columns
            </button>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {columns.map((col) => (
                <button
                  key={col.name}
                  onClick={() => onToggleColumn(col.name)}
                  className={cn(
                    "px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
                    selectedColumns.includes(col.name)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {col.name}
                </button>
              ))}
              <button
                onClick={() => columns.forEach(c => onToggleColumn(c.name))}
                className="px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          {selectedColumns.length} column{selectedColumns.length !== 1 ? "s" : ""} selected
        </p>
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
                    value={f.column}
                    onValueChange={(v) => updateFilter(i, { column: v })}
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
                    value={f.operator}
                    onValueChange={(v) => updateFilter(i, { operator: v })}
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

      {/* Sort & Limit */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          <ArrowUpDown className="w-3 h-3" />
          Sort and Limit
        </div>
        <div className="flex gap-2">
          <Select value={sortBy || "__none__"} onValueChange={(v) => onSortByChange(v === "__none__" ? "" : v)}>
            <SelectTrigger size="sm" className="flex-1">
              <SelectValue placeholder="Coloană sortare" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No sorting</SelectItem>
              {columns.map((c) => (
                <SelectItem key={c.name} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sortDesc ? "desc" : "asc"}
            onValueChange={(v) => onSortDescChange(v === "desc")}
            disabled={!sortBy}
          >
            <SelectTrigger size="sm" className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">A→Z</SelectItem>
              <SelectItem value="desc">Z→A</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input
          className="w-full h-8 text-xs bg-background/60 border-border/50"
          type="number"
          placeholder="Row limit (e.g. 100)"
          value={limit}
          onChange={(e) => onLimitChange(e.target.value)}
          min="1"
        />
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

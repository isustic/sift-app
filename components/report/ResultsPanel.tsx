import { useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Download, Table, TrendingUp, Loader2, ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { invoke } from "@tauri-apps/api/core";

interface ResultsPanelProps {
  data: Record<string, unknown>[];
  loading: boolean;
  error: string | null;
  onExport: () => void;
  queryTime?: number;
}

export function ResultsPanel({ data, loading, error, onExport, queryTime }: ResultsPanelProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]).map((c) => ({
      id: c,
      accessorKey: c,
      header: c,
      cell: ({ getValue }: { getValue: () => unknown }) => (
        <span className="text-xs font-data">{String(getValue() ?? "")}</span>
      ),
    })) as ColumnDef<Record<string, unknown>>[];
  }, [data]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
        <h3 className="text-sm font-medium mb-1">Running Query</h3>
        <p className="text-xs text-muted-foreground">Processing report…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
          <span className="text-lg">⚠️</span>
        </div>
        <h3 className="text-sm font-medium mb-1">Query Error</h3>
        <p className="text-xs text-destructive max-w-md">{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-primary/10 mb-4">
          <Table className="w-7 h-7 text-primary/50" />
        </div>
        <h3 className="text-sm font-medium mb-1">No Results</h3>
        <p className="text-xs text-muted-foreground max-w-sm">
          The query returned no records. Try adjusting your filters or criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Stats bar */}
      <div className="sticky top-0 z-10 px-4 py-2 border-b border-border/50 bg-card/50 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">
              <span className="font-data text-primary">{data.length.toLocaleString()}</span> rows
            </span>
          </div>
          <span className="w-px h-3 bg-border/50" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">
              <span className="font-data text-primary">{columns.length}</span> columns
            </span>
          </div>
          {queryTime && (
            <>
              <span className="w-px h-3 bg-border/50" />
              <span className="text-xs text-muted-foreground">
                {queryTime}ms
              </span>
            </>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 border-border/50 hover:bg-muted/40"
          onClick={onExport}
        >
          <Download size={12} />
          Export
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-[37px] z-10">
            <tr className="bg-card/80 backdrop-blur-sm border-b border-border/50">
              {table.getHeaderGroups().map((hg) => (
                hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className={cn(
                      "text-left px-4 py-3 border-r border-border/30 font-medium text-xs whitespace-nowrap last:border-r-0",
                      h.column.getCanSort() && "cursor-pointer hover:bg-muted/30 select-none transition-colors group"
                    )}
                    onClick={h.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1.5">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      <span className="flex items-center">
                        {h.column.getIsSorted() === "asc" ? (
                          <ChevronUp size={12} className="text-primary" />
                        ) : h.column.getIsSorted() === "desc" ? (
                          <ChevronDown size={12} className="text-primary" />
                        ) : (
                          <ChevronsUpDown size={12} className="text-muted-foreground/30 group-hover:text-muted-foreground/60" />
                        )}
                      </span>
                    </div>
                  </th>
                ))
              ))}
            </tr>
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-border/30 transition-colors hover:bg-primary/5",
                  i % 2 === 0 ? "bg-background/30" : "bg-background/50"
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-2.5 border-r border-border/30 whitespace-nowrap last:border-r-0 max-w-64 truncate"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

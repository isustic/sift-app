"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import { ChevronsUpDown, ChevronUp, ChevronDown, Download, Search, X, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ProgramBadge } from "./ProgramBadge";
import { invoke } from "@tauri-apps/api/core";

export interface EppRow {
  client: string;
  agent: string;
  q1_total: number;
  q2_total: number;
  q3_total: number;
  q4_total: number;
  total_anual: number;
  reducere: number;
  total: number;
  program: string;
  procent: string;
  culoare_decolorare_q1: number;
  culoare_decolorare_q2: number;
  culoare_decolorare_q3: number;
  culoare_decolorare_q4: number;
}

interface EppReportTableProps {
  rows: EppRow[];
  agentName: string;
  year: number;
  showQualifiedOnly: boolean;
  onQualifiedFilterChange: (value: boolean) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export function EppReportTable({ rows, agentName, year, showQualifiedOnly, onQualifiedFilterChange }: EppReportTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "client", desc: false }]);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter rows by search query and qualified filter
  const filteredRows = useMemo(() => {
    let result = rows;

    // Filter by qualified status (Total >= 15000 AND has a program)
    if (showQualifiedOnly) {
      result = result.filter((row) =>
        row.total >= 15000 && row.program !== "-" && row.program !== ""
      );
    }

    // Filter by search query (searches client name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((row) =>
        row.client.toLowerCase().includes(query)
      );
    }

    return result;
  }, [rows, searchQuery, showQualifiedOnly]);

  const handleExport = async () => {
    try {
      // Convert filtered rows to the format expected by export_report
      const exportRows = filteredRows.map((row) => ({
        Client: row.client,
        Agent: row.agent,
        "Total Q1": row.q1_total,
        "Total Q2": row.q2_total,
        "Total Q3": row.q3_total,
        "Total Q4": row.q4_total,
        "Total Anual": row.total_anual,
        "Reducere 7.5%": row.reducere,
        Total: row.total,
        "Program incadrare": row.program,
        "Procent incadrare": row.procent,
      }));

      const columns = [
        "Client",
        "Agent",
        "Total Q1",
        "Total Q2",
        "Total Q3",
        "Total Q4",
        "Total Anual",
        "Reducere 7.5%",
        "Total",
        "Program incadrare",
        "Procent incadrare",
      ];

      await invoke("export_report", {
        rows: exportRows,
        columns,
        templateName: `EPP Report - ${agentName} - ${year}`,
      });
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const columns = useMemo<ColumnDef<EppRow>[]>(
    () => [
      {
        id: "client",
        accessorKey: "client",
        header: "Client",
        cell: ({ getValue }) => (
          <span className="font-medium text-xs whitespace-nowrap">{getValue() as string}</span>
        ),
      },
      {
        id: "agent",
        accessorKey: "agent",
        header: "Agent",
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">{getValue() as string}</span>
        ),
      },
      {
        id: "q1_total",
        accessorKey: "q1_total",
        header: "Total Q1",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-right">{formatCurrency(getValue() as number)}</span>
        ),
      },
      {
        id: "q2_total",
        accessorKey: "q2_total",
        header: "Total Q2",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-right">{formatCurrency(getValue() as number)}</span>
        ),
      },
      {
        id: "q3_total",
        accessorKey: "q3_total",
        header: "Total Q3",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-right">{formatCurrency(getValue() as number)}</span>
        ),
      },
      {
        id: "q4_total",
        accessorKey: "q4_total",
        header: "Total Q4",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-right">{formatCurrency(getValue() as number)}</span>
        ),
      },
      {
        id: "total_anual",
        accessorKey: "total_anual",
        header: "Total Anual",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs font-bold text-right">{formatCurrency(getValue() as number)}</span>
        ),
      },
      {
        id: "reducere",
        accessorKey: "reducere",
        header: "Reducere 7.5%",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs italic text-muted-foreground text-right">
            {formatCurrency(getValue() as number)}
          </span>
        ),
      },
      {
        id: "total",
        accessorKey: "total",
        header: "Total",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs font-bold text-right text-primary">
            {formatCurrency(getValue() as number)}
          </span>
        ),
      },
      {
        id: "program",
        accessorKey: "program",
        header: "Program incadrare",
        cell: ({ row }) => (
          <ProgramBadge program={row.original.program} percent={row.original.procent} />
        ),
      },
      {
        id: "procent",
        accessorKey: "procent",
        header: "Procent",
        cell: ({ getValue }) => {
          const value = getValue() as string;
          return (
            <span className={cn(
              "text-xs font-medium",
              value === "-" ? "text-muted-foreground" : "text-primary"
            )}>
              {value}
            </span>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: (updater) => {
      const newSorting = typeof updater === "function" ? updater(sorting) : updater;
      // @ts-ignore - we're using a local state for now
      setSorting(newSorting);
    },
    state: {
      sorting,
    },
  });

  // Quarter column background colors
  const getQuarterBgColor = (columnId: string) => {
    switch (columnId) {
      case "q1_total":
        return "bg-blue-500/5";
      case "q2_total":
        return "bg-green-500/5";
      case "q3_total":
        return "bg-orange-500/5";
      case "q4_total":
        return "bg-red-500/5";
      default:
        return "";
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Controls bar */}
      <div className="h-12 px-4 flex items-center justify-between gap-4 border-b border-border/50 bg-card/20">
        <div className="text-xs text-muted-foreground w-24">
          {filteredRows.length} client{filteredRows.length !== 1 ? "s" : ""}
          {searchQuery && ` (filtered)`}
        </div>

        {/* Search input - centered */}
        <div className="flex-1 flex justify-center">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Qualified filter checkbox */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md border border-border/50">
            <Checkbox
              id="qualified-only"
              checked={showQualifiedOnly}
              onCheckedChange={(checked) => onQualifiedFilterChange(checked === true)}
              className="h-4 w-4"
            />
            <label
              htmlFor="qualified-only"
              className="text-xs font-medium cursor-pointer select-none whitespace-nowrap"
            >
              Qualified only (≥15k)
            </label>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            className="gap-2 h-8"
          >
            <Download size={14} />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr
                key={hg.id}
                className="bg-card/80 backdrop-blur-sm border-b border-border/50"
              >
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className={cn(
                      "px-3 py-2 border-r border-border/30 font-medium text-xs whitespace-nowrap last:border-r-0",
                      h.column.getCanSort() && "cursor-pointer hover:bg-muted/30 select-none transition-colors group",
                      getQuarterBgColor(h.id)
                    )}
                    onClick={h.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      <span>{flexRender(h.column.columnDef.header, h.getContext())}</span>
                      <span className="flex items-center">
                        {/* @ts-ignore */}
                        {h.column.getIsSorted() === "asc" ? (
                          <ChevronUp size={12} className="text-primary" />
                        ) : /* @ts-ignore */
                        h.column.getIsSorted() === "desc" ? (
                          <ChevronDown size={12} className="text-primary" />
                        ) : (
                          <ChevronsUpDown size={12} className="text-muted-foreground/30 group-hover:text-muted-foreground/60" />
                        )}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            ))}
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
                    className={cn(
                      "px-3 py-2 border-r border-border/30 last:border-r-0",
                      getQuarterBgColor(cell.column.id)
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty state */}
        {filteredRows.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            {searchQuery ? (
              <>
                <p className="text-sm text-muted-foreground">No clients match "{searchQuery}"</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { invoke } from "@tauri-apps/api/core";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ResultsGridProps {
    data: Record<string, unknown>[];
    columns: string[];
}

export function ResultsGrid({ data, columns }: ResultsGridProps) {
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            await invoke("export_report", {
                data: data.map((row) => ({
                    cells: columns.map((col) => String(row[col] ?? ""))
                })),
                path: `analysis_export_${Date.now()}.xlsx`
            });
        } catch (error) {
            console.error("Export failed:", error);
        } finally {
            setExporting(false);
        }
    };

    if (data.length === 0) {
        return (
            <div className="bg-card/30 border border-border/40 rounded-xl p-8 text-center">
                <p className="text-sm text-muted-foreground">No results to display</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Run your analysis to see results</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{data.length.toLocaleString()} rows</p>
                <Button
                    onClick={handleExport}
                    disabled={exporting}
                    size="sm"
                    variant="outline"
                >
                    <Download className="w-4 h-4 mr-1" />
                    Export
                </Button>
            </div>

            <div className="bg-card/30 border border-border/40 rounded-xl overflow-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                        <tr>
                            {columns.map((col) => (
                                <th key={col} className="px-4 py-2 text-left font-medium border-b border-border/40">
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.slice(0, 100).map((row, i) => (
                            <tr key={i} className="border-b border-border/20 hover:bg-muted/20">
                                {columns.map((col) => (
                                    <td key={col} className="px-4 py-2">
                                        {String(row[col] ?? "")}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data.length > 100 && (
                    <div className="px-4 py-2 text-xs text-muted-foreground text-center border-t border-border/40">
                        Showing first 100 of {data.length.toLocaleString()} rows
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";

import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DatasetSelector } from "@/components/analysis/DatasetSelector";
import { PivotBuilder, PivotConfig } from "@/components/analysis/pivot/PivotBuilder";
import { ResultsGrid } from "@/components/analysis/ResultsGrid";

interface Column {
    name: string;
    col_type: string;
    display_order: number;
}

interface PivotResult {
    rows: Record<string, unknown>[];
    columns: string[];
}

export default function PivotPage() {
    const [datasetId, setDatasetId] = useState<number | null>(null);
    const [columns, setColumns] = useState<string[]>([]);
    const [results, setResults] = useState<Record<string, unknown>[]>([]);
    const [resultColumns, setResultColumns] = useState<string[]>([]);

    const handleDatasetChange = async (id: number) => {
        setDatasetId(id);
        const cols = await invoke<Column[]>("get_columns", { datasetId: id });
        setColumns(cols.map((c: Column) => c.name));
    };

    const handleRun = async (config: PivotConfig) => {
        if (!datasetId) return;
        try {
            const result = await invoke<PivotResult>("run_pivot_query", {
                datasetId,
                config
            });
            setResults(result.rows);
            setResultColumns(result.columns);
        } catch (error) {
            console.error("Pivot query failed:", error);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background/50 mesh-bg">
            {/* Header */}
            <div className="h-14 px-6 flex items-center justify-between border-b border-border/50 bg-card/30 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <DatasetSelector value={datasetId} onChange={handleDatasetChange} />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                {datasetId ? (
                    <div className="space-y-6">
                        <PivotBuilder
                            columns={columns}
                            onRun={handleRun}
                            onSave={() => {}}
                        />
                        {results.length > 0 && (
                            <ResultsGrid data={results} columns={resultColumns} />
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-sm text-muted-foreground">Select a dataset to begin</p>
                    </div>
                )}
            </div>
        </div>
    );
}

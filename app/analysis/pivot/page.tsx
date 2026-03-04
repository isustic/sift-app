"use client";

import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { LoaderIcon, AlertCircleIcon, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DatasetSelector } from "@/components/analysis/DatasetSelector";
import { PivotBuilder, PivotConfig } from "@/components/analysis/pivot/PivotBuilder";
import { ResultsGrid } from "@/components/analysis/ResultsGrid";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

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
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoadingColumns, setIsLoadingColumns] = useState(false);

    const handleDatasetChange = async (id: number) => {
        setDatasetId(id);
        setIsLoadingColumns(true);
        setError(null);
        setResults([]);
        setResultColumns([]);

        try {
            const cols = await invoke<Column[]>("get_columns", { datasetId: id });
            setColumns(cols.map((c: Column) => c.name));
        } catch (err) {
            console.error("Failed to load columns:", err);
            setError("Failed to load columns. Please try selecting the dataset again.");
            setColumns([]);
        } finally {
            setIsLoadingColumns(false);
        }
    };

    const handleRun = async (config: PivotConfig) => {
        if (!datasetId) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await invoke<PivotResult>("run_pivot_query", {
                datasetId,
                config
            });
            setResults(result.rows);
            setResultColumns(result.columns);
        } catch (err) {
            console.error("Pivot query failed:", err);
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            setError(`Failed to run pivot query: ${errorMessage}. Please check your configuration and try again.`);
            setResults([]);
            setResultColumns([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRetry = () => {
        setError(null);
        if (datasetId) {
            handleDatasetChange(datasetId);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background/50 mesh-bg">
            {/* Header */}
            <div className="h-14 px-6 flex items-center justify-between border-b border-border/50 bg-card/30 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <Link href="/analysis">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <DatasetSelector value={datasetId} onChange={handleDatasetChange} />
                    {isLoadingColumns && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <LoaderIcon className="h-4 w-4 animate-spin" />
                            <span>Loading columns...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircleIcon className="h-4 w-4" />
                        <AlertDescription className="flex items-center justify-between">
                            <span>{error}</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRetry}
                                className="ml-4 bg-background"
                            >
                                Try again
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                {datasetId ? (
                    <div className="space-y-6">
                        <PivotBuilder
                            columns={columns}
                            onRun={handleRun}
                            onSave={() => {}}
                            isLoading={isLoading}
                        />
                        {isLoading && (
                            <div className="flex items-center justify-center py-12">
                                <div className="flex flex-col items-center gap-3">
                                    <LoaderIcon className="h-8 w-8 text-primary animate-spin" />
                                    <p className="text-sm text-muted-foreground">Running pivot query...</p>
                                </div>
                            </div>
                        )}
                        {!isLoading && results.length > 0 && (
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

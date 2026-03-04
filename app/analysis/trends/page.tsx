"use client";

import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DatasetSelector } from "@/components/analysis/DatasetSelector";
import { TrendsBuilder } from "@/components/analysis/trends/TrendsBuilder";

interface Column {
    name: string;
}

export default function TrendsPage() {
    const [datasetId, setDatasetId] = useState<number | null>(null);
    const [columns, setColumns] = useState<string[]>([]);

    const handleDatasetChange = async (id: number) => {
        setDatasetId(id);
        const cols = await invoke<Column[]>("get_columns", { datasetId: id });
        setColumns(cols.map((c) => c.name));
    };

    return (
        <div className="flex flex-col h-full bg-background/50 mesh-bg">
            <div className="h-14 px-6 flex items-center gap-3 border-b border-border/50 bg-card/30 backdrop-blur-sm">
                <DatasetSelector value={datasetId} onChange={handleDatasetChange} />
            </div>

            <div className="flex-1 overflow-auto p-6">
                {datasetId ? (
                    <TrendsBuilder datasetId={datasetId} columns={columns} />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-sm text-muted-foreground">Select a dataset to begin</p>
                    </div>
                )}
            </div>
        </div>
    );
}

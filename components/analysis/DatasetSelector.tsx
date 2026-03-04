"use client";

import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { Database, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Dataset {
    id: number;
    name: string;
    row_count: number;
}

interface DatasetSelectorProps {
    value: number | null;
    onChange: (datasetId: number) => void;
}

export function DatasetSelector({ value, onChange }: DatasetSelectorProps) {
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        invoke<Dataset[]>("list_datasets").then(setDatasets);
    }, []);

    const selected = datasets.find((d) => d.id === value);

    return (
        <div className="relative">
            <Button
                variant="outline"
                onClick={() => setOpen(!open)}
                className="w-[200px] justify-between"
            >
                {selected ? (
                    <span className="truncate">{selected.name}</span>
                ) : (
                    <span className="text-muted-foreground">Select dataset</span>
                )}
                <ChevronDown className="w-4 h-4 opacity-50" />
            </Button>

            {open && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-1 w-[280px] bg-card border border-border/40 rounded-lg shadow-lg z-20 max-h-[300px] overflow-auto">
                        {datasets.map((dataset) => (
                            <button
                                key={dataset.id}
                                onClick={() => {
                                    onChange(dataset.id);
                                    setOpen(false);
                                }}
                                className="w-full px-3 py-2 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                            >
                                <Database className="w-4 h-4 text-muted-foreground" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{dataset.name}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {dataset.row_count.toLocaleString()} rows
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

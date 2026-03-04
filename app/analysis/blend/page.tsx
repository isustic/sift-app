"use client";

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { BlendBuilder } from "@/components/analysis/blend/BlendBuilder";

export default function BlendPage() {
    const [datasets, setDatasets] = useState<Array<{ id: number; name: string; table_name: string }>>([]);

    useEffect(() => {
        invoke<Array<{ id: number; name: string; table_name: string }>>("list_datasets").then(setDatasets);
    }, []);

    return (
        <div className="flex flex-col h-full bg-background/50 mesh-bg">
            <div className="h-14 px-6 flex items-center justify-between border-b border-border/50 bg-card/30 backdrop-blur-sm">
                <h1 className="text-sm font-semibold">Blend Datasets</h1>
            </div>

            <div className="flex-1 overflow-auto p-6">
                {datasets.length >= 2 ? (
                    <BlendBuilder datasets={datasets} />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-sm text-muted-foreground">
                            You need at least 2 datasets to blend. {datasets.length} available.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

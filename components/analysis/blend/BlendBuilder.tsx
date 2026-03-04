"use client";

import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Database, Plus, Trash2, Play, Save } from "lucide-react";

interface BlendBuilderProps {
    datasets: Array<{ id: number; name: string; table_name: string }>;
}

export function BlendBuilder({ datasets }: BlendBuilderProps) {
    const [selectedDatasets, setSelectedDatasets] = useState<number[]>([]);
    const [joinType, setJoinType] = useState<"inner" | "left" | "right" | "full">("inner");
    const [matches, setMatches] = useState<Array<{ left: string; right: string }>>([]);
    const [results, setResults] = useState<Record<string, unknown>[]>([]);
    const [resultColumns, setResultColumns] = useState<string[]>([]);

    const handleAddDataset = (id: number) => {
        if (selectedDatasets.length < 4 && !selectedDatasets.includes(id)) {
            setSelectedDatasets([...selectedDatasets, id]);
        }
    };

    const handleRemoveDataset = (id: number) => {
        setSelectedDatasets(selectedDatasets.filter((d) => d !== id));
    };

    const handleAddMatch = () => {
        setMatches([...matches, { left: "", right: "" }]);
    };

    const handleRun = async () => {
        if (selectedDatasets.length < 2) {
            alert("Please select at least 2 datasets");
            return;
        }

        try {
            const result = await invoke<{ rows: Record<string, unknown>[]; columns: string[] }>("run_blend_query", {
                config: {
                    datasetIds: selectedDatasets,
                    joinType,
                    matches: matches.filter((m) => m.left && m.right),
                },
            });
            setResults(result.rows);
            setResultColumns(result.columns);
        } catch (error) {
            console.error("Blend query failed:", error);
            alert("Blend failed: " + error);
        }
    };

    const selectedDatasetObjs = datasets.filter((d) => selectedDatasets.includes(d.id));

    return (
        <div className="grid grid-cols-3 gap-4">
            {/* Dataset Selection */}
            <div className="space-y-4">
                <div className="bg-card/30 border border-border/40 rounded-xl p-3">
                    <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                        Datasets ({selectedDatasets.length}/4)
                    </h4>
                    <div className="space-y-1">
                        {datasets.map((ds) => (
                            <button
                                key={ds.id}
                                onClick={() => handleAddDataset(ds.id)}
                                disabled={selectedDatasets.includes(ds.id)}
                                className="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                            >
                                <Database className="w-3 h-3" />
                                {ds.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Selected Datasets */}
                {selectedDatasetObjs.length > 0 && (
                    <div className="bg-card/30 border border-border/40 rounded-xl p-3">
                        <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                            Selected
                        </h4>
                        <div className="space-y-1">
                            {selectedDatasetObjs.map((ds) => (
                                <div
                                    key={ds.id}
                                    className="flex items-center justify-between px-2 py-1.5 bg-primary/10 rounded text-xs"
                                >
                                    <span className="font-medium">{ds.name}</span>
                                    <button
                                        onClick={() => handleRemoveDataset(ds.id)}
                                        className="text-muted-foreground hover:text-destructive"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Join Configuration */}
            <div className="col-span-2 space-y-4">
                {/* Join Type */}
                <div className="bg-card/30 border border-border/40 rounded-xl p-3">
                    <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                        Join Type
                    </h4>
                    <div className="flex gap-2">
                        {(["inner", "left", "right", "full"] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => setJoinType(type)}
                                className={`px-3 py-1.5 text-xs rounded capitalize transition-colors ${
                                    joinType === type
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted/50 hover:bg-muted"
                                }`}
                            >
                                {type} join
                            </button>
                        ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                        {joinType === "inner" && "Only keep rows that match in all datasets"}
                        {joinType === "left" && "Keep all rows from the first dataset"}
                        {joinType === "right" && "Keep all rows from the last dataset"}
                        {joinType === "full" && "Keep all rows from all datasets"}
                    </p>
                </div>

                {/* Match Columns */}
                <div className="bg-card/30 border border-border/40 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                            Match On
                        </h4>
                        <Button size="icon-xs" variant="ghost" onClick={handleAddMatch}>
                            <Plus size={12} />
                        </Button>
                    </div>
                    <div className="space-y-2">
                        {matches.map((match, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="Column from first dataset"
                                    value={match.left}
                                    onChange={(e) => {
                                        const newMatches = [...matches];
                                        newMatches[i].left = e.target.value;
                                        setMatches(newMatches);
                                    }}
                                    className="flex-1 px-2 py-1 text-xs border border-border/40 rounded"
                                />
                                <span className="text-muted-foreground">=</span>
                                <input
                                    type="text"
                                    placeholder="Column from second dataset"
                                    value={match.right}
                                    onChange={(e) => {
                                        const newMatches = [...matches];
                                        newMatches[i].right = e.target.value;
                                        setMatches(newMatches);
                                    }}
                                    className="flex-1 px-2 py-1 text-xs border border-border/40 rounded"
                                />
                                <button
                                    onClick={() => setMatches(matches.filter((_, j) => j !== i))}
                                    className="text-muted-foreground hover:text-destructive"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                        {matches.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-2">
                                No matches defined. Add a match to join datasets.
                            </p>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <Button onClick={handleRun} size="sm" disabled={selectedDatasets.length < 2}>
                        <Play className="w-4 h-4 mr-1" />
                        Run Blend
                    </Button>
                    <Button size="sm" variant="outline">
                        <Save className="w-4 h-4 mr-1" />
                        Save Blend
                    </Button>
                </div>

                {/* Results */}
                {results.length > 0 && (
                    <div className="bg-card/30 border border-border/40 rounded-xl overflow-auto">
                        <div className="px-4 py-2 border-b border-border/40 flex justify-between items-center">
                            <span className="text-xs font-medium">
                                {results.length} rows blended
                            </span>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-muted/30">
                                <tr>
                                    {resultColumns.map((col) => (
                                        <th key={col} className="px-4 py-2 text-left">
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {results.slice(0, 50).map((row, i) => (
                                    <tr key={i} className="border-t border-border/20">
                                        {resultColumns.map((col) => (
                                            <td key={col} className="px-4 py-2">
                                                {String(row[col] ?? "")}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {results.length > 50 && (
                            <div className="px-4 py-2 text-xs text-muted-foreground text-center border-t border-border/40">
                                Showing first 50 of {results.length} rows
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

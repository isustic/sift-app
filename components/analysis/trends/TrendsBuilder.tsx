"use client";

import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { SparklineChart } from "./SparklineChart";

interface TrendsBuilderProps {
    datasetId: number;
    columns: string[];
}

interface TrendsResult {
    periods: string[];
    values: number[];
    metrics: {
        total: number;
        avg: number;
        min: number;
        max: number;
        growth: number;
    };
}

export function TrendsBuilder({ datasetId, columns }: TrendsBuilderProps) {
    const [dateColumn, setDateColumn] = useState<string>("");
    const [valueColumn, setValueColumn] = useState<string>("");
    const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "quarterly" | "yearly">("monthly");
    const [aggregation, setAggregation] = useState<"sum" | "avg" | "count">("sum");
    const [result, setResult] = useState<TrendsResult | null>(null);

    const dateColumns = columns.filter((c) => c.toLowerCase().includes("date") || c.toLowerCase().includes("time"));
    const numericColumns = columns.filter((c) => !dateColumns.includes(c));

    const handleRun = async () => {
        try {
            const res = await invoke<TrendsResult>("run_trends_query", {
                datasetId,
                config: {
                    dateColumn,
                    valueColumn,
                    period,
                    aggregation,
                },
            });
            setResult(res);
        } catch (error) {
            console.error("Trends query failed:", error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Config */}
            <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Date Column</label>
                    <select
                        value={dateColumn}
                        onChange={(e) => setDateColumn(e.target.value)}
                        className="px-3 py-2 border border-border/40 rounded-lg text-sm bg-background"
                    >
                        <option value="">Select...</option>
                        {dateColumns.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Value Column</label>
                    <select
                        value={valueColumn}
                        onChange={(e) => setValueColumn(e.target.value)}
                        className="px-3 py-2 border border-border/40 rounded-lg text-sm bg-background"
                    >
                        <option value="">Select...</option>
                        {numericColumns.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Period</label>
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as any)}
                        className="px-3 py-2 border border-border/40 rounded-lg text-sm bg-background"
                    >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Aggregation</label>
                    <select
                        value={aggregation}
                        onChange={(e) => setAggregation(e.target.value as any)}
                        className="px-3 py-2 border border-border/40 rounded-lg text-sm bg-background"
                    >
                        <option value="sum">Sum</option>
                        <option value="avg">Average</option>
                        <option value="count">Count</option>
                    </select>
                </div>

                <Button onClick={handleRun} size="sm" disabled={!dateColumn || !valueColumn}>
                    <Play className="w-4 h-4 mr-1" />
                    Run
                </Button>
            </div>

            {/* Results */}
            {result && (
                <div className="space-y-4">
                    {/* Chart */}
                    <div className="bg-card/30 border border-border/40 rounded-xl p-4">
                        <h3 className="text-xs font-medium text-muted-foreground mb-3">Trend</h3>
                        <div className="flex justify-center">
                            <SparklineChart data={result.values} width={400} height={100} />
                        </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-card/30 border border-border/40 rounded-xl p-4">
                            <p className="text-[10px] text-muted-foreground">Total</p>
                            <p className="text-lg font-semibold">{result.metrics.total.toLocaleString()}</p>
                        </div>
                        <div className="bg-card/30 border border-border/40 rounded-xl p-4">
                            <p className="text-[10px] text-muted-foreground">Average</p>
                            <p className="text-lg font-semibold">{result.metrics.avg.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div className="bg-card/30 border border-border/40 rounded-xl p-4">
                            <p className="text-[10px] text-muted-foreground">Min / Max</p>
                            <p className="text-lg font-semibold">{result.metrics.min} / {result.metrics.max}</p>
                        </div>
                        <div className="bg-card/30 border border-border/40 rounded-xl p-4">
                            <p className="text-[10px] text-muted-foreground">Growth</p>
                            <p className={`text-lg font-semibold ${result.metrics.growth >= 0 ? "text-green-500" : "text-red-500"}`}>
                                {result.metrics.growth >= 0 ? "+" : ""}{result.metrics.growth.toFixed(1)}%
                            </p>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-card/30 border border-border/40 rounded-xl overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/30">
                                <tr>
                                    <th className="px-4 py-2 text-left">Period</th>
                                    <th className="px-4 py-2 text-right">Value</th>
                                    <th className="px-4 py-2 text-right">Change</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.periods.map((period, i) => (
                                    <tr key={i} className="border-t border-border/20">
                                        <td className="px-4 py-2">{period}</td>
                                        <td className="px-4 py-2 text-right">{result.values[i]?.toLocaleString()}</td>
                                        <td className={`px-4 py-2 text-right ${i > 0 && result.values[i] >= result.values[i-1] ? "text-green-500" : "text-red-500"}`}>
                                            {i > 0 ? ((result.values[i] - result.values[i-1]) / result.values[i-1] * 100).toFixed(1) + "%" : "-"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

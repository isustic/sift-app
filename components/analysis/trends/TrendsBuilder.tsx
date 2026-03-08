"use client";

import { useState, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Play, LoaderIcon, AlertCircleIcon } from "lucide-react";
import { SparklineChart } from "./SparklineChart";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

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

// Format period strings - backend now handles Excel date conversion
function formatPeriod(period: string): string {
    // Backend should return YYYY-MM format, just validate and return
    if (/^\d{4}-\d{2}$/.test(period)) {
        return period;
    }

    // Fallback for unexpected formats
    return period;
}

export function TrendsBuilder({ datasetId, columns }: TrendsBuilderProps) {
    const [dateColumn, setDateColumn] = useState<string>("");
    const [valueColumn, setValueColumn] = useState<string>("");
    const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "quarterly" | "yearly">("monthly");
    const [aggregation, setAggregation] = useState<"sum" | "avg" | "count">("sum");
    const [result, setResult] = useState<TrendsResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Format periods for display
    const formattedData = useMemo(() => {
        if (!result) return null;
        return {
            ...result,
            periods: result.periods.map(formatPeriod)
        };
    }, [result]);

    // Show all columns - let user decide which is date vs value
    // Sort columns with date/time hints first for convenience
    const allColumns = [...columns].sort((a, b) => {
        const aIsDate = a.toLowerCase().includes("date") || a.toLowerCase().includes("time");
        const bIsDate = b.toLowerCase().includes("date") || b.toLowerCase().includes("time");
        if (aIsDate && !bIsDate) return -1;
        if (!aIsDate && bIsDate) return 1;
        return a.localeCompare(b);
    });

    const handleRun = async () => {
        if (!dateColumn || !valueColumn) return;

        setIsLoading(true);
        setError(null);

        try {
            const res = await invoke<TrendsResult>("run_trends_query", {
                datasetId,
                config: {
                    date_column: dateColumn,
                    value_column: valueColumn,
                    period,
                    aggregation,
                },
            });
            console.log("=== TRENDS RAW RESULT ===");
            console.log("Periods:", res.periods);
            console.log("Values:", res.values);
            console.log("==========================");
            setResult(res);
        } catch (err) {
            console.error("Trends query failed:", err);
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            setError(`Failed to run trends query: ${errorMessage}. Please check your configuration and try again.`);
            setResult(null);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Config */}
            <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Date Column</label>
                    <Select value={dateColumn} onValueChange={setDateColumn} disabled={isLoading}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                            {allColumns.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Value Column</label>
                    <Select value={valueColumn} onValueChange={setValueColumn} disabled={isLoading}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                            {allColumns.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Period</label>
                    <Select value={period} onValueChange={(v) => setPeriod(v as "daily" | "weekly" | "monthly" | "quarterly" | "yearly")} disabled={isLoading}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Aggregation</label>
                    <Select value={aggregation} onValueChange={(v) => setAggregation(v as "sum" | "avg" | "count")} disabled={isLoading}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="sum">Sum</SelectItem>
                            <SelectItem value="avg">Average</SelectItem>
                            <SelectItem value="count">Count</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Button onClick={handleRun} size="sm" disabled={!dateColumn || !valueColumn || isLoading}>
                    {isLoading ? (
                        <LoaderIcon className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                        <Play className="w-4 h-4 mr-1" />
                    )}
                    {isLoading ? "Running..." : "Run"}
                </Button>
            </div>

            {/* Error Display */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircleIcon className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3">
                        <LoaderIcon className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">Running trends analysis...</p>
                    </div>
                </div>
            )}

            {/* Results */}
            {!isLoading && formattedData && (
                <div className="space-y-4">
                    {/* Chart */}
                    <div className="bg-card/30 border border-border/40 rounded-xl p-4">
                        <h3 className="text-xs font-medium text-muted-foreground mb-3">Trend</h3>
                        <div className="flex justify-center">
                            <SparklineChart data={formattedData.values} width={400} height={100} />
                        </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-card/30 border border-border/40 rounded-xl p-4">
                            <p className="text-[10px] text-muted-foreground">Total</p>
                            <p className="text-lg font-semibold">{formattedData.metrics.total.toLocaleString()}</p>
                        </div>
                        <div className="bg-card/30 border border-border/40 rounded-xl p-4">
                            <p className="text-[10px] text-muted-foreground">Average</p>
                            <p className="text-lg font-semibold">{formattedData.metrics.avg.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div className="bg-card/30 border border-border/40 rounded-xl p-4">
                            <p className="text-[10px] text-muted-foreground">Min / Max</p>
                            <p className="text-lg font-semibold">{formattedData.metrics.min} / {formattedData.metrics.max}</p>
                        </div>
                        <div className="bg-card/30 border border-border/40 rounded-xl p-4">
                            <p className="text-[10px] text-muted-foreground">Growth</p>
                            <p className={`text-lg font-semibold ${formattedData.metrics.growth >= 0 ? "text-green-500" : "text-red-500"}`}>
                                {formattedData.metrics.growth >= 0 ? "+" : ""}{formattedData.metrics.growth.toFixed(1)}%
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
                                {formattedData.periods.map((period, i) => (
                                    <tr key={i} className="border-t border-border/20">
                                        <td className="px-4 py-2">{period}</td>
                                        <td className="px-4 py-2 text-right">{formattedData.values[i]?.toLocaleString()}</td>
                                        <td className={`px-4 py-2 text-right ${i > 0 && formattedData.values[i] >= formattedData.values[i-1] ? "text-green-500" : "text-red-500"}`}>
                                            {i > 0 ? ((formattedData.values[i] - formattedData.values[i-1]) / formattedData.values[i-1] * 100).toFixed(1) + "%" : "-"}
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

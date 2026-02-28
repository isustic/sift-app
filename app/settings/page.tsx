"use client";

import { useEffect, useState } from "react";
import {
    Sun, Moon,
    Database, BarChart3, TrendingUp, Clock, Star,
    Trash2, RotateCcw, Package
} from "lucide-react";
import { cn } from "@/lib/utils";
import { invoke } from "@tauri-apps/api/core";

type Theme = "dark" | "light";

// Analytics types
interface UsageStats {
    datasets_count: number;
    reports_run: number;
    total_rows: number;
    most_used_columns: ColumnUsage[];
}

interface ColumnUsage {
    column_name: string;
    usage_count: number;
}

interface ActivityDay {
    date: string;
    count: number;
}

interface QueryEntry {
    id: number;
    report_config: string;
    row_count: number;
    timestamp: string;
}

interface Favorite {
    id: number;
    item_type: string;
    item_id: number;
    name: string;
    created_at: string;
}

function useTheme(): [Theme, (t: Theme) => void] {
    const [theme, setThemeState] = useState<Theme>("dark");

    useEffect(() => {
        const stored = (localStorage.getItem("theme") as Theme) || "dark";
        setThemeState(stored);
        document.documentElement.classList.toggle("dark", stored === "dark");
    }, []);

    const setTheme = (t: Theme) => {
        setThemeState(t);
        localStorage.setItem("theme", t);
        document.documentElement.classList.toggle("dark", t === "dark");
    };

    return [theme, setTheme];
}

export default function SettingsPage() {
    const [theme, setTheme] = useTheme();
    const [stats, setStats] = useState<UsageStats | null>(null);
    const [activity, setActivity] = useState<ActivityDay[]>([]);
    const [queryHistory, setQueryHistory] = useState<QueryEntry[]>([]);
    const [favorites, setFavorites] = useState<Favorite[]>([]);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            const [statsData, activityData, historyData, favoritesData] = await Promise.all([
                invoke<UsageStats>("get_usage_stats"),
                invoke<ActivityDay[]>("get_activity_heatmap", { days: 90 }),
                invoke<QueryEntry[]>("get_query_history", { limit: 10 }),
                invoke<Favorite[]>("get_favorites"),
            ]);
            setStats(statsData);
            setActivity(activityData);
            setQueryHistory(historyData);
            setFavorites(favoritesData);
        } catch (error) {
            console.error("Failed to load analytics:", error);
        }
    };

    const handleRemoveFavorite = async (id: number) => {
        try {
            await invoke("remove_favorite", { favoriteId: id });
            setFavorites((prev) => prev.filter((f) => f.id !== id));
        } catch (error) {
            console.error("Failed to remove favorite:", error);
        }
    };

    const handleRerunQuery = async (configStr: string) => {
        try {
            const config = JSON.parse(configStr);
            const result = await invoke("run_report", { query: config });
            // Navigate to report page with results
            // For now, just log it
            console.log("Rerun query result:", result);
        } catch (error) {
            console.error("Failed to rerun query:", error);
        }
    };

    const getActivityLevel = (count: number) => {
        if (count === 0) return "bg-muted/30";
        if (count <= 2) return "bg-accent/30";
        if (count <= 5) return "bg-accent/60";
        return "bg-accent";
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    // Build heatmap data (last 12 weeks)
    const buildHeatmapGrid = () => {
        const weeks = 12;
        const daysPerWeek = 7;
        const grid: { date: string; count: number }[][] = [];

        const activityMap = new Map(activity.map((a) => [a.date, a.count]));
        const today = new Date();

        for (let week = 0; week < weeks; week++) {
            const weekData: { date: string; count: number }[] = [];
            for (let day = 0; day < daysPerWeek; day++) {
                const date = new Date(today);
                date.setDate(date.getDate() - ((weeks - 1 - week) * 7 + (daysPerWeek - 1 - day)));
                const dateStr = date.toISOString().split("T")[0];
                weekData.push({
                    date: dateStr,
                    count: activityMap.get(dateStr) || 0,
                });
            }
            grid.push(weekData);
        }
        return grid;
    };

    const heatmapGrid = buildHeatmapGrid();

    return (
        <div className="flex flex-col h-full bg-background/50 mesh-bg">
            {/* Header */}
            <div className="h-14 px-6 flex items-center gap-3 border-b border-border/50 bg-card/30 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                    <Sun className="w-4 h-4 text-primary" />
                </div>
                <div>
                    <h1 className="text-sm font-semibold">Settings</h1>
                    <p className="text-[10px] text-muted-foreground">Manage your preferences</p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-8">
                <div className="max-w-4xl space-y-10">
                    {/* ── Your Analytics ── */}
                    <section className="space-y-5">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-accent" />
                            <h2 className="text-sm font-medium">Your Analytics</h2>
                        </div>

                        {/* Stats Cards */}
                        {stats && (
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-card/50 border border-border/40 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                        <Database className="w-4 h-4" />
                                        <span className="text-xs">Datasets</span>
                                    </div>
                                    <p className="text-2xl font-semibold text-foreground">{stats.datasets_count}</p>
                                </div>
                                <div className="bg-card/50 border border-border/40 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                        <BarChart3 className="w-4 h-4" />
                                        <span className="text-xs">Reports Run</span>
                                    </div>
                                    <p className="text-2xl font-semibold text-foreground">{stats.reports_run}</p>
                                </div>
                                <div className="bg-card/50 border border-border/40 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                        <Package className="w-4 h-4" />
                                        <span className="text-xs">Total Rows</span>
                                    </div>
                                    <p className="text-2xl font-semibold text-foreground">{stats.total_rows.toLocaleString()}</p>
                                </div>
                            </div>
                        )}

                        {/* Activity Heatmap */}
                        <div className="bg-card/30 border border-border/40 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-medium text-muted-foreground">Activity</h3>
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                    <span>Less</span>
                                    <div className="flex gap-0.5">
                                        <div className="w-3 h-3 rounded-sm bg-muted/30" />
                                        <div className="w-3 h-3 rounded-sm bg-accent/30" />
                                        <div className="w-3 h-3 rounded-sm bg-accent/60" />
                                        <div className="w-3 h-3 rounded-sm bg-accent" />
                                    </div>
                                    <span>More</span>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                {heatmapGrid.map((week, weekIdx) => (
                                    <div key={weekIdx} className="flex flex-col gap-1">
                                        {week.map((day, dayIdx) => (
                                            <div
                                                key={`${weekIdx}-${dayIdx}`}
                                                className={cn(
                                                    "w-3 h-3 rounded-sm transition-all hover:ring-1 hover:ring-accent/50",
                                                    getActivityLevel(day.count)
                                                )}
                                                title={`${day.date}: ${day.count} actions`}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Most Used Columns */}
                        {stats && stats.most_used_columns.length > 0 && (
                            <div className="bg-card/30 border border-border/40 rounded-xl p-4">
                                <h3 className="text-xs font-medium text-muted-foreground mb-3">Most Used Columns</h3>
                                <div className="flex flex-wrap gap-2">
                                    {stats.most_used_columns.map((col) => (
                                        <div
                                            key={col.column_name}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg text-xs"
                                        >
                                            <span className="font-medium">{col.column_name}</span>
                                            <span className="text-muted-foreground">{col.usage_count}x</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* ── Query History ── */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-accent" />
                            <h2 className="text-sm font-medium">Recent Reports</h2>
                        </div>

                        {queryHistory.length > 0 ? (
                            <div className="bg-card/30 border border-border/40 rounded-xl divide-y divide-border/40">
                                {queryHistory.map((entry) => {
                                    let config;
                                    try {
                                        config = JSON.parse(entry.report_config);
                                    } catch {
                                        return null;
                                    }
                                    return (
                                        <div key={entry.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                                                    <BarChart3 className="w-4 h-4 text-accent" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {config.calculations?.length > 0
                                                            ? `Aggregation (${config.calculations.length} calculations)`
                                                            : `Raw Data (${config.display_columns?.length || 0} columns)`
                                                        }
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {entry.row_count} rows • {formatDate(entry.timestamp)}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRerunQuery(entry.report_config)}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg hover:bg-accent/20 hover:text-accent transition-colors"
                                            >
                                                <RotateCcw size={12} />
                                                Rerun
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-card/30 border border-border/40 rounded-xl p-8 text-center">
                                <Clock className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                                <p className="text-sm text-muted-foreground">No report history yet</p>
                                <p className="text-xs text-muted-foreground/60">Run some reports to see them here</p>
                            </div>
                        )}
                    </section>

                    {/* ── Favorites ── */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-accent" />
                            <h2 className="text-sm font-medium">Favorites</h2>
                        </div>

                        {favorites.length > 0 ? (
                            <div className="bg-card/30 border border-border/40 rounded-xl divide-y divide-border/40">
                                {favorites.map((fav) => (
                                    <div key={fav.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                {fav.item_type === "dataset" ? (
                                                    <Database className="w-4 h-4 text-primary" />
                                                ) : (
                                                    <BarChart3 className="w-4 h-4 text-primary" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{fav.name}</p>
                                                <p className="text-[10px] text-muted-foreground capitalize">{fav.item_type}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveFavorite(fav.id)}
                                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-card/30 border border-border/40 rounded-xl p-8 text-center">
                                <Star className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                                <p className="text-sm text-muted-foreground">No favorites yet</p>
                                <p className="text-xs text-muted-foreground/60">Star datasets or reports to quick access them</p>
                            </div>
                        )}
                    </section>

                    {/* ── Appearance ── */}
                    <section className="space-y-3">
                        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Sun className="w-3 h-3" />
                            Appearance
                        </h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setTheme("light")}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-all",
                                    theme === "light"
                                        ? "border-primary bg-primary/10 text-primary glow-forest"
                                        : "border-border/50 text-muted-foreground hover:border-border hover:bg-muted/40"
                                )}
                            >
                                <Sun size={14} />
                                Light
                            </button>
                            <button
                                onClick={() => setTheme("dark")}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-all",
                                    theme === "dark"
                                        ? "border-primary bg-primary/10 text-primary glow-forest"
                                        : "border-border/50 text-muted-foreground hover:border-border hover:bg-muted/40"
                                )}
                            >
                                <Moon size={14} />
                                Dark
                            </button>
                        </div>
                    </section>

                    {/* ── About ── */}
                    <section className="space-y-3 pt-4 border-t border-border/50">
                        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">About</h2>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>EPP Analytics</span>
                            <span className="w-px h-3 bg-border/50" />
                            <span className="font-data">Version 0.1.0</span>
                            <span className="w-px h-3 bg-border/50" />
                            <span>Built with Tauri + Next.js</span>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

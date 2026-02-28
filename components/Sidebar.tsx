"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Sprout, BarChart3, Settings2, Database, History, PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/upload", label: "Raw Data", icon: Database },
    { href: "/report", label: "Report Builder", icon: BarChart3 },
    { href: "/istoric", label: "Istoric", icon: History },
    { href: "/settings", label: "Settings", icon: Settings2 },
];

export function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    // Load collapsed state from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem("sidebar-collapsed");
        if (stored !== null) {
            setCollapsed(stored === "true");
        }
    }, []);

    // Save collapsed state to localStorage when it changes
    useEffect(() => {
        localStorage.setItem("sidebar-collapsed", String(collapsed));
    }, [collapsed]);

    const toggleCollapsed = () => setCollapsed((prev) => !prev);

    return (
        <aside
            className={cn(
                "bg-card/60 border-r border-border/40 backdrop-blur-md flex flex-col relative overflow-hidden transition-all duration-300 ease-in-out",
                collapsed ? "w-20" : "w-64"
            )}
        >
            {/* Botanical corner accent */}
            <div className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                    <path
                        d="M75,10 Q85,20 80,35 Q75,50 85,65 Q90,75 80,85 Q70,90 55,85 Q40,80 25,85"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="0.5"
                        className="text-primary"
                    />
                    <path
                        d="M85,5 Q95,15 90,30 Q85,45 95,60 Q100,70 90,80"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="0.5"
                        className="text-primary"
                        opacity="0.6"
                    />
                    <ellipse cx="70" cy="70" rx="20" ry="10" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-primary" opacity="0.4" />
                </svg>
            </div>

            {/* Logo with collapse toggle */}
            <div className="h-16 flex items-center justify-between px-3 border-b border-border/40 relative z-10">
                <div className={cn(
                    "flex items-center transition-all duration-300",
                    collapsed ? "justify-center w-full" : "gap-2.5"
                )}>
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-[#D4B896] flex items-center justify-center shadow-lg shrink-0">
                        <Sprout className="w-4 h-4 text-primary" strokeWidth={2} />
                    </div>
                    <div className={cn(
                        "transition-opacity duration-200 overflow-hidden",
                        collapsed ? "w-0 opacity-0" : "opacity-100"
                    )}>
                        <div>
                            <span className="text-base font-medium tracking-tight text-gradient-botanical font-display block">
                                EPP Analytics
                            </span>
                            <span className="text-[9px] text-muted-foreground/60 uppercase tracking-[0.2em] font-body block">
                                Botanical Insights
                            </span>
                        </div>
                    </div>
                </div>

                {/* Collapse toggle button */}
                <button
                    onClick={toggleCollapsed}
                    className={cn(
                        "shrink-0 rounded-lg flex items-center justify-center transition-all duration-200",
                        "hover:bg-accent/20 hover:text-accent text-muted-foreground",
                        "w-8 h-8"
                    )}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-1 relative z-10">
                {navItems.map(({ href, label, icon: Icon }, idx) => {
                    const active = pathname.startsWith(href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "group relative flex items-center rounded-xl text-sm font-medium transition-all duration-300",
                                collapsed ? "justify-center h-12 px-3" : "gap-3 px-3.5 py-3",
                                active
                                    ? "shadow-md"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                            style={{
                                animationDelay: `${idx * 50}ms`,
                            }}
                        >
                            {active ? (
                                <>
                                    {/* Active state with champagne gold gradient */}
                                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-accent to-[#D4B896] animate-shimmer" />
                                    <div className="absolute inset-0 rounded-xl shadow-lg shadow-accent/20" />
                                </>
                            ) : (
                                <span className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            )}

                            <Icon
                                size={18}
                                className={cn(
                                    "transition-colors relative z-10 shrink-0",
                                    active ? "text-[#1A3C34]" : "text-muted-foreground group-hover:text-foreground"
                                )}
                            />
                            <span className={cn(
                                "relative z-10 transition-all duration-200 overflow-hidden",
                                collapsed ? "w-0 opacity-0" : "opacity-100",
                                active ? "text-[#1A3C34] font-semibold" : ""
                            )}>{label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className={cn(
                "border-t border-border/40 relative z-10 transition-all duration-300",
                collapsed ? "px-3 py-4 flex justify-center" : "px-5 py-4"
            )}>
                <div className={cn(
                    "flex items-center justify-between w-full",
                    collapsed ? "flex-col gap-3" : ""
                )}>
                    <div className={cn(
                        "transition-all duration-200 overflow-hidden",
                        collapsed ? "w-0 h-0 opacity-0" : "opacity-100"
                    )}>
                        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-body">Version</p>
                        <p className="text-xs font-data text-muted-foreground">v0.1.0</p>
                    </div>

                    <div className={cn(
                        "flex items-center gap-2",
                        collapsed ? "gap-0" : "gap-1.5"
                    )}>
                        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        <div className="w-1.5 h-1.5 rounded-full bg-chart-2/50" />
                        <div className="w-1.5 h-1.5 rounded-full bg-chart-4/40" />
                    </div>
                </div>
            </div>
        </aside>
    );
}

"use client";

import { useState, useEffect, useRef } from "react";

export interface AutocompleteItem {
    type: "function" | "column";
    name: string;
    detail?: string;
    icon?: string;
}

interface FormulaAutocompleteProps {
    query: string;
    columns: string[];
    onSelect: (item: AutocompleteItem) => void;
    onClose: () => void;
    position: { top: number; left: number };
}

export function FormulaAutocomplete({
    query,
    columns,
    onSelect,
    onClose,
    position
}: FormulaAutocompleteProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);

    // Function definitions aligned with FunctionReference
    const functions = [
        { name: "SUM", detail: "Aggregate function", icon: "📊" },
        { name: "AVG", detail: "Aggregate function", icon: "📊" },
        { name: "COUNT", detail: "Aggregate function", icon: "📊" },
        { name: "MIN", detail: "Aggregate function", icon: "📊" },
        { name: "MAX", detail: "Aggregate function", icon: "📊" },
        { name: "ROUND", detail: "Math function", icon: "🔢" },
        { name: "ABS", detail: "Math function", icon: "🔢" },
        { name: "POWER", detail: "Math function", icon: "🔢" },
        { name: "IF", detail: "Logic function", icon: "🧠" },
        { name: "CASE", detail: "Logic function", icon: "🧠" },
        { name: "COALESCE", detail: "Logic function", icon: "🧠" },
        { name: "NULLIF", detail: "Logic function", icon: "🧠" },
        { name: "CONCAT", detail: "Text function", icon: "📝" },
        { name: "UPPER", detail: "Text function", icon: "📝" },
        { name: "LOWER", detail: "Text function", icon: "📝" },
        { name: "SUBSTRING", detail: "Text function", icon: "📝" },
        { name: "LENGTH", detail: "Text function", icon: "📝" },
        { name: "TRIM", detail: "Text function", icon: "📝" },
        { name: "NOW", detail: "Date function", icon: "📅" },
        { name: "YEAR", detail: "Date function", icon: "📅" },
        { name: "MONTH", detail: "Date function", icon: "📅" },
        { name: "DAY", detail: "Date function", icon: "📅" },
        { name: "DATEDIFF", detail: "Date function", icon: "📅" },
        { name: "DATE", detail: "Date function", icon: "📅" },
    ];

    // Filter suggestions based on query
    const suggestions: AutocompleteItem[] = [
        ...functions.filter(f =>
            f.name.toLowerCase().startsWith(query.toLowerCase())
        ).map(f => ({ ...f, type: "function" as const })),
        ...columns.filter(c =>
            c.toLowerCase().includes(query.toLowerCase())
        ).map(c => ({ name: c, type: "column" as const, icon: "📄" }))
    ];

    // Reset selected index when suggestions change
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && suggestions[selectedIndex]) {
                e.preventDefault();
                onSelect(suggestions[selectedIndex]);
            } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [suggestions, selectedIndex, onSelect, onClose]);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    if (suggestions.length === 0) return null;

    return (
        <div
            ref={menuRef}
            className="fixed z-50 w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto"
            style={{ top: position.top + 24, left: position.left }}
        >
            {suggestions.map((item, index) => (
                <button
                    key={`${item.type}-${item.name}`}
                    onClick={() => onSelect(item)}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                        index === selectedIndex
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-muted"
                    }`}
                >
                    <span className="text-base">{item.icon}</span>
                    <span className="font-medium">{item.name}</span>
                    {item.detail && (
                        <span className="text-xs text-muted-foreground ml-auto">{item.detail}</span>
                    )}
                </button>
            ))}
        </div>
    );
}

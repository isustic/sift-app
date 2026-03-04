"use client";

import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";

interface Column {
    id: number;
    name: string;
    col_type: "INTEGER" | "REAL" | "TEXT";
}

interface ColumnPickerProps {
    datasetId: number | null;
    selected: string[];
    onChange: (columns: string[]) => void;
    placeholder?: string;
}

export function ColumnPicker({ datasetId, selected, onChange, placeholder = "Select columns" }: ColumnPickerProps) {
    const [columns, setColumns] = useState<Column[]>([]);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (datasetId) {
            invoke<Column[]>("get_columns", { datasetId }).then(setColumns);
        }
    }, [datasetId]);

    const toggleColumn = (name: string) => {
        if (selected.includes(name)) {
            onChange(selected.filter((c) => c !== name));
        } else {
            onChange([...selected, name]);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="px-3 py-2 border border-border/40 rounded-lg text-sm text-left hover:bg-muted/30 transition-colors min-w-[150px]"
            >
                {selected.length > 0 ? `${selected.length} selected` : placeholder}
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute top-full left-0 mt-1 w-[200px] bg-card border border-border/40 rounded-lg shadow-lg z-20 max-h-[300px] overflow-auto">
                        {columns.map((col) => (
                            <button
                                key={col.id}
                                onClick={() => toggleColumn(col.name)}
                                className="w-full px-3 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors"
                            >
                                <span className="text-sm">{col.name}</span>
                                {selected.includes(col.name) && (
                                    <Check className="w-4 h-4 text-primary" />
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

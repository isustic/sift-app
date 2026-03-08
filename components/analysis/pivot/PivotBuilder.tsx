"use client";

import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from "@dnd-kit/core";
import { PivotDropZone } from "./PivotDropZone";
import { DraggableColumn } from "./DraggableColumn";
import { Button } from "@/components/ui/button";
import { Play, Save, LoaderIcon } from "lucide-react";

interface PivotBuilderProps {
    columns: string[];
    onRun: (config: PivotConfig) => void;
    onSave: () => void;
    isLoading?: boolean;
    compact?: boolean;
}

export interface PivotConfig {
    rows: string[];
    columns: string[];
    values: Array<{ column: string; agg: string }>;
    filters: Array<{ column: string; operator: string; value: string }>;
}

export function PivotBuilder({ columns, onRun, onSave, isLoading = false, compact = false }: PivotBuilderProps) {
    const [rows, setRows] = useState<string[]>([]);
    const [cols, setCols] = useState<string[]>([]);
    const [values, setValues] = useState<Array<{ column: string; agg: string }>>([]);
    const [activeId, setActiveId] = useState<string | null>(null);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const columnId = active.id as string;
        const zoneId = over.id as string;

        if (zoneId === "rows" && !rows.includes(columnId)) {
            setRows([...rows, columnId]);
        } else if (zoneId === "columns" && !cols.includes(columnId)) {
            setCols([...cols, columnId]);
        } else if (zoneId === "values" && !values.find((v) => v.column === columnId)) {
            setValues([...values, { column: columnId, agg: "SUM" }]);
        }
    };

    const handleRemove = (zone: "rows" | "columns" | "values", id: string) => {
        if (zone === "rows") setRows(rows.filter((r) => r !== id));
        if (zone === "columns") setCols(cols.filter((c) => c !== id));
        if (zone === "values") setValues(values.filter((v) => v.column !== id));
    };

    const handleRun = () => {
        onRun({ rows, columns: cols, values, filters: [] });
    };

    // Compact layout for side-by-side view
    if (compact) {
        return (
            <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
                <div className="space-y-3">
                    {/* Available Columns */}
                    <div className="space-y-1.5">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium px-1">Available Columns</p>
                        <div className="flex flex-wrap gap-1">
                            {columns
                                .filter((c) => !rows.includes(c) && !cols.includes(c) && !values.find((v) => v.column === c))
                                .map((col) => (
                                    <DraggableColumn key={col} id={col} label={col} compact />
                                ))}
                        </div>
                    </div>

                    {/* Drop Zones - Stacked */}
                    <div className="space-y-2">
                        <PivotDropZone id="rows" label="ROWS" compact>
                            {rows.map((r) => (
                                <DraggableColumn key={r} id={r} label={r} onRemove={() => handleRemove("rows", r)} compact />
                            ))}
                        </PivotDropZone>

                        <PivotDropZone id="columns" label="COLUMNS" compact>
                            {cols.map((c) => (
                                <DraggableColumn key={c} id={c} label={c} onRemove={() => handleRemove("columns", c)} compact />
                            ))}
                        </PivotDropZone>

                        <PivotDropZone id="values" label="VALUES" compact>
                            {values.map((v) => (
                                <div key={v.column} className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded text-xs" title={`${v.agg}(${v.column})`}>
                                    <span className="truncate">{v.agg}({v.column})</span>
                                    <button onClick={() => handleRemove("values", v.column)} className="text-muted-foreground hover:text-destructive shrink-0 text-[10px]">×</button>
                                </div>
                            ))}
                        </PivotDropZone>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                        <Button
                            onClick={handleRun}
                            size="sm"
                            disabled={isLoading || rows.length === 0 || values.length === 0}
                            className="h-7 px-3 text-xs flex-1"
                            title={rows.length === 0 ? "At least one row column is required" : values.length === 0 ? "At least one value column is required" : ""}
                        >
                            {isLoading ? (
                                <LoaderIcon className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                                <Play className="w-3 h-3 mr-1" />
                            )}
                            {isLoading ? "Running..." : "Run"}
                        </Button>
                        <Button onClick={onSave} size="sm" variant="outline" disabled={isLoading} className="h-7 px-3 text-xs">
                            <Save className="w-3 h-3 mr-1" />
                        </Button>
                    </div>
                </div>

                <DragOverlay>
                    {activeId ? (
                        <div className="px-2 py-1 bg-primary text-primary-foreground rounded shadow-lg text-xs">
                            {activeId}
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        );
    }

    // Original layout
    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
            <div className="flex gap-4">
                {/* Available Columns */}
                <div className="w-56 space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Available</p>
                    <div className="space-y-1">
                        {columns
                            .filter((c) => !rows.includes(c) && !cols.includes(c) && !values.find((v) => v.column === c))
                            .map((col) => (
                                <DraggableColumn key={col} id={col} label={col} />
                            ))}
                    </div>
                </div>

                {/* Drop Zones */}
                <div className="flex-1 grid grid-cols-2 gap-4">
                    <PivotDropZone id="rows" label="ROWS">
                        {rows.map((r) => (
                            <DraggableColumn key={r} id={r} label={r} onRemove={() => handleRemove("rows", r)} />
                        ))}
                    </PivotDropZone>

                    <PivotDropZone id="columns" label="COLUMNS">
                        {cols.map((c) => (
                            <DraggableColumn key={c} id={c} label={c} onRemove={() => handleRemove("columns", c)} />
                        ))}
                    </PivotDropZone>

                    <PivotDropZone id="values" label="VALUES" className="col-span-2">
                        {values.map((v) => (
                            <div key={v.column} className="flex items-center gap-2 px-2 py-1 bg-primary/10 rounded text-sm" title={`${v.agg}(${v.column})`}>
                                <span className="truncate">{v.agg}({v.column})</span>
                                <button onClick={() => handleRemove("values", v.column)} className="text-muted-foreground hover:text-destructive shrink-0">×</button>
                            </div>
                        ))}
                    </PivotDropZone>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4">
                <Button
                    onClick={handleRun}
                    size="sm"
                    disabled={isLoading || rows.length === 0 || values.length === 0}
                    title={rows.length === 0 ? "At least one row column is required" : values.length === 0 ? "At least one value column is required" : ""}
                >
                    {isLoading ? (
                        <LoaderIcon className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                        <Play className="w-4 h-4 mr-1" />
                    )}
                    {isLoading ? "Running..." : "Run"}
                </Button>
                <Button onClick={onSave} size="sm" variant="outline" disabled={isLoading}>
                    <Save className="w-4 h-4 mr-1" />
                    Save
                </Button>
            </div>

            <DragOverlay>
                {activeId ? (
                    <div className="px-3 py-2 bg-primary text-primary-foreground rounded shadow-lg text-sm">
                        {activeId}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

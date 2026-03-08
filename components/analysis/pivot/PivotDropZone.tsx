"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface PivotDropZoneProps {
    id: string;
    label: string;
    children: React.ReactNode;
    className?: string;
    compact?: boolean;
}

export function PivotDropZone({ id, label, children, className, compact = false }: PivotDropZoneProps) {
    const { setNodeRef, isOver } = useDroppable({ id });

    if (compact) {
        return (
            <div className={cn("space-y-1", className)}>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium px-1">{label}</p>
                <div
                    ref={setNodeRef}
                    className={cn(
                        "min-h-[32px] bg-card/50 border border-border/40 rounded-md p-1.5 transition-colors flex flex-wrap gap-1",
                        isOver && "border-primary bg-primary/5"
                    )}
                >
                    {children || (
                        <p className="text-[10px] text-muted-foreground/60">Drag here</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={cn("space-y-2", className)}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
            <div
                ref={setNodeRef}
                className={cn(
                    "min-h-[60px] bg-card/50 border border-border/40 rounded-lg p-2 transition-colors",
                    isOver && "border-primary bg-primary/5"
                )}
            >
                {children || (
                    <p className="text-xs text-muted-foreground/60 text-center py-4">Drag columns here</p>
                )}
            </div>
        </div>
    );
}

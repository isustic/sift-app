"use client";

import { useDraggable } from "@dnd-kit/core";

interface DraggableColumnProps {
    id: string;
    label: string;
    onRemove?: () => void;
    compact?: boolean;
}

export function DraggableColumn({ id, label, onRemove, compact = false }: DraggableColumnProps) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });

    if (compact) {
        return (
            <div
                ref={setNodeRef}
                className={`px-2 py-1 bg-muted/50 rounded text-xs hover:bg-muted transition-colors flex items-center gap-1.5 max-w-full ${
                    isDragging ? "opacity-50" : ""
                }`}
                title={label}
            >
                <span {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing flex-1 min-w-0 truncate">
                    {label}
                </span>
                {onRemove && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}
                        className="text-muted-foreground hover:text-destructive cursor-pointer shrink-0 text-[10px] leading-none"
                    >
                        ×
                    </button>
                )}
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            className={`px-3 py-2 bg-muted/50 rounded text-sm hover:bg-muted transition-colors flex items-center justify-between gap-2 ${
                isDragging ? "opacity-50" : ""
            }`}
            title={label}
        >
            <span {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing flex-1 min-w-0 truncate">
                {label}
            </span>
            {onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                >
                    ×
                </button>
            )}
        </div>
    );
}

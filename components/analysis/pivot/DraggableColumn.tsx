"use client";

import { useDraggable } from "@dnd-kit/core";

interface DraggableColumnProps {
    id: string;
    label: string;
    onRemove?: () => void;
}

export function DraggableColumn({ id, label, onRemove }: DraggableColumnProps) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });

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

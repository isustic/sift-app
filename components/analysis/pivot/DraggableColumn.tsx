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
            {...listeners}
            {...attributes}
            className={`px-3 py-2 bg-muted/50 rounded text-sm cursor-grab active:cursor-grabbing hover:bg-muted transition-colors flex items-center justify-between ${
                isDragging ? "opacity-50" : ""
            }`}
        >
            <span>{label}</span>
            {onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="text-muted-foreground hover:text-destructive ml-2"
                >
                    ×
                </button>
            )}
        </div>
    );
}

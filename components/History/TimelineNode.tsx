"use client";

import { Calendar, Clock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineNodeProps {
  type: 'year' | 'month';
  label: string | number;
  count?: number;
  expanded: boolean;
  onClick: () => void;
}

export function TimelineNode({ type, label, count, expanded, onClick }: TimelineNodeProps) {
  const isYear = type === 'year';

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full transition-all duration-300",
        "hover:scale-[1.02] active:scale-[0.98]"
      )}
    >
      {/* Timeline node */}
      <div className="relative">
        {/* Glow effect */}
        <div className={cn(
          "absolute inset-0 rounded-full blur-md transition-all duration-300",
          isYear && "bg-primary/30 animate-pulse-glow"
        )} />

        {/* Main circle */}
        <div className={cn(
          "relative rounded-full bg-background flex items-center justify-center border-2 transition-all duration-300",
          isYear
            ? "w-10 h-10 border-primary hover:scale-105"
            : "w-7 h-7 border-accent/70 hover:border-accent hover:scale-105",
          expanded && "scale-110 shadow-lg"
        )}>
          {isYear ? (
            <Calendar className="w-5 h-5 text-primary" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-accent" />
          )}
        </div>
      </div>

      {/* Label */}
      <div className="flex items-center gap-2">
        <span className={cn(
          "font-semibold",
          isYear ? "text-base" : "text-sm"
        )}>
          {label}
        </span>

        {count !== undefined && (
          <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted/50 font-data">
            {count}
          </span>
        )}
      </div>

      {/* Expand indicator */}
      {isYear && (
        <ChevronDown className={cn(
          "w-4 h-4 ml-auto text-muted-foreground transition-transform duration-300",
          !expanded && "-rotate-90"
        )} />
      )}
    </button>
  );
}

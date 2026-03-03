"use client";

import { cn } from "@/lib/utils";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterChipsProps {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

export function FilterChips({ options, value, onChange }: FilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-300",
            value === option.value
              ? "bg-primary text-primary-foreground shadow-md btn-botanical"
              : "bg-card/50 border border-border/50 hover:border-accent/50 hover:bg-accent/10"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

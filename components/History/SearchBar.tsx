"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  resultCount?: number;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  resultCount,
  placeholder = "Search datasets...",
}: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />

      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "pl-10 pr-10 bg-card/50 border-border/50",
          "focus:border-accent/50 focus:ring-accent/20 transition-all"
        )}
      />

      {value && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {resultCount !== undefined && (
            <span className="text-xs text-muted-foreground font-data">
              {resultCount} {resultCount === 1 ? 'result' : 'results'}
            </span>
          )}

          <button
            onClick={() => onChange('')}
            className="p-0.5 rounded-full hover:bg-muted transition-colors"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { FileSpreadsheet, Calendar, Folder, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatasetCardProps {
  name: string;
  createdAt: string;
  fileOrigin: string;
  rowCount: number;
  columnCount?: number;
  isFavorite?: boolean;
  onFavorite?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
}

export function DatasetCard({
  name,
  createdAt,
  fileOrigin,
  rowCount,
  columnCount,
  isFavorite = false,
  onFavorite,
  onDelete,
  onClick,
}: DatasetCardProps) {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");

    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative ml-10 p-4 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden",
        "bg-card/60 backdrop-blur-sm hover:bg-card/80",
        "hover:-translate-y-1 hover:shadow-xl",
        "before:absolute before:inset-0 before:rounded-xl before:opacity-0 before:transition-opacity hover:before:opacity-100",
        "before:bg-gradient-to-br before:from-primary/5 before:to-accent/5"
      )}
    >
      {/* Animated border gradient */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute inset-[1px] rounded-xl bg-background/80" />

      {/* Content */}
      <div className="relative flex items-start gap-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/10 group-hover:scale-110 transition-transform">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
            {name}
          </h3>

          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3 shrink-0" />
            <span className="font-data">{formatDate(createdAt)}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Folder className="w-3 h-3 shrink-0" />
            <span className="truncate">{fileOrigin}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs font-medium text-primary font-data">
            {rowCount.toLocaleString()} rows
          </span>
          {columnCount && (
            <span className="text-xs text-muted-foreground font-data">
              {columnCount} columns
            </span>
          )}
        </div>
      </div>

      {/* Quick actions */}
      {(onFavorite || onDelete) && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFavorite();
              }}
              className={cn(
                "p-1.5 rounded-lg bg-background/80 backdrop-blur-sm transition-all hover:scale-110",
                isFavorite
                  ? "text-accent hover:bg-accent/20"
                  : "text-muted-foreground hover:text-accent hover:bg-accent/10"
              )}
            >
              <Star className={cn("w-3.5 h-3.5", isFavorite && "fill-current")} />
            </button>
          )}

          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 rounded-lg bg-background/80 backdrop-blur-sm text-muted-foreground transition-all hover:text-destructive hover:bg-destructive/20 hover:scale-110"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

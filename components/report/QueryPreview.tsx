import { cn } from "@/lib/utils";
import { Code } from "lucide-react";

interface QueryPreviewProps {
  query: string;
  className?: string;
}

export function QueryPreview({ query, className }: QueryPreviewProps) {
  return (
    <div
      className={cn(
        "rounded-lg bg-muted/50 border border-border/50 p-4",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <Code className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">Query Preview</h3>
      </div>
      <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-all">
        {query || "SELECT ..."}
      </pre>
    </div>
  );
}

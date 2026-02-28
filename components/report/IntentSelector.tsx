import { cn } from "@/lib/utils";
import { Search, BarChart3, TrendingUp, Settings } from "lucide-react";

export type IntentType = "raw" | "summary" | "trends" | "advanced";

export interface Intent {
  id: IntentType;
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

const INTENTS: Intent[] = [
  {
    id: "raw",
    icon: Search,
    title: "Raw Data",
    description: "Navigate and filter data with columns, filters, and sorting. See records exactly as they appear.",
    color: "from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/10",
  },
  {
    id: "summary",
    icon: BarChart3,
    title: "Summary",
    description: "Group by dimensions and calculate metrics like sum, count, average. Build custom aggregations.",
    color: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/10",
  },
  {
    id: "trends",
    icon: TrendingUp,
    title: "Trends",
    description: "Analyze patterns over time. Group by month, quarter, or year to see trends and changes.",
    color: "from-violet-500/10 to-violet-600/5 border-violet-500/20 hover:border-violet-500/40 hover:bg-violet-500/10",
  },
  {
    id: "advanced",
    icon: Settings,
    title: "Advanced",
    description: "Full control over all options. Combine grouping, metrics, date bucketing, and custom filters.",
    color: "from-amber-500/10 to-amber-600/5 border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/10",
  },
];

interface IntentSelectorProps {
  selected: IntentType | null;
  onSelect: (intent: IntentType) => void;
  disabled?: boolean;
}

export function IntentSelector({ selected, onSelect, disabled }: IntentSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {INTENTS.map((intent) => {
        const Icon = intent.icon;
        const isSelected = selected === intent.id;
        return (
          <button
            key={intent.id}
            onClick={() => !disabled && onSelect(intent.id)}
            disabled={disabled}
            className={cn(
              "relative p-4 rounded-xl border transition-all duration-200 text-left",
              "bg-gradient-to-br",
              intent.color,
              isSelected && "ring-2 ring-primary/50 shadow-lg",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                isSelected ? "bg-primary/20 text-primary" : "bg-background/60 text-muted-foreground"
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium mb-1">{intent.title}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {intent.description}
                </p>
              </div>
            </div>
            {isSelected && (
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}

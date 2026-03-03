import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProgramBadgeProps {
  program: string;
  percent: string;
  className?: string;
}

export function ProgramBadge({ program, percent, className }: ProgramBadgeProps) {
  // Determine badge variant based on program
  const getVariant = () => {
    if (program === "-" || program === "") return "outline";
    if (program.includes("Starter")) return "secondary";
    if (program.includes("Explorer")) return "default";
    if (program.includes("Artist")) return "outline";
    if (program.includes("Prestige")) return "default";
    return "outline";
  };

  const getColorClass = () => {
    if (program === "-" || program === "") return "text-muted-foreground border-border";
    if (program.includes("Starter")) return "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600";
    if (program.includes("Explorer")) return "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700";
    if (program.includes("Artist")) return "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700";
    if (program.includes("Prestige")) return "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700";
    return "";
  };

  return (
    <Badge
      variant={getVariant()}
      className={cn(
        "font-medium text-xs",
        getColorClass(),
        className
      )}
    >
      {program !== "-" ? program : "-"}
    </Badge>
  );
}

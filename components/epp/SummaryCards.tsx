import { Card } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

interface SummaryCardsProps {
  agentName: string;
  clientCount: number;
  totalAnual: number;
  averagePerClient: number;
  className?: string;
}

export function SummaryCards({
  agentName,
  clientCount,
  totalAnual,
  averagePerClient,
  className,
}: SummaryCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency: "RON",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("ro-RO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const cards = [
    {
      label: "Agent",
      value: agentName,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Clients",
      value: formatNumber(clientCount),
      icon: Calculator,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Total Anual",
      value: formatCurrency(totalAnual),
      icon: DollarSign,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Avg/Client",
      value: formatCurrency(averagePerClient),
      icon: TrendingUp,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <div className={cn("grid grid-cols-4 gap-2", className)}>
      {cards.map((card) => (
        <Card key={card.label} className="p-2">
          <div className="flex items-center gap-2">
            <div className={cn("p-1 rounded", card.bgColor)}>
              <card.icon className={cn("w-3 h-3", card.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] uppercase tracking-wide text-muted-foreground leading-none">
                {card.label}
              </p>
              <p className="text-xs font-medium truncate mt-0.5" title={card.value}>
                {card.value}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

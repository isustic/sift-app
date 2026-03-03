"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, Database } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsBarProps {
  thisMonthCount: number;
  thisYearCount: number;
  totalCount: number;
}

export function StatsBar({
  thisMonthCount,
  thisYearCount,
  totalCount,
}: StatsBarProps) {
  const [displayedMonth, setDisplayedMonth] = useState(0);
  const [displayedYear, setDisplayedYear] = useState(0);
  const [displayedTotal, setDisplayedTotal] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out

      setDisplayedMonth(Math.floor(eased * thisMonthCount));
      setDisplayedYear(Math.floor(eased * thisYearCount));
      setDisplayedTotal(Math.floor(eased * totalCount));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [thisMonthCount, thisYearCount, totalCount]);

  return (
    <div className="flex items-center gap-6 px-4 py-3 bg-card/30 border-y border-border/40 glass-card">
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <div className="absolute inset-0 rounded-full bg-accent blur-sm animate-pulse" />
        </div>
        <span className="text-sm text-muted-foreground">This month</span>
        <span className="text-lg font-bold text-primary font-data">
          {displayedMonth.toLocaleString()}
        </span>
      </div>

      <div className="w-px h-4 bg-border/40" />

      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">This year</span>
        <span className="text-lg font-bold text-primary font-data">
          {displayedYear.toLocaleString()}
        </span>
      </div>

      <div className="w-px h-4 bg-border/40" />

      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-lg font-bold text-primary font-data">
          {displayedTotal.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

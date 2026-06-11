"use client";

import { ChartCard } from "@/components/analytics/chart-card";
import { cn } from "@/lib/utils/cn";
import { ShieldCheck } from "lucide-react";

interface SLAComplianceChartProps {
  data: { areaName: string; compliancePercent: number; withinSLA: number; totalResolved: number }[];
}

export function SLAComplianceChart({ data }: SLAComplianceChartProps) {
  if (data.length === 0) {
    return (
      <ChartCard title="Cumplimiento de SLA" description="% de tickets resueltos dentro del SLA">
        <div className="flex flex-col items-center justify-center h-[200px] text-sm text-muted-foreground gap-2">
          <ShieldCheck className="h-8 w-8 text-muted-foreground/30" />
          <span>Sin datos de SLA disponibles</span>
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Cumplimiento de SLA" description="% de tickets resueltos dentro del SLA configurado">
      <div className="space-y-5">
        {data.map((item) => {
          const color = item.compliancePercent >= 80
            ? "bg-emerald-500"
            : item.compliancePercent >= 60
              ? "bg-yellow-500"
              : "bg-red-500";
          const textColor = item.compliancePercent >= 80
            ? "text-emerald-600 dark:text-emerald-400"
            : item.compliancePercent >= 60
              ? "text-yellow-600 dark:text-yellow-400"
              : "text-red-600 dark:text-red-400";

          return (
            <div key={item.areaName} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{item.areaName}</span>
                <span className={cn("text-sm font-bold", textColor)}>
                  {item.compliancePercent}%
                </span>
              </div>
              <div className="relative">
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500 ease-out", color)}
                    style={{ width: `${item.compliancePercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {item.withinSLA} de {item.totalResolved} tickets dentro del SLA
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}

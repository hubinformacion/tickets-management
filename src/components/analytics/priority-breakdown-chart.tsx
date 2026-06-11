"use client";

import { PieChart } from "@/components/analytics/charts/pie-chart";
import { ChartCard } from "@/components/analytics/chart-card";
import { PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/constants/analytics";
import type { PriorityCount } from "@/db/queries/analytics";

interface PriorityBreakdownChartProps {
  data: PriorityCount[];
}

export function PriorityBreakdownChart({ data }: PriorityBreakdownChartProps) {
  const chartData = data.map((item) => ({
    name: PRIORITY_LABELS[item.priority] || item.priority,
    value: item.count,
    color: PRIORITY_COLORS[item.priority] || "#94a3b8",
  }));

  return (
    <ChartCard title="Tickets por prioridad" description="Solo tickets con prioridad asignada">
      <PieChart data={chartData} height={250} innerRadius={50} />
    </ChartCard>
  );
}

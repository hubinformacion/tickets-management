"use client";

import { PieChart } from "@/components/analytics/charts/pie-chart";
import { ChartCard } from "@/components/analytics/chart-card";
import { AREA_COLORS } from "@/lib/constants/analytics";
import type { AreaCount } from "@/db/queries/analytics";

interface AreaDistributionChartProps {
  data: AreaCount[];
}

export function AreaDistributionChart({ data }: AreaDistributionChartProps) {
  const chartData = data.map((item) => ({
    name: item.areaName,
    value: item.count,
    color: AREA_COLORS[item.areaSlug] || "#94a3b8",
  }));

  return (
    <ChartCard title="Distribución por área" description="Todos los tiempos">
      <PieChart data={chartData} height={250} />
    </ChartCard>
  );
}

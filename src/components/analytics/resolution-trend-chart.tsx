"use client";

import { LineChart } from "@/components/analytics/charts/line-chart";
import { ChartCard } from "@/components/analytics/chart-card";
import type { WeeklyResolution } from "@/db/queries/analytics";

interface ResolutionTrendChartProps {
  data: WeeklyResolution[];
}

export function ResolutionTrendChart({ data }: ResolutionTrendChartProps) {
  const chartData = data.map((item) => ({
    name: item.week,
    Creados: item.created,
    Resueltos: item.resolved,
  }));

  return (
    <ChartCard title="Tendencia semanal" description="Tickets creados vs resueltos">
      <LineChart
        data={chartData}
        lines={[
          { key: "Creados", color: "#3b82f6", label: "Creados" },
          { key: "Resueltos", color: "#22c55e", label: "Resueltos" },
        ]}
        height={250}
      />
    </ChartCard>
  );
}

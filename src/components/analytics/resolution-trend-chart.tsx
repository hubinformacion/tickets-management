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
    Cierres: item.resolved,
  }));

  return (
    <ChartCard title="Tendencia semanal" description="Altas y cierres registrados en el periodo · Lima">
      <LineChart
        data={chartData}
        lines={[
          { key: "Creados", color: "#3b82f6", label: "Creados" },
          { key: "Cierres", color: "#22c55e", label: "Cierres" },
        ]}
        height={250}
      />
    </ChartCard>
  );
}

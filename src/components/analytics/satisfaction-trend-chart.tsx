"use client";

import { LineChart } from "@/components/analytics/charts/line-chart";
import { ChartCard } from "@/components/analytics/chart-card";
import type { SatisfactionTrend } from "@/db/queries/analytics";

interface SatisfactionTrendChartProps {
  data: SatisfactionTrend[];
}

export function SatisfactionTrendChart({ data }: SatisfactionTrendChartProps) {
  const chartData = data.map((item) => ({
    name: item.month,
    "Satisfacción promedio": Math.round(item.avgRating * 10) / 10,
  }));

  return (
    <ChartCard title="Tendencia de satisfacción" description="Calificación promedio por mes">
      <LineChart
        data={chartData}
        lines={[
          { key: "Satisfacción promedio", color: "#f59e0b", label: "Satisfacción promedio" },
        ]}
        height={250}
      />
    </ChartCard>
  );
}

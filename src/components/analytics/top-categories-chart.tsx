"use client";

import { BarChart } from "@/components/analytics/charts/bar-chart";
import { ChartCard } from "@/components/analytics/chart-card";
import type { CategoryCount } from "@/db/queries/analytics";

interface TopCategoriesChartProps {
  data: CategoryCount[];
}

export function TopCategoriesChart({ data }: TopCategoriesChartProps) {
  const chartData = data.map((item) => ({
    name: item.categoryName,
    value: item.count,
  }));

  return (
    <ChartCard title="Top categorías" description="Categorías con más tickets">
      <BarChart data={chartData} height={250} layout="vertical" />
    </ChartCard>
  );
}

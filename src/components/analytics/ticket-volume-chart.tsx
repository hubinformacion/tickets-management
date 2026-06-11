"use client";

import { BarChart } from "@/components/analytics/charts/bar-chart";
import { ChartCard } from "@/components/analytics/chart-card";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants/analytics";
import type { StatusCount } from "@/db/queries/analytics";

interface TicketVolumeChartProps {
  data: StatusCount[];
}

export function TicketVolumeChart({ data }: TicketVolumeChartProps) {
  const chartData = data.map((item) => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
    color: STATUS_COLORS[item.status] || "#94a3b8",
  }));

  return (
    <ChartCard title="Tickets por estado" description="Distribución actual">
      <BarChart data={chartData} height={250} />
    </ChartCard>
  );
}

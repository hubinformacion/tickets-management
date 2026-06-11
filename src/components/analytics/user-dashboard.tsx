"use client";

import { KpiCard } from "@/components/analytics/kpi-card";
import { PieChart } from "@/components/analytics/charts/pie-chart";
import { ChartCard } from "@/components/analytics/chart-card";
import { Ticket, Clock, CheckCircle, Star, TrendingUp } from "lucide-react";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants/analytics";

interface UserDashboardProps {
  kpis: {
    totalTickets: number;
    pendingCount: number;
    resolvedCount: number;
    avgSatisfaction: number;
  };
}

export function UserAnalyticsDashboard({ kpis }: UserDashboardProps) {
  const openCount = Math.max(0, kpis.totalTickets - kpis.pendingCount - kpis.resolvedCount);
  const resolutionRate = kpis.totalTickets > 0 ? Math.round((kpis.resolvedCount / kpis.totalTickets) * 100) : 0;

  const pieData = [
    { name: STATUS_LABELS.open, value: openCount, color: STATUS_COLORS.open },
    { name: STATUS_LABELS.in_progress, value: kpis.pendingCount, color: STATUS_COLORS.in_progress },
    { name: STATUS_LABELS.resolved, value: kpis.resolvedCount, color: STATUS_COLORS.resolved },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-8">
      {/* Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Mis tickets"
          value={kpis.totalTickets}
          icon={<Ticket className="h-5 w-5" />}
          iconClassName="text-blue-500 bg-blue-500/10"
        />
        <KpiCard
          title="Pendientes"
          value={kpis.pendingCount}
          icon={<Clock className="h-5 w-5" />}
          iconClassName="text-amber-500 bg-amber-500/10"
        />
        <KpiCard
          title="Resueltos"
          value={kpis.resolvedCount}
          icon={<CheckCircle className="h-5 w-5" />}
          iconClassName="text-emerald-500 bg-emerald-500/10"
        />
        <KpiCard
          title="Mi satisfacción"
          value={kpis.avgSatisfaction > 0 ? `${kpis.avgSatisfaction}/5` : "-"}
          icon={<Star className="h-5 w-5" />}
          iconClassName="text-yellow-500 bg-yellow-500/10"
        />
      </div>

      {/* Section: Resumen */}
      <div>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Resumen</h3>
          <p className="text-xs text-muted-foreground">Distribución de tus tickets</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Mis tickets por estado">
            <PieChart data={pieData} height={280} />
          </ChartCard>
          <div className="flex flex-col gap-4">
            <KpiCard
              title="Tasa de resolución"
              value={`${resolutionRate}%`}
              icon={<TrendingUp className="h-5 w-5" />}
              iconClassName="text-emerald-500 bg-emerald-500/10"
              description={`${kpis.resolvedCount} de ${kpis.totalTickets} tickets resueltos`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

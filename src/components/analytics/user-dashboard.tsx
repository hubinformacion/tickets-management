"use client";

import { Ticket, Clock, CheckCircle, Star, TrendingUp } from "lucide-react";
import { KpiCard } from "@/components/analytics/kpi-card";
import { PieChart } from "@/components/analytics/charts/pie-chart";
import { ChartCard } from "@/components/analytics/chart-card";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants/analytics";
import type { StatusCount } from "@/db/queries/analytics";

interface UserDashboardProps {
  kpis: {
    totalTickets: number;
    statusCounts: StatusCount[];
    pendingCount: number;
    resolvedCount: number;
    avgSatisfaction: number;
  };
}

export function UserAnalyticsDashboard({ kpis }: UserDashboardProps) {
  const resolutionRate = kpis.totalTickets > 0 ? Math.round((kpis.resolvedCount / kpis.totalTickets) * 100) : 0;

  const pieData = kpis.statusCounts.map(item => ({
    name: Object.hasOwn(STATUS_LABELS, item.status) ? STATUS_LABELS[item.status] : "Otro estado",
    value: item.count,
    color: Object.hasOwn(STATUS_COLORS, item.status) ? STATUS_COLORS[item.status] : "#64748b",
  })).filter(item => item.value > 0);

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
          description="Abiertos, en progreso y en validación"
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
          description="Tus respuestas de encuesta"
          value={kpis.avgSatisfaction > 0 ? `${kpis.avgSatisfaction}/5` : "-"}
          icon={<Star className="h-5 w-5" />}
          iconClassName="text-yellow-500 bg-yellow-500/10"
        />
      </div>

      {/* Section: Resumen */}
      <div>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Resumen</h3>
          <p className="text-xs text-muted-foreground">Tickets creados por ti · histórico y estado actual</p>
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

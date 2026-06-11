"use client";

import { KpiCard } from "@/components/analytics/kpi-card";
import { TicketVolumeChart } from "@/components/analytics/ticket-volume-chart";
import { PriorityBreakdownChart } from "@/components/analytics/priority-breakdown-chart";
import { SatisfactionTrendChart } from "@/components/analytics/satisfaction-trend-chart";
import { TopCategoriesChart } from "@/components/analytics/top-categories-chart";
import { AgentWorkloadTable } from "@/components/analytics/agent-workload-table";
import { DashboardFilters } from "@/components/analytics/dashboard-filters";
import { LayoutList, UserCheck, ShieldCheck, Star } from "lucide-react";
import type { StatusCount, PriorityCount, SatisfactionTrend, CategoryCount, AgentWorkload, SLACompliance } from "@/db/queries/analytics";

interface AgentDashboardProps {
  kpis: {
    totalTickets: number;
    statusCounts: StatusCount[];
    avgSatisfaction: number;
    resolutionRate: number;
  };
  priorityData: PriorityCount[];
  satisfactionData: SatisfactionTrend[];
  topCategories: CategoryCount[];
  agentWorkload: AgentWorkload[];
  slaData: SLACompliance[];
  currentRange: string;
}

export function AgentAnalyticsDashboard({
  kpis,
  priorityData,
  satisfactionData,
  topCategories,
  agentWorkload,
  slaData,
  currentRange,
}: AgentDashboardProps) {
  const inProgressCount = kpis.statusCounts.find((s) => s.status === "in_progress")?.count ?? 0;
  const openCount = kpis.statusCounts.find((s) => s.status === "open")?.count ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Vista de mi área</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Métricas de tu área de atención</p>
        </div>
        <DashboardFilters currentRange={currentRange} />
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Tickets de mi área"
          value={kpis.totalTickets}
          icon={<LayoutList className="h-5 w-5" />}
          iconClassName="text-blue-500 bg-blue-500/10"
        />
        <KpiCard
          title="Sin asignar"
          value={openCount}
          icon={<UserCheck className="h-5 w-5" />}
          iconClassName="text-amber-500 bg-amber-500/10"
        />
        <KpiCard
          title="En progreso"
          value={inProgressCount}
          icon={<ShieldCheck className="h-5 w-5" />}
          iconClassName="text-purple-500 bg-purple-500/10"
        />
        <KpiCard
          title="Satisfacción"
          value={kpis.avgSatisfaction > 0 ? `${kpis.avgSatisfaction}/5` : "-"}
          icon={<Star className="h-5 w-5" />}
          iconClassName="text-yellow-500 bg-yellow-500/10"
        />
      </div>

      {/* Section: Distribución */}
      <div>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Distribución</h3>
          <p className="text-xs text-muted-foreground">Tickets por estado y prioridad</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TicketVolumeChart data={kpis.statusCounts} />
          <PriorityBreakdownChart data={priorityData} />
        </div>
      </div>

      {/* Section: Tendencias */}
      <div>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Tendencias</h3>
          <p className="text-xs text-muted-foreground">Evolución de satisfacción y categorías</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SatisfactionTrendChart data={satisfactionData} />
          <TopCategoriesChart data={topCategories} />
        </div>
      </div>

      {/* Section: Rendimiento */}
      <div>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Rendimiento</h3>
          <p className="text-xs text-muted-foreground">Productividad del equipo</p>
        </div>
        <AgentWorkloadTable data={agentWorkload} />
      </div>
    </div>
  );
}

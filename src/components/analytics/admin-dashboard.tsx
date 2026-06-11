"use client";

import { KpiCard } from "@/components/analytics/kpi-card";
import { TicketVolumeChart } from "@/components/analytics/ticket-volume-chart";
import { AreaDistributionChart } from "@/components/analytics/area-distribution-chart";
import { PriorityBreakdownChart } from "@/components/analytics/priority-breakdown-chart";
import { ResolutionTrendChart } from "@/components/analytics/resolution-trend-chart";
import { SLAComplianceChart } from "@/components/analytics/sla-compliance-chart";
import { SatisfactionTrendChart } from "@/components/analytics/satisfaction-trend-chart";
import { TopCategoriesChart } from "@/components/analytics/top-categories-chart";
import { AgentWorkloadTable } from "@/components/analytics/agent-workload-table";
import { DashboardFilters } from "@/components/analytics/dashboard-filters";
import { Ticket, Clock, CheckCircle, TrendingUp, ShieldCheck, Star, UserX, BarChart3 } from "lucide-react";
import type { StatusCount, AreaCount, PriorityCount, WeeklyResolution, SLACompliance, SatisfactionTrend, CategoryCount, AgentWorkload } from "@/db/queries/analytics";

interface AdminDashboardProps {
  kpis: {
    totalTickets: number;
    statusCounts: StatusCount[];
    unassignedCount: number;
    avgSatisfaction: number;
    resolutionRate: number;
  };
  areaData: AreaCount[];
  priorityData: PriorityCount[];
  weeklyTrend: WeeklyResolution[];
  slaData: SLACompliance[];
  satisfactionData: SatisfactionTrend[];
  topCategories: CategoryCount[];
  agentWorkload: AgentWorkload[];
  currentRange: string;
}

export function AdminAnalyticsDashboard({
  kpis,
  areaData,
  priorityData,
  weeklyTrend,
  slaData,
  satisfactionData,
  topCategories,
  agentWorkload,
  currentRange,
}: AdminDashboardProps) {
  const openCount = kpis.statusCounts.find((s) => s.status === "open")?.count ?? 0;
  const inProgressCount = kpis.statusCounts.find((s) => s.status === "in_progress")?.count ?? 0;
  const resolvedCount = kpis.statusCounts.find((s) => s.status === "resolved")?.count ?? 0;
  const pendingValidationCount = kpis.statusCounts.find((s) => s.status === "pending_validation")?.count ?? 0;
  const voidedCount = kpis.statusCounts.find((s) => s.status === "voided")?.count ?? 0;

  return (
    <div className="space-y-8">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Vista general</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Resumen del rendimiento del sistema</p>
        </div>
        <DashboardFilters currentRange={currentRange} />
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Tickets abiertos"
          value={openCount}
          icon={<Ticket className="h-5 w-5" />}
          iconClassName="text-blue-500 bg-blue-500/10"
        />
        <KpiCard
          title="En progreso"
          value={inProgressCount}
          icon={<Clock className="h-5 w-5" />}
          iconClassName="text-amber-500 bg-amber-500/10"
        />
        <KpiCard
          title="Pendiente validación"
          value={pendingValidationCount}
          icon={<BarChart3 className="h-5 w-5" />}
          iconClassName="text-purple-500 bg-purple-500/10"
        />
        <KpiCard
          title="Resueltos"
          value={resolvedCount}
          icon={<CheckCircle className="h-5 w-5" />}
          iconClassName="text-emerald-500 bg-emerald-500/10"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Tasa de resolución"
          value={`${kpis.resolutionRate}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          iconClassName="text-emerald-500 bg-emerald-500/10"
        />
        <KpiCard
          title="SLA compliance"
          value={slaData.length > 0 ? `${Math.round(slaData.reduce((a, b) => a + b.compliancePercent, 0) / slaData.length)}%` : "-"}
          icon={<ShieldCheck className="h-5 w-5" />}
          iconClassName="text-blue-500 bg-blue-500/10"
        />
        <KpiCard
          title="Satisfacción promedio"
          value={kpis.avgSatisfaction > 0 ? `${kpis.avgSatisfaction}/5` : "-"}
          icon={<Star className="h-5 w-5" />}
          iconClassName="text-yellow-500 bg-yellow-500/10"
        />
        <KpiCard
          title="Tickets sin asignar"
          value={kpis.unassignedCount}
          icon={<UserX className="h-5 w-5" />}
          iconClassName="text-red-500 bg-red-500/10"
          description={kpis.unassignedCount > 0 ? "Requieren atención" : "Todos asignados"}
        />
      </div>

      {/* Section: Distribución */}
      <div>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Distribución</h3>
          <p className="text-xs text-muted-foreground">Volumen de tickets por categoría</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TicketVolumeChart data={kpis.statusCounts} />
          <AreaDistributionChart data={areaData} />
          <PriorityBreakdownChart data={priorityData} />
        </div>
      </div>

      {/* Section: Tendencias */}
      <div>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Tendencias</h3>
          <p className="text-xs text-muted-foreground">Evolución en el tiempo</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResolutionTrendChart data={weeklyTrend} />
          <SatisfactionTrendChart data={satisfactionData} />
        </div>
      </div>

      {/* Section: Rendimiento */}
      <div>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Rendimiento</h3>
          <p className="text-xs text-muted-foreground">Cumplimiento y productividad</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SLAComplianceChart data={slaData} />
          <AgentWorkloadTable data={agentWorkload} />
        </div>
      </div>

      {/* Section: Análisis */}
      <div>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Análisis</h3>
          <p className="text-xs text-muted-foreground">Categorías más demandadas</p>
        </div>
        <TopCategoriesChart data={topCategories} />
      </div>
    </div>
  );
}

import { Suspense } from "react";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { getSession, requireAuth } from "@/lib/auth/helpers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  getDashboardKPIs,
  getTicketsByArea,
  getTicketsByPriority,
  getResolutionTrend,
  getSLACompliance,
  getSatisfactionTrend,
  getTopCategories,
  getAgentWorkload,
  getUserKPIs,
} from "@/db/queries/analytics";
import { AdminAnalyticsDashboard } from "@/components/analytics/admin-dashboard";
import { AgentAnalyticsDashboard } from "@/components/analytics/agent-dashboard";
import { UserAnalyticsDashboard } from "@/components/analytics/user-dashboard";

export const metadata: Metadata = {
  title: "Analytics",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const session = await requireAuth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  const params = await searchParams;
  const range = typeof params.range === "string" ? params.range : "month";

  if (role === "admin") {
    const [kpis, areaData, priorityData, weeklyTrend, slaData, satisfactionData, topCategories, agentWorkload] = await Promise.all([
      getDashboardKPIs(undefined, undefined, range),
      getTicketsByArea(range),
      getTicketsByPriority(undefined, range),
      getResolutionTrend(undefined, 8),
      getSLACompliance(),
      getSatisfactionTrend(undefined, 6),
      getTopCategories(undefined, 5, range),
      getAgentWorkload(),
    ]);

    return (
      <div className="flex flex-col gap-6">
        <Breadcrumb items={[{ label: "Analytics" }]} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard de Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Métricas y rendimiento del sistema de tickets
          </p>
        </div>
        <Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded-lg" />}>
          <AdminAnalyticsDashboard
            kpis={kpis}
            areaData={areaData}
            priorityData={priorityData}
            weeklyTrend={weeklyTrend}
            slaData={slaData}
            satisfactionData={satisfactionData}
            topCategories={topCategories}
            agentWorkload={agentWorkload}
            currentRange={range}
          />
        </Suspense>
      </div>
    );
  }

  if (role === "agent") {
    const areaId = session.user.attentionAreaId;
    if (!areaId) redirect("/dashboard");

    const [kpis, priorityData, satisfactionData, topCategories, agentWorkload, slaData] = await Promise.all([
      getDashboardKPIs(areaId, undefined, range),
      getTicketsByPriority(areaId, range),
      getSatisfactionTrend(areaId, 6),
      getTopCategories(areaId, 5, range),
      getAgentWorkload(areaId),
      getSLACompliance(areaId),
    ]);

    return (
      <div className="flex flex-col gap-6">
        <Breadcrumb items={[{ label: "Analytics" }]} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics del área</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Métricas y rendimiento de tu área de atención
          </p>
        </div>
        <Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded-lg" />}>
          <AgentAnalyticsDashboard
            kpis={kpis}
            priorityData={priorityData}
            satisfactionData={satisfactionData}
            topCategories={topCategories}
            agentWorkload={agentWorkload}
            slaData={slaData}
            currentRange={range}
          />
        </Suspense>
      </div>
    );
  }

  // User role
  const kpis = await getUserKPIs(session.user.id);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Mis estadísticas" }]} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mis estadísticas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Resumen de tu actividad en el sistema
        </p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded-lg" />}>
        <UserAnalyticsDashboard kpis={kpis} />
      </Suspense>
    </div>
  );
}

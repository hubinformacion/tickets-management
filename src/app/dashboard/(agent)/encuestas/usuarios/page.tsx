import { getSurveyResultsAction, getAgentsWithSurveysAction } from "@/actions/surveys";
import { SurveyResultsView } from "@/components/surveys/survey-results-view";
import { SurveyFilters } from "@/components/surveys/survey-filters";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { requireAgent } from "@/lib/auth/helpers";
import { db } from "@/db";
import { attentionAreas } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Encuestas de usuarios",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function UserSurveysPage({ searchParams }: PageProps) {
  const [session, params] = await Promise.all([requireAgent(), searchParams]);
  const isAdmin = session.user.role === "admin";

  const filters = {
    agentId: typeof params.agentId === "string" ? params.agentId : undefined,
    areaId: typeof params.areaId === "string" ? params.areaId : undefined,
    dateFrom: typeof params.dateFrom === "string" ? params.dateFrom : undefined,
    dateTo: typeof params.dateTo === "string" ? params.dateTo : undefined,
  };

  const [results, agents, allAreas] = await Promise.all([
    getSurveyResultsAction(filters),
    getAgentsWithSurveysAction(),
    isAdmin
      ? db.query.attentionAreas.findMany({
          where: eq(attentionAreas.isActive, true),
          columns: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  // Resolve area name for subtitle
  let areaName: string | null = null;
  if (!isAdmin && session.user.attentionAreaId) {
    const area = await db.query.attentionAreas.findFirst({
      where: eq(attentionAreas.id, session.user.attentionAreaId),
      columns: { name: true },
    });
    areaName = area?.name ?? null;
  }

  const subtitle = isAdmin
    ? "Resultados globales de las encuestas post-atención de todas las áreas."
    : areaName
      ? `Resultados de las encuestas post-atención del área de ${areaName}.`
      : "Resultados de las encuestas post-atención de tickets de tu área.";

  // Build download URL with current filters
  const downloadParams = new URLSearchParams();
  if (filters.agentId) downloadParams.set("agentId", filters.agentId);
  if (filters.areaId) downloadParams.set("areaId", filters.areaId);
  if (filters.dateFrom) downloadParams.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) downloadParams.set("dateTo", filters.dateTo);
  const downloadHref = `/dashboard/encuestas/usuarios/download${downloadParams.size > 0 ? `?${downloadParams}` : ""}`;

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in duration-500">
      <Breadcrumb
        items={[
          { label: "Encuestas", href: "/dashboard/encuestas" },
          { label: "Encuestas de usuarios" },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Encuestas de usuarios</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        <Link href={downloadHref} target="_blank">
          <Button variant="outline" className="gap-2 shrink-0">
            <FileDown className="h-4 w-4" />
            Descargar PDF
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Suspense fallback={<div className="h-12 animate-pulse bg-muted rounded-lg" />}>
        <SurveyFilters agents={agents} attentionAreas={allAreas} />
      </Suspense>

      {/* Results */}
      {"error" in results ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>{results.error}</p>
        </div>
      ) : (
        <SurveyResultsView
          surveys={results.surveys}
          kpis={results.kpis}
          distributions={results.distributions}
        />
      )}
    </div>
  );
}

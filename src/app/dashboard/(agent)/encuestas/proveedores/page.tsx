import { getProviderSurveyResultsAction, getAgentsWithProviderSurveysAction } from "@/actions/surveys/provider-surveys";
import { ProviderSurveyResultsView } from "@/components/surveys/provider-survey-results-view";
import { SurveyFilters } from "@/components/surveys/survey-filters";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { requireAgent } from "@/lib/auth/helpers";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Evaluaciones de proveedores",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProviderSurveysPage({ searchParams }: PageProps) {
  const [session, params] = await Promise.all([requireAgent(), searchParams]);

  const filters = {
    agentId: typeof params.agentId === "string" ? params.agentId : undefined,
    dateFrom: typeof params.dateFrom === "string" ? params.dateFrom : undefined,
    dateTo: typeof params.dateTo === "string" ? params.dateTo : undefined,
  };

  const [results, agents] = await Promise.all([
    getProviderSurveyResultsAction(filters),
    getAgentsWithProviderSurveysAction(),
  ]);

  const isAdmin = session.user.role === "admin";
  const subtitle = isAdmin
    ? "Evaluaciones internas globales registradas por agentes al cerrar tickets de proveedor."
    : "Evaluaciones internas registradas por agentes de tu área al cerrar tickets de proveedor.";

  // Build download URL with current filters
  const downloadParams = new URLSearchParams();
  if (filters.agentId) downloadParams.set("agentId", filters.agentId);
  if (filters.dateFrom) downloadParams.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) downloadParams.set("dateTo", filters.dateTo);
  const downloadHref = `/dashboard/encuestas/proveedores/download${downloadParams.size > 0 ? `?${downloadParams}` : ""}`;

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in duration-500">
      <Breadcrumb
        items={[
          { label: "Encuestas", href: "/dashboard/encuestas" },
          { label: "Evaluaciones de proveedores" },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Evaluaciones de proveedores</h1>
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
      <SurveyFilters agents={agents} />

      {/* Results */}
      {"error" in results ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>{results.error}</p>
        </div>
      ) : (
        <ProviderSurveyResultsView
          surveys={results.surveys}
          kpis={results.kpis}
        />
      )}
    </div>
  );
}

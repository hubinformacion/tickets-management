"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Star, Clock, CalendarCheck, Package, Brain, Handshake, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";

interface ProviderSurveyData {
  id: number;
  providerTicketId: number;
  responseTimeRating: number;
  deadlineRating: number;
  qualityRating: number;
  requirementUnderstandingRating: number;
  attentionRating: number;
  createdAt: Date;
  providerTicket: {
    externalCode: string;
    title: string;
    provider: { name: string };
  };
  submittedBy: { name: string };
  attentionArea: { name: string; slug: string };
}

interface ProviderKPIs {
  totalSurveys: number;
  invalidRatingCount?: number;
  avgResponseTime: number;
  avgDeadline: number;
  avgQuality: number;
  avgRequirementUnderstanding: number;
  avgAttention: number;
  avgOverall: number;
}

interface ProviderSurveyResultsViewProps {
  surveys: ProviderSurveyData[];
  kpis: ProviderKPIs;
}

const KPI_DEFINITIONS = [
  { key: "avgOverall" as keyof ProviderKPIs, label: "Promedio general", icon: Star, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" },
  { key: "avgResponseTime" as keyof ProviderKPIs, label: "Tiempo de respuesta", icon: Clock, color: "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400" },
  { key: "avgDeadline" as keyof ProviderKPIs, label: "Cumplimiento de plazos", icon: CalendarCheck, color: "bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400" },
  { key: "avgQuality" as keyof ProviderKPIs, label: "Calidad del entregable", icon: Package, color: "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400" },
  { key: "avgRequirementUnderstanding" as keyof ProviderKPIs, label: "Comprensión del req.", icon: Brain, color: "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400" },
  { key: "avgAttention" as keyof ProviderKPIs, label: "Atención del proveedor", icon: Handshake, color: "bg-teal-100 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400" },
];

function RatingDisplay({ value }: { value: number }) {
  const color =
    value <= 2
      ? "text-red-600 dark:text-red-400"
      : value === 3
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-green-600 dark:text-green-400";
  return <span className={cn("font-bold tabular-nums", color)}>{value}</span>;
}

function MiniBar({ value }: { value: number }) {
  const pct = (value / 5) * 100;
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function pctColor(pct: number) {
  return pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-500";
}

export function ProviderSurveyResultsView({ surveys, kpis }: ProviderSurveyResultsViewProps) {
  if (kpis.totalSurveys === 0) {
    return (
      <div className="text-center py-16 px-4 border border-dashed rounded-lg bg-muted/5">
        <div className="mx-auto h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
          <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Sin evaluaciones aún</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Las evaluaciones de proveedores aparecerán aquí cuando cierres tickets de proveedor con evaluación.
        </p>
      </div>
    );
  }

  const overallPct = Math.round((kpis.avgOverall / 5) * 100);

  return (
    <div className="space-y-8">
      {(kpis.invalidRatingCount ?? 0) > 0 ? <p role="status" className="text-sm text-muted-foreground">Algunas calificaciones históricas no son válidas y se excluyen de los promedios. Se conservan en el detalle.</p> : null}
      {/* Promedio general destacado */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-4">
            <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", KPI_DEFINITIONS[0].color)}>
              <Star className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Promedio general</p>
              <p className="text-xs text-muted-foreground/70 mb-1">Promedio de los 5 criterios de evaluación</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight">{overallPct}%</span>
                <span className="text-sm text-muted-foreground">{kpis.avgOverall}/5</span>
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", pctColor(overallPct))}
                  style={{ width: `${overallPct}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards — 5 criteria */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {KPI_DEFINITIONS.slice(1).map(({ key, label, icon: Icon, color }) => {
          const val = kpis[key] as number;
          const pct = Math.round((val / 5) * 100);
          return (
            <Card key={key}>
              <CardContent className="pt-4 pb-4">
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-2", color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-xs text-muted-foreground leading-tight mb-1">{label}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold tracking-tight">{val}</span>
                  <span className="text-sm font-normal text-muted-foreground">/5</span>
                  <span className="text-xs font-semibold text-muted-foreground ml-1">{pct}%</span>
                </div>
                <MiniBar value={val} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail Table */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Detalle de evaluaciones</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Ticket</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Proveedor</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Fecha</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">T.Resp</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Plazos</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Calidad</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Comprensión</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Atención</th>
                </tr>
              </thead>
              <tbody>
                {surveys.map((survey) => (
                  <tr key={survey.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs">{survey.providerTicket.externalCode}</span>
                      <p className="text-xs text-muted-foreground truncate max-w-[140px]">{survey.providerTicket.title}</p>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{survey.providerTicket.provider.name}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">{formatDate(survey.createdAt)}</td>
                    <td className="py-3 px-4 text-center"><RatingDisplay value={survey.responseTimeRating} /></td>
                    <td className="py-3 px-4 text-center"><RatingDisplay value={survey.deadlineRating} /></td>
                    <td className="py-3 px-4 text-center"><RatingDisplay value={survey.qualityRating} /></td>
                    <td className="py-3 px-4 text-center"><RatingDisplay value={survey.requirementUnderstandingRating} /></td>
                    <td className="py-3 px-4 text-center"><RatingDisplay value={survey.attentionRating} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

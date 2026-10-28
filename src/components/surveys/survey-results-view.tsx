"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Star, Clock, MessageSquare, CheckCircle, BarChart3, TrendingUp, Layers } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import Link from "next/link";

interface SurveyData {
  id: number;
  ticketId: number;
  responseTimeRating: number;
  communicationRating: number;
  solutionRating: number;
  overallRating: number;
  improvementSuggestion: string | null;
  createdAt: Date;
  ticket: { ticketCode: string; title: string };
  user: { name: string };
  attentionArea: { name: string; slug: string };
}

interface KPIs {
  totalSurveys: number;
  resolvedCount: number;
  avgGeneral: number;
  avgOverall: number;
  avgResponseTime: number;
  avgCommunication: number;
  avgSolution: number;
  responseRate: number;
  invalidRatingCount?: number;
}

interface Distributions {
  responseTime: number[];
  communication: number[];
  solution: number[];
  overall: number[];
}

interface SurveyResultsViewProps {
  surveys: SurveyData[];
  kpis: KPIs;
  distributions: Distributions;
}

function ratingColor(pct: number) {
  return pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-500";
}

function RatingDisplay({ value }: { value: number }) {
  const color =
    value <= 2
      ? "text-red-600 dark:text-red-400"
      : value === 3
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-green-600 dark:text-green-400";
  return <span className={cn("font-bold tabular-nums", color)}>{value}</span>;
}

function CriterionCard({
  label,
  avg,
  icon: Icon,
  iconBg,
}: {
  label: string;
  avg: number;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
}) {
  const pct = Math.round((avg / 5) * 100);
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-2", iconBg)}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs text-muted-foreground leading-tight mb-1">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tracking-tight">{avg}</span>
          <span className="text-sm text-muted-foreground">/5</span>
          <span className="text-sm font-semibold text-muted-foreground ml-1">{pct}%</span>
        </div>
        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-700", ratingColor(pct))}
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function SurveyResultsView({ surveys, kpis }: SurveyResultsViewProps) {
  if (kpis.totalSurveys === 0) {
    return (
      <div className="text-center py-16 px-4 border border-dashed rounded-lg bg-muted/5">
        <div className="mx-auto h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
          <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Sin encuestas aún</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Hay {kpis.resolvedCount} ticket(s) resueltos con los filtros actuales, todavía sin encuestas.
          Las respuestas aparecerán aquí cuando los usuarios las envíen.
        </p>
      </div>
    );
  }

  const generalPct = Math.round((kpis.avgGeneral / 5) * 100);

  return (
    <div className="space-y-8">
      {(kpis.invalidRatingCount ?? 0) > 0 ? (
        <p className="text-sm text-muted-foreground" role="status">
          Algunas calificaciones históricas están fuera de rango y no se incluyen en los promedios. Las respuestas se conservan en la tabla.
        </p>
      ) : null}
      {/* Row 1: 4 criterion KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <CriterionCard
          label="Tiempo de respuesta"
          avg={kpis.avgResponseTime}
          icon={Clock}
          iconBg="bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
        />
        <CriterionCard
          label="Comunicación"
          avg={kpis.avgCommunication}
          icon={MessageSquare}
          iconBg="bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
        />
        <CriterionCard
          label="Solución"
          avg={kpis.avgSolution}
          icon={CheckCircle}
          iconBg="bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400"
        />
        <CriterionCard
          label="Satisfacción general"
          avg={kpis.avgOverall}
          icon={Star}
          iconBg="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
        />
      </div>

      {/* Row 2: Promedio General + Total Encuestas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Promedio General */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-teal-100 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400 shrink-0">
                <Layers className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Promedio general</p>
                <p className="text-xs text-muted-foreground/70 mb-1">Evaluación general de los 4 criterios</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight">{generalPct}%</span>
                  <span className="text-sm text-muted-foreground">{kpis.avgGeneral}/5</span>
                </div>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", ratingColor(generalPct))}
                    style={{ width: `${generalPct}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Encuestas / Tasa de respuesta */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 shrink-0">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Total de encuestas</p>
                <p className="text-xs text-muted-foreground/70 mb-1">Respuestas de los tickets resueltos con estos filtros</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight">
                    {kpis.totalSurveys}
                    <span className="text-base font-normal text-muted-foreground">
                      /{kpis.resolvedCount}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground">{kpis.responseRate}%</span>
                </div>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                    style={{ width: `${Math.min(kpis.responseRate, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          Detalle de encuestas
        </h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Ticket</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Fecha de respuesta</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Tiempo</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Comunicación</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Solución</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">General</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Comentario</th>
                </tr>
              </thead>
              <tbody>
                {surveys.map((survey) => (
                  <tr key={survey.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        href={`/dashboard/tickets/${survey.ticket.ticketCode}`}
                        className="text-primary hover:underline font-mono text-xs"
                      >
                        {survey.ticket.ticketCode}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs whitespace-nowrap">
                      {formatDate(survey.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <RatingDisplay value={survey.responseTimeRating} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <RatingDisplay value={survey.communicationRating} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <RatingDisplay value={survey.solutionRating} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <RatingDisplay value={survey.overallRating} />
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs max-w-xs truncate">
                      {survey.improvementSuggestion || "—"}
                    </td>
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

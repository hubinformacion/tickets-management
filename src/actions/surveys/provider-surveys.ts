"use server";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { providerSatisfactionSurveys, users } from "@/db/schema";
import { requireAgent } from "@/lib/auth/helpers";
import { surveyFiltersSchema } from "@/lib/validation/schemas";
import { parsePage } from "@/lib/utils/pagination";
import { readProviderSurveyResults } from "@/lib/surveys/provider-results";

export interface ProviderSurveyFilterParams {
  agentId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/** Indicadores completos y detalles paginados del alcance autenticado. */
export async function getProviderSurveyResultsAction(filters?: ProviderSurveyFilterParams, page: unknown = 1) {
  const session = await requireAgent();
  if (session.user.role !== "admin" && !session.user.attentionAreaId) {
    return { error: "Debes tener un área asignada para consultar encuestas" };
  }
  const parsed = surveyFiltersSchema.safeParse(filters ?? {});
  if (!parsed.success) return { error: "Filtros de encuesta inválidos" };
  const areaId = session.user.role === "admin" ? undefined : session.user.attentionAreaId!;
  try {
    return await readProviderSurveyResults(areaId, parsed.data, parsePage(page));
  } catch {
    console.error("No se pudieron obtener las evaluaciones de proveedores");
    return { error: "Error al obtener los resultados de encuestas de proveedores" };
  }
}

/** Opciones del área sin cargar todas las evaluaciones con relaciones. */
export async function getAgentsWithProviderSurveysAction() {
  const session = await requireAgent();
  if (session.user.role !== "admin" && !session.user.attentionAreaId) return [];
  try {
    return await db.selectDistinct({ id: users.id, name: users.name }).from(providerSatisfactionSurveys)
      .innerJoin(users, eq(providerSatisfactionSurveys.submittedById, users.id))
      .where(session.user.role === "admin" ? undefined : eq(providerSatisfactionSurveys.attentionAreaId, session.user.attentionAreaId!))
      .orderBy(asc(users.name), asc(users.id));
  } catch {
    return [];
  }
}

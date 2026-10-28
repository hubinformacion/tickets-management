"use server";

import { and, count, desc, eq, inArray, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { satisfactionSurveys, tickets, users } from "@/db/schema";
import { requireAuth, requireAgent } from "@/lib/auth/helpers";
import { submitSurveySchema, surveyFiltersSchema } from "@/lib/validation/schemas";
import { createRateLimiter } from "@/lib/utils/rate-limit";
import { userSurveyCohort } from "@/lib/surveys/cohort";
import { summarizeUserSurveys } from "@/lib/surveys/summary";

const surveyRateLimiter = createRateLimiter("MODERATE");

/** Solo el creador de un ticket resuelto puede enviar una evaluación, una vez por ticket. */
export async function submitSurveyAction(data: {
  ticketId: number;
  responseTimeRating: number;
  communicationRating: number;
  solutionRating: number;
  overallRating: number;
  improvementSuggestion?: string;
}) {
  const session = await requireAuth();
  if (!["user", "agent", "admin"].includes(session.user.role)) return { error: "No autorizado" };
  if (!surveyRateLimiter(`survey:${session.user.id}`).success) {
    return { error: "Demasiadas solicitudes. Intenta de nuevo en un momento." };
  }
  const parsed = submitSurveySchema.safeParse(data);
  if (!parsed.success) return { error: "Datos inválidos", details: parsed.error.flatten() };

  try {
    const result = await db.transaction(async tx => {
      const [ticket] = await tx.select({
        id: tickets.id, ticketCode: tickets.ticketCode, status: tickets.status,
        createdById: tickets.createdById, attentionAreaId: tickets.attentionAreaId,
      }).from(tickets).where(eq(tickets.id, parsed.data.ticketId)).for("update");
      if (!ticket) return { error: "Ticket no encontrado" };
      if (ticket.createdById !== session.user.id) return { error: "Solo el creador del ticket puede completar la encuesta" };
      if (ticket.status !== "resolved") return { error: "El ticket debe estar resuelto para completar la encuesta" };
      if (!ticket.attentionAreaId) return { error: "El ticket no tiene un área de atención asignada" };

      const inserted = await tx.insert(satisfactionSurveys).values({
        ...parsed.data, userId: session.user.id, attentionAreaId: ticket.attentionAreaId,
        improvementSuggestion: parsed.data.improvementSuggestion || null,
      }).onConflictDoNothing({ target: satisfactionSurveys.ticketId }).returning({ id: satisfactionSurveys.id });
      if (inserted.length === 0) return { error: "Ya se completó una encuesta para este ticket" };
      return { ticketCode: ticket.ticketCode };
    });
    if (result.error) return { error: result.error };
    revalidatePath(`/dashboard/tickets/${result.ticketCode}`);
    revalidatePath("/dashboard/encuestas");
    return { success: true };
  } catch {
    console.error("No se pudo confirmar el envío de la encuesta");
    return { error: "Error al enviar la encuesta" };
  }
}

export interface SurveyFilterParams {
  agentId?: string;
  areaId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/** Respuestas y denominador del mismo conjunto de tickets resueltos, por fecha de cierre en Lima. */
export async function getSurveyResultsAction(filters?: SurveyFilterParams) {
  const session = await requireAgent();
  if (session.user.role !== "admin" && !session.user.attentionAreaId) {
    return { error: "Debes tener un área asignada para consultar encuestas" };
  }
  const parsed = surveyFiltersSchema.safeParse(filters ?? {});
  if (!parsed.success) return { error: "Filtros de encuesta inválidos" };
  const selected = parsed.data;
  const areaId = session.user.role === "admin"
    ? selected.areaId ? Number(selected.areaId) : undefined : session.user.attentionAreaId!;

  try {
    const { surveys, resolvedCount } = await db.transaction(async tx => {
      const cohort = userSurveyCohort(areaId, selected);
      const cohortIds = tx.select({ id: tickets.id }).from(tickets).where(cohort);
      const [surveys, totals] = await Promise.all([
        tx.query.satisfactionSurveys.findMany({
          where: and(
            inArray(satisfactionSurveys.ticketId, cohortIds),
            areaId === undefined ? undefined : eq(satisfactionSurveys.attentionAreaId, areaId),
          ),
          with: {
            ticket: { columns: { ticketCode: true, title: true }, with: { assignedTo: { columns: { id: true, name: true } } } },
            user: { columns: { name: true } },
            attentionArea: { columns: { name: true, slug: true } },
          },
          orderBy: [desc(satisfactionSurveys.createdAt)],
        }),
        tx.select({ count: count() }).from(tickets).where(cohort),
      ]);
      return { surveys, resolvedCount: totals[0]?.count ?? 0 };
    }, { isolationLevel: "repeatable read", accessMode: "read only" });
    return { surveys, ...summarizeUserSurveys(surveys, resolvedCount) };
  } catch {
    console.error("No se pudieron obtener los resultados de encuestas");
    return { error: "Error al obtener los resultados de encuestas" };
  }
}

/** Agentes de tickets resueltos del alcance, incluidos los que todavía no tienen encuestas. */
export async function getAgentsWithSurveysAction() {
  const session = await requireAgent();
  if (session.user.role !== "admin" && !session.user.attentionAreaId) return [];
  try {
    return await db.selectDistinct({ id: users.id, name: users.name }).from(tickets)
      .innerJoin(users, eq(tickets.assignedToId, users.id))
      .where(userSurveyCohort(session.user.role === "admin" ? undefined : session.user.attentionAreaId!, {}))
      .orderBy(asc(users.name));
  } catch {
    return [];
  }
}

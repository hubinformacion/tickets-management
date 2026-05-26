"use server";

import { db } from "@/db";
import { satisfactionSurveys, tickets } from "@/db/schema";
import { requireAuth, requireAgent } from "@/lib/auth/helpers";
import { eq, and, count, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { submitSurveySchema } from "@/lib/validation/schemas";
import { createRateLimiter } from "@/lib/utils/rate-limit";

const surveyRateLimiter = createRateLimiter("MODERATE");

/**
 * Submit a satisfaction survey for a resolved TSI ticket.
 * Only the ticket creator can submit, and only once per ticket.
 */
export async function submitSurveyAction(data: {
  ticketId: number;
  responseTimeRating: number;
  communicationRating: number;
  solutionRating: number;
  overallRating: number;
  improvementSuggestion?: string;
}) {
  const session = await requireAuth();

  // Rate limiting
  const rateLimitResult = surveyRateLimiter(`survey:${session.user.id}`);
  if (!rateLimitResult.success) {
    return { error: "Demasiadas solicitudes. Intenta de nuevo en un momento." };
  }

  // Validate input
  const parsed = submitSurveySchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Datos inválidos", details: parsed.error.flatten() };
  }

  try {
    // Verify ticket exists, is resolved, belongs to TSI, and user is the creator
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, parsed.data.ticketId),
      with: { attentionArea: true },
    });

    if (!ticket) {
      return { error: "Ticket no encontrado" };
    }

    if (ticket.createdById !== session.user.id) {
      return { error: "Solo el creador del ticket puede completar la encuesta" };
    }

    if (ticket.status !== "resolved") {
      return { error: "El ticket debe estar resuelto para completar la encuesta" };
    }

    if (!ticket.attentionAreaId) {
      return { error: "El ticket no tiene un área de atención asignada" };
    }

    // Check if survey already exists
    const existing = await db.query.satisfactionSurveys.findFirst({
      where: eq(satisfactionSurveys.ticketId, parsed.data.ticketId),
    });

    if (existing) {
      return { error: "Ya se completó una encuesta para este ticket" };
    }

    // Insert survey
    await db.insert(satisfactionSurveys).values({
      ticketId: parsed.data.ticketId,
      userId: session.user.id,
      attentionAreaId: ticket.attentionAreaId!,
      responseTimeRating: parsed.data.responseTimeRating,
      communicationRating: parsed.data.communicationRating,
      solutionRating: parsed.data.solutionRating,
      overallRating: parsed.data.overallRating,
      improvementSuggestion: parsed.data.improvementSuggestion || null,
    });

    revalidatePath(`/dashboard/tickets/${ticket.ticketCode}`);
    revalidatePath("/dashboard/encuestas");
    return { success: true };
  } catch (error) {
    console.error("Error submitting survey:", error);
    return { error: "Error al enviar la encuesta" };
  }
}

/**
 * Get survey for a specific ticket (used in ticket detail page).
 * Returns null if no survey exists.
 */
export async function getSurveyByTicketAction(ticketId: number) {
  const session = await requireAuth();

  try {
    const survey = await db.query.satisfactionSurveys.findFirst({
      where: eq(satisfactionSurveys.ticketId, ticketId),
    });

    return survey ?? null;
  } catch (error) {
    console.error("Error fetching survey:", error);
    return null;
  }
}

export interface SurveyFilterParams {
  agentId?: string;
  areaId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Get aggregated survey results for the results page.
 * - Agents: see only encuestas from their attentionArea.
 * - Admins: see all encuestas across every area.
 * Optional filters: agentId (assigned agent on ticket), dateFrom/dateTo.
 */
export async function getSurveyResultsAction(filters?: SurveyFilterParams) {
  const session = await requireAgent();

  try {
    const isAdmin = session.user.role === "admin";
    const areaId = session.user.attentionAreaId;

    // Build where conditions (AND logic)
    const conditions = [];

    // Area scoping
    if (!isAdmin && areaId) {
      conditions.push(eq(satisfactionSurveys.attentionAreaId, areaId));
    }

    // Admin area filter (when admin selects a specific area)
    if (isAdmin && filters?.areaId) {
      conditions.push(eq(satisfactionSurveys.attentionAreaId, Number(filters.areaId)));
    }

    // Date filters on survey creation date
    if (filters?.dateFrom) {
      conditions.push(sql`${satisfactionSurveys.createdAt} >= ${filters.dateFrom}::timestamp`);
    }
    if (filters?.dateTo) {
      conditions.push(sql`${satisfactionSurveys.createdAt} < (${filters.dateTo}::timestamp + interval '1 day')`);
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    // Get all surveys with ticket info
    const allSurveys = await db.query.satisfactionSurveys.findMany({
      where: whereCondition,
      with: {
        ticket: {
          columns: { ticketCode: true, title: true },
          with: {
            assignedTo: { columns: { id: true, name: true } },
          },
        },
        user: {
          columns: { name: true },
        },
        attentionArea: {
          columns: { name: true, slug: true },
        },
      },
      orderBy: [desc(satisfactionSurveys.createdAt)],
    });

    // Apply agent filter in-memory (filter by assigned agent on the ticket)
    const surveysList = filters?.agentId
      ? allSurveys.filter(s => s.ticket.assignedTo?.id === filters.agentId)
      : allSurveys;

    // Calculate KPIs
    const totalSurveys = surveysList.length;

    if (totalSurveys === 0) {
      return {
        surveys: [],
        kpis: {
          totalSurveys: 0,
          resolvedCount: 0,
          avgGeneral: 0,
          avgOverall: 0,
          avgResponseTime: 0,
          avgCommunication: 0,
          avgSolution: 0,
          responseRate: 0,
        },
        distributions: {
          responseTime: [0, 0, 0, 0, 0],
          communication: [0, 0, 0, 0, 0],
          solution: [0, 0, 0, 0, 0],
          overall: [0, 0, 0, 0, 0],
        },
      };
    }

    // Calculate averages
    const avgOverall = surveysList.reduce((sum, s) => sum + s.overallRating, 0) / totalSurveys;
    const avgResponseTime = surveysList.reduce((sum, s) => sum + s.responseTimeRating, 0) / totalSurveys;
    const avgCommunication = surveysList.reduce((sum, s) => sum + s.communicationRating, 0) / totalSurveys;
    const avgSolution = surveysList.reduce((sum, s) => sum + s.solutionRating, 0) / totalSurveys;

    // Calculate response rate (surveys / resolved tickets in scope)
    const resolvedTicketsConditions = [eq(tickets.status, "resolved")];
    if (!isAdmin && areaId) {
      resolvedTicketsConditions.push(eq(tickets.attentionAreaId, areaId));
    }
    if (isAdmin && filters?.areaId) {
      resolvedTicketsConditions.push(eq(tickets.attentionAreaId, Number(filters.areaId)));
    }

    const [resolvedCount] = await db.select({ count: count() })
      .from(tickets)
      .where(and(...resolvedTicketsConditions));

    const responseRate = resolvedCount.count > 0
      ? (totalSurveys / resolvedCount.count) * 100
      : 0;

    // Calculate distributions
    const distributions = {
      responseTime: [0, 0, 0, 0, 0] as number[],
      communication: [0, 0, 0, 0, 0] as number[],
      solution: [0, 0, 0, 0, 0] as number[],
      overall: [0, 0, 0, 0, 0] as number[],
    };

    for (const survey of surveysList) {
      distributions.responseTime[survey.responseTimeRating - 1]++;
      distributions.communication[survey.communicationRating - 1]++;
      distributions.solution[survey.solutionRating - 1]++;
      distributions.overall[survey.overallRating - 1]++;
    }

    // avgGeneral = promedio de los 4 criterios (tiempo, comunicación, solución, general)
    const avgGeneral = (avgResponseTime + avgCommunication + avgSolution + avgOverall) / 4;

    return {
      surveys: surveysList,
      kpis: {
        totalSurveys,
        resolvedCount: resolvedCount.count,
        avgGeneral: Math.round(avgGeneral * 10) / 10,
        avgOverall: Math.round(avgOverall * 10) / 10,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        avgCommunication: Math.round(avgCommunication * 10) / 10,
        avgSolution: Math.round(avgSolution * 10) / 10,
        responseRate: Math.round(responseRate * 10) / 10,
      },
      distributions,
    };
  } catch (error) {
    console.error("Error fetching survey results:", error);
    return { error: "Error al obtener los resultados de encuestas" };
  }
}

/**
 * Returns the list of agents who have attended at least one surveyed ticket.
 * Used to populate the agent filter dropdown on the surveys page.
 */
export async function getAgentsWithSurveysAction() {
  const session = await requireAgent();

  try {
    const isAdmin = session.user.role === "admin";
    const areaId = session.user.attentionAreaId;

    const scopeCondition = isAdmin || !areaId
      ? undefined
      : eq(satisfactionSurveys.attentionAreaId, areaId);

    const rows = await db.query.satisfactionSurveys.findMany({
      where: scopeCondition,
      with: {
        ticket: {
          columns: {},
          with: { assignedTo: { columns: { id: true, name: true } } },
        },
      },
    });

    // Deduplicate by agent id
    const agentMap = new Map<string, string>();
    for (const row of rows) {
      const agent = row.ticket.assignedTo;
      if (agent && !agentMap.has(agent.id)) {
        agentMap.set(agent.id, agent.name || agent.id);
      }
    }

    return Array.from(agentMap.entries()).map(([id, name]) => ({ id, name }));
  } catch {
    return [];
  }
}

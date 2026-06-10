"use server";

import { db } from "@/db";
import { providerSatisfactionSurveys, providerTickets } from "@/db/schema";
import { requireAgent } from "@/lib/auth/helpers";
import { eq, and, count, desc, sql } from "drizzle-orm";

export interface ProviderSurveyFilterParams {
  agentId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Get provider satisfaction survey results.
 * Agents see only their area; admins see all.
 * Optional filters: agentId (submitted by), dateFrom/dateTo.
 */
export async function getProviderSurveyResultsAction(filters?: ProviderSurveyFilterParams) {
  const session = await requireAgent();

  try {
    const isAdmin = session.user.role === "admin";
    const areaId = session.user.attentionAreaId;

    const conditions = [];

    if (!isAdmin && areaId) {
      conditions.push(eq(providerSatisfactionSurveys.attentionAreaId, areaId));
    }
    if (filters?.agentId) {
      conditions.push(eq(providerSatisfactionSurveys.submittedById, filters.agentId));
    }
    if (filters?.dateFrom) {
      conditions.push(sql`${providerSatisfactionSurveys.createdAt} >= ${filters.dateFrom}::timestamp`);
    }
    if (filters?.dateTo) {
      conditions.push(sql`${providerSatisfactionSurveys.createdAt} < (${filters.dateTo}::timestamp + interval '1 day')`);
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    const surveysList = await db.query.providerSatisfactionSurveys.findMany({
      where: whereCondition,
      with: {
        providerTicket: {
          columns: { externalCode: true, title: true },
          with: {
            provider: { columns: { name: true } },
          },
        },
        submittedBy: { columns: { id: true, name: true } },
        attentionArea: { columns: { name: true, slug: true } },
      },
      orderBy: [desc(providerSatisfactionSurveys.createdAt)],
    });

    const totalSurveys = surveysList.length;

    if (totalSurveys === 0) {
      return {
        surveys: [],
        kpis: {
          totalSurveys: 0,
          avgResponseTime: 0,
          avgDeadline: 0,
          avgQuality: 0,
          avgRequirementUnderstanding: 0,
          avgAttention: 0,
          avgOverall: 0,
        },
      };
    }

    const avg = (key: keyof typeof surveysList[0]) =>
      Math.round(
        (surveysList.reduce((sum, s) => sum + (s[key] as number), 0) / totalSurveys) * 10
      ) / 10;

    return {
      surveys: surveysList,
      kpis: {
        totalSurveys,
        avgResponseTime: avg("responseTimeRating"),
        avgDeadline: avg("deadlineRating"),
        avgQuality: avg("qualityRating"),
        avgRequirementUnderstanding: avg("requirementUnderstandingRating"),
        avgAttention: avg("attentionRating"),
        avgOverall:
          Math.round(
            ((avg("responseTimeRating") +
              avg("deadlineRating") +
              avg("qualityRating") +
              avg("requirementUnderstandingRating") +
              avg("attentionRating")) /
              5) *
            10
          ) / 10,
      },
    };
  } catch (error) {
    console.error("Error fetching provider survey results:", error);
    return { error: "Error al obtener los resultados de encuestas de proveedores" };
  }
}

/**
 * Returns agents who have submitted at least one provider survey.
 * Used for the agent filter dropdown.
 */
export async function getAgentsWithProviderSurveysAction() {
  const session = await requireAgent();

  try {
    const isAdmin = session.user.role === "admin";
    const areaId = session.user.attentionAreaId;

    const whereCondition = isAdmin || !areaId
      ? undefined
      : eq(providerSatisfactionSurveys.attentionAreaId, areaId);

    const rows = await db.query.providerSatisfactionSurveys.findMany({
      where: whereCondition,
      with: { submittedBy: { columns: { id: true, name: true } } },
    });

    const agentMap = new Map<string, string>();
    for (const row of rows) {
      const agentId = row.submittedBy.id;
      if (!agentMap.has(agentId)) {
        agentMap.set(agentId, row.submittedBy.name || agentId);
      }
    }

    return Array.from(agentMap.entries()).map(([id, name]) => ({ id, name }));
  } catch {
    return [];
  }
}

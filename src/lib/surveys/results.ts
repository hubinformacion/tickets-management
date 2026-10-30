import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { satisfactionSurveys, tickets } from "@/db/schema";
import { userSurveyCohort } from "@/lib/surveys/cohort";
import { getSurveyPagination, SURVEY_PAGE_SIZE } from "@/lib/surveys/pagination";
import { summarizeUserSurveyBuckets } from "@/lib/surveys/summary";
import type { SurveyFilterParams } from "@/actions/surveys";

/** El caller debe autenticar, validar filtros y derivar el área desde la sesión. Sin page solo para reporte interno. */
export async function readUserSurveyResults(areaId: number | undefined, selected: SurveyFilterParams, page?: number) {
  return db.transaction(async tx => {
    const cohort = userSurveyCohort(areaId, selected);
    const cohortIds = tx.select({ id: tickets.id }).from(tickets).where(cohort);
    const surveyScope = and(
      inArray(satisfactionSurveys.ticketId, cohortIds),
      areaId === undefined ? undefined : eq(satisfactionSurveys.attentionAreaId, areaId),
    );
    const validRating = sql`CASE WHEN v.rating IN (1, 2, 3, 4, 5) THEN v.rating ELSE NULL END`;
    const [buckets, totals] = await Promise.all([
      tx.execute<{ criterion: "responseTime" | "communication" | "solution" | "overall"; rating: number | null; count: number }>(sql`
        SELECT v.criterion, ${validRating} AS rating, count(*)::integer AS count
        FROM ${satisfactionSurveys}
        CROSS JOIN LATERAL (VALUES
          ('responseTime', ${satisfactionSurveys.responseTimeRating}),
          ('communication', ${satisfactionSurveys.communicationRating}),
          ('solution', ${satisfactionSurveys.solutionRating}),
          ('overall', ${satisfactionSurveys.overallRating})
        ) v(criterion, rating)
        WHERE ${surveyScope}
        GROUP BY v.criterion, ${validRating}
      `),
      tx.select({ count: count() }).from(tickets).where(cohort),
    ]);
    const summary = summarizeUserSurveyBuckets(buckets.rows, totals[0]?.count ?? 0);
    const pagination = getSurveyPagination(page ?? 1, summary.kpis.totalSurveys);
    const surveys = await tx.query.satisfactionSurveys.findMany({
      where: surveyScope,
      with: {
        ticket: { columns: { ticketCode: true, title: true }, with: { assignedTo: { columns: { id: true, name: true } } } },
        user: { columns: { name: true } },
        attentionArea: { columns: { name: true, slug: true } },
      },
      orderBy: [desc(satisfactionSurveys.createdAt), desc(satisfactionSurveys.id)],
      ...(page === undefined ? {} : { limit: SURVEY_PAGE_SIZE, offset: pagination.offset }),
    });
    return { surveys, ...summary, pagination };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { satisfactionSurveys, tickets } from "@/db/schema";
import { userSurveyCohort } from "@/lib/surveys/cohort";
import { getSurveyPagination, SURVEY_PAGE_SIZE } from "@/lib/surveys/pagination";
import { summarizeUserSurveyBuckets } from "@/lib/surveys/summary";
import type { SQL } from "drizzle-orm";
import type { SurveyFilterParams } from "@/actions/surveys";

type SurveyTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type UserSummary = ReturnType<typeof summarizeUserSurveyBuckets>;
type Cursor = { id: number; createdAt: string };

/** El caller autentica, valida filtros y deriva el área desde la sesión. */
async function withUserSurveySummary<T>(
  areaId: number | undefined,
  selected: SurveyFilterParams,
  read: (tx: SurveyTransaction, scope: SQL | undefined, summary: UserSummary) => Promise<T>,
) {
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
    return read(tx, surveyScope, summary);
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}

function readUserSurveyRows(tx: SurveyTransaction, scope: SQL | undefined, pagination?: { offset: number }, cursor?: Cursor) {
  return tx.query.satisfactionSurveys.findMany({
    where: and(scope, cursor ? sql`(${satisfactionSurveys.createdAt}, ${satisfactionSurveys.id}) < (${cursor.createdAt}::timestamp, ${cursor.id})` : undefined),
    extras: { cursorCreatedAt: sql<string>`${satisfactionSurveys.createdAt}::text`.as("cursor_created_at") },
    with: {
      ticket: { columns: { ticketCode: true, title: true }, with: { assignedTo: { columns: { id: true, name: true } } } },
      user: { columns: { name: true } },
      attentionArea: { columns: { name: true, slug: true } },
    },
    orderBy: [desc(satisfactionSurveys.createdAt), desc(satisfactionSurveys.id)],
    limit: pagination ? SURVEY_PAGE_SIZE : 500,
    offset: pagination?.offset,
  });
}

export async function readUserSurveyResults(areaId: number | undefined, selected: SurveyFilterParams, page = 1) {
  return withUserSurveySummary(areaId, selected, async (tx, scope, summary) => {
    const pagination = getSurveyPagination(page, summary.kpis.totalSurveys);
    const surveys = await readUserSurveyRows(tx, scope, pagination);
    return { surveys, ...summary, pagination };
  });
}

export async function writeUserSurveyReport(
  areaId: number | undefined,
  selected: SurveyFilterParams,
  report: {
    start: (kpis: UserSummary["kpis"]) => Promise<void>;
    rows: (rows: Awaited<ReturnType<typeof readUserSurveyRows>>) => Promise<void>;
  },
  signal: AbortSignal,
) {
  signal.throwIfAborted();
  return withUserSurveySummary(areaId, selected, async (tx, scope, summary) => {
    await report.start(summary.kpis);
    let cursor: Cursor | undefined;
    while (!signal.aborted) {
      const rows = await readUserSurveyRows(tx, scope, undefined, cursor);
      signal.throwIfAborted();
      await report.rows(rows);
      if (rows.length < 500) break;
      const last = rows[rows.length - 1];
      // Date truncaría los microsegundos originales de PostgreSQL.
      cursor = { id: last.id, createdAt: last.cursorCreatedAt };
    }
    signal.throwIfAborted();
  });
}

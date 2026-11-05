import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { providerSatisfactionSurveys as surveys } from "@/db/schema";
import { getPagination } from "@/lib/utils/pagination";
import type { SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { ProviderSurveyFilterParams } from "@/actions/surveys/provider-surveys";

export interface ProviderSurveyAggregate {
  totalSurveys: number;
  invalidRatingCount: number;
  avgResponseTime: number | null;
  avgDeadline: number | null;
  avgQuality: number | null;
  avgRequirementUnderstanding: number | null;
  avgAttention: number | null;
}

export function summarizeProviderSurveys(row: ProviderSurveyAggregate) {
  const round = (value: number) => Math.round(value * 10) / 10;
  const available = [row.avgResponseTime, row.avgDeadline, row.avgQuality, row.avgRequirementUnderstanding, row.avgAttention]
    .filter((value): value is number => value !== null).map(round);
  return {
    totalSurveys: row.totalSurveys, invalidRatingCount: row.invalidRatingCount,
    avgResponseTime: round(row.avgResponseTime ?? 0), avgDeadline: round(row.avgDeadline ?? 0),
    avgQuality: round(row.avgQuality ?? 0), avgRequirementUnderstanding: round(row.avgRequirementUnderstanding ?? 0),
    avgAttention: round(row.avgAttention ?? 0),
    avgOverall: available.length ? round(available.reduce((sum, value) => sum + value, 0) / available.length) : 0,
  };
}

/** La sesión fija el área; las fechas representan días del registro de respuesta en Lima. */
export function providerSurveyScope(areaId: number | undefined, filters: ProviderSurveyFilterParams) {
  return and(
    areaId === undefined ? undefined : eq(surveys.attentionAreaId, areaId),
    filters.agentId ? eq(surveys.submittedById, filters.agentId) : undefined,
    filters.dateFrom ? sql`${surveys.createdAt} >= ((${filters.dateFrom}::date::timestamp AT TIME ZONE 'America/Lima') AT TIME ZONE 'UTC')` : undefined,
    filters.dateTo ? sql`${surveys.createdAt} < (((${filters.dateTo}::date + interval '1 day') AT TIME ZONE 'America/Lima') AT TIME ZONE 'UTC')` : undefined,
  );
}

type SurveyTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type ProviderKpis = ReturnType<typeof summarizeProviderSurveys>;
type Cursor = { id: number; createdAt: string };

/** El caller autentica y valida. */
async function withProviderSurveySummary<T>(
  areaId: number | undefined,
  filters: ProviderSurveyFilterParams,
  read: (tx: SurveyTransaction, scope: SQL | undefined, kpis: ProviderKpis) => Promise<T>,
) {
  return db.transaction(async tx => {
    const scope = providerSurveyScope(areaId, filters);
    const columns = [surveys.responseTimeRating, surveys.deadlineRating, surveys.qualityRating, surveys.requirementUnderstandingRating, surveys.attentionRating];
    const average = (column: AnyPgColumn) => sql<number | null>`AVG(CASE WHEN ${column} IN (1, 2, 3, 4, 5) THEN ${column} END)::double precision`;
    const invalids = sql.join(columns.map(column => sql`COUNT(*) FILTER (WHERE ${column} IS NULL OR ${column} NOT IN (1, 2, 3, 4, 5))`), sql` + `);
    const [aggregate] = await tx.select({
      totalSurveys: count(), invalidRatingCount: sql<number>`(${invalids})::double precision`,
      avgResponseTime: average(surveys.responseTimeRating), avgDeadline: average(surveys.deadlineRating),
      avgQuality: average(surveys.qualityRating), avgRequirementUnderstanding: average(surveys.requirementUnderstandingRating),
      avgAttention: average(surveys.attentionRating),
    }).from(surveys).where(scope);
    const kpis = summarizeProviderSurveys(aggregate);
    return read(tx, scope, kpis);
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}

function readProviderSurveyRows(tx: SurveyTransaction, scope: SQL | undefined, pagination?: { pageSize: number; offset: number }, cursor?: Cursor) {
  return tx.query.providerSatisfactionSurveys.findMany({
    where: and(scope, cursor ? sql`(${surveys.createdAt}, ${surveys.id}) < (${cursor.createdAt}::timestamp, ${cursor.id})` : undefined),
    extras: { cursorCreatedAt: sql<string>`${surveys.createdAt}::text`.as("cursor_created_at") },
    with: {
      providerTicket: { columns: { externalCode: true, title: true }, with: { provider: { columns: { name: true } } } },
      submittedBy: { columns: { id: true, name: true } },
      attentionArea: { columns: { name: true, slug: true } },
    },
    orderBy: [desc(surveys.createdAt), desc(surveys.id)],
    limit: pagination ? pagination.pageSize : 500,
    offset: pagination?.offset,
  });
}

export async function readProviderSurveyResults(areaId: number | undefined, filters: ProviderSurveyFilterParams, page = 1) {
  return withProviderSurveySummary(areaId, filters, async (tx, scope, kpis) => {
    const pagination = getPagination(page, kpis.totalSurveys);
    const rows = await readProviderSurveyRows(tx, scope, pagination);
    return { surveys: rows, kpis, pagination };
  });
}

export async function writeProviderSurveyReport(
  areaId: number | undefined,
  filters: ProviderSurveyFilterParams,
  report: {
    start: (kpis: ProviderKpis) => Promise<void>;
    rows: (rows: Awaited<ReturnType<typeof readProviderSurveyRows>>) => Promise<void>;
  },
  signal: AbortSignal,
) {
  signal.throwIfAborted();
  return withProviderSurveySummary(areaId, filters, async (tx, scope, kpis) => {
    await report.start(kpis);
    let cursor: Cursor | undefined;
    while (!signal.aborted) {
      const rows = await readProviderSurveyRows(tx, scope, undefined, cursor);
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

import { db } from "@/db";
import { tickets, ticketCategories, attentionAreas, users, priorityConfig, satisfactionSurveys, ticketStatusHistory } from "@/db/schema";
import { eq, and, sql, count as drizzleCount, gte, lte, desc } from "drizzle-orm";
import { getAnalyticsPeriod } from "@/lib/analytics/period";
import type { AnalyticsPeriod, AnalyticsPeriodInput } from "@/lib/analytics/period";
import { summarizeResolutionCycles } from "@/lib/analytics/resolution-cycles";
import type { ResolutionCycle } from "@/lib/analytics/resolution-cycles";

// ============================================
// Types
// ============================================

export type DateRange = AnalyticsPeriod;

export interface StatusCount {
  status: string;
  count: number;
}

export interface AreaCount {
  areaName: string;
  areaSlug: string;
  count: number;
}

export interface PriorityCount {
  priority: string;
  count: number;
}

export interface WeeklyResolution {
  week: string;
  resolved: number;
  created: number;
}

export interface CategoryCount {
  categoryName: string;
  count: number;
}

export interface AgentWorkload {
  agentId: string;
  agentName: string;
  open: number;
  inProgress: number;
  total: number;
}

export interface SLACompliance {
  areaName: string;
  totalResolved: number;
  withinSLA: number;
  compliancePercent: number;
}

export interface SatisfactionTrend {
  month: string;
  avgRating: number;
  count: number;
}

// ============================================
// Date range helpers
// ============================================

function buildAreaCondition(areaId?: number) {
  return areaId ? eq(tickets.attentionAreaId, areaId) : undefined;
}

function buildDateCondition(dateRange?: DateRange) {
  if (!dateRange) return undefined;
  return and(
    dateRange.from ? gte(tickets.createdAt, dateRange.from) : undefined,
    lte(tickets.createdAt, dateRange.to),
  );
}

// ============================================
// Queries
// ============================================

/**
 * Tickets agrupados por estado.
 */
export async function getTicketVolumeByStatus(areaId?: number, range?: AnalyticsPeriodInput) {
  const dateRange = getAnalyticsPeriod(range);
  const conditions = [buildDateCondition(dateRange), buildAreaCondition(areaId)].filter(Boolean);

  const result = await db
    .select({
      status: tickets.status,
      count: drizzleCount(),
    })
    .from(tickets)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(tickets.status);

  return result as StatusCount[];
}

/**
 * Tickets agrupados por área de atención.
 */
export async function getTicketsByArea(range?: AnalyticsPeriodInput) {
  const dateRange = getAnalyticsPeriod(range);
  const conditions = [buildDateCondition(dateRange)].filter(Boolean);

  const result = await db
    .select({
      areaName: attentionAreas.name,
      areaSlug: attentionAreas.slug,
      count: drizzleCount(),
    })
    .from(tickets)
    .innerJoin(attentionAreas, eq(tickets.attentionAreaId, attentionAreas.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(attentionAreas.name, attentionAreas.slug);

  return result as AreaCount[];
}

/**
 * Tickets agrupados por prioridad.
 */
export async function getTicketsByPriority(areaId?: number, range?: AnalyticsPeriodInput) {
  const dateRange = getAnalyticsPeriod(range);
  const conditions = [
    buildDateCondition(dateRange),
    buildAreaCondition(areaId),
    sql`${tickets.priority} IS NOT NULL`,
  ].filter(Boolean);

  const result = await db
    .select({
      priority: tickets.priority,
      count: drizzleCount(),
    })
    .from(tickets)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(tickets.priority);

  return result as PriorityCount[];
}

/**
 * Tendencia semanal de tickets creados vs resueltos.
 */
export async function getResolutionTrend(areaId?: number, range?: AnalyticsPeriodInput) {
  const period = getAnalyticsPeriod(range);
  // Los timestamps sin zona almacenan UTC; agrupamos el calendario explícitamente en Lima.
  const createdWeek = sql`date_trunc('week', (${tickets.createdAt} AT TIME ZONE 'UTC') AT TIME ZONE 'America/Lima')`;
  const closedWeek = sql`date_trunc('week', (${ticketStatusHistory.changedAt} AT TIME ZONE 'UTC') AT TIME ZONE 'America/Lima')`;
  const [created, resolved] = await Promise.all([
    db.select({
      week: sql<string>`to_char(${createdWeek}, 'YYYY-MM-DD')`,
      created: drizzleCount(),
    }).from(tickets).where(and(buildDateCondition(period), buildAreaCondition(areaId)))
      .groupBy(createdWeek),
    db.select({
      week: sql<string>`to_char(${closedWeek}, 'YYYY-MM-DD')`,
      resolved: drizzleCount(),
    }).from(ticketStatusHistory).innerJoin(tickets, eq(ticketStatusHistory.ticketId, tickets.id))
      .where(and(
        eq(ticketStatusHistory.toStatus, "resolved"),
        sql`${ticketStatusHistory.fromStatus} IS NOT NULL AND ${ticketStatusHistory.fromStatus} <> 'resolved'`,
        period.from ? gte(ticketStatusHistory.changedAt, period.from) : undefined,
        lte(ticketStatusHistory.changedAt, period.to), buildAreaCondition(areaId),
      )).groupBy(closedWeek),
  ]);
  const weeks = new Map<string, WeeklyResolution>();
  for (const row of created) weeks.set(row.week, { ...row, resolved: 0 });
  for (const row of resolved) {
    const entry = weeks.get(row.week) ?? { week: row.week, created: 0, resolved: 0 };
    entry.resolved = row.resolved;
    weeks.set(row.week, entry);
  }
  return Array.from(weeks.values()).sort((a, b) => a.week.localeCompare(b.week));
}

/** Consulta en lote: los terminales separan ciclos y no cortamos el historial por periodo. */
async function getResolutionCycles(areaId?: number, range?: AnalyticsPeriodInput): Promise<ResolutionCycle[]> {
  const dates = getAnalyticsPeriod(range);
  const result = await db.execute<ResolutionCycle & Record<string, unknown>>(sql`
    WITH history AS (
      SELECT h.*,
        COUNT(*) FILTER (WHERE h.to_status IN ('resolved', 'voided')) OVER (
          PARTITION BY h.ticket_id ORDER BY h.changed_at, h.id
          ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ) AS cycle
      FROM ${ticketStatusHistory} h
      INNER JOIN ${tickets} ON ${tickets.id} = h.ticket_id
      ${areaId ? sql`WHERE ${tickets.attentionAreaId} = ${areaId}` : sql``}
    ), paired AS (
      SELECT history.*,
        MIN(changed_at) FILTER (WHERE to_status = 'in_progress') OVER (
          PARTITION BY ticket_id, cycle
        ) AS started_at
      FROM history
    )
    SELECT ${attentionAreas.id} AS "areaId", ${attentionAreas.name} AS "areaName",
      to_char(c.started_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "startedAt",
      to_char(c.changed_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "resolvedAt",
      ${attentionAreas.businessStartTime} AS "businessStart", ${attentionAreas.businessEndTime} AS "businessEnd",
      ${attentionAreas.businessDays} AS "businessDays", ${priorityConfig.slaHours} AS "slaHours"
    FROM paired c INNER JOIN ${tickets} ON ${tickets.id} = c.ticket_id
      INNER JOIN ${attentionAreas} ON ${attentionAreas.id} = ${tickets.attentionAreaId}
      LEFT JOIN ${priorityConfig} ON ${priorityConfig.attentionAreaId} = ${tickets.attentionAreaId}
        AND ${priorityConfig.priority} = ${tickets.priority}
    WHERE c.to_status = 'resolved' AND c.from_status IS NOT NULL AND c.from_status <> 'resolved'
      AND c.started_at IS NOT NULL AND c.started_at <= c.changed_at
      ${dates.from ? sql`AND c.changed_at >= ${dates.from.toISOString()}::timestamp` : sql``}
      AND c.changed_at <= ${dates.to.toISOString()}::timestamp
    ORDER BY ${attentionAreas.id}, c.changed_at, c.id
  `);
  return result.rows;
}

/** Promedio en horas hábiles de ciclos con inicio y cierre válidos. */
export async function getAvgResolutionTime(areaId?: number, range?: AnalyticsPeriodInput) {
  const stats = summarizeResolutionCycles(await getResolutionCycles(areaId, range));
  return stats.map(area => ({ areaName: area.areaName, avgHours: area.totalHours / area.measuredCycles }));
}

/** Cumplimiento de ciclos cerrados en el periodo, con el SLA y horario vigentes. */
export async function getSLACompliance(areaId?: number, range?: AnalyticsPeriodInput): Promise<SLACompliance[]> {
  const stats = summarizeResolutionCycles(await getResolutionCycles(areaId, range));
  return stats.filter(area => area.totalResolved > 0).map(area => ({
    areaName: area.areaName,
    totalResolved: area.totalResolved,
    withinSLA: area.withinSLA,
    compliancePercent: Math.round(area.withinSLA / area.totalResolved * 100),
  }));
}

/**
 * Tendencia de satisfacción del usuario por mes.
 */
export async function getSatisfactionTrend(areaId?: number, range?: AnalyticsPeriodInput) {
  const period = getAnalyticsPeriod(range);
  const month = sql`date_trunc('month', (${satisfactionSurveys.createdAt} AT TIME ZONE 'UTC') AT TIME ZONE 'America/Lima')`;
  const result = await db.select({
    month: sql<string>`to_char(${month}, 'YYYY-MM')`,
    avgRating: sql<number>`AVG(${satisfactionSurveys.overallRating})::double precision`,
    count: drizzleCount(),
  }).from(satisfactionSurveys).where(and(
    period.from ? gte(satisfactionSurveys.createdAt, period.from) : undefined,
    lte(satisfactionSurveys.createdAt, period.to),
    areaId ? eq(satisfactionSurveys.attentionAreaId, areaId) : undefined,
  )).groupBy(month).orderBy(month);
  return result as SatisfactionTrend[];
}

/**
 * Carga de trabajo por agente (tickets asignados).
 */
export async function getAgentWorkload(areaId?: number) {
  const conditions = [
    sql`${tickets.assignedToId} IS NOT NULL`,
    sql`${tickets.status} IN ('open', 'in_progress')`,
    buildAreaCondition(areaId),
  ].filter(Boolean);

  const result = await db
    .select({
      agentId: tickets.assignedToId,
      agentName: users.name,
      status: tickets.status,
      count: drizzleCount(),
    })
    .from(tickets)
    .innerJoin(users, eq(tickets.assignedToId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(tickets.assignedToId, users.name, tickets.status);

  // Agregar por agente
  const workloadMap = new Map<string, AgentWorkload>();
  for (const row of result) {
    if (!row.agentId) continue;
    const existing = workloadMap.get(row.agentId) || {
      agentId: row.agentId,
      agentName: row.agentName,
      open: 0,
      inProgress: 0,
      total: 0,
    };
    if (row.status === 'open') existing.open = row.count;
    if (row.status === 'in_progress') existing.inProgress = row.count;
    existing.total += row.count;
    workloadMap.set(row.agentId, existing);
  }

  return Array.from(workloadMap.values()).sort((a, b) => b.total - a.total);
}

/**
 * Top N categorías con más tickets.
 */
export async function getTopCategories(areaId?: number, limit = 5, range?: AnalyticsPeriodInput) {
  const dateRange = getAnalyticsPeriod(range);
  const conditions = [
    buildDateCondition(dateRange),
    buildAreaCondition(areaId),
  ].filter(Boolean);

  const result = await db
    .select({
      categoryName: ticketCategories.name,
      count: drizzleCount(),
    })
    .from(tickets)
    .innerJoin(ticketCategories, eq(tickets.categoryId, ticketCategories.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(ticketCategories.name)
    .orderBy(desc(drizzleCount()))
    .limit(limit);

  return result as CategoryCount[];
}

/**
 * KPIs resumen para el dashboard.
 */
export async function getDashboardKPIs(areaId?: number, userId?: string, range?: AnalyticsPeriodInput) {
  const period = getAnalyticsPeriod(range);
  const [statusCounts, unassigned, satisfaction] = await Promise.all([
    getTicketVolumeByStatus(areaId, period),
    db.select({ count: drizzleCount() }).from(tickets).where(and(
      buildDateCondition(period), buildAreaCondition(areaId),
      sql`${tickets.assignedToId} IS NULL`, eq(tickets.status, "open"),
    )),
    db.select({ avg: sql<number>`AVG(${satisfactionSurveys.overallRating})::double precision` })
      .from(satisfactionSurveys).where(and(
        areaId ? eq(satisfactionSurveys.attentionAreaId, areaId) : undefined,
        period.from ? gte(satisfactionSurveys.createdAt, period.from) : undefined,
        lte(satisfactionSurveys.createdAt, period.to),
      )),
  ]);
  const totalTickets = statusCounts.reduce((total, row) => total + row.count, 0);
  const resolvedCount = statusCounts.find(row => row.status === "resolved")?.count ?? 0;
  return {
    totalTickets,
    statusCounts,
    unassignedCount: unassigned[0]?.count ?? 0,
    avgSatisfaction: Math.round((satisfaction[0]?.avg ?? 0) * 10) / 10,
    resolutionRate: totalTickets > 0 ? Math.round(resolvedCount / totalTickets * 100) : 0,
  };
}

/**
 * KPIs personales del usuario.
 */
export async function getUserKPIs(userId: string) {
  const conditions = [eq(tickets.createdById, userId)];

  const totalResult = await db
    .select({ count: drizzleCount() })
    .from(tickets)
    .where(and(...conditions));
  const totalTickets = totalResult[0]?.count ?? 0;

  const pendingResult = await db
    .select({ count: drizzleCount() })
    .from(tickets)
    .where(and(...conditions, sql`${tickets.status} NOT IN ('resolved', 'voided')`));
  const pendingCount = pendingResult[0]?.count ?? 0;

  const resolvedResult = await db
    .select({ count: drizzleCount() })
    .from(tickets)
    .where(and(...conditions, eq(tickets.status, 'resolved')));
  const resolvedCount = resolvedResult[0]?.count ?? 0;

  const satisfactionResult = await db
    .select({ avg: sql<number>`AVG(${satisfactionSurveys.overallRating})` })
    .from(satisfactionSurveys)
    .where(eq(satisfactionSurveys.userId, userId));
  const avgSatisfaction = satisfactionResult[0]?.avg ?? 0;

  return {
    totalTickets,
    pendingCount,
    resolvedCount,
    avgSatisfaction: Math.round(avgSatisfaction * 10) / 10,
  };
}

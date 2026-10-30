import { db } from "@/db";
import { tickets, ticketCategories, attentionAreas, users, priorityConfig, satisfactionSurveys, ticketStatusHistory } from "@/db/schema";
import { eq, and, sql, count as drizzleCount, gte, lte, desc } from "drizzle-orm";
import { summarizeResolutionCycles } from "@/lib/analytics/resolution-cycles";
import type { ResolutionCycle } from "@/lib/analytics/resolution-cycles";

// ============================================
// Types
// ============================================

export interface DateRange {
  from: Date;
  to: Date;
}

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

function getDateRange(range?: string): DateRange {
  const now = new Date();
  const start = new Date();

  switch (range) {
    case "week":
      start.setDate(now.getDate() - 7);
      break;
    case "month":
      start.setMonth(now.getMonth() - 1);
      break;
    case "quarter":
      start.setMonth(now.getMonth() - 3);
      break;
    case "year":
      start.setFullYear(now.getFullYear() - 1);
      break;
    default:
      start.setFullYear(2020, 0, 1);
  }

  return { from: start, to: now };
}

function buildAreaCondition(areaId?: number) {
  return areaId ? eq(tickets.attentionAreaId, areaId) : undefined;
}

function buildDateCondition(dateRange?: DateRange) {
  if (!dateRange) return undefined;
  return and(
    gte(tickets.createdAt, dateRange.from),
    lte(tickets.createdAt, dateRange.to),
  );
}

// ============================================
// Queries
// ============================================

/**
 * Tickets agrupados por estado.
 */
export async function getTicketVolumeByStatus(areaId?: number, range?: string) {
  const dateRange = getDateRange(range);
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
export async function getTicketsByArea(range?: string) {
  const dateRange = getDateRange(range);
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
export async function getTicketsByPriority(areaId?: number, range?: string) {
  const dateRange = getDateRange(range);
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
export async function getResolutionTrend(areaId?: number, weeks = 8) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - weeks * 7);

  const conditions = [
    gte(tickets.createdAt, startDate),
    buildAreaCondition(areaId),
  ].filter(Boolean);

  const result = await db
    .select({
      week: sql<string>`to_char(date_trunc('week', ${tickets.createdAt}), 'YYYY-MM-DD')`,
      created: drizzleCount(),
    })
    .from(tickets)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(sql`date_trunc('week', ${tickets.createdAt})`)
    .orderBy(sql`date_trunc('week', ${tickets.createdAt})`);

  // Query separada para tickets resueltos
  const resolvedConditions = [
    gte(tickets.updatedAt, startDate),
    eq(tickets.status, 'resolved'),
    buildAreaCondition(areaId),
  ].filter(Boolean);

  const resolvedResult = await db
    .select({
      week: sql<string>`to_char(date_trunc('week', ${tickets.updatedAt}), 'YYYY-MM-DD')`,
      resolved: drizzleCount(),
    })
    .from(tickets)
    .where(resolvedConditions.length > 0 ? and(...resolvedConditions) : undefined)
    .groupBy(sql`date_trunc('week', ${tickets.updatedAt})`)
    .orderBy(sql`date_trunc('week', ${tickets.updatedAt})`);

  // Merge results
  const weekMap = new Map<string, WeeklyResolution>();
  for (const row of result) {
    weekMap.set(row.week, { week: row.week, created: row.created, resolved: 0 });
  }
  for (const row of resolvedResult) {
    const existing = weekMap.get(row.week);
    if (existing) {
      existing.resolved = row.resolved;
    } else {
      weekMap.set(row.week, { week: row.week, created: 0, resolved: row.resolved });
    }
  }

  return Array.from(weekMap.values()).sort((a, b) => a.week.localeCompare(b.week));
}

/** Consulta en lote: los terminales separan ciclos y no cortamos el historial por periodo. */
async function getResolutionCycles(areaId?: number, range?: string): Promise<ResolutionCycle[]> {
  const dates = range && range !== "all" ? getDateRange(range) : undefined;
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
      ${dates ? sql`AND c.changed_at >= ${dates.from.toISOString()}::timestamp
        AND c.changed_at <= ${dates.to.toISOString()}::timestamp` : sql``}
    ORDER BY ${attentionAreas.id}, c.changed_at, c.id
  `);
  return result.rows;
}

/** Promedio en horas hábiles de ciclos con inicio y cierre válidos. */
export async function getAvgResolutionTime(areaId?: number, range?: string) {
  const stats = summarizeResolutionCycles(await getResolutionCycles(areaId, range));
  return stats.map(area => ({ areaName: area.areaName, avgHours: area.totalHours / area.measuredCycles }));
}

/** Cumplimiento de ciclos cerrados en el periodo, con el SLA y horario vigentes. */
export async function getSLACompliance(areaId?: number, range?: string): Promise<SLACompliance[]> {
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
export async function getSatisfactionTrend(areaId?: number, months = 6) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const conditions = [
    gte(satisfactionSurveys.createdAt, startDate),
    areaId ? eq(satisfactionSurveys.attentionAreaId, areaId) : undefined,
  ].filter(Boolean);

  const result = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${satisfactionSurveys.createdAt}), 'YYYY-MM')`,
      avgRating: sql<number>`AVG(${satisfactionSurveys.overallRating})`,
      count: drizzleCount(),
    })
    .from(satisfactionSurveys)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(sql`date_trunc('month', ${satisfactionSurveys.createdAt})`)
    .orderBy(sql`date_trunc('month', ${satisfactionSurveys.createdAt})`);

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
export async function getTopCategories(areaId?: number, limit = 5, range?: string) {
  const dateRange = getDateRange(range);
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
export async function getDashboardKPIs(areaId?: number, userId?: string, range?: string) {
  const dateRange = getDateRange(range);
  const conditions = [buildDateCondition(dateRange), buildAreaCondition(areaId)].filter(Boolean);
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Totales por estado
  const statusCounts = await getTicketVolumeByStatus(areaId, range);

  // Total de tickets
  const totalResult = await db
    .select({ count: drizzleCount() })
    .from(tickets)
    .where(whereClause);
  const totalTickets = totalResult[0]?.count ?? 0;

  // Tickets abiertos (sin asignar)
  const unassignedResult = await db
    .select({ count: drizzleCount() })
    .from(tickets)
    .where(and(
      whereClause,
      sql`${tickets.assignedToId} IS NULL`,
      eq(tickets.status, 'open'),
    ));
  const unassignedCount = unassignedResult[0]?.count ?? 0;

  // Satisfacción promedio
  const satisfactionConditions = [
    areaId ? eq(satisfactionSurveys.attentionAreaId, areaId) : undefined,
  ].filter(Boolean);
  const satisfactionResult = await db
    .select({ avg: sql<number>`AVG(${satisfactionSurveys.overallRating})` })
    .from(satisfactionSurveys)
    .where(satisfactionConditions.length > 0 ? and(...satisfactionConditions) : undefined);
  const avgSatisfaction = satisfactionResult[0]?.avg ?? 0;

  // Tasa de resolución
  const resolvedCount = statusCounts.find(s => s.status === 'resolved')?.count ?? 0;
  const resolutionRate = totalTickets > 0 ? Math.round((resolvedCount / totalTickets) * 100) : 0;

  return {
    totalTickets,
    statusCounts,
    unassignedCount,
    avgSatisfaction: Math.round(avgSatisfaction * 10) / 10,
    resolutionRate,
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

import { db } from "@/db";
import { tickets, ticketCategories, ticketSubcategories, attentionAreas, users, priorityConfig, satisfactionSurveys, ticketStatusHistory } from "@/db/schema";
import { eq, and, sql, count as drizzleCount, gte, lte, desc } from "drizzle-orm";
import type { TicketStatus } from "@/types";

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

/**
 * Tiempo promedio de resolución por área (en horas).
 * Usa ticket_status_history para calcular el tiempo entre in_progress y resolved.
 */
export async function getAvgResolutionTime(areaId?: number) {
  const conditions = [
    eq(ticketStatusHistory.toStatus, 'resolved'),
    sql`${ticketStatusHistory.fromStatus} IS NOT NULL`,
    buildAreaCondition(areaId),
  ].filter(Boolean);

  const result = await db
    .select({
      areaName: attentionAreas.name,
      avgHours: sql<number>`AVG(EXTRACT(EPOCH FROM (${ticketStatusHistory.changedAt} - (
        SELECT h2.changed_at FROM ticket_status_history h2
        WHERE h2.ticket_id = ${ticketStatusHistory.ticketId}
          AND h2.to_status = 'in_progress'
        ORDER BY h2.changed_at DESC LIMIT 1
      ))) / 3600)`,
    })
    .from(ticketStatusHistory)
    .innerJoin(tickets, eq(ticketStatusHistory.ticketId, tickets.id))
    .innerJoin(attentionAreas, eq(tickets.attentionAreaId, attentionAreas.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(attentionAreas.name);

  return result;
}

/**
 * SLA compliance por área: % de tickets resueltos dentro del SLA configurado.
 */
export async function getSLACompliance(areaId?: number) {
  // Obtener configs de SLA por área
  const slaConfigs = await db
    .select({
      areaId: priorityConfig.attentionAreaId,
      priority: priorityConfig.priority,
      slaHours: priorityConfig.slaHours,
    })
    .from(priorityConfig);

  const slaMap = new Map<string, number>();
  for (const config of slaConfigs) {
    slaMap.set(`${config.areaId}-${config.priority}`, config.slaHours);
  }

  // Obtener tickets resueltos con su tiempo de resolución
  const conditions = [
    eq(ticketStatusHistory.toStatus, 'resolved'),
    sql`${ticketStatusHistory.fromStatus} IS NOT NULL`,
    buildAreaCondition(areaId),
  ].filter(Boolean);

  const resolvedTickets = await db
    .select({
      ticketId: ticketStatusHistory.ticketId,
      areaId: tickets.attentionAreaId,
      priority: tickets.priority,
      resolvedAt: ticketStatusHistory.changedAt,
    })
    .from(ticketStatusHistory)
    .innerJoin(tickets, eq(ticketStatusHistory.ticketId, tickets.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  // Calcular compliance
  const areaStats = new Map<number, { total: number; withinSLA: number; areaName: string }>();

  for (const ticket of resolvedTickets) {
    if (!ticket.areaId || !ticket.priority) continue;

    const areaConfig = slaMap.get(`${ticket.areaId}-${ticket.priority}`);
    if (!areaConfig) continue;

    // Obtener tiempo cuando entró en in_progress
    const historyEntry = await db.query.ticketStatusHistory.findFirst({
      where: and(
        eq(ticketStatusHistory.ticketId, ticket.ticketId),
        eq(ticketStatusHistory.toStatus, 'in_progress'),
      ),
      orderBy: desc(ticketStatusHistory.changedAt),
    });

    if (!historyEntry) continue;

    const hoursToResolve = (ticket.resolvedAt.getTime() - historyEntry.changedAt.getTime()) / (1000 * 60 * 60);

    const stats = areaStats.get(ticket.areaId) || { total: 0, withinSLA: 0, areaName: '' };
    stats.total++;
    if (hoursToResolve <= areaConfig) {
      stats.withinSLA++;
    }
    areaStats.set(ticket.areaId, stats);
  }

  // Obtener nombres de área
  const areas = await db.select().from(attentionAreas);
  const areaNameMap = new Map(areas.map(a => [a.id, a.name]));

  return Array.from(areaStats.entries()).map(([areaId, stats]) => ({
    areaName: areaNameMap.get(areaId) || `Área ${areaId}`,
    totalResolved: stats.total,
    withinSLA: stats.withinSLA,
    compliancePercent: stats.total > 0 ? Math.round((stats.withinSLA / stats.total) * 100) : 0,
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

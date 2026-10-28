import { and, eq, sql } from "drizzle-orm";
import { tickets } from "@/db/schema";

interface SurveyCohortFilters {
  agentId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Los timestamps se almacenan en UTC; los días del filtro representan el calendario de Lima.
export function userSurveyCohort(areaId: number | undefined, filters: SurveyCohortFilters) {
  const conditions = [eq(tickets.status, "resolved")];
  if (areaId !== undefined) conditions.push(eq(tickets.attentionAreaId, areaId));
  if (filters.agentId) conditions.push(eq(tickets.assignedToId, filters.agentId));
  if (filters.dateFrom) conditions.push(sql`${tickets.closedAt} >= ((${filters.dateFrom}::date::timestamp at time zone 'America/Lima') at time zone 'UTC')`);
  if (filters.dateTo) conditions.push(sql`${tickets.closedAt} < (((${filters.dateTo}::date + interval '1 day') at time zone 'America/Lima') at time zone 'UTC')`);
  return and(...conditions);
}

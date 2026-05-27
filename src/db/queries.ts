import { db } from "@/db";
import { tickets, comments, ticketCategories, ticketSubcategories, appSettings, users, attentionAreas, satisfactionSurveys } from "@/db/schema";
import { eq, desc, sql, and, or, ilike, inArray, SQL, count as drizzleCount } from "drizzle-orm";
import { STATUS_URL_TO_DB } from "@/lib/constants/tickets";
import type { TicketStatus } from "@/types";

/**
 * Resultado de la query de tickets con conteo de comentarios.
 */
export type TicketRow = Awaited<ReturnType<typeof queryTickets>>[number];

/**
 * Parámetros de filtro para tickets (usados desde URL search params).
 */
export interface TicketFilterParams {
  estado?: string;
  asignado?: string;
  area?: string;
  categoria?: string;
  subcategoria?: string;
  buscar?: string;
  anio?: string;
  desde?: string;
  hasta?: string;
  pagina?: number;
  porPagina?: number;
}

/**
 * Resultado paginado de tickets.
 */
export interface PaginatedTicketsResult {
  rows: TicketRow[];
  totalCount: number;
}

/**
 * Construye condiciones WHERE a partir de filtros de tickets.
 */
function buildTicketFilterConditions(filters: TicketFilterParams): SQL[] {
  const conditions: SQL[] = [];

  // Multi-select de estado: "abierto,en_progreso" → ['open', 'in_progress']
  if (filters.estado) {
    const slugs = filters.estado.split(',').filter(Boolean);
    const dbValues = slugs
      .map(s => STATUS_URL_TO_DB[s])
      .filter((v): v is TicketStatus => v != null);
    if (dbValues.length === 1) {
      conditions.push(eq(tickets.status, dbValues[0]));
    } else if (dbValues.length > 1) {
      conditions.push(inArray(tickets.status, dbValues));
    }
  }

  if (filters.asignado) {
    if (filters.asignado === "sin_asignar") {
      conditions.push(sql`${tickets.assignedToId} IS NULL`);
    } else {
      conditions.push(eq(tickets.assignedToId, filters.asignado));
    }
  }

  if (filters.area) {
    conditions.push(eq(tickets.attentionAreaId, Number(filters.area)));
  }

  if (filters.categoria) {
    conditions.push(eq(tickets.categoryId, Number(filters.categoria)));
  }

  if (filters.subcategoria) {
    conditions.push(eq(tickets.subcategoryId, Number(filters.subcategoria)));
  }

  if (filters.buscar) {
    const searchPattern = `%${filters.buscar}%`;
    conditions.push(
      or(
        ilike(tickets.ticketCode, searchPattern),
        ilike(tickets.title, searchPattern),
      )!,
    );
  }

  if (filters.anio && filters.anio !== "all") {
    conditions.push(
      sql`extract(year from ${tickets.createdAt}) = ${Number(filters.anio)}`,
    );
  }

  if (filters.desde) {
    conditions.push(sql`${tickets.createdAt} >= ${filters.desde}::timestamp`);
  }

  if (filters.hasta) {
    // Agregar un día para incluir el día completo
    conditions.push(sql`${tickets.createdAt} < (${filters.hasta}::timestamp + interval '1 day')`);
  }

  return conditions;
}

/**
 * Query reutilizable para obtener tickets con conteo de comentarios.
 * Consolida el patrón en dashboards, mis-tickets, seguimiento, explorador y area.
 * 
 * NOTA: Esta función se mantiene para los dashboards que usan limit sin paginación.
 *
 * @param where - Condición WHERE de Drizzle (ej: eq(tickets.createdById, userId))
 * @param limit - Límite de resultados (opcional, sin límite por defecto)
 */
export function queryTickets(
  where?: SQL,
  limit?: number,
) {
  const query = db
    .select({
      id: tickets.id,
      ticketCode: tickets.ticketCode,
      title: tickets.title,
      status: tickets.status,
      priority: tickets.priority,
      categoryId: tickets.categoryId,
      categoryName: ticketCategories.name,
      subcategoryId: tickets.subcategoryId,
      createdById: tickets.createdById,
      assignedToId: tickets.assignedToId,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      commentCount: sql<number>`cast(count(${comments.id}) as integer)`,
      hasSurvey: sql<boolean>`exists(select 1 from satisfaction_survey where satisfaction_survey.ticket_id = ${tickets.id})`,
    })
    .from(tickets)
    .leftJoin(ticketCategories, eq(tickets.categoryId, ticketCategories.id))
    .leftJoin(comments, and(eq(tickets.id, comments.ticketId), eq(comments.type, 'comment')))
    .groupBy(tickets.id, ticketCategories.name)
    .orderBy(desc(tickets.createdAt));

  if (where) {
    query.where(where);
  }

  if (limit) {
    query.limit(limit);
  }

  return query;
}

/**
 * Query paginada de tickets con filtros server-side.
 * Ejecuta dos queries en paralelo: una para los datos paginados y otra para el total.
 *
 * @param filters - Filtros de URL search params
 * @param baseWhere - Condición base (ej: tickets del usuario, del área, etc.)
 */
export async function queryTicketsPaginated(
  filters: TicketFilterParams,
  baseWhere?: SQL,
): Promise<PaginatedTicketsResult> {
  const page = filters.pagina || 1;
  const perPage = filters.porPagina || 25;
  const offset = (page - 1) * perPage;

  // Combinar condición base con filtros
  const filterConditions = buildTicketFilterConditions(filters);
  const allConditions = baseWhere
    ? [baseWhere, ...filterConditions]
    : filterConditions;
  const whereClause = allConditions.length > 0 ? and(...allConditions) : undefined;

  // Query de datos paginados
  const dataQuery = db
    .select({
      id: tickets.id,
      ticketCode: tickets.ticketCode,
      title: tickets.title,
      status: tickets.status,
      priority: tickets.priority,
      categoryId: tickets.categoryId,
      categoryName: ticketCategories.name,
      subcategoryId: tickets.subcategoryId,
      createdById: tickets.createdById,
      assignedToId: tickets.assignedToId,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      commentCount: sql<number>`cast(count(${comments.id}) as integer)`,
      hasSurvey: sql<boolean>`exists(select 1 from satisfaction_survey where satisfaction_survey.ticket_id = ${tickets.id})`,
    })
    .from(tickets)
    .leftJoin(ticketCategories, eq(tickets.categoryId, ticketCategories.id))
    .leftJoin(comments, and(eq(tickets.id, comments.ticketId), eq(comments.type, 'comment')))
    .groupBy(tickets.id, ticketCategories.name)
    .orderBy(desc(tickets.createdAt))
    .limit(perPage)
    .offset(offset);

  if (whereClause) {
    dataQuery.where(whereClause);
  }

  // Query de conteo total (sin joins de comments, solo cuenta tickets)
  const countQuery = db
    .select({ count: drizzleCount() })
    .from(tickets)
    .leftJoin(ticketCategories, eq(tickets.categoryId, ticketCategories.id));

  if (whereClause) {
    countQuery.where(whereClause);
  }

  const [rows, countResult] = await Promise.all([dataQuery, countQuery]);

  return {
    rows,
    totalCount: countResult[0]?.count ?? 0,
  };
}

/**
 * Resultado paginado de usuarios.
 */
export interface PaginatedUsersResult {
  rows: (typeof users.$inferSelect)[];
  totalCount: number;
}

/**
 * Query paginada de usuarios con búsqueda server-side.
 */
export async function queryUsersPaginated(
  search?: string,
  page = 1,
  perPage = 25,
): Promise<PaginatedUsersResult> {
  const offset = (page - 1) * perPage;

  const conditions: SQL[] = [];
  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      or(
        ilike(users.name, searchPattern),
        ilike(users.email, searchPattern),
      )!,
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const dataQuery = db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(perPage)
    .offset(offset);

  const countQuery = db
    .select({ count: drizzleCount() })
    .from(users);

  if (whereClause) {
    dataQuery.where(whereClause);
    countQuery.where(whereClause);
  }

  const [rows, countResult] = await Promise.all([dataQuery, countQuery]);

  return {
    rows,
    totalCount: countResult[0]?.count ?? 0,
  };
}

/**
 * Obtiene las opciones de filtro para las listas de tickets.
 * Retorna los usuarios asignados y categorías únicas dentro del scope dado.
 *
 * @param baseWhere - Condición base para acotar el scope (ej: tickets del usuario)
 */
export async function getTicketFilterOptions(baseWhere?: SQL) {
  const assignedQuery = db
    .selectDistinct({
      id: users.id,
      name: users.name,
    })
    .from(tickets)
    .innerJoin(users, eq(tickets.assignedToId, users.id));

  const categoryQuery = db
    .selectDistinct({
      id: ticketCategories.id,
      name: ticketCategories.name,
    })
    .from(tickets)
    .innerJoin(ticketCategories, eq(tickets.categoryId, ticketCategories.id));

  const subcategoryQuery = db
    .selectDistinct({
      id: ticketSubcategories.id,
      name: ticketSubcategories.name,
      categoryId: ticketSubcategories.categoryId,
    })
    .from(tickets)
    .innerJoin(ticketSubcategories, eq(tickets.subcategoryId, ticketSubcategories.id));

  const areaQuery = db
    .selectDistinct({
      id: attentionAreas.id,
      name: attentionAreas.name,
    })
    .from(tickets)
    .innerJoin(attentionAreas, eq(tickets.attentionAreaId, attentionAreas.id));

  if (baseWhere) {
    assignedQuery.where(baseWhere);
    categoryQuery.where(baseWhere);
    subcategoryQuery.where(baseWhere);
    areaQuery.where(baseWhere);
  }

  const [assignedUsers, categoriesList, subcategoriesList, areasList] = await Promise.all([
    assignedQuery,
    categoryQuery,
    subcategoryQuery,
    areaQuery,
  ]);

  return { assignedUsers, categories: categoriesList, subcategories: subcategoriesList, attentionAreas: areasList };
}

/**
 * Obtiene el valor de una configuración de la aplicación.
 *
 * @param key - Clave de la configuración (ej: "allow_new_tickets")
 * @returns El valor como string, o null si no existe
 */
export async function getAppSetting(key: string): Promise<string | null> {
  const setting = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, key),
  });
  return setting?.value ?? null;
}

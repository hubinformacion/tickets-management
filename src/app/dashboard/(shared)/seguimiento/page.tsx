import { db } from "@/db";
import { tickets } from "@/db/schema";
import { queryTicketsPaginated, getTicketFilterOptions } from "@/db/queries";
import type { TicketFilterParams } from "@/db/queries";
import { requireAuth } from "@/lib/auth/helpers";
import { sql, and, not, eq, inArray } from "drizzle-orm";
import { TicketsList } from "@/components/tickets/tickets-list";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "En seguimiento",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SeguimientoPage({ searchParams }: PageProps) {
  const session = await requireAuth();

  const baseWhere = and(
    not(eq(tickets.createdById, session.user.id)),
    sql`${session.user.id} = ANY(${tickets.watchers})`
  )!;

  const params = await searchParams;
  const filters: TicketFilterParams = {
    estado: typeof params.estado === "string" ? params.estado : undefined,
    asignado: typeof params.asignado === "string" ? params.asignado : undefined,
    categoria: typeof params.categoria === "string" ? params.categoria : undefined,
    subcategoria: typeof params.subcategoria === "string" ? params.subcategoria : undefined,
    buscar: typeof params.buscar === "string" ? params.buscar : undefined,
    anio: typeof params.anio === "string" ? params.anio : undefined,
    desde: typeof params.desde === "string" ? params.desde : undefined,
    hasta: typeof params.hasta === "string" ? params.hasta : undefined,
    pagina: typeof params.pagina === "string" ? Number(params.pagina) : 1,
    porPagina: typeof params.porPagina === "string" ? Number(params.porPagina) : 10,
  };

  // Queries independientes en paralelo
  const [paginatedResult, filterOptions] = await Promise.all([
    queryTicketsPaginated(filters, baseWhere),
    getTicketFilterOptions(baseWhere),
  ]);

  // Fetch relations solo para los IDs de la página actual
  const ticketIds = paginatedResult.rows.map(t => t.id);
  const relationsData = ticketIds.length > 0
    ? await db.query.tickets.findMany({
      where: inArray(tickets.id, ticketIds),
      columns: { id: true },
      with: {
        assignedTo: true,
        createdBy: true,
      },
    })
    : [];

  // Merge
  const mergedTickets = paginatedResult.rows.map((ticket) => {
    const withRelations = relationsData.find((t) => t.id === ticket.id);
    return {
      ...ticket,
      assignedTo: withRelations?.assignedTo || null,
      createdBy: withRelations?.createdBy || null,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumbs */}
      <Breadcrumb items={[{ label: "En seguimiento" }]} />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">En seguimiento</h1>
        <p className="text-muted-foreground mt-1">
          Tickets donde estás asignado como observador
        </p>
      </div>

      <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded-lg" />}>
        <TicketsList
          tickets={mergedTickets}
          totalCount={paginatedResult.totalCount}
          isAdmin={session.user.role === "admin"}
          isWatchedView={true}
          hideHeader={true}
          assignedUsers={filterOptions.assignedUsers}
          categories={filterOptions.categories}
          subcategories={filterOptions.subcategories}
        />
      </Suspense>
    </div>
  );
}

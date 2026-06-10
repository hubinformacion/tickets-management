import { db } from "@/db";
import { tickets, attentionAreas } from "@/db/schema";
import { queryTicketsPaginated, getTicketFilterOptions } from "@/db/queries";
import type { TicketFilterParams } from "@/db/queries";
import { getSession } from "@/lib/auth/helpers";
import { eq, inArray } from "drizzle-orm";
import { TicketsList } from "@/components/tickets/tickets-list";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tickets del área",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AreaTicketsPage({ searchParams }: PageProps) {
  // Authorization handled by (agent) layout
  const session = await getSession();
  if (!session?.user) return null;

  if (!session.user.attentionAreaId) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-destructive">Error de configuración</h1>
        <p className="mt-2 text-muted-foreground">
          Tu usuario tiene rol de agente pero no tiene un área de atención asignada.
          Contacta al administrador.
        </p>
      </div>
    );
  }

  const { attentionAreaId } = session.user;
  const baseWhere = eq(tickets.attentionAreaId, attentionAreaId);

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
  const [areaDetails, paginatedResult, filterOptions] = await Promise.all([
    db.query.attentionAreas.findFirst({
      where: eq(attentionAreas.id, attentionAreaId),
    }),
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

  const mergedTickets = paginatedResult.rows.map((ticket) => {
    const withAssigned = relationsData.find((t) => t.id === ticket.id);
    return {
      ...ticket,
      assignedTo: withAssigned?.assignedTo || null,
      createdBy: withAssigned?.createdBy || null,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumbs */}
      <Breadcrumb items={[{ label: "Tickets del área" }]} />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tickets del área</h1>
        <p className="text-muted-foreground mt-1">
          Gestión completa de tickets para {areaDetails?.name || "tu área"}
        </p>
      </div>

      <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded-lg" />}>
        <TicketsList
          tickets={mergedTickets}
          totalCount={paginatedResult.totalCount}
          isAdmin={session.user.role === "admin"}
          isAgent={true}
          hideHeader={true}
          assignedUsers={filterOptions.assignedUsers}
          categories={filterOptions.categories}
          subcategories={filterOptions.subcategories}
        />
      </Suspense>
    </div>
  );
}

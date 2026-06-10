import { db } from "@/db";
import { tickets } from "@/db/schema";
import { queryTicketsPaginated, getTicketFilterOptions } from "@/db/queries";
import type { TicketFilterParams } from "@/db/queries";
import { getSession } from "@/lib/auth/helpers";
import { inArray } from "drizzle-orm";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explorador de tickets",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ExploradorPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session?.user) return null;

  const params = await searchParams;
  const filters: TicketFilterParams = {
    estado: typeof params.estado === "string" ? params.estado : undefined,
    asignado: typeof params.asignado === "string" ? params.asignado : undefined,
    area: typeof params.area === "string" ? params.area : undefined,
    categoria: typeof params.categoria === "string" ? params.categoria : undefined,
    buscar: typeof params.buscar === "string" ? params.buscar : undefined,
    anio: typeof params.anio === "string" ? params.anio : undefined,
    desde: typeof params.desde === "string" ? params.desde : undefined,
    hasta: typeof params.hasta === "string" ? params.hasta : undefined,
    pagina: typeof params.pagina === "string" ? Number(params.pagina) : 1,
    porPagina: typeof params.porPagina === "string" ? Number(params.porPagina) : 10,
  };

  const [paginatedResult, filterOptions] = await Promise.all([
    queryTicketsPaginated(filters),
    getTicketFilterOptions(),
  ]);

  const ticketIds = paginatedResult.rows.map(t => t.id);
  const relationsData = ticketIds.length > 0
    ? await db.query.tickets.findMany({
      where: inArray(tickets.id, ticketIds),
      columns: { id: true },
      with: {
        createdBy: true,
        assignedTo: true,
      },
    })
    : [];

  const mergedTickets = paginatedResult.rows.map((ticket) => {
    const withRelations = relationsData.find((t) => t.id === ticket.id);
    return {
      ...ticket,
      createdBy: withRelations?.createdBy || null,
      assignedTo: withRelations?.assignedTo || null,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Explorador de tickets" }]} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Explorador de tickets</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestión completa de todos los tickets del sistema
        </p>
      </div>

      <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded-lg" />}>
        <AdminTicketsTable
          tickets={mergedTickets}
          totalCount={paginatedResult.totalCount}
          assignedUsers={filterOptions.assignedUsers}
          categories={filterOptions.categories}
          attentionAreas={filterOptions.attentionAreas}
        />
      </Suspense>
    </div>
  );
}

import { AdminTicketsTable } from "@/components/admin/admin-tickets-table";

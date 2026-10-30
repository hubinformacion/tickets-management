import { db } from "@/db";
import { tickets } from "@/db/schema";
import { requireAgent } from "@/lib/auth/helpers";
import { getActiveProvidersByArea } from "@/actions/config/get-config";
import { eq, desc } from "drizzle-orm";
import { ProviderTicketsList } from "@/components/agent/provider-tickets-list";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { readProviderTicketsPage } from "@/lib/providers/ticket-list";
import { providerTicketListFiltersSchema } from "@/lib/validation/schemas";
import { parsePage } from "@/lib/utils/pagination";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tickets de proveedores",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProviderTicketsPage({ searchParams }: PageProps) {
  const [session, params] = await Promise.all([requireAgent(), searchParams]);

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

  const parsed = providerTicketListFiltersSchema.safeParse({ providerId: params.providerId, status: params.status });
  if (!parsed.success) return <p className="p-8 text-destructive">Filtros de proveedores inválidos</p>;
  const filters = parsed.data;
  const [result, activeProviders, areaTickets] = await Promise.all([
    readProviderTicketsPage(attentionAreaId, filters, parsePage(params.page)),
    getActiveProvidersByArea(attentionAreaId),
    db.query.tickets.findMany({
      where: eq(tickets.attentionAreaId, attentionAreaId),
      columns: { id: true, ticketCode: true, title: true },
      orderBy: [desc(tickets.createdAt)],
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Tickets de proveedores" }]} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tickets de proveedores</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de tickets de proveedores externos de tu área
          </p>
        </div>
        <Link href="/dashboard/proveedores/export">
          <Button variant="outline" className="gap-2 shrink-0">
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>
        </Link>
      </div>

      <ProviderTicketsList
        providerTickets={result.rows}
        providerOptions={result.providerOptions}
        pagination={result.pagination}
        filters={filters}
        providers={activeProviders}
        areaTickets={areaTickets}
      />
    </div>
  );
}

import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { providerTickets, providers } from "@/db/schema";
import { getPagination } from "@/lib/utils/pagination";
import type { z } from "zod";
import type { providerTicketListFiltersSchema } from "@/lib/validation/schemas";

export type ProviderTicketListFilters = z.infer<typeof providerTicketListFiltersSchema>;
export const PROVIDER_TICKET_PAGE_SIZE = 25;

/** El caller autentica, valida filtros y fija el área desde la sesión. */
export async function readProviderTicketsPage(areaId: number, filters: ProviderTicketListFilters, page: number) {
  return db.transaction(async tx => {
    const scope = and(
      eq(providerTickets.attentionAreaId, areaId),
      filters.providerId ? eq(providerTickets.providerId, Number(filters.providerId)) : undefined,
      filters.status ? eq(providerTickets.status, filters.status) : undefined,
    );
    const [totals, providerOptions] = await Promise.all([
      tx.select({ count: count() }).from(providerTickets).where(scope),
      tx.selectDistinct({ id: providers.id, name: providers.name }).from(providerTickets)
        .innerJoin(providers, eq(providerTickets.providerId, providers.id))
        .where(eq(providerTickets.attentionAreaId, areaId)).orderBy(asc(providers.name), asc(providers.id)),
    ]);
    const pagination = getPagination(page, totals[0]?.count ?? 0, PROVIDER_TICKET_PAGE_SIZE);
    const rows = await tx.query.providerTickets.findMany({
      where: scope,
      with: {
        provider: true,
        requestedBy: { columns: { id: true, name: true, email: true, image: true } },
        ticket: { columns: { id: true, ticketCode: true, title: true } },
      },
      orderBy: [sql`CASE WHEN ${providerTickets.status} = 'cerrado' THEN 1 ELSE 0 END`, desc(providerTickets.createdAt), desc(providerTickets.id)],
      limit: PROVIDER_TICKET_PAGE_SIZE, offset: pagination.offset,
    });
    return { rows, providerOptions, pagination };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}

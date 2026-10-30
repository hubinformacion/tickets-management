"use server";

import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { tickets } from "@/db/schema";
import { requireAgent } from "@/lib/auth/helpers";
import { createRateLimiter } from "@/lib/utils/rate-limit";
import { providerTicketSearchSchema } from "@/lib/validation/schemas";

export interface LinkedTicketOption { id: number; ticketCode: string; title: string }
const searchLimiter = createRateLimiter("RELAXED", "providers:ticket-search");

export async function searchProviderLinkedTicketsAction(query: unknown) {
  const session = await requireAgent();
  const areaId = session.user.attentionAreaId;
  if (!areaId) return { error: "Debes tener un área asignada para buscar tickets" };
  const parsed = providerTicketSearchSchema.safeParse(query);
  if (!parsed.success) return { error: "Escribe entre 2 y 120 caracteres, o deja la búsqueda vacía" };
  const limit = await searchLimiter(session.user.id);
  if (!limit.success) return { error: limit.error ?? "Demasiadas búsquedas. Intenta de nuevo en un momento." };
  const pattern = `%${parsed.data.replace(/[\\%_]/g, "\\$&")}%`;
  try {
    const rows = await db.select({ id: tickets.id, ticketCode: tickets.ticketCode, title: tickets.title })
      .from(tickets).where(and(
        eq(tickets.attentionAreaId, areaId),
        parsed.data ? or(ilike(tickets.ticketCode, pattern), ilike(tickets.title, pattern)) : undefined,
      )).orderBy(desc(tickets.createdAt), desc(tickets.id)).limit(26);
    return { tickets: rows.slice(0, 25), hasMore: rows.length > 25 };
  } catch {
    console.error("No se pudieron buscar tickets para vincular al proveedor");
    return { error: "No se pudo realizar la búsqueda. Vuelve a intentar." };
  }
}

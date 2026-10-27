import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tickets } from "@/db/schema";
import { getSession } from "@/lib/auth/helpers";
import { canReadTicket } from "@/lib/auth/ticket-permissions";

/** Comparte la misma comprobación de acceso entre metadata y detalle. */
export const getReadableTicket = cache(async (code: string) => {
  const session = await getSession();
  if (!session?.user.isActive) return null;

  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.ticketCode, code),
    columns: {
      id: true, ticketCode: true, title: true,
      createdById: true, attentionAreaId: true, watchers: true,
    },
  });

  return ticket && canReadTicket(session.user, ticket) ? ticket : null;
});

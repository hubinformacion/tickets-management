import { db } from "@/db";
import { ticketStatusHistory } from "@/db/schema";
import type { TicketStatus } from "@/types";

/**
 * Registra un cambio de estado en el historial del ticket.
 * Usar después de cada UPDATE que cambie el campo status.
 */
export async function recordStatusChange(
  ticketId: number,
  fromStatus: TicketStatus | null,
  toStatus: TicketStatus,
  changedById: string,
  changedAt?: Date,
) {
  await db.insert(ticketStatusHistory).values({
    ticketId,
    fromStatus,
    toStatus,
    changedById,
    changedAt: changedAt ?? new Date(),
  });
}

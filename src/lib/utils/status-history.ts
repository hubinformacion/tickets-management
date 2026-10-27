import { db } from "@/db";
import { ticketStatusHistory } from "@/db/schema";
import type { TicketStatus } from "@/types";

type HistoryExecutor = Pick<typeof db, "insert">;

/**
 * Registra un cambio de estado en el historial del ticket.
 * Pasar el executor de la transacción que actualiza el estado para confirmar
 * o revertir ambos cambios juntos.
 */
export async function recordStatusChange(
  ticketId: number,
  fromStatus: TicketStatus | null,
  toStatus: TicketStatus,
  changedById: string,
  changedAt?: Date,
  executor: HistoryExecutor = db,
) {
  await executor.insert(ticketStatusHistory).values({
    ticketId,
    fromStatus,
    toStatus,
    changedById,
    changedAt: changedAt ?? new Date(),
  });
}

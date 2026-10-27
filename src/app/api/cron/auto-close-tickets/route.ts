import { db } from "@/db";
import { tickets, ticketStatusHistory } from "@/db/schema";
import { lt, and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { TICKET_STATUS, CLOSURE_TYPE, VALIDATION_TIMEOUT_HOURS } from "@/lib/constants/tickets";

export const dynamic = "force-dynamic";

/** Cierra tickets que continúan pendientes de validación después de 48 horas. */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const now = new Date();
    const cutoffTime = new Date(now.getTime() - VALIDATION_TIMEOUT_HOURS * 60 * 60 * 1000);
    const closedTickets = await db.transaction(async tx => {
      // PostgreSQL reevalúa la condición si otra transición ganó el bloqueo de la fila.
      const updated = await tx.update(tickets).set({
        status: TICKET_STATUS.RESOLVED,
        closedBy: CLOSURE_TYPE.SYSTEM,
        closedByUserId: null,
        closedAt: now,
        updatedAt: now,
      }).where(and(
        eq(tickets.status, TICKET_STATUS.PENDING_VALIDATION),
        lt(tickets.validationRequestedAt, cutoffTime),
      )).returning({
        id: tickets.id, ticketCode: tickets.ticketCode,
        validationRequestedAt: tickets.validationRequestedAt,
        assignedToId: tickets.assignedToId, createdById: tickets.createdById,
      });

      if (updated.length > 0) {
        // El esquema actual requiere un usuario en el historial; el cierre queda marcado como sistema.
        // Limitar cada INSERT para no generar una consulta con demasiados parámetros.
        for (let offset = 0; offset < updated.length; offset += 500) {
          await tx.insert(ticketStatusHistory).values(updated.slice(offset, offset + 500).map(ticket => ({
            ticketId: ticket.id,
            fromStatus: TICKET_STATUS.PENDING_VALIDATION,
            toStatus: TICKET_STATUS.RESOLVED,
            changedById: ticket.assignedToId ?? ticket.createdById,
            changedAt: now,
          })));
        }
      }
      return updated;
    });

    console.info("Tickets cerrados automáticamente", { count: closedTickets.length });
    return NextResponse.json({
      success: true,
      message: closedTickets.length > 0 ? "Tickets cerrados automáticamente" : "No hay tickets pendientes de cierre automático",
      count: closedTickets.length,
      closedTickets: closedTickets.map(ticket => ({
        id: ticket.id, code: ticket.ticketCode, validationRequestedAt: ticket.validationRequestedAt,
      })),
    });
  } catch (error) {
    console.error("Error al cerrar tickets automáticamente:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

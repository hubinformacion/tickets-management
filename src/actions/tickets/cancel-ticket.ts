"use server";

import { db } from "@/db";
import { tickets } from "@/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { TICKET_STATUS } from "@/lib/constants/tickets";
import { recordStatusChange } from "@/lib/utils/status-history";

export async function userCancelTicketAction(ticketId: number) {
  const session = await requireAuth();

  try {
    // Enforce user is creator
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId),
    });

    if (!ticket) return { error: "Ticket no encontrado" };

    if (ticket.createdById !== session.user.id) {
      return { error: "Solo el creador puede anular este ticket" };
    }

    if (ticket.status === TICKET_STATUS.RESOLVED || ticket.status === TICKET_STATUS.VOIDED) {
      return { error: "El ticket ya está cerrado" };
    }

    await db.update(tickets)
      .set({
        status: TICKET_STATUS.VOIDED,
        updatedAt: new Date()
      })
      .where(eq(tickets.id, ticketId));

    // Registrar cambio de estado en historial
    await recordStatusChange(ticketId, ticket.status as typeof TICKET_STATUS[keyof typeof TICKET_STATUS], TICKET_STATUS.VOIDED, session.user.id);

    revalidatePath(`/dashboard/tickets/${ticket.ticketCode}`);
    revalidatePath("/dashboard/tickets");
    return { success: true };
  } catch (error) {
    console.error("Error canceling ticket:", error);
    return { error: "Error al anular el ticket" };
  }
}

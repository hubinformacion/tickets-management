"use server";

import { db } from "@/db";
import { tickets } from "@/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { TICKET_STATUS } from "@/lib/constants/tickets";
import { transitionTicket } from "@/lib/utils/ticket-transition";
import { ticketIdSchema } from "@/lib/validation/schemas";

export async function userCancelTicketAction(ticketId: number) {
  const session = await requireAuth();
  if (!ticketIdSchema.safeParse(ticketId).success) return { error: "Ticket inválido" };

  try {
    // Enforce user is creator
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId),
    });

    if (!ticket) return { error: "Ticket no encontrado" };

    if (ticket.createdById !== session.user.id) {
      return { error: "Solo el creador puede anular este ticket" };
    }

    if (!["open", "in_progress", "pending_validation"].includes(ticket.status)) {
      return { error: "El ticket ya está cerrado" };
    }

    const updated = await transitionTicket(ticket, TICKET_STATUS.VOIDED, session.user.id, { closedBy: "user" });
    if (!updated) return { error: "El ticket cambió. Actualiza la página e intenta de nuevo" };

    revalidatePath(`/dashboard/tickets/${ticket.ticketCode}`);
    revalidatePath("/dashboard/tickets");
    return { success: true };
  } catch (error) {
    console.error("Error canceling ticket:", error);
    return { error: "Error al anular el ticket" };
  }
}

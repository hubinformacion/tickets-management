"use server";

import { db } from "@/db";
import { ticketAttachments, tickets } from "@/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { revalidatePath } from "next/cache";
import { eq, and, isNull } from "drizzle-orm";

/**
 * Links pending attachments (uploaded via FilePond with an uploadToken)
 * to an existing ticket. Only the uploader can link their own files.
 */
export async function addTicketAttachmentsAction(ticketId: number, uploadToken: string) {
  if (!ticketId || !uploadToken) {
    return { error: "Parámetros inválidos" };
  }

  const session = await requireAuth();

  // Verify ticket exists
  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, ticketId),
    columns: { id: true, status: true, ticketCode: true },
  });

  if (!ticket) {
    return { error: "Ticket no encontrado" };
  }

  if (ticket.status === "resolved" || ticket.status === "voided") {
    return { error: "No se pueden adjuntar archivos a un ticket cerrado" };
  }

  // Link pending attachments uploaded by this user with this token to the ticket
  await db.update(ticketAttachments)
    .set({ ticketId, uploadToken: null })
    .where(
      and(
        eq(ticketAttachments.uploadToken, uploadToken),
        eq(ticketAttachments.uploadedById, session.user.id),
        isNull(ticketAttachments.ticketId)
      )
    );

  revalidatePath(`/dashboard/tickets/${ticket.ticketCode}`);
  return { success: true };
}

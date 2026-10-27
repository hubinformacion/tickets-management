"use server";

import { db } from "@/db";
import { ticketAttachments, tickets } from "@/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { revalidatePath } from "next/cache";
import { eq, and, isNull } from "drizzle-orm";
import { areTicketAttachmentsAllowed, canReadTicket } from "@/lib/auth/ticket-permissions";
import { ticketAttachmentSchema } from "@/lib/validation/schemas";

/**
 * Links pending attachments (uploaded via FilePond with an uploadToken)
 * to an existing ticket. Only the uploader can link their own files.
 */
export async function addTicketAttachmentsAction(ticketId: number, uploadToken: string) {
  const session = await requireAuth();
  if (!ticketAttachmentSchema.safeParse({ ticketId, uploadToken }).success) {
    return { error: "Parámetros inválidos" };
  }

  // Verify ticket exists
  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, ticketId),
    with: { attentionArea: true, subcategory: true },
  });

  if (!ticket || !canReadTicket(session.user, ticket)) {
    return { error: "Ticket no encontrado o sin acceso" };
  }

  if (!areTicketAttachmentsAllowed(ticket.attentionArea?.slug, ticket.subcategory?.name)) {
    return { error: "Esta solicitud no permite archivos adjuntos" };
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

"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { tickets, ticketAttachments } from "@/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { areTicketAttachmentsAllowed, canReadTicket } from "@/lib/auth/ticket-permissions";
import { ticketAttachmentSchema } from "@/lib/validation/schemas";
import { linkPendingAttachments } from "@/lib/uploads/pending-attachments";
import { lockUploadBatch, bindUploadBatch, UploadBatchConflictError } from "@/lib/uploads/upload-batches";

/**
 * Links pending attachments (uploaded via FilePond with an uploadToken)
 * to an existing ticket. Only the uploader can link their own files.
 */
export async function addTicketAttachmentsAction(ticketId: number, uploadToken: string, attachmentIds?: string[]) {
  const session = await requireAuth();
  const parsed = ticketAttachmentSchema.safeParse({ ticketId, uploadToken, attachmentIds });
  if (!parsed.success) {
    return { error: "Parámetros inválidos" };
  }

  try {
    const result = await db.transaction(async tx => {
      const batch = await lockUploadBatch(tx, session.user.id, uploadToken);
      // Estabiliza estado y permisos frente a un cierre o derivación concurrente.
      await tx.execute(sql`SELECT id FROM ${tickets} WHERE id = ${ticketId} FOR UPDATE`);
      const ticket = await tx.query.tickets.findFirst({
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
      await bindUploadBatch(tx, batch, session.user.id, uploadToken, ticketId);
      await linkPendingAttachments(tx, ticketId, session.user.id, uploadToken);
      const requestedIds = parsed.data.attachmentIds;
      const confirmed = requestedIds?.length ? await tx.select({ id: ticketAttachments.id }).from(ticketAttachments)
        .where(and(
          eq(ticketAttachments.ticketId, ticketId),
          eq(ticketAttachments.uploadedById, session.user.id),
          inArray(ticketAttachments.id, requestedIds),
        )).orderBy(ticketAttachments.id).for("update") : [];
      return { ticketCode: ticket.ticketCode, confirmedAttachmentIds: confirmed.map(file => file.id) };
    }, { isolationLevel: "read committed" });
    if ("error" in result) return { error: result.error };
    revalidatePath(`/dashboard/tickets/${result.ticketCode}`);
    return { success: true, confirmedAttachmentIds: result.confirmedAttachmentIds };
  } catch (error) {
    if (error instanceof UploadBatchConflictError) return { error: error.message };
    console.error("No se pudieron vincular los adjuntos al ticket");
    return { error: "No se pudieron adjuntar los archivos. Intenta nuevamente." };
  }
}

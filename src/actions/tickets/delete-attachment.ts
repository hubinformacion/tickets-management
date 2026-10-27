"use server";

import { db } from "@/db";
import { ticketAttachments, tickets } from "@/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { deleteFileFromDrive } from "@/lib/drive/client";
import { canManageTicket, canReadTicket } from "@/lib/auth/ticket-permissions";
import { deleteTicketAttachmentSchema } from "@/lib/validation/schemas";

/**
 * Elimina un adjunto del ticket real al que pertenece.
 * Requiere acceso al ticket y ser el uploader, admin o agente de su área.
 */
export async function deleteTicketAttachmentAction(attachmentId: string, ticketId: number) {
  const session = await requireAuth();
  if (!deleteTicketAttachmentSchema.safeParse({ attachmentId, ticketId }).success) {
    return { error: "Parámetros inválidos" };
  }

  // Fetch the attachment
  const [attachment] = await db
    .select()
    .from(ticketAttachments)
    .where(eq(ticketAttachments.id, attachmentId))
    .limit(1);

  if (!attachment || attachment.ticketId !== ticketId) {
    return { error: "Archivo no encontrado" };
  }

  const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, ticketId) });
  if (!ticket || !canReadTicket(session.user, ticket)) {
    return { error: "Ticket no encontrado o sin acceso" };
  }

  // El rol de agente por sí solo no concede permisos sobre otras áreas.
  const isUploader = attachment.uploadedById === session.user.id;
  const isManager = canManageTicket(session.user, ticket);

  if (!isUploader && !isManager) {
    return { error: "No tienes permiso para eliminar este archivo" };
  }

  try {
    // Conservar la referencia si Drive no confirma el borrado.
    await deleteFileFromDrive(attachment.driveFileId);
    await db.delete(ticketAttachments).where(eq(ticketAttachments.id, attachmentId));
  } catch (error) {
    console.error("Error al eliminar el adjunto:", error);
    return { error: "No se pudo completar la eliminación del archivo" };
  }

  revalidatePath(`/dashboard/tickets/${ticket.ticketCode}`);
  return { success: true };
}

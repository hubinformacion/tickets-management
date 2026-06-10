"use server";

import { db } from "@/db";
import { ticketAttachments, tickets } from "@/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { deleteFileFromDrive } from "@/lib/drive/client";

/**
 * Deletes a ticket attachment from Google Drive and the database.
 * Only the uploader or an admin can delete an attachment.
 */
export async function deleteTicketAttachmentAction(attachmentId: string, ticketId: number) {
  const session = await requireAuth();

  // Fetch the attachment
  const [attachment] = await db
    .select()
    .from(ticketAttachments)
    .where(eq(ticketAttachments.id, attachmentId))
    .limit(1);

  if (!attachment) {
    return { error: "Archivo no encontrado" };
  }

  // Only the uploader or an admin can delete
  const isUploader = attachment.uploadedById === session.user.id;
  const isAdmin = session.user.role === "admin" || session.user.role === "agent";

  if (!isUploader && !isAdmin) {
    return { error: "No tienes permiso para eliminar este archivo" };
  }

  // Delete from Google Drive and DB in parallel
  await Promise.all([
    deleteFileFromDrive(attachment.driveFileId).catch((err) =>
      console.error("Error eliminando de Drive (continuando con BD):", err)
    ),
    db.delete(ticketAttachments).where(eq(ticketAttachments.id, attachmentId)),
  ]);

  // Obtener ticketCode para revalidar la ruta correcta
  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, ticketId),
    columns: { ticketCode: true },
  });

  revalidatePath(`/dashboard/tickets/${ticket?.ticketCode ?? ticketId}`);
  return { success: true };
}

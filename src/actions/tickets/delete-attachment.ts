"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/helpers";
import { removeLinkedAttachment } from "@/lib/uploads/linked-attachment-removal";
import { deleteTicketAttachmentSchema } from "@/lib/validation/schemas";

/** Elimina de Drive por solicitud autorizada y conserva referencia/evidencia en BD. */
export async function deleteTicketAttachmentAction(attachmentId: string, ticketId: number) {
  const session = await requireAuth();
  if (!deleteTicketAttachmentSchema.safeParse({ attachmentId, ticketId }).success) {
    return { error: "Parámetros inválidos" };
  }
  try {
    const result = await removeLinkedAttachment(session.user, attachmentId, ticketId);
    if ("ticketCode" in result && result.ticketCode) revalidatePath(`/dashboard/tickets/${result.ticketCode}`);
    switch (result.kind) {
      case "removed": return { success: true };
      case "missing": return { error: "Archivo o ticket no encontrado" };
      case "forbidden": return { error: "No tienes acceso o permiso para eliminar este archivo" };
      case "busy": return { error: "Ya hay una eliminación en curso. Espera un momento y vuelve a intentar." };
      default: return { error: "No se pudo confirmar la eliminación. La referencia se conservó; puedes reintentar." };
    }
  } catch {
    console.error("No se pudo completar la eliminación del adjunto");
    return { error: "No se pudo confirmar la eliminación. Intenta nuevamente." };
  }
}

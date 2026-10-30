import { sql } from "drizzle-orm";
import { ticketAttachments, uploadBatches } from "@/db/schema";

/** Predicado para un adjunto con alias a; incluye pendientes de formularios vinculados. */
export function attachmentPurgeScope(ticketId: number) {
  return sql`(a.ticket_id = ${ticketId} OR (a.ticket_id IS NULL AND EXISTS (
    SELECT 1 FROM ${uploadBatches} b WHERE b.ticket_id = ${ticketId}
      AND b.uploaded_by_id = a.uploaded_by_id AND b.upload_token = a.upload_token
  )))`;
}

/** Alias u. Nunca incluye un intento cuya referencia pertenece a otro recurso. */
export function attemptPurgeScope(ticketId: number) {
  return sql`(EXISTS (
    SELECT 1 FROM ${ticketAttachments} a WHERE a.id = u.attachment_id AND ${attachmentPurgeScope(ticketId)}
  ) OR (EXISTS (
    SELECT 1 FROM ${uploadBatches} b WHERE b.ticket_id = ${ticketId}
      AND b.uploaded_by_id = u.uploaded_by_id AND b.upload_token = u.upload_token
  ) AND NOT EXISTS (SELECT 1 FROM ${ticketAttachments} a WHERE a.id = u.attachment_id)))`;
}

import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { attachmentReverts, ticketAttachments } from "@/db/schema";
import { deleteFileFromDrive } from "@/lib/drive/client";

type AttachmentExecutor = Pick<typeof db, "execute">;
type RevertResult = "removed" | "missing" | "busy" | "failed";

/** Debe ejecutarse dentro de la transacción que crea o valida el ticket. */
export async function linkPendingAttachments(
  tx: AttachmentExecutor,
  ticketId: number,
  userId: string,
  uploadToken: string,
): Promise<number> {
  const locked = await tx.execute<{ id: string }>(sql`
    SELECT id FROM ${ticketAttachments}
    WHERE uploaded_by_id = ${userId} AND upload_token = ${uploadToken} AND ticket_id IS NULL
    ORDER BY id FOR UPDATE
  `);
  if (!locked.rows.length) return 0;
  const ids = sql.join(locked.rows.map(row => sql`${row.id}::uuid`), sql`, `);
  // Sentencia posterior al bloqueo: ve una cancelación que se confirmó mientras esperaba.
  const linked = await tx.execute<{ id: string }>(sql`
    UPDATE ${ticketAttachments} a SET ticket_id = ${ticketId}, upload_token = NULL
    WHERE a.id IN (${ids}) AND a.uploaded_by_id = ${userId}
      AND a.upload_token = ${uploadToken} AND a.ticket_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM ${attachmentReverts} r WHERE r.attachment_id = a.id)
    RETURNING a.id
  `);
  return linked.rows.length;
}

export async function revertPendingAttachment(
  attachmentId: string,
  userId: string,
  removeFile: typeof deleteFileFromDrive = deleteFileFromDrive,
): Promise<RevertResult> {
  const token = randomUUID();
  const claim = await db.transaction(async tx => {
    const files = await tx.execute<{ driveFileId: string }>(sql`
      SELECT drive_file_id AS "driveFileId" FROM ${ticketAttachments}
      WHERE id = ${attachmentId}::uuid AND uploaded_by_id = ${userId} AND ticket_id IS NULL
      FOR UPDATE
    `);
    const file = files.rows[0];
    if (!file) return { kind: "missing" } as const;
    const previous = await tx.execute<{ state: string; leaseActive: boolean }>(sql`
      SELECT state, lease_until > now() AS "leaseActive" FROM ${attachmentReverts}
      WHERE attachment_id = ${attachmentId}::uuid
    `);
    const job = previous.rows[0];
    if (job?.state === "removed") return { kind: "removed" } as const;
    if (job?.state === "removing" && job.leaseActive) return { kind: "busy" } as const;
    await tx.execute(sql`
      INSERT INTO ${attachmentReverts} (attachment_id, requested_by_id, lease_token, lease_until)
      VALUES (${attachmentId}::uuid, ${userId}, ${token}::uuid, now() + interval '5 minutes')
      ON CONFLICT (attachment_id) DO UPDATE SET state = 'removing',
        requested_by_id = EXCLUDED.requested_by_id, lease_token = EXCLUDED.lease_token,
        lease_until = EXCLUDED.lease_until, attempts = attachment_revert.attempts + 1,
        updated_at = now(), last_error_code = NULL
    `);
    return { kind: "claimed", driveFileId: file.driveFileId } as const;
  }, { isolationLevel: "read committed" });
  if (claim.kind !== "claimed") return claim.kind;

  try {
    // La intención está confirmada; no se mantiene una transacción durante la llamada a Drive.
    await removeFile(claim.driveFileId, { signal: AbortSignal.timeout(20_000), timeout: 20_000 });
  } catch {
    await db.execute(sql`
      UPDATE ${attachmentReverts} SET state = 'failed', lease_token = NULL, lease_until = NULL,
        updated_at = now(), last_error_code = 'drive_unconfirmed'
      WHERE attachment_id = ${attachmentId}::uuid AND lease_token = ${token}::uuid AND state = 'removing'
    `);
    return "failed";
  }
  const confirmed = await db.execute<{ id: string }>(sql`
    UPDATE ${attachmentReverts} SET state = 'removed', drive_deleted_at = now(),
      lease_token = NULL, lease_until = NULL, updated_at = now(), last_error_code = NULL
    WHERE attachment_id = ${attachmentId}::uuid AND lease_token = ${token}::uuid AND state = 'removing'
    RETURNING attachment_id AS id
  `);
  if (!confirmed.rows.length) throw new Error("No se pudo confirmar la cancelación del adjunto");
  // Se conserva ticket_attachment y la evidencia operativa; nunca se vuelve a vincular ese archivo.
  return "removed";
}

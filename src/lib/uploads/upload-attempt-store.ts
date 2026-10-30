import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { attachmentReverts, ticketAttachments, uploadAttempts } from "@/db/schema";
import { UploadPersistenceError } from "@/lib/uploads/upload-attempt-types";
import type { UploadAttemptStore } from "@/lib/uploads/upload-attempt-types";
import { lockUploadBatch, getUploadBatchTarget, linkConfirmedUploadBatch } from "@/lib/uploads/upload-batches";

export async function isUploadAttemptStoreReady(): Promise<boolean> {
  const result = await db.execute<{ ready: boolean }>(sql`
    SELECT to_regclass('public.upload_attempt') IS NOT NULL
      AND to_regclass('public.upload_batch') IS NOT NULL AS ready
  `);
  return result.rows[0]?.ready === true;
}

export const uploadAttemptStore: UploadAttemptStore = {
  async claim(input) {
    const token = randomUUID();
    return db.transaction(async tx => {
      const batch = await lockUploadBatch(tx, input.userId, input.uploadToken);
      const target = await getUploadBatchTarget(tx, batch, input.userId);
      await tx.execute(sql`
        INSERT INTO ${uploadAttempts}
          (id, attachment_id, uploaded_by_id, upload_token, file_name, file_size, mime_type, sha256, md5)
        VALUES (${input.id}::uuid, ${randomUUID()}::uuid, ${input.userId}, ${input.uploadToken},
          ${input.fileName}, ${input.fileSize}, ${input.mimeType}, ${input.sha256}, ${input.md5})
        ON CONFLICT (id) DO NOTHING
      `);
      const result = await tx.execute<{
        attachmentId: string; state: string; driveFileId: string | null;
        matches: boolean; leaseActive: boolean | null;
      }>(sql`
        SELECT attachment_id AS "attachmentId", state, drive_file_id AS "driveFileId",
          lease_until > now() AS "leaseActive",
          (uploaded_by_id = ${input.userId} AND upload_token = ${input.uploadToken}
            AND file_name = ${input.fileName} AND file_size = ${input.fileSize}
            AND mime_type = ${input.mimeType} AND sha256 = ${input.sha256} AND md5 = ${input.md5}) AS matches
        FROM ${uploadAttempts} WHERE id = ${input.id}::uuid FOR UPDATE
      `);
      const row = result.rows[0];
      if (!row?.matches) {
        throw new UploadPersistenceError("El identificador de carga ya se utilizó para otra solicitud", 409);
      }
      if (row.state === "stored") {
        // Coordina la consulta con una cancelación: nunca reconstruye referencias eliminadas.
        const stored = await tx.execute<{ id: string; ticketId: number | null; uploadToken: string | null }>(sql`
          SELECT id, ticket_id AS "ticketId", upload_token AS "uploadToken" FROM ${ticketAttachments}
          WHERE id = ${row.attachmentId}::uuid AND uploaded_by_id = ${input.userId} FOR UPDATE
        `);
        const reverted = await tx.execute<{ id: string }>(sql`
          SELECT attachment_id AS id FROM ${attachmentReverts} WHERE attachment_id = ${row.attachmentId}::uuid
        `);
        if (!stored.rows.length || reverted.rows.length) {
          throw new UploadPersistenceError("La carga fue cancelada o el archivo ya no está disponible", 410);
        }
        const attachment = stored.rows[0];
        if (attachment.ticketId !== null) {
          if (batch.ticketId !== null && attachment.ticketId !== batch.ticketId) {
            throw new UploadPersistenceError("El archivo ya pertenece a otro ticket", 409);
          }
          return { kind: "stored", attachmentId: row.attachmentId };
        }
        if (attachment.uploadToken !== input.uploadToken || target.kind === "blocked") {
          throw new UploadPersistenceError("El archivo está conservado, pero el ticket no admite su vinculación. Reintenta cuando esté disponible.", 409);
        }
        await linkConfirmedUploadBatch(tx, target, input.userId, input.uploadToken);
        return { kind: "stored", attachmentId: row.attachmentId };
      }
      if (target.kind === "blocked") {
        throw new UploadPersistenceError("El ticket del formulario no admite nuevas cargas", 409);
      }
      if (row.state === "uploading" && row.leaseActive) {
        throw new UploadPersistenceError("La carga ya está en curso. Intenta nuevamente en un momento.", 409, 30);
      }
      const reserved = await tx.execute<{ id: string }>(sql`
        UPDATE ${uploadAttempts} SET state = 'uploading', lease_token = ${token}::uuid,
          lease_until = now() + interval '5 minutes', attempts = attempts + 1,
          updated_at = now(), last_error_code = NULL
        WHERE id = ${input.id}::uuid AND uploaded_by_id = ${input.userId} RETURNING id
      `);
      if (!reserved.rows.length) throw new UploadPersistenceError("No se pudo reservar la carga", 503);
      return { kind: "claimed", claim: { id: input.id, attachmentId: row.attachmentId, token, driveFileId: row.driveFileId } };
    }, { isolationLevel: "read committed" });
  },

  async assignDriveId(claim, driveFileId) {
    const result = await db.execute<{ id: string }>(sql`
      UPDATE ${uploadAttempts} SET drive_file_id = ${driveFileId}, updated_at = now()
      WHERE id = ${claim.id}::uuid AND lease_token = ${claim.token}::uuid
        AND state = 'uploading' AND drive_file_id IS NULL AND lease_until > now()
      RETURNING id
    `);
    if (!result.rows.length) throw new UploadPersistenceError("No se pudo confirmar la reserva de Drive", 503);
  },

  async complete(claim, input, file) {
    const outcome = await db.transaction(async tx => {
      const batch = await lockUploadBatch(tx, input.userId, input.uploadToken);
      const target = await getUploadBatchTarget(tx, batch, input.userId);
      const reserved = await tx.execute<{ driveFileId: string }>(sql`
        SELECT drive_file_id AS "driveFileId" FROM ${uploadAttempts}
        WHERE id = ${claim.id}::uuid AND lease_token = ${claim.token}::uuid
          AND uploaded_by_id = ${input.userId} AND state = 'uploading' FOR UPDATE
      `);
      if (reserved.rows[0]?.driveFileId !== file.fileId) {
        throw new UploadPersistenceError("No se pudo confirmar la reserva de carga", 503);
      }
      await tx.execute(sql`
        INSERT INTO ${ticketAttachments}
          (id, ticket_id, file_name, file_size, mime_type, drive_file_id, drive_view_link, upload_token, uploaded_by_id)
        VALUES (${claim.attachmentId}::uuid, NULL, ${input.fileName}, ${input.fileSize}, ${input.mimeType},
          ${file.fileId}, ${file.viewLink}, ${input.uploadToken}, ${input.userId})
      `);
      const completed = await tx.execute<{ id: string }>(sql`
        UPDATE ${uploadAttempts} SET state = 'stored', lease_token = NULL, lease_until = NULL,
          updated_at = now(), last_error_code = NULL
        WHERE id = ${claim.id}::uuid AND lease_token = ${claim.token}::uuid AND state = 'uploading'
        RETURNING id
      `);
      if (!completed.rows.length) throw new UploadPersistenceError("No se pudo confirmar el registro del archivo", 503);
      await linkConfirmedUploadBatch(tx, target, input.userId, input.uploadToken);
      return { attachmentId: claim.attachmentId, blocked: target.kind === "blocked" };
    }, { isolationLevel: "read committed" });
    // La referencia y el intento stored ya están confirmados; no provocar su rollback.
    if (outcome.blocked) {
      throw new UploadPersistenceError("El archivo quedó conservado, pero el ticket no admite su vinculación. Reintenta cuando esté disponible.", 409);
    }
    return outcome.attachmentId;
  },

  async uncertain(claim) {
    await db.execute(sql`
      UPDATE ${uploadAttempts} SET state = 'uncertain', lease_token = NULL, lease_until = NULL,
        updated_at = now(), last_error_code = 'upload_unconfirmed'
      WHERE id = ${claim.id}::uuid AND lease_token = ${claim.token}::uuid AND state = 'uploading'
    `);
  },
};

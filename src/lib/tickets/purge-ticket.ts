import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  tickets, ticketAttachments, uploadAttempts, uploadBatches, attachmentReverts,
  surveyReminderDeliveries, providerTickets, providerSatisfactionSurveys,
  satisfactionSurveys, ticketStatusHistory, comments,
} from "@/db/schema";
import { deleteFileFromDrive } from "@/lib/drive/client";
import { removeLinkedAttachment } from "@/lib/uploads/linked-attachment-removal";
import { attachmentPurgeScope, attemptPurgeScope } from "@/lib/uploads/ticket-purge-scope";
import { lockUploadBatchContext } from "@/lib/uploads/upload-batches";
import type { AppUser } from "@/types";

type Executor = Pick<typeof db, "execute">;
type PurgeUser = Pick<AppUser, "id" | "role" | "isActive" | "attentionAreaId">;
interface PurgeFile { id: string; driveFileId: string; removalState: string | null }
interface PurgeAttempt { id: string; attachmentId: string; driveFileId: string | null; state: string; removalState: string | null }
interface PurgeBatch { userId: string; uploadToken: string }
interface Snapshot { ticketCode: string | null; files: PurgeFile[]; attempts: PurgeAttempt[]; batches: PurgeBatch[] }

export class TicketPurgeError extends Error {
  constructor(message: string, public ticketCode: string | null = null) { super(message); }
}

async function readSnapshot(tx: Executor, ticketId: number): Promise<Snapshot> {
  await tx.execute(sql`SET LOCAL lock_timeout = '3s'`);
  await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);
  const ticket = await tx.execute<{ ticketCode: string }>(sql`
    SELECT ticket_code AS "ticketCode" FROM ${tickets} WHERE id = ${ticketId} FOR UPDATE
  `);
  const ticketCode = ticket.rows[0]?.ticketCode ?? null;
  // Orden ticket -> entrega, igual que la confirmación del worker de recordatorios.
  const deliveries = await tx.execute<{ state: string; active: boolean | null }>(sql`
    SELECT state, lease_until > now() AS active FROM ${surveyReminderDeliveries}
    WHERE ticket_id = ${ticketId} ORDER BY id FOR UPDATE
  `);
  if (deliveries.rows.some(row => row.state === "leased" && row.active)) {
    throw new TicketPurgeError("Hay un recordatorio en curso. Espera un momento y vuelve a intentar.", ticketCode);
  }
  const [files, attempts, batches] = await Promise.all([
    tx.execute<{ id: string; driveFileId: string; removalState: string | null }>(sql`
      SELECT a.id, a.drive_file_id AS "driveFileId", r.state AS "removalState"
      FROM ${ticketAttachments} a LEFT JOIN ${attachmentReverts} r ON r.attachment_id = a.id
      WHERE ${attachmentPurgeScope(ticketId)} ORDER BY a.id FOR UPDATE OF a
    `),
    tx.execute<{ id: string; attachmentId: string; driveFileId: string | null; state: string; removalState: string | null }>(sql`
      SELECT u.id, u.attachment_id AS "attachmentId", u.drive_file_id AS "driveFileId", u.state,
        r.state AS "removalState" FROM ${uploadAttempts} u
      LEFT JOIN ${attachmentReverts} r ON r.attachment_id = u.attachment_id
      WHERE ${attemptPurgeScope(ticketId)} ORDER BY u.id FOR UPDATE OF u
    `),
    tx.execute<{ userId: string; uploadToken: string }>(sql`
      SELECT uploaded_by_id AS "userId", upload_token AS "uploadToken" FROM ${uploadBatches}
      WHERE ticket_id = ${ticketId} ORDER BY uploaded_by_id, upload_token
    `),
  ]);
  if (attempts.rows.some(row => row.state !== "stored" || !row.driveFileId)) {
    throw new TicketPurgeError("Hay cargas sin confirmar. Espera a que terminen o reinténtalas antes de eliminar el ticket.", ticketCode);
  }
  return { ticketCode, files: files.rows, attempts: attempts.rows, batches: batches.rows };
}

function fingerprint(snapshot: Snapshot): string {
  // Los estados de eliminación pueden avanzar durante Drive; la identidad no debe cambiar.
  return JSON.stringify([
    snapshot.ticketCode,
    snapshot.files.map(row => JSON.stringify([row.id, row.driveFileId])).sort(),
    snapshot.attempts.map(row => JSON.stringify([row.id, row.attachmentId, row.driveFileId, row.state])).sort(),
    snapshot.batches.map(row => JSON.stringify([row.userId, row.uploadToken])).sort(),
  ]);
}

function allFiles(snapshot: Snapshot): PurgeFile[] {
  const files = new Map(snapshot.files.map(row => [row.id, row]));
  for (const attempt of snapshot.attempts) {
    if (!files.has(attempt.attachmentId) && attempt.driveFileId) {
      files.set(attempt.attachmentId, { id: attempt.attachmentId, driveFileId: attempt.driveFileId, removalState: attempt.removalState });
    }
  }
  return Array.from(files.values());
}

/** Solo para la eliminación definitiva confirmada por un administrador. */
export async function purgeTicketCompletely(
  user: PurgeUser, ticketId: number, removeFile: typeof deleteFileFromDrive = deleteFileFromDrive,
): Promise<{ ticketCode: string | null }> {
  if (user.role !== "admin" || !user.isActive) throw new TicketPurgeError("No tienes permiso para eliminar este ticket");
  const initial = await db.transaction(tx => readSnapshot(tx, ticketId), { isolationLevel: "read committed" });
  const files = allFiles(initial);
  const driveIds = [...new Set(files.map(row => row.driveFileId))];
  const shared = driveIds.length ? await db.execute<{ driveFileId: string }>(sql`
    SELECT DISTINCT a.drive_file_id AS "driveFileId" FROM ${ticketAttachments} a
    WHERE a.drive_file_id = ANY(${sql.param(driveIds)}::text[]) AND NOT ${attachmentPurgeScope(ticketId)}
    UNION
    SELECT DISTINCT u.drive_file_id AS "driveFileId" FROM ${uploadAttempts} u
    WHERE u.drive_file_id = ANY(${sql.param(driveIds)}::text[]) AND NOT ${attemptPurgeScope(ticketId)}
  `) : { rows: [] };
  const sharedIds = new Set(shared.rows.map(row => row.driveFileId));
  const pending = files.filter(row => row.removalState !== "removed" && !sharedIds.has(row.driveFileId));
  for (let offset = 0; offset < pending.length; offset += 4) {
    const results = await Promise.allSettled(pending.slice(offset, offset + 4).map(file =>
      removeLinkedAttachment(user, file.id, ticketId, removeFile, "ticket-purge")
    ));
    if (results.some(result => result.status === "rejected" || result.value.kind !== "removed")) {
      throw new TicketPurgeError("No se pudo completar la eliminación de todos los archivos. Reintenta; el progreso confirmado se conserva.", initial.ticketCode);
    }
  }

  await db.transaction(async tx => {
    await tx.execute(sql`SET LOCAL lock_timeout = '3s'`);
    await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);
    const batches = [...initial.batches].sort((a, b) => {
      const left = JSON.stringify([a.userId, a.uploadToken]), right = JSON.stringify([b.userId, b.uploadToken]);
      return left < right ? -1 : left > right ? 1 : 0;
    });
    // Antes del ticket: no invertir el orden de los handlers de carga/vinculación.
    for (const batch of batches) await lockUploadBatchContext(tx, batch.userId, batch.uploadToken);
    const current = await readSnapshot(tx, ticketId);
    if (fingerprint(current) !== fingerprint(initial)) {
      throw new TicketPurgeError("Los archivos o formularios cambiaron durante la eliminación. Vuelve a intentar.", current.ticketCode ?? initial.ticketCode);
    }
    const attachmentIds = [...new Set(allFiles(current).map(row => row.id))];
    const attemptIds = current.attempts.map(row => row.id);

    // Excepción destructiva explícita: todas estas escrituras pertenecen al ticket seleccionado.
    await tx.execute(sql`DELETE FROM ${providerSatisfactionSurveys} WHERE provider_ticket_id IN (
      SELECT id FROM ${providerTickets} WHERE ticket_id = ${ticketId})`);
    await tx.execute(sql`DELETE FROM ${providerTickets} WHERE ticket_id = ${ticketId}`);
    await tx.execute(sql`DELETE FROM ${satisfactionSurveys} WHERE ticket_id = ${ticketId}`);
    await tx.execute(sql`DELETE FROM ${ticketStatusHistory} WHERE ticket_id = ${ticketId}`);
    await tx.execute(sql`DELETE FROM ${comments} WHERE ticket_id = ${ticketId}`);
    await tx.execute(sql`DELETE FROM ${surveyReminderDeliveries} WHERE ticket_id = ${ticketId}`);
    await tx.execute(sql`DELETE FROM ${attachmentReverts} WHERE attachment_id = ANY(${sql.param(attachmentIds)}::uuid[])`);
    await tx.execute(sql`DELETE FROM ${uploadAttempts} WHERE id = ANY(${sql.param(attemptIds)}::uuid[])`);
    await tx.execute(sql`DELETE FROM ${ticketAttachments} WHERE id = ANY(${sql.param(attachmentIds)}::uuid[])`);
    await tx.execute(sql`DELETE FROM ${uploadBatches} WHERE ticket_id = ${ticketId}`);
    await tx.execute(sql`DELETE FROM ${tickets} WHERE id = ${ticketId}`);
  }, { isolationLevel: "read committed" });
  return { ticketCode: initial.ticketCode };
}

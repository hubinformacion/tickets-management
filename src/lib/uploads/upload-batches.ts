import { sql } from "drizzle-orm";
import { db } from "@/db";
import { uploadBatches, tickets, users, attentionAreas, ticketSubcategories } from "@/db/schema";
import { areTicketAttachmentsAllowed, canReadTicket } from "@/lib/auth/ticket-permissions";
import { linkPendingAttachments } from "@/lib/uploads/pending-attachments";

type BatchExecutor = Pick<typeof db, "execute">;
interface UploadBatch { ticketId: number | null }
type BatchTarget =
  | { kind: "unbound" }
  | { kind: "ready"; ticketId: number; ticketCode: string }
  | { kind: "blocked" };

export class UploadBatchConflictError extends Error {
  constructor() {
    super("Este formulario de archivos ya pertenece a otro ticket. Abre un formulario nuevo para continuar.");
  }
}

/** Dentro de una transacción, antes de bloquear tickets, intentos o adjuntos. */
export async function lockUploadBatch(tx: BatchExecutor, userId: string, uploadToken: string): Promise<UploadBatch> {
  await tx.execute(sql`SET LOCAL lock_timeout = '3s'`);
  await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);
  // La clave completa sigue en la PK: una colisión del hash solo serializa dos lotes.
  const key = JSON.stringify(["upload-batch", userId, uploadToken]);
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
  await tx.execute(sql`
    INSERT INTO ${uploadBatches} (uploaded_by_id, upload_token)
    VALUES (${userId}, ${uploadToken}) ON CONFLICT (uploaded_by_id, upload_token) DO NOTHING
  `);
  const result = await tx.execute<{ ticketId: number | null }>(sql`
    SELECT ticket_id AS "ticketId" FROM ${uploadBatches}
    WHERE uploaded_by_id = ${userId} AND upload_token = ${uploadToken} FOR UPDATE
  `);
  if (!result.rows[0]) throw new Error("No se pudo confirmar el formulario de archivos");
  return result.rows[0];
}

/** El caller ya validó y bloqueó el ticket; batch viene de lockUploadBatch. */
export async function bindUploadBatch(
  tx: BatchExecutor, batch: UploadBatch, userId: string, uploadToken: string, ticketId: number,
): Promise<void> {
  if (batch.ticketId !== null && batch.ticketId !== ticketId) throw new UploadBatchConflictError();
  const result = await tx.execute<{ ticketId: number }>(sql`
    UPDATE ${uploadBatches} SET ticket_id = ${ticketId}, bound_at = coalesce(bound_at, now()), last_error_code = NULL
    WHERE uploaded_by_id = ${userId} AND upload_token = ${uploadToken}
      AND (ticket_id IS NULL OR ticket_id = ${ticketId}) RETURNING ticket_id AS "ticketId"
  `);
  if (result.rows[0]?.ticketId !== ticketId) throw new UploadBatchConflictError();
}

/** Bloquea el ticket antes de los intentos/adjuntos y valida la identidad vigente. */
export async function getUploadBatchTarget(tx: BatchExecutor, batch: UploadBatch, userId: string): Promise<BatchTarget> {
  if (batch.ticketId === null) return { kind: "unbound" };
  const result = await tx.execute<{
    id: number; ticketCode: string; status: string; createdById: string;
    watchers: string[] | null; attentionAreaId: number | null;
    areaSlug: string | null; subcategoryName: string | null;
    userId: string | null; role: string | null; isActive: boolean | null; userAreaId: number | null;
  }>(sql`
    SELECT t.id, t.ticket_code AS "ticketCode", t.status, t.created_by_id AS "createdById",
      t.watchers, t.attention_area_id AS "attentionAreaId", a.slug AS "areaSlug", s.name AS "subcategoryName",
      u.id AS "userId", u.role, u.is_active AS "isActive", u.attention_area_id AS "userAreaId"
    FROM ${tickets} t LEFT JOIN ${attentionAreas} a ON a.id = t.attention_area_id
      LEFT JOIN ${ticketSubcategories} s ON s.id = t.subcategory_id
      LEFT JOIN ${users} u ON u.id = ${userId}
    WHERE t.id = ${batch.ticketId} FOR UPDATE OF t
  `);
  const row = result.rows[0];
  if (!row || row.userId !== userId || !row.isActive ||
      (row.role !== "user" && row.role !== "agent" && row.role !== "admin")) return { kind: "blocked" };
  if (!canReadTicket({ id: userId, role: row.role, isActive: row.isActive, attentionAreaId: row.userAreaId ?? undefined }, row) ||
      row.status === "resolved" || row.status === "voided" ||
      !areTicketAttachmentsAllowed(row.areaSlug ?? undefined, row.subcategoryName ?? undefined)) {
    return { kind: "blocked" };
  }
  return { kind: "ready", ticketId: row.id, ticketCode: row.ticketCode };
}

/** Conserva referencias incluso cuando el destino dejó de admitir la vinculación. */
export async function linkConfirmedUploadBatch(
  tx: BatchExecutor, target: BatchTarget, userId: string, uploadToken: string,
): Promise<void> {
  if (target.kind === "unbound") return;
  if (target.kind === "ready") await linkPendingAttachments(tx, target.ticketId, userId, uploadToken);
  await tx.execute(sql`
    UPDATE ${uploadBatches} SET last_error_code = ${target.kind === "blocked" ? "ticket_unavailable" : null}
    WHERE uploaded_by_id = ${userId} AND upload_token = ${uploadToken}
  `);
}

/** Lectura posterior al commit para invalidar caché; nunca modifica la relación. */
export async function getUploadBatchTicketCode(userId: string, uploadToken: string): Promise<string | null> {
  const result = await db.execute<{ ticketCode: string }>(sql`
    SELECT t.ticket_code AS "ticketCode" FROM ${uploadBatches} b
      INNER JOIN ${tickets} t ON t.id = b.ticket_id
    WHERE b.uploaded_by_id = ${userId} AND b.upload_token = ${uploadToken}
  `);
  return result.rows[0]?.ticketCode ?? null;
}

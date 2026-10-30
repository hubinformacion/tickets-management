import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { tickets, ticketAttachments, attachmentReverts, uploadAttempts } from "@/db/schema";
import { canManageTicket, canReadTicket } from "@/lib/auth/ticket-permissions";
import { deleteFileFromDrive } from "@/lib/drive/client";
import { attachmentPurgeScope, attemptPurgeScope } from "@/lib/uploads/ticket-purge-scope";
import type { AppUser } from "@/types";

type RemovalUser = Pick<AppUser, "id" | "role" | "isActive" | "attentionAreaId">;
type RemovalResult =
  | { kind: "missing" | "forbidden" }
  | { kind: "busy" | "removed" | "failed" | "unconfirmed"; ticketCode: string | null };
type RemovalClaim =
  | { kind: "missing" | "forbidden" }
  | { kind: "busy" | "removed"; ticketCode: string | null }
  | { kind: "claimed"; ticketCode: string | null; driveFileId: string };

function isNotFound(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === 404) return true;
  return "response" in error && typeof error.response === "object" && error.response !== null &&
    "status" in error.response && error.response.status === 404;
}

/** Una solicitud explícita de UI; nunca elimina la referencia de BD. */
export async function removeLinkedAttachment(
  user: RemovalUser,
  attachmentId: string,
  ticketId: number,
  removeFile: typeof deleteFileFromDrive = deleteFileFromDrive,
  scope: "linked" | "ticket-purge" = "linked",
): Promise<RemovalResult> {
  if (scope === "ticket-purge" && (user.role !== "admin" || !user.isActive)) return { kind: "forbidden" };
  const token = randomUUID();
  const claim = await db.transaction(async (tx): Promise<RemovalClaim> => {
    await tx.execute(sql`SET LOCAL lock_timeout = '3s'`);
    await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);
    const ticketResult = await tx.execute<{
      id: number; ticketCode: string; createdById: string; watchers: string[] | null; attentionAreaId: number | null;
    }>(sql`
      SELECT id, ticket_code AS "ticketCode", created_by_id AS "createdById", watchers,
        attention_area_id AS "attentionAreaId" FROM ${tickets} WHERE id = ${ticketId} FOR UPDATE
    `);
    const ticket = ticketResult.rows[0];
    if (!ticket && scope === "linked") return { kind: "missing" };
    if (ticket && !canReadTicket(user, ticket)) return { kind: "forbidden" };
    const ticketCode = ticket?.ticketCode ?? null;
    const fileScope = scope === "ticket-purge" ? attachmentPurgeScope(ticketId) : sql`a.ticket_id = ${ticketId}`;
    const files = await tx.execute<{ driveFileId: string; uploadedById: string }>(sql`
      SELECT a.drive_file_id AS "driveFileId", a.uploaded_by_id AS "uploadedById" FROM ${ticketAttachments} a
      WHERE a.id = ${attachmentId}::uuid AND ${fileScope} FOR UPDATE OF a
    `);
    let file = files.rows[0];
    if (!file && scope === "ticket-purge") {
      // Un registro stored sin metadata todavía puede aportar el ID remoto para la purga.
      const attempts = await tx.execute<{ driveFileId: string; uploadedById: string }>(sql`
        SELECT u.drive_file_id AS "driveFileId", u.uploaded_by_id AS "uploadedById" FROM ${uploadAttempts} u
        WHERE u.attachment_id = ${attachmentId}::uuid AND u.state = 'stored' AND ${attemptPurgeScope(ticketId)}
        FOR UPDATE OF u
      `);
      file = attempts.rows[0];
    }
    if (!file) return { kind: "missing" };
    if (scope === "linked" && (!ticket || (file.uploadedById !== user.id && !canManageTicket(user, ticket)))) {
      return { kind: "forbidden" };
    }
    const previous = await tx.execute<{ state: string; leaseActive: boolean | null }>(sql`
      SELECT state, lease_until > now() AS "leaseActive" FROM ${attachmentReverts}
      WHERE attachment_id = ${attachmentId}::uuid
    `);
    const job = previous.rows[0];
    if (job?.state === "removed") return { kind: "removed", ticketCode };
    if (job?.state === "removing" && job.leaseActive) return { kind: "busy", ticketCode };
    await tx.execute(sql`
      INSERT INTO ${attachmentReverts} (attachment_id, requested_by_id, lease_token, lease_until)
      VALUES (${attachmentId}::uuid, ${user.id}, ${token}::uuid, now() + interval '5 minutes')
      ON CONFLICT (attachment_id) DO UPDATE SET state = 'removing', lease_token = EXCLUDED.lease_token,
        lease_until = EXCLUDED.lease_until, attempts = attachment_revert.attempts + 1,
        updated_at = now(), last_error_code = NULL
    `);
    return { kind: "claimed", driveFileId: file.driveFileId, ticketCode };
  }, { isolationLevel: "read committed" });
  if (claim.kind !== "claimed") return claim;

  let notFound = false;
  try {
    await removeFile(claim.driveFileId, { signal: AbortSignal.timeout(20_000), timeout: 20_000 });
  } catch (error) {
    if (scope === "ticket-purge" && isNotFound(error)) {
      notFound = true;
    } else {
      try {
        const failed = await db.execute<{ id: string }>(sql`
          UPDATE ${attachmentReverts} SET state = 'failed', lease_token = NULL, lease_until = NULL,
            updated_at = now(), last_error_code = 'drive_unconfirmed'
          WHERE attachment_id = ${attachmentId}::uuid AND lease_token = ${token}::uuid AND state = 'removing'
          RETURNING attachment_id AS id
        `);
        return { kind: failed.rows.length ? "failed" : "unconfirmed", ticketCode: claim.ticketCode };
      } catch {
        return { kind: "unconfirmed", ticketCode: claim.ticketCode };
      }
    }
  }
  try {
    const confirmed = await db.execute<{ id: string }>(sql`
      UPDATE ${attachmentReverts} SET state = 'removed', drive_deleted_at = now(),
        lease_token = NULL, lease_until = NULL, updated_at = now(), last_error_code = ${notFound ? "drive_not_found" : null}
      WHERE attachment_id = ${attachmentId}::uuid AND lease_token = ${token}::uuid AND state = 'removing'
      RETURNING attachment_id AS id
    `);
    return { kind: confirmed.rows.length ? "removed" : "unconfirmed", ticketCode: claim.ticketCode };
  } catch {
    return { kind: "unconfirmed", ticketCode: claim.ticketCode };
  }
}

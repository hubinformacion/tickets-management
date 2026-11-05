import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

/** Solo clasifica referencias de BD; el caller aporta una transacción de solo lectura. */
export async function readUploadReconciliationReport(tx: Pick<NodePgDatabase, "execute">) {
  const result = await tx.execute<{ category: string; count: string }>(sql`
    WITH attempt_counts AS (
      SELECT
        count(*) AS total,
        count(*) FILTER (WHERE u.state = 'uploading' AND u.lease_until > now()) AS in_progress,
        count(*) FILTER (WHERE u.state = 'uploading' AND u.lease_until <= now()) AS expired_lease,
        count(*) FILTER (WHERE u.state = 'uncertain') AS uncertain,
        count(*) FILTER (WHERE u.state <> 'stored' AND u.drive_file_id IS NULL) AS without_remote_id,
        count(*) FILTER (WHERE u.state <> 'stored' AND u.drive_file_id IS NOT NULL
          AND a.id IS NULL AND r.attachment_id IS NULL
          AND NOT (u.state = 'uploading' AND u.lease_until > now())) AS reserved_remote_unconfirmed,
        count(*) FILTER (WHERE u.state = 'stored' AND a.id IS NULL
          AND r.attachment_id IS NULL) AS stored_missing_reference,
        count(*) FILTER (WHERE a.id IS NOT NULL AND
          (u.drive_file_id, u.uploaded_by_id, u.file_name, u.file_size, u.mime_type)
          IS DISTINCT FROM
          (a.drive_file_id, a.uploaded_by_id, a.file_name, a.file_size, a.mime_type)) AS reference_mismatch,
        count(*) FILTER (WHERE a.id IS NOT NULL AND a.ticket_id IS NULL
          AND a.upload_token IS DISTINCT FROM u.upload_token) AS pending_token_mismatch,
        count(*) FILTER (WHERE b.uploaded_by_id IS NULL) AS without_batch,
        count(*) FILTER (WHERE a.ticket_id IS NOT NULL AND b.ticket_id IS NOT NULL
          AND a.ticket_id <> b.ticket_id) AS batch_target_mismatch
      FROM upload_attempt u
      LEFT JOIN ticket_attachment a ON a.id = u.attachment_id
      LEFT JOIN attachment_revert r ON r.attachment_id = u.attachment_id
      LEFT JOIN upload_batch b ON b.uploaded_by_id = u.uploaded_by_id AND b.upload_token = u.upload_token
    ), attachment_counts AS (
      SELECT
        count(*) AS total,
        count(*) FILTER (WHERE u.id IS NULL) AS legacy_without_attempt,
        count(*) FILTER (WHERE r.state = 'removed') AS intentionally_removed,
        count(*) FILTER (WHERE a.ticket_id IS NULL AND r.attachment_id IS NULL
          AND b.uploaded_by_id IS NOT NULL AND b.ticket_id IS NULL) AS pending_unbound,
        count(*) FILTER (WHERE a.ticket_id IS NULL AND r.attachment_id IS NULL
          AND b.ticket_id IS NOT NULL) AS pending_bound,
        count(*) FILTER (WHERE a.ticket_id IS NULL AND r.attachment_id IS NULL
          AND b.ticket_id IS NOT NULL AND b.last_error_code = 'ticket_unavailable') AS pending_blocked,
        count(*) FILTER (WHERE a.ticket_id IS NULL AND r.attachment_id IS NULL
          AND a.upload_token IS NOT NULL AND b.uploaded_by_id IS NULL) AS pending_without_batch,
        count(*) FILTER (WHERE a.ticket_id IS NULL AND r.attachment_id IS NULL
          AND a.upload_token IS NOT NULL AND b.uploaded_by_id IS NULL AND u.id IS NULL) AS pending_legacy_without_batch,
        count(*) FILTER (WHERE a.ticket_id IS NULL AND r.attachment_id IS NULL
          AND a.upload_token IS NOT NULL AND b.uploaded_by_id IS NULL AND u.id IS NOT NULL) AS pending_registered_without_batch,
        count(*) FILTER (WHERE a.ticket_id IS NULL AND r.attachment_id IS NULL
          AND a.upload_token IS NULL) AS pending_without_token,
        count(*) FILTER (WHERE a.ticket_id IS NOT NULL AND a.upload_token IS NOT NULL) AS linked_with_token
      FROM ticket_attachment a
      LEFT JOIN upload_attempt u ON u.attachment_id = a.id
      LEFT JOIN attachment_revert r ON r.attachment_id = a.id
      LEFT JOIN upload_batch b ON b.uploaded_by_id = a.uploaded_by_id AND b.upload_token = a.upload_token
    ), revert_counts AS (
      SELECT
        count(*) FILTER (WHERE r.state = 'removed') AS removed,
        count(*) FILTER (WHERE r.state = 'failed') AS failed,
        count(*) FILTER (WHERE r.state = 'removing' AND r.lease_until > now()) AS in_progress,
        count(*) FILTER (WHERE r.state = 'removing' AND r.lease_until <= now()) AS expired_lease,
        count(*) FILTER (WHERE a.id IS NULL AND u.id IS NULL) AS without_reference_or_attempt
      FROM attachment_revert r
      LEFT JOIN ticket_attachment a ON a.id = r.attachment_id
      LEFT JOIN upload_attempt u ON u.attachment_id = r.attachment_id
    ), batch_counts AS (
      SELECT count(*) AS total,
        count(*) FILTER (WHERE b.ticket_id IS NULL) AS unbound,
        count(*) FILTER (WHERE b.ticket_id IS NOT NULL AND t.id IS NULL) AS missing_target,
        count(*) FILTER (WHERE b.last_error_code = 'ticket_unavailable') AS blocked
      FROM upload_batch b LEFT JOIN ticket t ON t.id = b.ticket_id
    ), duplicate_counts AS (
      SELECT count(*) AS groups, coalesce(sum(n - 1), 0) AS extra_references
      FROM (
        SELECT count(*) AS n FROM ticket_attachment a
        LEFT JOIN attachment_revert r ON r.attachment_id = a.id
        WHERE r.state IS DISTINCT FROM 'removed'
        GROUP BY a.drive_file_id HAVING count(*) > 1
      ) duplicates
    )
    SELECT metric.category, metric.count::text
    FROM attempt_counts u CROSS JOIN attachment_counts a CROSS JOIN revert_counts r
      CROSS JOIN batch_counts b CROSS JOIN duplicate_counts d
      CROSS JOIN LATERAL (VALUES
        ('attempts_total', u.total),
        ('attempts_in_progress', u.in_progress),
        ('attempts_expired_lease', u.expired_lease),
        ('attempts_uncertain', u.uncertain),
        ('attempts_without_remote_id', u.without_remote_id),
        ('attempts_reserved_remote_unconfirmed', u.reserved_remote_unconfirmed),
        ('stored_attempts_missing_reference_without_revert', u.stored_missing_reference),
        ('attempt_attachment_mismatches', u.reference_mismatch),
        ('attempt_pending_token_mismatches', u.pending_token_mismatch),
        ('attempts_without_batch', u.without_batch),
        ('attempt_batch_target_mismatches', u.batch_target_mismatch),
        ('attachments_total', a.total),
        ('legacy_attachments_without_attempt', a.legacy_without_attempt),
        ('attachments_intentionally_removed', a.intentionally_removed),
        ('pending_attachments_unbound_without_revert', a.pending_unbound),
        ('pending_attachments_bound_without_revert', a.pending_bound),
        ('pending_attachments_blocked_without_revert', a.pending_blocked),
        ('pending_attachments_without_batch_or_revert', a.pending_without_batch),
        ('pending_legacy_attachments_without_batch_or_revert', a.pending_legacy_without_batch),
        ('pending_registered_attachments_without_batch_or_revert', a.pending_registered_without_batch),
        ('pending_attachments_without_token_or_revert', a.pending_without_token),
        ('linked_attachments_with_token', a.linked_with_token),
        ('reverts_removed', r.removed),
        ('reverts_failed', r.failed),
        ('reverts_in_progress', r.in_progress),
        ('reverts_expired_lease', r.expired_lease),
        ('reverts_without_reference_or_attempt', r.without_reference_or_attempt),
        ('batches_total', b.total),
        ('batches_unbound', b.unbound),
        ('batches_missing_target', b.missing_target),
        ('batches_blocked', b.blocked),
        ('duplicate_remote_reference_groups_excluding_removed', d.groups),
        ('duplicate_remote_extra_references_excluding_removed', d.extra_references)
      ) AS metric(category, count)
    ORDER BY metric.category
  `);

  const counts: Record<string, number> = {};
  for (const row of result.rows) {
    const count = Number(row.count);
    if (!/^\d+$/.test(row.count) || !Number.isSafeInteger(count)) {
      throw new Error("El diagnóstico de adjuntos recibió un conteo inválido");
    }
    counts[row.category] = count;
  }

  // Las categorías se solapan; antigüedad y reservas remotas no prueban archivos huérfanos.
  return { remoteInventory: "not_scanned" as const, counts };
}

import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { surveyReminderDeliveries } from "@/db/schema";
import type { SendSurveyReminderEmailParams } from "@/lib/email/send-emails";
import type { ReminderStore } from "@/lib/reminders/worker";

// Los timestamps históricos sin zona contienen UTC. La comparación ocurre íntegramente en PG.
function eligibility(startAt: Date) {
  return sql`t.status = 'resolved'
    AND t.closed_at >= timezone('UTC', ${startAt.toISOString()}::timestamptz)
    AND t.closed_at <= timezone('UTC', now() - interval '48 hours')
    AND t.survey_reminder_sent_at IS NULL
    AND t.attention_area_id IS NOT NULL AND u.is_active = true
    AND NOT EXISTS (SELECT 1 FROM satisfaction_survey s WHERE s.ticket_id = t.id)`;
}

export const reminderStore: ReminderStore = {
  async enqueue(startAt) {
    // Conserva los registros operativos invalidados sin alterar el ticket ni su historia.
    await db.execute(sql`
      WITH stale AS (
        SELECT j.id FROM ${surveyReminderDeliveries} j
        WHERE (j.state = 'pending' OR (j.state = 'leased' AND j.lease_until <= now()))
          AND NOT EXISTS (
            SELECT 1 FROM ticket t JOIN "user" u ON u.id = t.created_by_id
            WHERE t.id = j.ticket_id AND t.closed_at = j.closed_at AND ${eligibility(startAt)}
          )
        ORDER BY j.created_at, j.id LIMIT 200 FOR UPDATE OF j SKIP LOCKED
      )
      UPDATE ${surveyReminderDeliveries} j SET state = 'cancelled',
        lease_token = NULL, lease_until = NULL, updated_at = now(), last_error_code = 'not_eligible'
      FROM stale WHERE j.id = stale.id
    `);
    await db.execute(sql`
      INSERT INTO ${surveyReminderDeliveries} (ticket_id, closed_at)
      SELECT t.id, t.closed_at FROM ticket t JOIN "user" u ON u.id = t.created_by_id
      WHERE ${eligibility(startAt)} AND NOT EXISTS (
        SELECT 1 FROM ${surveyReminderDeliveries} j
        WHERE j.ticket_id = t.id AND j.closed_at = t.closed_at AND j.state <> 'cancelled'
      )
      ORDER BY t.closed_at, t.id LIMIT 100
      ON CONFLICT (ticket_id, closed_at) DO UPDATE SET state = 'pending',
        next_attempt_at = now(), updated_at = now(), last_error_code = NULL
      WHERE survey_reminder_delivery.state = 'cancelled'
    `);
  },

  async claim(startAt) {
    const token = randomUUID();
    const result = await db.execute<{ id: string; attempts: number }>(sql`
      WITH candidate AS (
        SELECT j.id FROM ${surveyReminderDeliveries} j
        JOIN ticket t ON t.id = j.ticket_id AND t.closed_at = j.closed_at
        JOIN "user" u ON u.id = t.created_by_id
        WHERE ${eligibility(startAt)} AND j.next_attempt_at <= now()
          AND (j.state = 'pending' OR (j.state = 'leased' AND j.lease_until <= now()))
          AND NOT EXISTS (
            SELECT 1 FROM ${surveyReminderDeliveries} other
            WHERE other.ticket_id = j.ticket_id AND other.state = 'leased' AND other.id <> j.id
          )
        ORDER BY j.next_attempt_at, j.created_at, j.id LIMIT 1 FOR UPDATE OF j SKIP LOCKED
      )
      UPDATE ${surveyReminderDeliveries} j SET state = 'leased', lease_token = ${token}::uuid,
        lease_until = now() + interval '5 minutes', attempts = j.attempts + 1, updated_at = now()
      FROM candidate WHERE j.id = candidate.id RETURNING j.id, j.attempts
    `);
    const row = result.rows[0];
    return row ? { ...row, token } : undefined;
  },

  async load(claim, startAt) {
    const result = await db.execute<{
      ticketId: number; ticketCode: string; title: string; closedAt: string;
      creatorEmail: string; creatorName: string; attentionAreaName: string;
      emailThreadId: string | null; initialMessageId: string | null; agentEmails: string[];
    }>(sql`
      SELECT t.id AS "ticketId", t.ticket_code AS "ticketCode", t.title,
        to_char(t.closed_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "closedAt",
        u.email AS "creatorEmail", u.name AS "creatorName", a.name AS "attentionAreaName",
        t.email_thread_id AS "emailThreadId", t.initial_message_id AS "initialMessageId",
        ARRAY(SELECT agent.email FROM "user" agent WHERE agent.role = 'agent'
          AND agent.is_active = true AND agent.attention_area_id = t.attention_area_id) AS "agentEmails"
      FROM ${surveyReminderDeliveries} j
      JOIN ticket t ON t.id = j.ticket_id AND t.closed_at = j.closed_at
      JOIN "user" u ON u.id = t.created_by_id
      JOIN attention_area a ON a.id = t.attention_area_id
      WHERE j.id = ${claim.id}::uuid AND j.lease_token = ${claim.token}::uuid
        AND j.state = 'leased' AND j.lease_until > now() AND ${eligibility(startAt)}
    `);
    const row = result.rows[0];
    if (!row) return undefined;
    return { ...row, closedAt: new Date(row.closedAt), watcherEmails: [] } satisfies SendSurveyReminderEmailParams;
  },

  async cancel(claim) {
    await db.execute(sql`UPDATE ${surveyReminderDeliveries} SET state = 'cancelled',
      lease_token = NULL, lease_until = NULL, updated_at = now(), last_error_code = 'not_eligible'
      WHERE id = ${claim.id}::uuid AND state = 'leased' AND lease_token = ${claim.token}::uuid`);
  },

  async retry(claim, delayMs) {
    await db.execute(sql`UPDATE ${surveyReminderDeliveries} SET state = 'pending',
      next_attempt_at = now() + (${delayMs} * interval '1 millisecond'),
      lease_token = NULL, lease_until = NULL, updated_at = now(), last_error_code = 'send_unconfirmed'
      WHERE id = ${claim.id}::uuid AND state = 'leased' AND lease_token = ${claim.token}::uuid`);
  },

  async complete(claim, messageId) {
    await db.transaction(async (tx) => {
      const result = await tx.execute<{ ticketId: number }>(sql`
        UPDATE ${surveyReminderDeliveries} SET state = 'sent', sent_at = now(),
          gmail_message_id = ${messageId ?? null}, lease_token = NULL, lease_until = NULL,
          updated_at = now(), last_error_code = NULL
        WHERE id = ${claim.id}::uuid AND state = 'leased' AND lease_token = ${claim.token}::uuid
        RETURNING ticket_id AS "ticketId"
      `);
      const row = result.rows[0];
      if (!row) throw new Error("Reserva de recordatorio perdida");
      // Registra un envío confirmado incluso si el usuario reabrió durante la llamada a Gmail.
      await tx.execute(sql`UPDATE ticket SET survey_reminder_sent_at = timezone('UTC', now())
        WHERE id = ${row.ticketId} AND survey_reminder_sent_at IS NULL`);
    });
  },
};

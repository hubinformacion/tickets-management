import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

type IntegrityExecutor = Pick<NodePgDatabase, "execute">;

/** Solo lee agregados y catálogo; el llamador controla la transacción de solo lectura. */
export async function readDomainIntegrityReport(tx: IntegrityExecutor) {
  // Una transacción comparte una conexión; pg requiere esperar cada consulta.
  const ticket = await tx.execute(sql`
      SELECT count(*) AS total,
        count(*) FILTER (WHERE status NOT IN ('open', 'in_progress', 'pending_validation', 'resolved', 'voided')) AS status_invalid,
        count(*) FILTER (WHERE status IS NULL) AS status_null,
        count(*) FILTER (WHERE priority NOT IN ('low', 'medium', 'high', 'critical')) AS priority_invalid,
        count(*) FILTER (WHERE priority IS NULL) AS priority_null
      FROM ticket
    `);
  const history = await tx.execute(sql`
      SELECT count(*) AS total,
        count(*) FILTER (WHERE from_status NOT IN ('open', 'in_progress', 'pending_validation', 'resolved', 'voided')) AS from_invalid,
        count(*) FILTER (WHERE from_status IS NULL) AS from_null,
        count(*) FILTER (WHERE to_status NOT IN ('open', 'in_progress', 'pending_validation', 'resolved', 'voided')) AS to_invalid,
        count(*) FILTER (WHERE to_status IS NULL) AS to_null
      FROM ticket_status_history
    `);
  const provider = await tx.execute(sql`
      SELECT count(*) AS total,
        count(*) FILTER (WHERE status NOT IN ('en_proceso', 'cerrado')) AS status_invalid,
        count(*) FILTER (WHERE status IS NULL) AS status_null,
        count(*) FILTER (WHERE priority NOT IN ('baja', 'media', 'alta', 'critica')) AS priority_invalid,
        count(*) FILTER (WHERE priority IS NULL) AS priority_null
      FROM provider_ticket
    `);
  const survey = await tx.execute(sql`
      SELECT count(*) AS total,
        count(*) FILTER (WHERE response_time_rating NOT BETWEEN 1 AND 5
          OR communication_rating NOT BETWEEN 1 AND 5
          OR solution_rating NOT BETWEEN 1 AND 5
          OR overall_rating NOT BETWEEN 1 AND 5) AS ratings_invalid,
        count(*) FILTER (WHERE response_time_rating IS NULL OR communication_rating IS NULL
          OR solution_rating IS NULL OR overall_rating IS NULL) AS ratings_null
      FROM satisfaction_survey
    `);
  const providerSurvey = await tx.execute(sql`
      SELECT count(*) AS total,
        count(*) FILTER (WHERE response_time_rating NOT BETWEEN 1 AND 5
          OR deadline_rating NOT BETWEEN 1 AND 5
          OR quality_rating NOT BETWEEN 1 AND 5
          OR requirement_understanding_rating NOT BETWEEN 1 AND 5
          OR attention_rating NOT BETWEEN 1 AND 5) AS ratings_invalid,
        count(*) FILTER (WHERE response_time_rating IS NULL OR deadline_rating IS NULL
          OR quality_rating IS NULL OR requirement_understanding_rating IS NULL
          OR attention_rating IS NULL) AS ratings_null
      FROM provider_satisfaction_survey
    `);
  const checks = await tx.execute(sql`
      SELECT n.nspname AS schema_name, t.relname AS table_name,
        c.conname AS constraint_name, c.convalidated AS validated,
        pg_get_constraintdef(c.oid) AS definition
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE c.contype = 'c' AND n.nspname = current_schema()
        AND t.relname IN ('ticket', 'ticket_status_history', 'provider_ticket',
          'satisfaction_survey', 'provider_satisfaction_survey')
      ORDER BY t.relname, c.conname
    `);
  const nullability = await tx.execute(sql`
      SELECT n.nspname AS schema_name, t.relname AS table_name,
        a.attname AS column_name, a.attnotnull AS not_null
      FROM pg_attribute a
      JOIN pg_class t ON t.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = current_schema() AND a.attnum > 0 AND NOT a.attisdropped
        AND (
          (t.relname = 'ticket' AND a.attname IN ('status', 'priority'))
          OR (t.relname = 'ticket_status_history' AND a.attname IN ('from_status', 'to_status'))
          OR (t.relname = 'provider_ticket' AND a.attname IN ('status', 'priority'))
          OR (t.relname = 'satisfaction_survey' AND a.attname IN (
            'response_time_rating', 'communication_rating', 'solution_rating', 'overall_rating'))
          OR (t.relname = 'provider_satisfaction_survey' AND a.attname IN (
            'response_time_rating', 'deadline_rating', 'quality_rating',
            'requirement_understanding_rating', 'attention_rating'))
        )
      ORDER BY t.relname, a.attnum
    `);

  return {
    counts: {
      ticket: ticket.rows[0],
      ticketStatusHistory: history.rows[0],
      providerTicket: provider.rows[0],
      satisfactionSurvey: survey.rows[0],
      providerSatisfactionSurvey: providerSurvey.rows[0],
    },
    checks: checks.rows,
    nullability: nullability.rows,
  };
}

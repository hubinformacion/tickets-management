-- PROPUESTA PARA REVISIÓN. No ejecutar con el permiso de merge/despliegue.
-- Requiere respaldo verificado y autorización específica de esquema de producción.
-- Solo crea una tabla vacía e índices propios. No cambia ni recorre datos históricos.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
CREATE TABLE survey_reminder_delivery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id integer NOT NULL,
  closed_at timestamp NOT NULL,
  state text NOT NULL DEFAULT 'pending',
  lease_token uuid,
  lease_until timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  gmail_message_id text,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT survey_reminder_event_unique UNIQUE (ticket_id, closed_at),
  CONSTRAINT survey_reminder_state_check CHECK (state IN ('pending', 'leased', 'sent', 'cancelled')),
  CONSTRAINT survey_reminder_attempts_check CHECK (attempts >= 0),
  CONSTRAINT survey_reminder_lease_check CHECK (
    (state = 'leased') = (lease_token IS NOT NULL AND lease_until IS NOT NULL)
  ),
  CONSTRAINT survey_reminder_sent_check CHECK ((state = 'sent') = (sent_at IS NOT NULL))
);
CREATE UNIQUE INDEX survey_reminder_one_lease ON survey_reminder_delivery (ticket_id) WHERE state = 'leased';
CREATE INDEX survey_reminder_due_idx ON survey_reminder_delivery (state, next_attempt_at, lease_until);
COMMIT;

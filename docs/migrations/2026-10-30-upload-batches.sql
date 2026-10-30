-- Solo una tabla operativa nueva. Sin ALTER, cascadas ni modificaciones históricas.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
CREATE TABLE upload_batch (
  uploaded_by_id text NOT NULL,
  upload_token text NOT NULL,
  ticket_id integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  bound_at timestamptz,
  last_error_code text,
  PRIMARY KEY (uploaded_by_id, upload_token),
  CONSTRAINT upload_batch_token_check CHECK (upload_token ~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'),
  CONSTRAINT upload_batch_ticket_check CHECK (ticket_id IS NULL OR ticket_id > 0),
  CONSTRAINT upload_batch_binding_check CHECK ((ticket_id IS NULL) = (bound_at IS NULL)),
  CONSTRAINT upload_batch_error_check CHECK (last_error_code IS NULL OR last_error_code = 'ticket_unavailable')
);
COMMIT;

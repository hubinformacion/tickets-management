-- Cambio aditivo autorizado: crea únicamente una tabla operativa vacía.
-- No modifica tablas existentes ni registros de negocio.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
CREATE TABLE attachment_revert (
  attachment_id uuid PRIMARY KEY,
  requested_by_id text NOT NULL,
  state text NOT NULL DEFAULT 'removing',
  lease_token uuid,
  lease_until timestamptz,
  attempts integer NOT NULL DEFAULT 1,
  last_error_code text,
  drive_deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attachment_revert_state_check CHECK (state IN ('removing', 'failed', 'removed')),
  CONSTRAINT attachment_revert_attempts_check CHECK (attempts >= 1),
  CONSTRAINT attachment_revert_lease_check CHECK (
    (state = 'removing' AND lease_token IS NOT NULL AND lease_until IS NOT NULL)
    OR (state <> 'removing' AND lease_token IS NULL AND lease_until IS NULL)
  ),
  CONSTRAINT attachment_revert_removed_check CHECK ((state = 'removed') = (drive_deleted_at IS NOT NULL))
);
CREATE INDEX attachment_revert_state_idx ON attachment_revert (state, lease_until);
COMMIT;

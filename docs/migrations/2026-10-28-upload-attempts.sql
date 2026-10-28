-- Cambio aditivo autorizado: solo una tabla operativa vacía e índices propios.
-- No modifica tablas existentes ni registros históricos.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
CREATE TABLE upload_attempt (
  id uuid PRIMARY KEY,
  attachment_id uuid NOT NULL,
  uploaded_by_id text NOT NULL,
  upload_token text NOT NULL,
  file_name text NOT NULL,
  file_size integer NOT NULL,
  mime_type text NOT NULL,
  sha256 text NOT NULL,
  md5 text NOT NULL,
  drive_file_id text,
  state text NOT NULL DEFAULT 'pending',
  lease_token uuid,
  lease_until timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT upload_attempt_attachment_unique UNIQUE (attachment_id),
  CONSTRAINT upload_attempt_drive_unique UNIQUE (drive_file_id),
  CONSTRAINT upload_attempt_state_check CHECK (state IN ('pending', 'uploading', 'stored', 'uncertain')),
  CONSTRAINT upload_attempt_count_check CHECK (attempts >= 0),
  CONSTRAINT upload_attempt_size_check CHECK (file_size > 0 AND file_size <= 4000000),
  CONSTRAINT upload_attempt_sha256_check CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT upload_attempt_md5_check CHECK (md5 ~ '^[a-f0-9]{32}$'),
  CONSTRAINT upload_attempt_lease_check CHECK (
    (state = 'uploading' AND lease_token IS NOT NULL AND lease_until IS NOT NULL)
    OR (state <> 'uploading' AND lease_token IS NULL AND lease_until IS NULL)
  ),
  CONSTRAINT upload_attempt_stored_check CHECK (state <> 'stored' OR drive_file_id IS NOT NULL)
);
CREATE INDEX upload_attempt_owner_token_idx ON upload_attempt (uploaded_by_id, upload_token);
CREATE INDEX upload_attempt_state_idx ON upload_attempt (state, updated_at);
COMMIT;

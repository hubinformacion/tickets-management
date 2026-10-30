-- Cambio aditivo autorizado: solo una tabla operativa vacía y sus restricciones propias.
-- Sin cambios sobre tablas existentes, cascadas, borrados ni backfills históricos.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
CREATE TABLE rate_limit_counter (
  namespace text NOT NULL,
  identifier_hash text NOT NULL,
  request_count integer NOT NULL,
  reset_at timestamptz NOT NULL,
  PRIMARY KEY (namespace, identifier_hash),
  CONSTRAINT rate_limit_counter_namespace_check CHECK (namespace ~ '^[a-z][a-z0-9:-]{0,79}$'),
  CONSTRAINT rate_limit_counter_hash_check CHECK (identifier_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT rate_limit_counter_count_check CHECK (request_count > 0)
);
COMMIT;

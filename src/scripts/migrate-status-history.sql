-- Migración: Crear tabla ticket_status_history
-- SEGURA: No borra datos existentes, solo crea tabla nueva y backfilla desde comments

BEGIN;

-- 1. Crear tabla nueva
CREATE TABLE IF NOT EXISTS ticket_status_history (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES ticket(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by_id TEXT NOT NULL REFERENCES "user"(id),
  changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Crear índices
CREATE INDEX IF NOT EXISTS idx_status_history_ticket ON ticket_status_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_status_history_changed_at ON ticket_status_history(changed_at);

-- 3. Backfill: insertar registros desde comments tipo 'system' que tienen metadata con cambio de estado
INSERT INTO ticket_status_history (ticket_id, from_status, to_status, changed_by_id, changed_at)
SELECT
  c.ticket_id,
  c.metadata->>'from_status',
  c.metadata->>'to_status',
  c.user_id,
  c.created_at
FROM comment c
WHERE c.type = 'system'
  AND c.metadata->>'to_status' IS NOT NULL
  AND c.metadata->>'from_status' IS NOT NULL;

-- 4. Para tickets sin historial en comments, inferir desde estado actual
INSERT INTO ticket_status_history (ticket_id, to_status, changed_by_id, changed_at)
SELECT
  t.id,
  t.status,
  t.created_by_id,
  t.created_at
FROM ticket t
WHERE NOT EXISTS (
  SELECT 1 FROM ticket_status_history h WHERE h.ticket_id = t.id
);

COMMIT;

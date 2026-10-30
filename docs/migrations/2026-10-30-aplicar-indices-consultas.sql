-- Aplicación aditiva autorizada expresamente por el usuario el 30 de octubre de 2026.
-- Manual: cada CREATE se ejecuta por separado, fuera de BEGIN/COMMIT.
-- No ejecutar automáticamente desde build, deploy o mantenimiento de desarrollo.
-- Verificar destino, definición, indisvalid e indisready antes y después.
-- IF NOT EXISTS no comprueba equivalencia de definición ni validez.
-- No elimina ni reconstruye índices existentes y no modifica filas.

CREATE INDEX CONCURRENTLY IF NOT EXISTS provider_ticket_area_order_idx
  ON public.provider_ticket (
    attention_area_id,
    (CASE WHEN status = 'cerrado' THEN 1 ELSE 0 END),
    created_at DESC,
    id DESC
  );

CREATE INDEX CONCURRENTLY IF NOT EXISTS ticket_area_status_closed_idx
  ON public.ticket (attention_area_id, status, closed_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS ticket_status_history_ticket_time_idx
  ON public.ticket_status_history (ticket_id, changed_at, id);

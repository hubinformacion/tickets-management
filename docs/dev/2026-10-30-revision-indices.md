# Revisión de índices de consultas

## Estado y alcance

Revisión realizada en paralelo con la paginación de proveedores, por petición expresa del usuario. Se inspeccionaron catálogo, restricciones, tamaños/estadísticas estimados y diez planes de consulta. **No se crearon, reconstruyeron ni eliminaron índices; no se ejecutaron migraciones, ANALYZE o escrituras.** La [propuesta SQL](../migrations/2026-10-30-indices-consultas.sql) conserva las sentencias comentadas y no forma parte del despliegue automático.

La conexión verificó primero el destino de producción esperado y utilizó BEGIN READ ONLY, statement_timeout de ocho segundos y EXPLAIN (FORMAT JSON) sin ANALYZE. Se consultaron metadatos de pg_class, pg_indexes, pg_index, pg_constraint y estadísticas acumuladas; no se seleccionaron filas de tickets, encuestas o usuarios. No se solicitaron bloqueos de filas. El material temporal de inspección se retiró al terminar.

## Catálogo observado

| Tabla | Filas estimadas por reltuples / n_live_tup | Tamaño de tabla / índices | Índices existentes |
|---|---:|---:|---|
| provider_ticket | 55 / 58 | 48 / 16 KiB | PK(id) |
| ticket | 392 / 399 | 432 / 72 KiB | PK(id), UNIQUE(ticket_code) |
| ticket_status_history | 1.076 / 1.104 | 112 / 40 KiB | PK(id) |
| satisfaction_survey | 168 / 209 | 24 / 32 KiB | PK(id), UNIQUE(ticket_id) |
| provider_satisfaction_survey | sin estimación reltuples / 14 | 8 / 32 KiB | PK(id), UNIQUE(provider_ticket_id) |
| provider | sin estimación reltuples / 13 | 8 / 16 KiB | PK(id) |

Son estimaciones y tamaños de metadatos, no recuentos exactos de registros de negocio. Las estadísticas pueden quedar desactualizadas entre operaciones; las fechas de autoanálisis de proveedor/encuestas observadas son de agosto y no se forzó su actualización en esta revisión. Los nueve índices observados estaban indisvalid=true e indisready=true. Los contadores idx_scan son acumulados y no se usan para declarar un índice prescindible: no se verificó una ventana de observación representativa ni su historial de resets.

No conviene añadir otro índice simple sobre satisfaction_survey.ticket_id o provider_satisfaction_survey.provider_ticket_id: sus UNIQUE ya proporcionan ese acceso. Las FK inspeccionadas están validadas; eso no implica un índice de consulta sobre cada columna referente. El script histórico src/scripts/migrate-status-history.sql declara idx_status_history_ticket e idx_status_history_changed_at, pero ninguno existe en el catálogo consultado. No se asumió que los scripts antiguos se ejecutaran ni se intentó aplicarlos.

## Planes actuales

Los parámetros de EXPLAIN fueron constantes ficticias (área/proveedor numéricos y agente ficticio); no se extrajeron IDs personales. Se revisó la forma de consulta usada por el código y el orden de proveedores previsto: CASE WHEN status='cerrado' THEN 1 ELSE 0 END, created_at DESC, id DESC.

| Forma de consulta | Operación dominante elegida | Coste total estimado del nodo raíz |
|---|---|---:|
| Proveedores: área, primera página | Seq Scan + Sort + Limit | 8,48 |
| Proveedores: área y estado | Seq Scan + Sort + Limit | 7,52 |
| Proveedores: área y proveedor | Seq Scan + Sort + Limit | 7,03 |
| Proveedores: área/proveedor/estado, OFFSET 25 | Seq Scan + Sort + Limit | 7,18 |
| Proveedores: conteo con tres filtros | Seq Scan + Aggregate | 7,17 |
| Cohorte resuelta: área y rango de cierre | Seq Scan | 61,98 |
| Cohorte resuelta: área/agente/rango | Seq Scan | 62,98 |
| Encuestas: cohorte/área y orden de respuesta | Hash Join + Sort + Limit | 69,94 |
| Historial de un ticket por fecha/ID | Seq Scan + Sort | 27,47 |
| Ventana de historial para un área | Hash Join + Sort + WindowAgg | 144,14 |

Los costes son unidades del planificador, **no milisegundos ni latencias observadas**. No se ejecutó EXPLAIN ANALYZE, no se compararon planes después de construir índices y no se generaron estadísticas sintéticas en producción. Con tablas pequeñas, un Seq Scan puede ser una elección razonable; estos planes no demuestran una urgencia para crear índices ni un defecto por sí solos.

## Tres candidatos mínimos

1. **provider_ticket_area_order_idx** sobre (attention_area_id, expresión de cerrado al final, created_at DESC, id DESC). Coincide con el acceso por área y el orden de la nueva tabla, incluido el desempate. Provider/status quedarían como filtros adicionales; no se afirma que este único índice optimice por igual las cuatro combinaciones ni todos los conteos. Un segundo índice que adelante provider_id se pospone hasta medir consultas selectivas por proveedor; adelantarlo perjudicaría el orden cuando no se filtra ese campo.
2. **ticket_area_status_closed_idx** sobre (attention_area_id, status, closed_at). Orientado a las cohortes por área/estado/rango de cierre, actualmente sin acceso compuesto. assigned_to_id seguiría como filtro adicional y una consulta global sin área no tiene el mismo patrón de prefijo. No se propone además un índice de agente ni uno por cada variante sin una muestra de uso. Se elige índice completo como candidato base, evitando depender de que un plan genérico pueda probar el predicado parcial status='resolved' cuando el estado llega como parámetro.
3. **ticket_status_history_ticket_time_idx** sobre (ticket_id, changed_at, id). Alinea la búsqueda y orden de historial por ticket con el desempate utilizado por las métricas. Su prefijo también cubre accesos por ticket_id; no se añade simultáneamente otro índice simple del mismo prefijo. Las métricas globales de todo el historial pueden seguir prefiriendo un escaneo/ordenación, por lo que no se promete acelerar toda ventana analítica.

Son candidatos de primera iteración, no una orden de aplicarlos. Cada índice añade almacenamiento/WAL y mantenimiento en inserciones/actualizaciones; status, closed_at y el estado del proveedor cambian durante el flujo y pasarían a mantener sus índices. El tamaño actual pequeño y la falta de una medición de latencia dejan la aplicación como decisión operativa posterior. No se proponen aquí índices de encuestas por área/fecha, coberturas INCLUDE, índices parciales adicionales ni índices individuales de todas las FK.

## Aplicación futura y comprobaciones

Antes de una aplicación autorizada se debe revisar otra vez catálogo/definiciones, tamaño, planes de consultas reales y carga. La propuesta usa CREATE INDEX CONCURRENTLY IF NOT EXISTS, uno por vez, **fuera de una transacción**. IF NOT EXISTS solo evita la colisión de nombre; no demuestra igualdad de definición ni validez de un índice ya existente. No se debe omitir la comprobación de pg_get_indexdef, indisvalid e indisready antes/después.

La construcción concurrente reduce el bloqueo de escrituras ordinarias, pero tiene coste de CPU/I/O, puede esperar transacciones y un fallo puede dejar un índice inválido. Si ocurre, se detiene y se evalúa su estado; esta propuesta no incluye un DROP o reconstrucción automáticos. No se ejecutan cambios de índices como verificación de código ni por el permiso de merge/despliegue de esta rama.

Tras una aplicación separada, registrar definición/validez, volver a EXPLAIN sin ANALYZE las mismas formas y observar carga/latencias reales antes de ampliar la lista. La definición de Drizzle deberá sincronizarse en esa misma entrega operativa, para evitar divergencia entre catálogo y esquema declarativo; este bloque no altera src/db/schema.ts ni presenta índices no aplicados como existentes.

Referencias primarias consultadas: [CREATE INDEX y construcción concurrente](https://www.postgresql.org/docs/current/sql-createindex.html), [índices multicolumna](https://www.postgresql.org/docs/current/indexes-multicolumn.html), [índices parciales y parámetros](https://www.postgresql.org/docs/current/indexes-partial.html). Los candidatos son inferencias a partir del código y del catálogo observado; su beneficio no fue medido.

## Aplicación posterior autorizada

Después de esta revisión, el usuario autorizó expresamente optimizar los índices durante una ventana sin usuarios. Los tres candidatos se crearon y verificaron; la [aplicación aditiva](2026-10-30-aplicacion-indices.md) registra la migración manual, catálogo, tamaños, planes y declaración de Drizzle sincronizada. El texto anterior conserva el resultado de la revisión previa, cuando todavía no estaban aplicados.

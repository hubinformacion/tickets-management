# Aplicación aditiva de índices autorizada

## Autorización y resultado

Después de revisar costes y alternativas, el usuario autorizó expresamente optimizar índices de producción y comunicó una ventana sin usuarios. Se aplicaron los tres candidatos mínimos de la revisión. No se ejecutaron DROP, REINDEX, ALTER de columnas/constraints, DML, backfills, ANALYZE ni operaciones sobre Gmail/Drive/worker.

Se verificó el destino esperado, la identidad de la base y el catálogo antes de operar. La operación utilizó una sesión directa de la misma base (mismo destino lógico y credenciales, sin cambiar variables de entorno), para mantener los timeouts de sesión fuera del pooler. Se configuraron lock_timeout=5s y statement_timeout=120s. No había construcciones concurrentes activas en las tres tablas y todos sus índices previos eran válidos/listos.

Cada CREATE INDEX CONCURRENTLY se ejecutó por separado, sin BEGIN/COMMIT alrededor del DDL. Antes de aplicar se comprobó que el SQL operativo coincidía con la [migración manual](../migrations/2026-10-30-aplicar-indices-consultas.sql), SHA-256 `6ee44040f07f02231577a43161755d2beff9b416e3800bf4caa196259d2c2da3`. La build y el despliegue no ejecutan esa migración.

| Índice | Definición de claves | Tamaño observado |
|---|---|---:|
| provider_ticket_area_order_idx | attention_area_id, CASE cerrado al final, created_at DESC, id DESC | 16 KiB |
| ticket_area_status_closed_idx | attention_area_id, status, closed_at | 32 KiB |
| ticket_status_history_ticket_time_idx | ticket_id, changed_at, id | 64 KiB |

Los tres quedaron indisvalid=true e indisready=true, no únicos y sin predicado parcial. Se comprobaron tabla, número de claves, expresión/orden y definición. Todos los índices previos de esas tablas conservaron su definición. El tamaño total observado de los tres nuevos es 114.688 bytes (112 KiB); crecerá con sus datos y no representa una cuota ni una estimación del consumo total de la base.

La declaración de Drizzle se sincronizó con los tres índices, incluidos orden/expresión y creación concurrente. No se declara ningún índice como aplicado solo por figurar en un script. La propuesta comentada original se conserva como registro histórico de la revisión previa.

## Planes y validación

Se planificaron cuatro variantes antes y después con EXPLAIN (FORMAT JSON) sin ANALYZE, en transacciones READ ONLY: página de proveedores, proveedor/estado, cohorte resuelta por área/cierre e historial por ticket. Parámetros ficticios; no se seleccionaron filas de negocio para medir resultados/latencia.

| Consulta | Plan anterior | Plan posterior |
|---|---|---|
| Página de proveedores | Seq Scan + Sort + Limit | Seq Scan + Sort + Limit |
| Proveedor/estado | Seq Scan + Sort + Limit | Seq Scan + Sort + Limit |
| Cohorte resuelta por área/cierre | Seq Scan | Seq Scan |
| Historial por ticket | Seq Scan + Sort | Bitmap Index Scan del nuevo índice + Bitmap Heap Scan + Sort |

Los escaneos restantes son razonables con tablas pequeñas. No se desactivó enable_seqscan ni se forzó un plan. El uso del índice en un plan no mide latencia real. Los índices quedan disponibles para esos accesos al crecer el volumen, pero no se promete aceleración de todas las variantes o ventanas globales.

TypeScript sin emisión, ESLint sin advertencias y build local completo aprobaron con los índices declarados, incluidas 23 páginas. La validación de código se ejecutó en copias sin archivos de entorno, variables ficticias y fuentes/dependencias de solo lectura; no se usó la aplicación para escribir fixtures en producción. No se añadieron tests al proyecto.

## Operación y siguientes pasos

Esta aplicación de DDL fue una operación de producción autorizada, no una prueba ni consecuencia automática de aprobar un merge. Los datos históricos permanecen intactos. No se recrearon tablas ni se alteraron índices PK/UNIQUE. La construcción añade almacenamiento y mantenimiento en escrituras; no supone CPU permanentemente ocupada.

Pendientes: observación representativa de uso/latencias y tamaño, planes con volumen real y ajustes selectivos si se justifican. No se añaden índices de todas las FK, de cada combinación de filtros o duplicados de UNIQUE. La paginación de proveedores se publica junto con esta sincronización; la búsqueda remota del selector vinculado y otros listados siguen separados. El material temporal de operación y validación se retira tras registrar el resultado.

## Publicación

La declaración sincronizada se integró con la paginación de proveedores en `d214f41`. Production `7450399708` aprobada y SHA público completo confirmado; la build no volvió a ejecutar el SQL manual. Se eliminó la rama integrada tras comprobar igualdad con main.

# Coordinación de adjuntos pendientes

## Alcance

Rama local `fix/coordinacion-adjuntos`. Corrige la carrera entre cancelar una carga pendiente y vincularla durante la creación de un ticket o al añadir archivos a uno existente. El [diseño](../plans/2026-10-28-coordinacion-adjuntos-design.md) conserva referencias y registra una intención antes de llamar a Drive.

La vinculación y la cancelación bloquean la misma fila. La vinculación consulta las intenciones en una sentencia posterior al bloqueo, con aislamiento READ COMMITTED explícito en sus transacciones. Una cancelación confirmada o incierta impide vincular ese archivo; una vinculación confirmada impide cancelar la carga como pendiente. Los adjuntos cancelados conservan su fila y el registro operativo, sin aparecer entre los archivos de un ticket.

También se bloquea y relee el ticket antes de validar permisos, área y estado para adjuntar a un ticket existente. La creación mantiene juntos código, ticket, historial y archivos.

## Esquema autorizado

El usuario confirmó snapshot y autorizó cambios aditivos sin operaciones destructivas. Se aplicó [la tabla independiente `attachment_revert`](../migrations/2026-10-28-attachment-reverts.sql), SHA-256 `34fdf22bd4648e5c76dce04bd64ed819160b421265cd49f152a42239fa3b9a80`, con 10 columnas, 2 índices, 5 constraints y 0 filas después de crearla. No añade columnas a tablas existentes ni ejecuta backfills.

La conexión exigió el destino Neon configurado y TLS `verify-full`. La migración usa transacción, lock timeout de 3 segundos y statement timeout de 30 segundos. La comprobación posterior se hizo en READ ONLY. No se ejecutaron reset, drop, seed, setup o db:push ni se eliminaron registros históricos. No se probó restauración del snapshot de forma independiente.

## Verificación

123 aserciones temporales con datos ficticios: ambos órdenes de vinculación/cancelación, espera por reserva no confirmada, doble cancelación, idempotencia, otro usuario, archivo ya vinculado, fallo de Drive/404, fallo de registrar intención, confirmación incierta y recuperación tras vencer reserva. Se comprueban parámetros y guards del SQL, integración en creación, permisos/estado cerrado y contrato HTTP de cancelación.

TypeScript aprobado con `tsc --noEmit --incremental false`; ESLint aprobado con 0 errores y las tres advertencias conocidas. Se planificaron 7 consultas compiladas por Drizzle mediante EXPLAIN sin ANALYZE en una transacción READ ONLY de PostgreSQL. No se ejecutaron sus INSERT/UPDATE ni se subieron o borraron archivos reales.

Los verificadores temporales se ejecutaron sin red ni credenciales, con fuentes/dependencias de solo lectura y límites de recursos. Se eliminan copias y scripts al terminar y no se incorpora framework de tests. La simulación de carreras no certifica concurrencia real de PostgreSQL.

Build local completo aprobado con Next.js 16.4.3/Turbopack: compilación, TypeScript, generación de las 23 páginas estáticas y optimización. Se usaron variables ficticias, sin archivos ni credenciales de producción; fuentes y dependencias de solo lectura y copia de trabajo en scratch temporal. Para descargar Inter se habilitó HTTPS con certificados públicos y proxies sin credenciales, a diferencia de los fixtures con red deshabilitada.

El proceso local limitó CPU/afinidad a dos núcleos, heap de Node a 3 GiB, DATA a 4 GiB por proceso, espacio virtual a 64 GiB, procesos a 256 y scratch a 1,5 GiB. `--disable-wasm-trap-handler` evitó reservas virtuales de Wasm bajo el límite; `CIRCLE_NODE_TOTAL=3` y `UV_THREADPOOL_SIZE=2` limitaron los trabajadores sin modificar `next.config.ts`, package.json ni producción. Los intentos anteriores con Webpack/fuentes simuladas no se presentan como builds aprobados. Se eliminaron fuentes descargadas, copias y resultados temporales.

Por petición del usuario, la rama de trabajo es local y no genera Preview. El código y la documentación acumulada se publican juntos desde main en un único despliegue. La confirmación final queda en el estado de deployment asociado al commit y en el registro de cierre, que se agrupa con el siguiente bloque para evitar desplegar solo documentación.

## Límites pendientes

La recuperación de una cancelación es manual: reserva vigente devuelve 409; fallo de Drive devuelve 502 conservando referencia e intención. Drive tiene timeout/señal de 20 segundos en esta operación, sin reintento automático del SDK; OAuth y el acceso a PostgreSQL no comparten ese límite global. La ruta limita su duración a 60 segundos y la reserva dura cinco minutos.

Un 404 de Drive no se convierte automáticamente en éxito porque puede representar falta de acceso. Los estados inciertos requieren reconciliación posterior; nunca se reutiliza esa referencia para vincularla a un ticket.

Quedan cuotas globales/cantidad y reservas antes del upload, uploads que terminan después de enviar el formulario, persistencia incierta en altas, reconciliación y huérfanos. El borrado explícito de archivos ya vinculados conserva su flujo actual y requiere una revisión separada. No se incorporó limpieza automática.

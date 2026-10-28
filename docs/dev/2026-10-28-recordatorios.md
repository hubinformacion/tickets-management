# Recordatorios recuperables de encuesta

## Estado

Preparado en `fix/recordatorios-recuperables`, sobre la producción `a606073`. La tabla adicional está aplicada con autorización específica del usuario y snapshot confirmado el 28 de octubre. El código de activación `3a598b7` está integrado en `main` y desplegado en producción, con modo `queue`, corte fijo y tabla disponible comprobados mediante la ruta autenticada de estado. El usuario confirmó **solo cierres nuevos desde la activación**, sin recuperar tickets antiguos.

El [diseño y procedimiento de activación](../plans/2026-10-28-recordatorios-design.md) detalla flujo, alternativas, límites y rollback operativo. La [propuesta SQL aditiva](../migrations/2026-10-28-survey-reminders.sql) creó exclusivamente una tabla vacía e índices propios. El usuario autorizó añadir tablas sin eliminar existentes y confirmó su snapshot antes de aplicarse. Se verificaron 13 columnas, 4 índices, 6 constraints y 0 filas operativas, sin escrituras sobre datos de negocio. La restauración del snapshot no se probó de forma independiente.

El cron diario actual usa una ventana heredada de 23–25 horas; el código nuevo permite seleccionar pendientes desde las 48 horas del cierre efectivo. El código de activación usa `queue` por defecto en producción y el corte fijo `2026-10-28T17:00:00Z` (12:00 de Lima). Preview y desarrollo conservan el modo anterior por defecto; existen overrides explícitos. La ruta autenticada `/api/cron/survey-reminder/status` permite comprobar el resultado real sin ejecutar envíos.

## Comprobaciones

165 aserciones temporales con datos ficticios: configuración de modos/corte UTC, worker con fallos y reservas vencidas, dos ejecuciones simuladas, límites de lote/tiempo, fallo de confirmación después de Gmail, SQL parametrizado compilado por el Drizzle instalado, guards de tokens, destinatarios/hilo, fecha de Lima, cancelación/timeout y opciones de Gmail, autenticación del cron y rechazo de configuración inválida sin fallback, valores predeterminados por entorno y consulta de estado sin worker.

TypeScript aprobado con `tsc --noEmit --incremental false`; ESLint aprobado con 0 errores y las 3 advertencias conocidas. No se añade framework ni archivos de tests al repositorio.

Vercel aprobó la [Preview del código `28acfef`](https://vercel.com/hub-de-informacions-projects/requerimientos-hub/BoU7cUc57w6ZNdJYBWaoPdqEoNf1). Es evidencia del código inicial; la activación posterior y su despliegue se registran por separado.

Las comprobaciones usan fuentes/dependencias de solo lectura, entorno ficticio, red aislada y límites de CPU/memoria/procesos/archivos/scratch. Los verificadores y copias temporales se eliminan al terminar. Los fixtures no cargaron el cliente real de BD ni enviaron correos. Tras la autorización, se aplicó únicamente el SQL aditivo revisado con límites de lock/statement y transacción. También se planificaron 11 consultas compiladas por Drizzle mediante EXPLAIN sin ANALYZE en una transacción READ ONLY de PostgreSQL, sin ejecutar sus INSERT/UPDATE. Se validó sintaxis, tipos y referencias contra el esquema real; no se certifica concurrencia real ni entrega de Gmail.

## Limitaciones operativas

- El cron sigue siendo diario a las 08:00 de Lima; el plazo de 48 horas habilita el envío, no fija su hora exacta. Backlog, fallos o el límite del lote pueden posponerlo.
- Gmail y PostgreSQL no comparten transacción. Una confirmación perdida después de aceptar el correo puede ocasionar un duplicado posterior. El diseño conserva ese límite explícito.
- La comprobación antes de Gmail reduce el envío a tickets reabiertos o ya evaluados, pero no bloquea al usuario durante la llamada de red.
- Quedan pendientes integración real Gmail/OAuth, concurrencia de PG y observación del cron durante 48–72 horas. La tabla fue aplicada; no se añadieron datos de prueba.

## Registro de la migración autorizada

Se aplicó únicamente `docs/migrations/2026-10-28-survey-reminders.sql`, SHA-256 `b9d98f588817d911ef4d415e20bfc8c80b238e6cffbad8baed445d5f84224d7d`. La conexión exigió el destino Neon configurado del proyecto y TLS `verify-full`. La transacción limitó la espera por locks a 3 segundos y cada sentencia a 30 segundos. No se ejecutaron reset, drop, seed, setup, db:push, backfills ni cambios de datos históricos.

La [Preview de activación `3a598b7`](https://vercel.com/hub-de-informacions-projects/requerimientos-hub/EUt596JKsDbCvDi76L818zx7FpFz) fue aprobada antes del merge. La hora de corte permanece fija para despliegues futuros; no se usa la hora de ejecución del cron.

## Producción y comprobación final

La [Production de `3a598b7`](https://vercel.com/hub-de-informacions-projects/requerimientos-hub/38LMqVyKMMdtEVeDE5S8r7f8bALg) fue aprobada por Vercel (registro de GitHub `7391867560`). El endpoint autenticado independiente de estado respondió 200 con `mode=queue`, `startAt=2026-10-28T17:00:00.000Z`, `queueReady=true` y el SHA exacto `3a598b794e68554342a7ca2dbd2d3003318dd60a`.

Comprobaciones públicas: login 200, sesión anónima 200/null, dashboard 307 a login y estado del cron sin credencial 401. No se invocó el worker, se reservaron trabajos ni se enviaron correos de prueba a usuarios.

Se incluyen exclusivamente cierres desde el **28 de octubre de 2026 a las 12:00 de Lima**. El cron existente conserva las 08:00 de Lima para recordatorios y las 19:00 para cierre automático. La elegibilidad del recordatorio comienza 48 horas después del cierre efectivo, manual o automático; el procesamiento sucede en el primer cron posterior con capacidad disponible. No se recuperan cierres anteriores al corte.

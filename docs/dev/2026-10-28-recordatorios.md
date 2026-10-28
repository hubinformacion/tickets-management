# Recordatorios recuperables de encuesta

## Estado

Preparado en `fix/recordatorios-recuperables`, sobre la producción `a606073`. La tabla adicional está aplicada con autorización específica del usuario y snapshot confirmado. El código de activación está pendiente de merge y despliegue. El usuario confirmó **solo cierres nuevos desde la activación**, sin recuperar tickets antiguos.

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
- Quedan pendientes publicación y comprobación del modo/corte efectivos, integración real Gmail/OAuth, concurrencia de PG y observación del cron durante 48–72 horas. La tabla fue aplicada; no se añadieron datos de prueba.

# Recordatorios recuperables de encuesta

## Estado

Preparado en `fix/recordatorios-recuperables`, sobre la producción `a606073`. Pendiente de merge, despliegue y activación. El usuario confirmó **solo cierres nuevos desde la activación**, sin recuperar tickets antiguos.

El [diseño y procedimiento de activación](../plans/2026-10-28-recordatorios-design.md) detalla flujo, alternativas, límites y rollback operativo. La [propuesta SQL aditiva](../migrations/2026-10-28-survey-reminders.sql) solo crea una tabla vacía e índices propios; no se ha ejecutado. Requiere respaldo recuperable y autorización específica antes de aplicarse a producción.

El cron diario actual usa una ventana heredada de 23–25 horas; el código nuevo permite seleccionar pendientes desde las 48 horas del cierre efectivo. El modo predeterminado conserva el flujo anterior hasta activar explícitamente la cola. No presentar la corrección como activa por haber desplegado código.

## Comprobaciones

151 aserciones temporales con datos ficticios: configuración de modos/corte UTC, worker con fallos y reservas vencidas, dos ejecuciones simuladas, límites de lote/tiempo, fallo de confirmación después de Gmail, SQL parametrizado compilado por el Drizzle instalado, guards de tokens, destinatarios/hilo, fecha de Lima, cancelación/timeout y opciones de Gmail, autenticación del cron y rechazo de configuración inválida sin fallback.

TypeScript aprobado con `tsc --noEmit --incremental false`; ESLint aprobado con 0 errores y las 3 advertencias conocidas. No se añade framework ni archivos de tests al repositorio.

Las comprobaciones usan fuentes/dependencias de solo lectura, entorno ficticio, red aislada y límites de CPU/memoria/procesos/archivos/scratch. Los verificadores y copias temporales se eliminan al terminar. No se cargó el cliente real de BD, ejecutó SQL contra un motor ni enviaron correos reales. La comprobación de migración fue estática; no se certifica su aplicación real ni la concurrencia real de PostgreSQL.

## Limitaciones operativas

- El cron sigue siendo diario a las 08:00 de Lima; el plazo de 48 horas habilita el envío, no fija su hora exacta. Backlog, fallos o el límite del lote pueden posponerlo.
- Gmail y PostgreSQL no comparten transacción. Una confirmación perdida después de aceptar el correo puede ocasionar un duplicado posterior. El diseño conserva ese límite explícito.
- La comprobación antes de Gmail reduce el envío a tickets reabiertos o ya evaluados, pero no bloquea al usuario durante la llamada de red.
- Quedan pendientes respaldo/compatibilidad, autorización de esquema, aplicación de la tabla, activación con corte fijo, integración real Gmail/OAuth/PG y observación del cron.

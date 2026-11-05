# Cierre automático y recordatorios sin fines de semana

## Alcance y regla aprobada

El usuario decidió omitir los recorridos reales pendientes de aceptación y atender incidencias reportadas. No se presentan como aprobados; las comprobaciones técnicas locales del repositorio se conservan. La nueva regla fue confirmada con este ejemplo: un ticket cerrado el lunes a las 18:00 completa el plazo el miércoles a las 18:00 y su recordatorio espera al jueves desde las 09:00 de Lima.

Ambos plazos duran 48 horas completas excluyendo sábados y domingos de America/Lima. Cuentan las noches de lunes a viernes; no se aplica el horario de SLA de los agentes, jornadas por usuario ni feriados. La primera etapa empieza en validationRequestedAt; el cierre automático ocurre en la primera ejecución habilitada después de cumplir el plazo y conserva su historial transaccional. La segunda empieza en el closedAt efectivo, tanto manual como automático, y exige que el ticket siga resuelto, el solicitante activo, sin encuesta ni recordatorio enviado.

El cambio queda en `fix/recordatorios-dias-laborables`, rama local pendiente de aprobación de merge/despliegue. [Plan](../plans/2026-11-05-recordatorios-dias-laborables-plan.md). Producción verificada al cierre anterior en `972e73d`, Production 7575926580, con reportes por lotes y protección del panel para cuentas inactivas integrados; su rama se eliminó.

## Implementación

Un helper de fecha calcula el cutoff inverso de 48 horas contando únicamente intervalos de lunes a viernes en Lima. Conserva hora/minuto/segundo/milisegundo y trata medianoche como final del día anterior. Así las consultas pueden comparar por fecha con parámetros, sin cargar todos los tickets para calcular plazos en JavaScript. La comparación es inclusiva al completar las 48 horas. Se reutilizan Day.js y la zona ya existentes.

El cierre conserva el UPDATE condicional por estado/fecha, closedAt efectivo y el historial en la misma transacción. Una invocación en fin de semana devuelve cero sin tocar BD. La elegibilidad de enqueue, claim y load de recordatorios utiliza el mismo cutoff, convertido a UTC explícitamente para los timestamps históricos sin zona de PostgreSQL. Conserva el corte fijo de activación 2026-10-28T17:00:00Z, los registros operativos, reintentos y reservas. Cambiar el calendario no reinicia la activación ni recupera cierres anteriores a ese corte.

El endpoint de recordatorios y el worker comprueban lunes–viernes desde las 09:00, incluso en invocaciones fuera del cron. El worker revalida antes de reclamar y de iniciar el envío; si después de cargar cruza al sábado, devuelve la reserva a pendiente sin enviar. El flujo legacy compatible también usa el plazo/corte fijo y comprueba la ventana inmediatamente antes del correo; no conserva la ventana estrecha de 23–25 horas ni envía a solicitantes inactivos. Producción continúa usando queue; no se cambia configuración de entorno.

El correo de solicitud de validación aclara que los sábados y domingos no cuentan. No se modifica el estado o el historial de tickets ya cerrados ni los correos ya enviados. Al activarse, los tickets pendientes y entregas no enviadas pasan a usar el nuevo cálculo; los trabajos que aún no cumplan el nuevo plazo pueden quedar cancelados operativamente y reactivarse por el mecanismo existente cuando sean elegibles, sin perder referencias.

## Programación gratuita

- Cierre automático: `0 0 * * 2-6` UTC, equivalente a lunes–viernes desde las 19:00 de Lima. Se conserva la franja de la tarde y se excluyen las tardes del fin de semana; usar 1-5 en UTC a medianoche sería incorrecto para Lima.
- Recordatorios: `0 14 * * 1-5` UTC, lunes–viernes desde las 09:00 de Lima. No se adelantan las 48 horas para incluir un ticket en la mañana del segundo día.

Vercel Hobby permite ejecución diaria y no garantiza el minuto exacto; puede invocar dentro de la hora programada. Se conserva el alojamiento gratuito sin cron externo ni nuevas dependencias. [Documentación de límites](https://vercel.com/docs/cron-jobs/usage-and-pricing) y [zona UTC](https://vercel.com/docs/cron-jobs). Context7 consultado también para Day.js startOf/tz y aritmética de fechas.

## Verificación técnica local

TypeScript estricto sin incremental, ESLint completo sin advertencias y build de producción aprobados (exit 0), con copia sin archivos .env, valores ficticios y dependencias existentes de solo lectura. No hubo instalaciones ni cambios de lockfile. La conexión de red del build se limita al entorno sin credenciales para obtener fuentes públicas; las comprobaciones de comportamiento se ejecutaron sin red.

Comprobación efímera con módulos reales transpilados y reloj/BD/correo ficticios, entorno sin secretos y red aislada: ejemplos entre semana y cruzando fin de semana, medianoche de lunes/miércoles, cambio de año y milisegundos; comparación con referencia independiente para 56 fechas/horas. Guardas a las 08:59:59/09:00 de Lima, sábado/domingo y desfase de día UTC comprobadas.

Endpoint de cierre fuera de semana no abre transacción; autenticación del cron sigue siendo obligatoria. SQL y parámetros reales de elegibilidad en enqueue/claim/load incluyen el mismo cutoff y corte fijo, conservan encuesta ausente y solicitante activo. Worker fuera de ventana no toca store ni correo; reserva/carga que cruza al sábado se devuelve a pendiente sin enviar. Legacy que inicia viernes 23:59:59 y termina consultas el sábado tampoco envía. El cron UTC se contrastó con la regla local.

Revisión independiente detectó la falta de revalidación justo antes de enviar en legacy; se corrigió y se verificó ese caso. No hay otros bloqueantes reportados. No se ejecutaron workers o crons reales, correos, mutaciones ni migraciones en producción. Sin suite/frameworks de tests persistentes. El material temporal se elimina al terminar.

## Límites

La frecuencia diaria implica que un plazo cumplido después del cron espera al siguiente día hábil. Los reintentos quedan pendientes hasta otra ejecución habilitada; sus demoras son mínimos, no una promesa de otro envío a los 15 minutos con este plan. El límite existente de 20 reservas/25 segundos por ejecución se mantiene, por lo que un exceso de pendientes puede requerir días posteriores. No se ha medido volumen real como parte de este cambio.

Las guardas evitan iniciar un correo fuera de la ventana. Un envío ya iniciado antes de medianoche puede ser aceptado después por Gmail; no se promete controlar el instante de entrega del proveedor. El cierre automático mantiene su ejecución diaria de tarde, por lo que el closedAt real puede ser posterior a las 48 horas cumplidas. Las nuevas 48 horas de encuesta parten de ese cierre real.

Sin tablas, índices, cuotas, nuevas herramientas/servicios, cambios de permisos Drive, reset/drop/seed, backfills o reescritura de historia. La aprobación actual cubre implementar la regla; el merge y despliegue de esta rama siguen pendientes de autorización.

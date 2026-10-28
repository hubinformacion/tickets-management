# Recordatorio de encuesta después de 48 horas

## Decisiones y alcance aprobado

Continúa el bloque de recordatorios del plan de estabilización. El usuario confirmó que solo deben incluirse **cierres nuevos desde la activación**, sin recuperar tickets antiguos. Se conserva un recordatorio por ticket durante toda su vida, según `surveyReminderSentAt`, y la encuesta única existente.

El instante de referencia es `ticket.closedAt`, tanto en un cierre manual como automático. Las 48 horas para cerrar automáticamente desde una solicitud de validación son otro plazo independiente. Un ticket debe seguir resuelto, con área, creador activo y sin encuesta ni recordatorio enviado.

## Alternativas

- Ampliar la consulta a todos los vencidos elimina la ventana estrecha, pero no coordina instancias ni conserva reservas tras una caída.
- Una cola en una tabla independiente permite reserva, reintento y auditoría sin modificar las columnas de los tickets existentes. Es el enfoque elegido en el plan aprobado.
- Un proveedor de colas externo añade infraestructura y configuración, innecesarias para el volumen actual.

## Flujo

1. El cron existente sigue ejecutándose diariamente a las 08:00 de Lima. No se cambia su frecuencia.
2. En modo `queue`, una fecha UTC fija de activación limita los cierres elegibles. Se añaden como máximo 100 eventos vencidos pendientes por ejecución; la clave única es ticket/cierre exacto.
3. Se reservan mensajes de uno en uno mediante `FOR UPDATE SKIP LOCKED` y un token UUID. La reserva dura cinco minutos; un índice único impide dos reservas por ticket. Hasta 20 mensajes y un presupuesto de 25 segundos para iniciar trabajo nuevo.
4. Antes de Gmail se vuelve a comprobar el estado, el cierre exacto, el plazo y la ausencia de encuesta/envío previo. No se mantienen transacciones abiertas durante llamadas de red.
5. Solo una respuesta de éxito de Gmail permite confirmar el trabajo y la marca existente del ticket en una transacción. No se modifica su `updatedAt` ni se crea historia artificial de negocio.
6. Ante un fallo de envío se conserva el pendiente con espera exponencial desde 15 minutos hasta 24 horas. La ejecución real del reintento ocurre en el siguiente cron diario elegible. Una reserva vencida puede retomarse tras una interrupción.

Los eventos invalidados se cancelan sin eliminarlos; si el mismo evento vuelve a ser elegible, se reactiva su pendiente. Las marcas de envío anteriores se conservan. Los agentes inactivos no reciben copia; se mantiene el destinatario creador y el hilo existente.

## Compatibilidad y límites

La tabla adicional no tiene FK hacia tickets deliberadamente: conserva evidencia operativa y no cambia las acciones existentes de eliminación. No se añaden columnas ni relaciones a los modelos de negocio. El código puede desplegarse antes de crear la tabla porque solo la consulta con `SURVEY_REMINDER_MODE=queue`.

Después de la autorización específica y de crear la tabla, producción en Vercel usa `queue` por defecto con el corte UTC fijo `2026-10-28T17:00:00Z` (28 de octubre, 12:00 de Lima), versionado en `production-rollout.ts`. Desarrollo y Preview conservan `legacy` por defecto; los overrides explícitos siguen disponibles. La activación no depende de introducir variables en el panel de Vercel. `paused` detiene únicamente los recordatorios, sin consultar la cola. Configuración de cola inválida o tabla ausente producen 503, sin recurrir al comportamiento anterior.

Con ejecución diaria, un cierre pasa a ser elegible a las 48 horas y se procesa en la primera ejecución posterior, normalmente entre 48 y 72 horas; fallos, capacidad o retrasos del cron pueden ampliarlo. Los límites actuales son conservadores y deberán ajustarse con volumen real. No se promete entrega exactamente a la hora 48.

Gmail y PostgreSQL no comparten transacción. Si Gmail acepta el mensaje pero se pierde su confirmación o el proceso cae antes del commit, puede existir un duplicado posterior. La reserva evita carreras normales, no garantiza entrega única absoluta. Una encuesta/reapertura ocurrida después de la última comprobación puede coincidir con un envío ya iniciado.

Las peticiones de Gmail del worker reciben señal de cancelación y timeout de 20 segundos, sin reintento automático de Gaxios ni consulta de metadata posterior al envío. El presupuesto no es un límite global de la autenticación OAuth o de PostgreSQL; la plataforma limita la función a 60 segundos y la reserva permite recuperación. Los otros correos conservan su contrato. La plantilla presenta la fecha de cierre en Lima.

## Procedimiento de activación y autorización

La [propuesta SQL](../migrations/2026-10-28-survey-reminders.sql) solo crea una tabla vacía, sus constraints e índices propios. No es un script automático de despliegue. No contiene ALTER, backfill, borrado, seed o cambios sobre tablas existentes. El usuario confirmó snapshot y autorizó expresamente añadir tablas/datos sin eliminar existentes; esta propuesta se aplicó el 28 de octubre antes de publicar el código.

Procedimiento seguido y controles de operación:

1. Confirmar respaldo recuperable y compatibilidad del esquema/destino; obtener autorización específica para esta propuesta SQL. El permiso de merge/despliegue no la incluye.
2. Aplicar exclusivamente la propuesta revisada, mediante el procedimiento operativo autorizado. No usar `db:push`, `setup` ni migraciones automáticas como atajo.
3. Publicar la configuración de producción versionada con el corte `2026-10-28T17:00:00Z`. Las variables `SURVEY_REMINDER_MODE` y `SURVEY_REMINDER_START_AT` permiten un override explícito; confirmar su resultado efectivo en la ruta de estado. No mover el corte en despliegues posteriores.
4. Coordinar la activación fuera de una ejecución legacy en curso. Si se pausa el servicio mientras se prepara el cambio, usar `paused`, que no detiene el cierre automático de tickets.
5. Observar cron, pendientes, reservas vencidas y errores durante 48–72 horas. No disparar envíos de prueba contra usuarios ni recuperar cierres anteriores al corte.

Para detener envíos después de activar, usar `paused` y conservar tabla, eventos, fecha de activación y marcas de envío. No revertir a `legacy` ni borrar la tabla como rollback. La reanudación usa la misma fecha fija; nunca mueve el corte hacia atrás sin una decisión explícita.

Quedan pendientes validación real de concurrencia en PostgreSQL, integración Gmail/OAuth y observación con volumen real. Los verificadores temporales no sustituyen estas comprobaciones.

## Referencias técnicas consultadas

La implementación se contrastó mediante Context7 con la [ejecución SQL de Drizzle](https://orm.drizzle.team/docs/sql), las [opciones por petición de Google APIs Node.js](https://github.com/googleapis/google-api-nodejs-client#request-options) y la [duración de funciones de Vercel](https://vercel.com/docs/functions/configuring-functions/duration). Se comprobaron además los tipos instalados de Gaxios/Google APIs para `timeout`, `signal` y `retry`.

## Comprobación de estado sin envíos

`GET /api/cron/survey-reminder/status` requiere el mismo Bearer `CRON_SECRET`. Devuelve modo, corte, disponibilidad de la tabla y SHA del despliegue. Solo consulta metadata; nunca reserva ni envía mensajes. Es una ruta independiente para evitar invocar accidentalmente el worker durante un despliegue. No forma parte de los cron configurados.

# Borradores de campaña puntual de encuestas históricas

**Alcance confirmado:** una campaña puntual, un correo por creador con su lista completa de tickets cerrados sin encuesta; conservar los recordatorios automáticos. Incluir cierres con 48 horas comprobadas sin fines de semana, aunque ya tuvieran recordatorio individual. Excluir siete cierres sin fecha y el cierre reciente; no reconstruir ni escribir historia. La consulta inicial de solo lectura encontró 158 tickets y 30 solicitantes activos.

**Entrega actual:** plantilla institucional y borradores locales revisables; no se envía correo ni se cambia ningún ticket/entrega. El envío real y su registro requieren una aprobación posterior del alcance concreto. No crear cron, endpoint, tabla, UI o servicio para preparar los borradores.

- Crear plantilla agrupada, con nombre escapado, cantidad y enlaces a código/título/área/fecha de cierre en Lima. Un correo se dirige solo al creador, sin CC/BCC ni threading de un ticket individual.
- Añadir script explícito de preparación, con argumentos validados antes de cargar configuración o conectar, consulta Drizzle en transacción READ ONLY/repeatable read, TLS verificado y timeouts. Agrupar por creador; sin corte de activación de octubre porque esta campaña histórica fue pedida expresamente.
- Generar HTML y manifest privados fuera del repositorio, permisos de directorio 0700/archivos 0600, sin credenciales y con indicador de borrador/no enviado. El cutoff explícito congela el plazo revisado; al enviar en otra etapa habrá que volver a comprobar estado/encuesta/usuario y evitar reenviar grupos ya procesados.
- Revisar plantilla y agrupación con datos ficticios, tipos y ESLint. Preparar borradores reales mediante la operación READ ONLY autorizada; comunicar solo totales y ruta del índice, sin publicar datos de personas en git/logs.

Aplicar Ponytail y la plantilla institucional existente. No Vercel Preview, CI, servicios de pago o pruebas de aceptación real nuevas. Branch local independiente `feat/recordatorio-historico-agrupado`. No extender esta preparación a la ejecución de una campaña de correo.

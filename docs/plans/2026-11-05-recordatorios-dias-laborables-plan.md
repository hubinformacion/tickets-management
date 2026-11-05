# Cierre automático y recordatorios sin fines de semana

> Ejecución inline con executing-plans y Ponytail; revisión independiente final. Sin suites/frameworks nuevos ni recorridos de aceptación, por instrucciones del proyecto y del usuario.

**Objetivo:** completar 48 horas excluyendo sábados y domingos de Lima en cada etapa. Las noches de lunes a viernes cuentan; no se usan horarios personales, SLA de agentes ni feriados.

**Diseño aprobado:** validación pendiente → 48 horas sin fines de semana → cierre automático efectivo; desde closedAt manual o automático → otras 48 horas sin fines de semana → siguiente ejecución de recordatorios desde las 09:00 de Lima, de lunes a viernes. Ejemplo: cierre lunes 18:00, cumple miércoles 18:00 y se envía jueves desde 09:00. El cierre automático conserva su franja de las 19:00 de Lima; en UTC su cron se limita a martes–sábado a las 00:00. Recordatorios lunes–viernes a las 14:00 UTC. El plan gratuito puede demorar la invocación dentro de la hora: no se promete minuto exacto.

- [x] Añadir un helper pequeño de fecha límite inversa y ventanas de ejecución, reutilizando Day.js/Lima. Retirar horas de sábados/domingo, preservar horas/minutos/milisegundos y consultar por cutoff parametrizado; no recorrer todos los tickets en JS.
- [x] Aplicarlo al cierre condicional/transaccional y a las tres consultas de elegibilidad de la cola; conservar permisos, encuesta ausente, corte fijo de activación y entregas/reintentos. Proteger endpoint y worker para que no envíen en fin de semana/antes de las 09:00, incluso si se invocan fuera del cron. Alinear el flujo legacy compatible para no dejar el cálculo anterior de 23–25 horas.
- [x] Ajustar vercel.json y texto del correo de validación. No reescribir fechas/cierres/envíos históricos, no resetear el corte de activación, no migrar tablas o crear servicios.
- [x] Comprobación local acotada de cálculo, guardas y SQL con valores ficticios; tipos, ESLint y build sin secretos. No ejecutar los crons reales ni enviar correos de prueba. Revisión final, documentación y commit local en rama independiente, pendiente de aprobación de merge/despliegue.

Las validaciones reales de aceptación anteriores se omiten por decisión del usuario y se atenderán reportes de incidencias. Las comprobaciones técnicas locales obligatorias del repositorio se conservan. Decisiones/resultado se registran en docs/dev/2026-11-05-recordatorios-dias-laborables.md.

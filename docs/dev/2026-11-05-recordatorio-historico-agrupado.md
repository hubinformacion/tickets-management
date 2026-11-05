# Preparación de correo agrupado para encuestas históricas

## Decisiones confirmadas

Campaña puntual independiente de los recordatorios automáticos. Un correo por creador de tickets, dirigido solo a esa persona, sin CC/BCC a agentes u observadores y sin incorporarlo al hilo de un ticket individual. Incluir tickets resueltos sin encuesta cuyo cierre haya completado las 48 horas sin fines de semana de Lima, incluso si recibieron antes un recordatorio individual. El usuario confirmó excluir siete cierres sin fecha registrada y un cierre que todavía no cumple el plazo.

El alcance observado por agregados fue de 166 tickets pendientes; la selección aprobada y preparada contiene **158 tickets para 30 solicitantes activos** (24 personas con más de un ticket; máximo 18 por persona). Cinco tickets incluidos ya tenían recordatorio individual, pero siguen sin encuesta. No se usa el corte de activación de octubre para esta campaña histórica expresamente solicitada; ese corte permanece intacto en los automáticos.

## Estado

Dependencias/calidad/rendimiento se integraron y publicaron en origin/main como `5d972be4dc89b74ea73a1d108c01366c3c57b33e`. Tipos y ESLint de integración aprobaron. La rama integrada se eliminó. GitHub no registraba despliegue ni checks/status de Vercel para ese SHA y el responsable confirmó que tampoco veía uno nuevo en Vercel. La ruta pública independiente de estado todavía respondió con `27ac4ea`; **no se declara 5d972be desplegado**.

No hay CLI o integración de Vercel autenticada disponible en el entorno. La búsqueda encontró la integración oficial disponible pero aún no instalada; se propuso habilitarla para inspeccionar/iniciar el despliegue. No se solicitaron secretos, se ampliaron permisos de GitHub ni se generaron commits vacíos para forzar eventos. El despliegue anterior queda pendiente de acceso a Vercel o de iniciar Production desde main, verificando el SHA 5d972be y no redesplegando el código antiguo.

Esta preparación de campaña queda en `feat/recordatorio-historico-agrupado`, rama local pendiente de aprobación de merge/despliegue. [Plan](../plans/2026-11-05-recordatorio-historico-agrupado-plan.md).

## Correo preparado

Asunto: **Encuestas de satisfacción pendientes | Hub de Información**.

Hola, [nombre]:

Tienes [cantidad] tickets cerrados cuyas encuestas de satisfacción aún están pendientes. Reunimos los pendientes en este único correo. Abre cada ticket y completa su encuesta para contarnos cómo fue la atención:

- [Código y título enlazados] — [Área] · Cerrado el [fecha de Lima].
- Se incluyen todos los tickets de esa persona en el mismo mensaje.

Si ya completaste alguna encuesta después de recibir este mensaje, no necesitas volver a responderla. Gracias por ayudarnos a mejorar nuestro servicio.

La plantilla reutiliza la identidad institucional existente. Cada borrador real contiene únicamente los tickets de su propio creador, con códigos completos y enlaces individuales a producción. Los textos se escapan, los códigos se codifican en URL y se exige HTTPS.

## Preparación sin envíos

El script `src/scripts/prepare-survey-reminder-digests.ts` solo consulta y crea borradores locales. Valida los argumentos antes de cargar configuración o conectar. Exige cutoff cumplido y URL HTTPS sin credenciales; TLS verificado, máximo una conexión, timeouts 10 segundos/sentencia y dos segundos/bloqueo; transacción repeatable read/read only. No importa Gmail, no incluye opción de enviar y no escribe tickets, encuestas, reservas ni historial.

Operación usada para la selección aprobada:

```bash
pnpm exec tsx src/scripts/prepare-survey-reminder-digests.ts --prepare --cutoff '2026-11-03T18:26:32.832Z' --base-url 'https://requerimientos-hub.vercel.app'
```

El cutoff fija el límite del plazo revisado; la lectura vuelve a excluir tickets que ya hayan respondido, dejado de estar resueltos o pertenezcan a usuarios inactivos antes de preparar. No se añaden filtros por fecha de activación o recordatorio enviado, porque la campaña histórica los incluye expresamente.

Resultado real: **30 HTML individuales, manifest e índice; 158 tickets; cero correos enviados**. Archivos fuera del repositorio, en directorio temporal privado 0700 y archivos 0600. Manifest marcado draft-only/sent:false, sin tokens ni credenciales. Se comprobó unicidad de los 30 destinatarios y 158 tickets, correo válido, ausencia de CC/BCC, enlaces de cada ticket y respeto del cutoff. El índice permite revisar los borradores; su ruta local se comunica al responsable, no se incorporan datos personales al repositorio o logs.

## Verificación y límites

Tipos estrictos y ESLint completo sin advertencias aprobados (exit 0). Comprobación efímera sin red/secretos, con módulos reales y BD ficticia: flags incorrectos, cutoff futuro, URL sin HTTPS o con credenciales se rechazan antes de conectar; agrupación 2+1, transacción READ ONLY, permisos de archivos, escape HTML, fecha Lima, singular/plural y manifest sin envío comprobados. Revisión independiente sin defectos concretos. El build integrado de la entrega anterior sigue registrado; no se repite un build completo por esta plantilla y script sin conexión a rutas de la aplicación.

Los borradores reales no son una simulación de carga o envío de correo; se prepararon como entrega solicitada mediante lectura autorizada. No se ejecutaron workers, crons o migraciones, ni se modificaron fechas históricas o marcadores de recordatorio. No se creó tabla, endpoint, servicio, CI o Vercel Preview.

El envío real **no está implementado ni ejecutado en esta entrega**: la solicitud actual es preparar y revisar. Antes de enviarlos habrá que obtener la aprobación concreta, volver a comprobar las encuestas/estado/cierre de cada ticket y la cuenta activa, evitar destinatarios sin tickets pendientes y registrar el resultado por persona para no repetir un grupo ya enviado al reintentar. Si una lista cambia, se vuelve a generar su cuerpo con los pendientes efectivos. Esa ejecución deberá respetar lunes–viernes desde las 09:00 de Lima y mantener intactos los automáticos y el historial.

El directorio de borradores temporales se conserva para revisión y contiene datos personales: no publicarlo ni adjuntarlo a git. Puede desaparecer por limpieza de temporales; el script permite regenerarlo. El material ficticio de comprobación se elimina al cerrar este bloque.

## Ejecución posterior aprobada y completada

Después de preparar esta nota, el usuario autorizó expresamente merge, push y envío, y pidió continuar sin configurar Vercel. Se integró/publicó `abb8bf2`; Production `7582780847` y SHA público confirmados, rama integrada eliminada. Gmail confirmó **30 correos para 158 tickets**, sin grupos omitidos, fallidos o inciertos. Antes de cada correo se revalidó titular activo/mismo correo, estado resuelto/mismo cierre, plazo aprobado y ausencia de encuesta. Registro privado persistido antes/después del HTTP y 30 identificadores Gmail únicos; ningún cambio de BD o de los automáticos.

La preparación descrita arriba no enviaba; la operación posterior autorizada se ejecutó una sola vez y guardó el resultado fuera del repositorio. Los borradores originales conservan sent:false porque son inmutables; el resultado efectivo está en el registro de ejecución, no en esa marca inicial. No repetir la campaña ni volver a crear borradores para reintentar sin consultar ese registro. No se publican destinatarios, títulos o contenido del manifiesto.

Durante el envío se detectó el encoder quoted-printable defectuoso: se mitigó solo en esa operación convirtiendo Unicode a entidades HTML. La [corrección compartida UTF-8/base64](2026-11-05-utf8-paquetes-calidad.md) se prepara después para los demás emisores, sin reenviar mensajes anteriores.

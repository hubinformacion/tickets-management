# Registro y reintentos de cargas a Drive

## Alcance y política

Integrado y desplegado en `e2e1596` (rama de trabajo local eliminada tras verificar igualdad de contenido), según el [diseño](../plans/2026-10-28-registro-cargas-drive-design.md). El usuario confirmó **cantidad ilimitada de adjuntos y 4 MB por archivo/carga**. No se agregan cuotas por ticket, usuario, lote ni espacio global. Se conservan los formatos y controles de frecuencia existentes.

FilePond asigna el UUID de intento en `beforeAddFile`, antes de permitir el procesamiento automático, mediante metadata silenciosa. Cada elemento mantiene el UUID en sus reintentos; elementos distintos obtienen UUID distintos. El servidor normaliza su representación y comprueba contenido, uploader, token, nombre, tamaño y MIME. Clientes anteriores sin esa metadata siguen funcionando con un UUID generado por el servidor, con deduplicación limitada.

El intento y su ID remoto se confirman antes de enviar el contenido a Drive. Una reserva de cinco minutos coordina solicitudes concurrentes; el mismo ID remoto se reutiliza tras un fallo. Una respuesta perdida se resuelve consultando ese ID y contrastando metadata/huellas antes de registrar el adjunto. El adjunto y el estado almacenado se confirman en la misma transacción. No se reconstruyen referencias que una acción posterior haya cancelado o eliminado.

Se conserva el intento ante incertidumbre; no se borra automáticamente el archivo ni se elimina su referencia como compensación. No se modifica el contenido de los archivos históricos ni sus metadatos.

## Esquema aditivo autorizado

Se aplicó [upload-attempts.sql](../migrations/2026-10-28-upload-attempts.sql), SHA-256 `aa266daf6ea090be700962e136eea207a2e09c538c880f950a4867efcbb7f3dc`, con autorización vigente del usuario y snapshot confirmado. Solo creó `upload_attempt` y sus índices/constraints propios: 17 columnas, 5 índices, 10 constraints y 0 filas al comprobarla.

La conexión exigió destino Neon configurado y TLS `verify-full`. La migración se ejecutó en transacción con lock timeout de 3 segundos y statement timeout de 30 segundos. No contiene cambios a tablas existentes, backfills, cascadas ni operaciones destructivas. No se ejecutó reset, drop, seed, setup o db:push. No se probó restauración del snapshot de forma independiente.

## Verificación

255 aserciones temporales con datos ficticios: metadata/UUID y compatibilidad anterior, cantidad sin límite configurado, archivo de exactamente 4 MB y rechazo del exceso, contratos HTTP/auth, privacidad de usuario/token, contenido distinto con un mismo intento, concurrencia simulada, reservas vencidas, ID persistido antes de enviar bytes, respuestas perdidas de Drive, commit de BD incierto, ausencia de duplicados en el flujo simulado y rechazo de referencias canceladas/eliminadas.

Se comprueba la serialización del cliente Google, el ID anticipado, propiedades privadas, checksums, MIME/carpeta y respuestas 404/409. También la consulta de estado, su autenticación y que no invoque uploads o escrituras. Los hashes se calculan con bytes reales del fixture; MD5 solo contrasta la metadata binaria de Drive y no sustituye SHA-256 como fingerprint.

TypeScript y build local completos aprobados con Next.js 16.4.3/Turbopack, incluida la fase de generación de páginas y optimización. ESLint aprobado con 0 errores y las tres advertencias conocidas. Se planificaron 11 consultas compiladas por el Drizzle instalado mediante EXPLAIN sin ANALYZE en READ ONLY, sin ejecutar sus INSERT/UPDATE.

Los fixtures usan red aislada y entorno sin credenciales; el build usa variables ficticias y acceso HTTPS para fuentes, sin archivos ni credenciales de producción. Fuentes/dependencias de solo lectura, scratch temporal de hasta 1,5 GiB y límites de CPU/memoria/procesos/archivos del bloque anterior. Se eliminan copias y verificadores al terminar; no se añade framework de tests ni se genera Preview.

## Estado autenticado sin cargas

`GET /api/upload/status` exige Bearer `CRON_SECRET`. Consulta en paralelo la existencia de la tabla y metadata de la carpeta de Drive; devuelve estado, política de 4 MB/cantidad ilimitada y SHA del despliegue, sin IDs de carpeta, archivos o credenciales. No ejecuta uploads, borrados ni escrituras de negocio; no está programado como cron. Responde 503 si no puede confirmar el destino.

Con las credenciales locales se verificó la generación anticipada de un ID, sin crear archivos; la carpeta local respondió 404. No se atribuye ese resultado a producción: la configuración efectiva se comprueba con la ruta protegida después de desplegar. No se suben ni borran archivos reales como prueba.

## Pendientes y límites

No se certifican concurrencia real de PostgreSQL ni upload/retry real de Drive por aprobar fixtures o build. Las reservas y los timeouts de las peticiones no forman una transacción entre servicios; OAuth y BD no comparten un límite global estricto. Se mantiene el límite de duración de la ruta y el registro recuperable.

Un navegador anterior sin UUID estable no deduplica reintentos de solicitudes distintas. Abandonar la pestaña puede dejar un intento incierto registrado; este bloque no incorpora un reconciliador automático ni limpieza de huérfanos históricos. Un cambio externo de permisos o metadata puede requerir revisión manual antes de confirmar. También quedan uploads que terminan después de enviar el formulario, borrado de adjuntos ya vinculados y rate limiting compartido.

La entrega se agrupa con el cierre documental anterior en un commit de main, sin publicar la rama de trabajo ni hacer un despliegue adicional de solo documentación.

## Producción y cierre de revisión de Drive

La [Production de `e2e1596`](https://vercel.com/hub-de-informacions-projects/requerimientos-hub/3UcUGK2M59M1WWaJEFHptHS4v3VV) fue aprobada (registro GitHub `7399340558`). Se agrupó el código con el cierre anterior en un solo commit y un único despliegue de main; no se generó Preview.

El dominio público confirmó el SHA exacto `e2e1596db84962ea32679adb1df3c1e0d568ed47`. Login 200, sesión anónima 200/null, dashboard 307 a login, GET de upload 405 y consulta de estado de upload sin credencial 401. Los recordatorios conservaron queue, corte fijo del 28 de octubre y tabla disponible.

La consulta autenticada de uploads respondió 503 con `databaseReady=true`, `driveStatus=not_found`, `maxFileBytes=4000000` y `unlimitedFiles=true`. No se presenta el destino de Drive como validado ni se atribuye una causa no comprobada. El código está desplegado; esa comprobación no certifica una carga real. La investigación de carpeta/permisos se cerró posteriormente por decisión expresa del usuario.

El usuario indicó la carpeta de destino mediante enlace; su ID difería del valor local. Se actualizó únicamente GOOGLE_DRIVE_FOLDER_ID en .env.local mediante escritura atómica, conservando las demás variables y sin incluir ese archivo en Git. Con el token local también respondió 404 la carpeta indicada. Se verificó que el token local pertenece a la cuenta institucional y solo tiene el alcance drive.file, no acceso completo a Drive; esto no certifica qué token o valor usa Vercel.

El usuario confirmó inicialmente que producción ya tenía el ID indicado, pero luego corrigió el enlace: la primera carpeta correspondía a otro sistema. La confirmación anterior no acredita que producción use el destino corregido. Se actualizó solo GOOGLE_DRIVE_FOLDER_ID local al nuevo destino, conservando las demás variables. La nueva carpeta también respondió 404 con las credenciales locales; el estado autenticado de producción sigue en 503/not_found, con la tabla disponible y el mismo SHA. Esto no identifica por sí solo la causa del 404 ni confirma el ID efectivo de Vercel. No hay token administrativo, sesión CLI o deploy hook de Vercel disponibles aquí; Git permite publicar código pero no consultar o editar esas variables. No se modificó la configuración de Vercel ni se ampliaron permisos de Google. [Alcances oficiales](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).

Se preparó una operación local temporal de Google Picker con selección limitada a la carpeta indicada, estado aleatorio y PKCE S256, receptor exclusivo de loopback y expiración de 15 minutos. El primer flujo expiró sin completarse; se reemplazó por uno para el destino corregido. Solicita solamente drive.file, sin combinar alcances anteriores ni solicitar refresh token. No guarda ni sustituye tokens y no modifica la configuración de Gmail. La identidad local y los alcances gmail.send/gmail.readonly existentes se verificaron antes de iniciar. Se comprobó que el receptor rechaza un estado incorrecto y que la redirección conserva esas restricciones. El usuario pidió conservar el acceso mediante el refresh token de la cuenta institucional y no continuar con autorizaciones de carpeta. Se canceló el receptor local antes de completar consentimiento; no se regeneraron ni reemplazaron tokens. No se presenta la carpeta como verificada mediante una carga real. [Selector oficial integrado en OAuth](https://developers.google.com/workspace/drive/picker/guides/desktop-mobile-picker).

No se crearon, movieron ni eliminaron archivos de Drive. Este cierre documental se acumula localmente para publicarse con el siguiente bloque de código y evitar otro despliegue de solo documentación.

# Registro y reintentos de cargas a Drive

## Alcance y política

Implementado en la rama local `fix/registro-cargas-drive`, según el [diseño](../plans/2026-10-28-registro-cargas-drive-design.md). El usuario confirmó **cantidad ilimitada de adjuntos y 4 MB por archivo/carga**. No se agregan cuotas por ticket, usuario, lote ni espacio global. Se conservan los formatos y controles de frecuencia existentes.

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

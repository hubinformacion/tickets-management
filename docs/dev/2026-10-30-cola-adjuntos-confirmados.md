# Conservación de la cola de adjuntos

## Estado

Implementado en la rama local `fix/cola-adjuntos-confirmados`, según el [diseño](../plans/2026-10-30-cola-adjuntos-confirmados-design.md). Código pendiente de merge y despliegue. No hay migraciones, operaciones de mantenimiento ni cambios de OAuth/Drive en este bloque.

La vinculación tardía anterior se integró y desplegó como `bb0b870`. Production `7441161433` aprobó la entrega y el dominio público confirmó ese SHA completo mediante el estado de recordatorios: queue y tabla disponibles, corte fijo `2026-10-28T17:00:00.000Z`. Login 200, sesión anónima 200/null y dashboard 307 a login. No se ejecutó el cron ni uploads como prueba. La rama anterior se eliminó tras verificar igualdad con main.

## Corrección

El temporizador anterior cambiaba el token y desmontaba FilePond aunque la vinculación siguiera en curso o hubiera fallado. También podía ocultar archivos añadidos después de programar el reinicio. Ahora el token permanece estable durante la sesión del ticket; cambiar de ticket inicia una instancia independiente con key y sus propios refs.

El widget serializa las solicitudes de vinculación y recoge los archivos que llegan durante una espera. Mantiene separados los IDs actuales y confirmados. Después de un éxito confirma solo los IDs de esa solicitud que siguen visibles y fueron reconocidos por el servidor; no presupone que todos estén vinculados por recibir success. Descarta notificaciones/actualizaciones tardías después de desmontar la instancia.

La acción admite un tercer parámetro opcional de IDs, validado por Zod. Después de la vinculación y dentro de la misma transacción, consulta únicamente los IDs solicitados que pertenecen al usuario y al ticket autorizado. Los bloquea en orden de ID hasta el commit y devuelve confirmedAttachmentIds. Clientes anteriores pueden omitir el parámetro. No se añaden cuotas de cantidad, por lote ni almacenamiento.

FileUpload recibe IDs confirmados opcionales. Después de dos segundos revisa los elementos actuales y limpia solo los que tienen ese serverId y estado PROCESSING_COMPLETE, usando su ID local. No desmonta la cola ni cambia el token. El efecto cancela su timer al cambiar confirmaciones o desmontarse y vuelve a revisar al completarse un proceso. Nuevos, fallidos y no confirmados permanecen.

La limpieza usa removeFile con revert=false/remove=false y chunkUploads=false explícito, coherente con el POST multipart actual. No se trata de borrar el archivo remoto. El formulario de creación no pasa IDs confirmados y conserva su lista hasta su flujo normal.

Un error devuelto, respuesta incompleta o excepción conserva los archivos no confirmados y muestra un mensaje con Reintentar vinculación. Este botón repite la acción de vincular sin repetir la transferencia a Drive. Los errores de subida siguen usando el reintento propio de FilePond. Un error de removefile tampoco descarta el ID local como si hubiese sido eliminado.

## Validación

- TypeScript completo aprobado con `--noEmit --incremental false`.
- ESLint completo con `--max-warnings 0`, sin errores ni advertencias.
- Build local completo de Next.js 16.4.3/Turbopack aprobado, con tipos y generación de 23 páginas.
- Contrato de métodos/ref/status contrastado con los tipos y código instalados de React FilePond/FilePond 4.32.11, además de Context7.
- Comprobación aislada del callback REMOVE_ITEM instalado: limpieza de INPUT y LOCAL archivó el elemento sin invocar revert/remove; un control con revert=true sí invocó revert. Se usaron funciones ficticias y ninguna petición HTTP ni archivo real. Esta comprobación no equivale al recorrido de navegador.

Tipos/lint y comprobación de dependencia usaron entorno vacío, red aislada, fuentes/dependencias de solo lectura y scratch con límites. El build usó copia sin .env.local, variables ficticias y HTTPS para fuentes públicas, sin credenciales de producción. No se añade framework ni archivos de tests al proyecto; se elimina el material temporal al terminar.

## Pendientes y compatibilidad

Falta validar en navegador: agregar archivos durante una vinculación lenta, fallo devuelto/excepción, confirmación parcial, cancelación concurrente, reintento sin nuevo POST, cambio de ticket y limpieza visual sin DELETE. La revisión estática, tipos y build no demuestran esas interacciones de React/FilePond ni concurrencia real de PostgreSQL.

Un cliente nuevo conserva la cola si recibe una respuesta antigua sin IDs confirmados; no los inventa. Un navegador que siga usando el widget anterior mantendrá su comportamiento hasta recargar. La pausa es visual y puede prolongarse al llegar nuevas confirmaciones o por temporizadores del navegador; no decide persistencia de datos.

No se modifican roles, pertenencia de archivos, formatos, cantidad ilimitada ni 4 MB por carga. Quedan por separado reconciliación de huérfanos, recuperación de borrados vinculados y observación de servicios reales. Esta entrega se agrupa con el cierre documental anterior para publicar un único commit desde main cuando se integre, sin Preview.

# Registro y reintentos de cargas a Drive

## Decisiones del usuario

El usuario confirmó cantidad ilimitada de archivos y máximo de 4 MB por archivo/carga. No se incorporan cuotas por ticket, usuario, lote o almacenamiento global. Se mantienen los formatos autorizados y el límite de cuerpo multipart existente. Continúa el plan aprobado de integridad de uploads, con cambios aditivos autorizados y sin borrados ni backfills históricos.

La rama de trabajo permanece local; se validan código y build localmente, y se agrupa el cierre documental anterior con esta entrega para un único despliegue desde main, sin Preview.

## Problema y alternativas

Hoy Drive crea un archivo y después se inserta su referencia en BD. Un fallo o confirmación perdida puede dejar un archivo sin referencia; repetir la solicitud puede crear otro. Borrar automáticamente al fallar BD es inseguro: la inserción puede haberse confirmado y el archivo podría estar vinculado.

Se elige una tabla independiente de intentos y un ID de Drive pre-generado y confirmado en BD antes de enviar el contenido. Otra alternativa es buscar archivos por propiedades tras fallar, pero una búsqueda incompleta no garantiza que el archivo no exista. El borrado compensatorio ciego se descarta para conservar datos y referencias.

## Flujo

1. FilePond asigna un UUID de intento en metadata mediante beforeAddFile antes del procesamiento automático, de forma silenciosa y estable entre reintentos del mismo elemento. El servidor valida esa metadata; clientes ya abiertos sin el campo reciben un UUID de servidor, conservando compatibilidad.
2. Tras validar formato y los 4 MB, se calculan SHA-256 del contenido y MD5 para contrastar la metadata binaria de Drive. SHA-256, nombre, tamaño, MIME, uploader y token de formulario fijan la identidad del intento.
3. Una transacción crea/bloquea el intento y toma una reserva de cinco minutos. Solo su propietario puede retomarlo; contenido o contexto distintos con el mismo UUID se rechazan. Una reserva vigente devuelve conflicto sin llamar a Drive.
4. Se genera un ID de Drive y se confirma en el intento antes del upload. Las llamadas de red ocurren fuera de transacciones. Ninguna carga se inicia sin haber persistido el ID remoto.
5. Los reintentos reutilizan el mismo ID. Si el archivo ya existe, se contrastan tamaño, MD5, MIME, carpeta y propiedades de intento y huella del contenido. Si el create devuelve 409, se consulta y valida el archivo existente. Un 404 en la lectura permite intentar crear con el mismo ID; nunca se asigna otro ID tras una carga incierta.
6. El resultado de Drive y la inserción de `ticket_attachment` se confirman en una transacción. El UUID del adjunto se reserva desde el principio. Un intento ya almacenado devuelve la misma referencia, salvo que haya sido cancelada o eliminada por una acción posterior; esos casos no se reconstruyen.
7. Un fallo conserva el intento, ID de Drive, fingerprint y estado incierto. La reserva puede retomarse después de vencer. No se borra automáticamente ningún archivo ni referencia.

La tabla nueva no modifica columnas ni restricciones de tablas existentes y no tiene cascadas. Se conservan los registros operativos. Se mantienen las protecciones ya desplegadas de vinculación/cancelación y permisos de ticket.

## Verificación y límites

Fixtures temporales sin red/credenciales para reintentos, concurrencia simulada, aislamiento de usuario/token, cambios de contenido, pérdida de confirmación, archivos cancelados, límites de 4 MB y clientes anteriores. TypeScript, ESLint y build local antes de publicar. El SQL puede planificarse con EXPLAIN sin ANALYZE en READ ONLY; las pruebas no suben ni eliminan archivos reales.

Se comprobó que las credenciales locales pueden generar un ID anticipado, sin crear archivos. La lectura de la carpeta de destino local respondió 404: no se certifica esa integración ni se cambian secretos por ello. La configuración real de Vercel puede ser distinta; queda pendiente el recorrido autenticado real.

Las reservas coordinan los reintentos normales; Drive y PostgreSQL no comparten transacción. Los clientes anteriores sin UUID estable no deduplican sus solicitudes repetidas. Abandonar la pestaña puede dejar un intento incierto conocido; este bloque no añade un reconciliador automático, recuperación de huérfanos anteriores ni limpieza. La vinculación de uploads terminados después de enviar el formulario requiere otro bloque.

## Referencias

- [Drive: IDs anticipados y reintentos sin duplicados](https://developers.google.com/workspace/drive/api/guides/manage-uploads#use_a_pre-generated_id_to_upload_files).
- [Drive: generar IDs](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/generateIds).
- [FilePond: metadata de archivos](https://pqina.nl/filepond/docs/api/file-item/).
- Context7: cliente Google APIs Node.js, FilePond y transacciones de Drizzle; tipos instalados contrastados para opciones y callbacks.

La ruta autenticada `/api/upload/status` comprueba tabla y carpeta de producción con consultas de solo lectura, devuelve política/SHA y estados sin credenciales ni IDs de carpeta, y no dispara cargas. Permite diferenciar la configuración local de la real tras desplegar sin crear datos de prueba.

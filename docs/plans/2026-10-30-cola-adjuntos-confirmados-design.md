# Conservación de la cola de adjuntos

## Problema y alcance

Se continúa el pendiente de reset del widget del plan de estabilización. La vinculación tardía ya se integró en main como `bb0b870`; este bloque corrige el cliente y conserva el flujo de carga existente.

El widget cambia su token y desmonta FilePond dos segundos después de onprocessfiles, aunque addTicketAttachmentsAction siga pendiente o falle. Una carga nueva durante esa espera también puede quedar oculta. Las excepciones de la acción no se capturan.

Se conserva la pausa visual de dos segundos. Se elige limpiar por IDs confirmados sin cambiar el token, frente a mantener un reset de todo el componente o dejar todos los archivos en la lista indefinidamente. Así no se desmontan cargas nuevas/fallidas y se libera la lista de los archivos que sí terminaron.

## Flujo

Cada instancia de ticket mantiene un token estable; cambiar de ticket inicia una instancia nueva mediante key. El widget conserva los IDs visibles y confirmados, serializa/agrupa solicitudes de vinculación y confirma únicamente IDs de la solicitud que siguen visibles y fueron devueltos por el servidor. La acción acepta un array opcional validado con Zod, sin cuotas nuevas de cantidad, y devuelve solo IDs del ticket que pertenecen al usuario. Clientes anteriores pueden omitirlo. Los eventos durante una solicitud se procesan después. No se muestran errores o éxito tardíos después de desmontar el widget.

FileUpload recibe IDs confirmados opcionales. Un efecto con cleanup programa una revisión dos segundos después y retira únicamente elementos con ese serverId y estado PROCESSING_COMPLETE. Usa el ID local del elemento y removeFile con remove=false/revert=false; chunkUploads se fija en false, coherente con la ruta multipart actual. No se invoca el revert remoto para limpiar visualmente un archivo ya vinculado. Nuevos, fallidos y no confirmados permanecen.

Si la vinculación devuelve error o lanza una excepción, se conservan los IDs y la cola, se muestra un mensaje y se permite reintentar la vinculación sin volver a transferir el archivo. No se reinicia automáticamente todo el lote ni se generan timers de cambio de token. El formulario de creación no pasa IDs confirmados: sus archivos no se limpian por este mecanismo.

No cambian permisos, formatos, cantidad ilimitada, 4 MB ni endpoints de BD/Google. No se añade una migración ni se ejecutan acciones reales como verificación. Se validan tipos, lint y build local; se contrasta el comportamiento de removeFile con el FilePond instalado y se registra como pendiente el recorrido real en navegador. No se añaden tests ni un framework.

## Referencias

- [FilePond: métodos de instancia](https://pqina.nl/filepond/docs/api/instance/methods/).
- Contrato contrastado con tipos y REMOVE_ITEM de FilePond 4.32.11 instalado: revert=false no llama a revert en archivos procesados sin chunking; remove=false evita server.remove para origen local. Se usa la implementación instalada para resolver diferencias con documentación de otras versiones.

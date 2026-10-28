# Coordinación de vinculación y cancelación de adjuntos

Continúa el bloque aprobado de integridad de archivos. El usuario autorizó cambios aditivos de BD con snapshot confirmado, sin operaciones destructivas, y pidió evitar Preview y despliegues duplicados.

La cancelación actual lee un archivo pendiente, lo borra en Drive y luego borra su referencia. Entre lectura y borrado otra solicitud puede vincularlo a un ticket. Añadir una condición al DELETE final no evita que el archivo vinculado ya haya sido eliminado de Drive.

Se elige una tabla operativa independiente `attachment_revert`, sin modificar columnas de tablas existentes, y un bloqueo breve de la fila del adjunto. La alternativa de mantener el bloqueo durante toda la llamada a Drive prolonga la transacción y no conserva intención ante caídas. Un bloqueo local en memoria no coordina instancias.

Al cancelar, una transacción bloquea la fila, vuelve a exigir propietario y ausencia de ticket, y registra una intención con token y reserva de cinco minutos. Drive se invoca fuera de la transacción. La vinculación en creación y en tickets existentes bloquea primero los mismos adjuntos y luego, en una sentencia posterior con snapshot fresco, excluye cualquier intención de cancelación. La primera operación confirmada determina el resultado. Los IDs se bloquean en orden para reducir deadlocks.

Solo el uploader puede cancelar su archivo pendiente. Una reserva vigente devuelve conflicto sin repetir Drive; una reserva vencida o fallida admite reintento manual. Una cancelación ya confirmada es idempotente. Se conserva tanto la intención como la referencia original del adjunto; ya no se elimina esa fila al revertir una carga pendiente. No se crean borrados masivos ni limpiezas automáticas.

Si Drive falla o la confirmación en BD es incierta, el archivo no puede vincularse y su referencia se conserva. Un 404 de Drive no se interpreta automáticamente como borrado confirmado porque también puede representar pérdida de acceso. La reconciliación de esos casos queda pendiente. La reserva no garantiza finalización automática: el usuario puede reintentar y la operación queda observable.

En adjuntos sobre tickets existentes también se bloquea y relee el ticket antes de validar permisos, área y estado cerrado. La creación de ticket conserva su transacción actual con contador, historial y vinculación.

La propuesta de esquema crea solo una tabla vacía e índices propios. Se valida localmente con fixtures temporales y tipos/lint; las consultas se pueden planificar con EXPLAIN sin ANALYZE en transacción READ ONLY. No se ejecutan uploads, cancelaciones ni borrados reales como prueba. Se publica una sola vez desde main, sin empujar la rama de trabajo ni generar Preview.

Quedan fuera de este bloque cuotas globales/cantidad, reservas antes del upload, compensación de inserción incierta, limpieza de huérfanos y cambios al borrado explícito de adjuntos ya vinculados. Esos riesgos conservan prioridad en el estado de auditoría.

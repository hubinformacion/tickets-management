# Vinculación de cargas que terminan después de crear el ticket

## Decisión aprobada

El usuario eligió vincular automáticamente al terminar, en vez de bloquear la creación hasta completar todas las cargas. No se modifican permisos ni carpetas de Google, no se borra contenido ni se recuperan archivos históricos como backfill. Se mantiene el registro previo de intentos, ID remoto estable, formatos, cantidad ilimitada y 4 MB por carga.

El rate limiting anterior se integró en `9838afd` y Production `7440258138` aprobó el despliegue. El dominio público confirmó esa versión mediante el estado de recordatorios, sin ejecutar el worker. Este bloque nuevo se implementa en una rama local independiente.

## Relación persistente y carreras

Una tabla independiente `upload_batch` conserva usuario, token de formulario y ticket de destino nullable, con fecha de creación/vinculación y último error operativo. El destino se fija una sola vez: un mismo formulario no puede vincularse a dos tickets. El usuario forma parte de la clave, por lo que conocer otro token no permite usar sus archivos.

La creación del ticket confirma su destino de formulario en la misma transacción que ticket, código, historial y vinculación de archivos ya terminados. La confirmación de una carga consulta esa relación dentro de la transacción que guarda adjunto e intento. Si todavía no existe ticket, el adjunto queda pendiente; si existe, se vincula al terminar. El orden inverso se cubre porque la creación también vincula los pendientes existentes.

Un bloqueo advisory de transacción por usuario/token serializa ambos lados, incluyendo la vinculación a un ticket existente. Orden de bloqueo: formulario, ticket de destino cuando existe, intento y adjuntos. No se mantienen transacciones durante transferencias a Google. La creación es un caso especial con un ticket nuevo todavía no visible para otros procesos; no espera un ticket anterior del formulario.

Antes de vincular se consulta el usuario vigente y se bloquea el ticket para validar acceso, estado y política de adjuntos. No se adjunta a tickets cerrados o anulados ni a áreas/subcategorías incompatibles. Si la carga ya llegó a Drive y la vinculación no procede, se confirma el archivo como pendiente con su referencia intacta y se devuelve conflicto después del commit. Un reintento puede vincularlo cuando vuelva a ser válido. Los archivos cancelados o eliminados nunca se reconstruyen.

Los reintentos de archivos ya vinculados conservan su ID sin crear otro archivo ni volver a adjuntarlo. Las relaciones ya vinculadas no se cambian. Una nueva consulta de lote no reasigna referencias antiguas ni deduce destinos de tickets históricos.

## Caché y compatibilidad

Los clientes mantienen el mismo uploadToken y la respuesta de upload sigue siendo el ID de adjunto. Después del éxito se invalida la ruta del ticket vinculado fuera de la transacción; un fallo de caché no convierte una carga confirmada en un fallo de almacenamiento. La relación en BD es automática; la invalidación no implica actualización en vivo de una página ya abierta.

Una desconexión puede interrumpir la transferencia; este bloque vincula las cargas que llegan a confirmarse, sin prometer que continúen tras cerrar la pestaña ni incorporar un reconciliador de Drive. Solicitudes que sigan ejecutando el código anterior durante el cambio de despliegue no participan de la coordinación nueva. Quedan también por separado la limpieza de huérfanos históricos, el borrado de vinculados y el reset por temporizador del widget de adjuntos de tickets existentes.

## Plan de implementación y validación

1. Crear esquema y SQL aditivos de la tabla nueva, sin relaciones con cascada, ALTER ni backfills.
2. Implementar helpers de bloqueo, destino inmutable, autorización actual y vinculación de lotes.
3. Integrarlos en creación del ticket, acción de adjuntar y claim/complete del intento, conservando refs ante una vinculación bloqueada.
4. Invalidar el detalle después de una carga confirmada y ampliar readiness para incluir la tabla nueva, sin llamadas adicionales a Drive.
5. Ejecutar tipos, ESLint y build local; revisar el SQL con EXPLAIN sin ANALYZE cuando sea aplicable. No crear framework ni archivos de tests y no subir/borrar archivos reales como prueba.
6. Aplicar solo la tabla aditiva bajo la autorización vigente y verificar metadata/ausencia de registros históricos modificados. Registrar límites de validación real y entregar el código para merge posterior.

## Referencia

[PostgreSQL: advisory locks de transacción](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS).

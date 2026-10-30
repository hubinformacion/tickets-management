# Purga administrativa completa

## Decisión del usuario

La opción administrativa debe eliminar definitivamente el ticket y todos sus registros asociados, incluido el historial. No se convierte en anulación y no conserva un archivo histórico del ticket eliminado. Esa autorización es para la función confirmada por un administrador; no permite ejecutar borrados de producción como verificación.

Este bloque se apoya en `28753bd` y continúa en una rama local apilada, sin merge ni Preview. No añade tablas/columnas ni cambia los contadores compartidos, catálogos, usuarios o recursos pertenecientes a otros tickets.

## Preparación y archivos

Se aplica un límite persistente de 30 solicitudes/minuto por administrador. Se captura una instantánea transaccional del ticket, sus adjuntos (incluidos pendientes de formularios ya vinculados), intentos y formularios. Los intentos sin confirmar bloquean el borrado antes de llamar a Drive. Los intentos stored cuya referencia desapareció pueden aportar su ID remoto, sin reconstruir metadata. Se excluyen intentos que pertenecen a referencias de otros tickets.

Se comprueba si un archivo de Drive también tiene referencias fuera del alcance: se retira la referencia del ticket eliminado, pero no se destruye un recurso que otro ticket sigue utilizando. Para los demás se reutilizan los claims de attachment_revert, con cuatro operaciones externas simultáneas y progreso persistente por archivo. Los confirmados no se vuelven a solicitar en un reintento.

En la purga administrativa un 404 de Drive se acepta como referencia ya ausente/no accesible y se etiqueta drive_not_found; otros errores impiden borrar los registros de BD. El 404 no prueba ausencia física cuando faltan permisos; se conserva esta limitación, sin ampliar OAuth. La eliminación individual sigue siendo conservadora ante 404. La intención administrativa de retirar definitivamente los datos del sistema es distinta de conservar evidencia indefinida para una eliminación individual fallida.

## Concurrencia y finalización

Las llamadas a Drive ocurren fuera de transacciones. Antes de borrar datos se bloquean en orden los formularios conocidos mediante el mismo advisory lock que las cargas, y después el ticket. Se bloquean también referencias e intentos, coordinando cancelaciones pendientes que solo bloquean la referencia. Se vuelve a leer la instantánea y se comprueba que no aparecieron intentos/archivos/destinos nuevos. Un conflicto obliga a reintentar, sin confirmar borrados parciales de BD. Las eliminaciones físicas ya confirmadas conservan progreso hasta completar la purga.

La transacción final elimina encuestas de proveedores, tickets de proveedores, encuestas del usuario, historial, actividad, recordatorios operativos, registros de cancelación/eliminación, intentos, referencias de adjuntos, formularios y ticket. Los registros temporales de eliminación también desaparecen al terminar. Se conserva la secuencia compartida para no reutilizar códigos y los límites globales de usuarios, que no son historia de un ticket.

La UI anuncia éxito solo después de finalizar la transacción y captura errores de transporte. La acción mantiene su nombre público para clientes anteriores. Se permiten reintentos después de un resultado incierto; un ticket ya ausente puede limpiar restos operativos atribuibles por ID, sin borrar huérfanos que no puedan asociarse con seguridad.

## Cargas que todavía no se registraron

El widget de un ticket existente envía su ticketId junto con el token. La carga valida/fija ese destino antes de ir a Drive y rechaza un ticket ya eliminado, evitando recrear un formulario sin destino después de esperar un bloqueo. El formulario de creación conserva su flujo sin ticketId. Los clientes anteriores sin contexto explícito o cargas aún no registradas/no asociadas no pueden atribuirse a un ticket después de borrar toda su relación; no se hace una limpieza global de uploads para cubrir ese caso. La reconciliación de huérfanos continúa separada.

## Verificación

Tipos, lint y build local; escenarios con BD/Drive ficticios y SQL generado; planificación de SELECT/INSERT/UPDATE/DELETE únicamente con EXPLAIN sin ANALYZE en READ ONLY. No se ejecutan purgas reales ni se añaden framework o archivos de tests al proyecto. Concurrencia real y navegación autenticada se registran como pendientes si no se ejercitan.

## Implementación

El resultado, las verificaciones y los límites están en [el registro del bloque](../dev/2026-10-30-purga-administrativa.md). Permanece local hasta aprobar merge/despliegue.

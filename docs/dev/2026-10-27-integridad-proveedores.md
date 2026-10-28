# Integridad de tickets de proveedores

## Estado y alcance

Implementado en `d1b05b8` e integrado y desplegado en producción como `a85e691` el 28 de octubre de 2026, sobre `3b89f87`. Desarrolla el bloque de proveedores del plan aprobado: referencias del área, encuesta completa o ausente y escrituras condicionales. No incluye cambios de esquema, migraciones ni corrección masiva de registros.

## Cambios

- IDs enteros positivos en creación, edición, cierre, reapertura y borrado. Antes de escribir, creación/edición verifican que proveedor y ticket del sistema opcional pertenezcan al área del agente. Las referencias independientes se consultan en paralelo.
- Un proveedor desactivado no admite nuevos enlaces; un ticket existente puede conservar su proveedor desactivado al editar otros campos. Admin sin área conserva el rechazo previo; no se amplía el alcance del módulo.
- Edición limitada en servidor a tickets en proceso, como en la UI. Cierre y reapertura usan sus acciones específicas. La edición genérica no puede omitir la transacción del cierre.
- Edición, cierre, reapertura y borrado comparan el snapshot leído en servidor: ID, área, estado, proveedor, fecha de solicitud, vínculo, fecha de cierre y `updatedAt`. Se comprueba RETURNING y no se revalida ante conflicto. La siguiente fecha de actualización avanza al menos un milisegundo para distinguir dos operaciones con el mismo reloj. La comparación admite timestamps históricos con microsegundos.
- El cierre admite cero o cinco calificaciones enteras de 1 a 5. Una encuesta parcial devuelve error antes de leer o escribir. Estado y encuesta se confirman en una transacción; un fallo revierte ambos.
- Se retira el upsert que reemplazaba evaluaciones. Si hay una encuesta previa y se intenta enviar otra al cerrar, el cierre se revierte y se pide cerrarlo sin una nueva encuesta. Reabrir o volver a cerrar sin encuesta conserva todos los campos de la evaluación anterior.
- No se puede cambiar el proveedor evaluado de un ticket con encuesta. El borrado individual solo admite tickets en proceso sin evaluación; el predicado NOT EXISTS se incluye en el DELETE para impedir una cascada sobre encuestas. Los tickets cerrados se conservan y su botón de eliminar aparece desactivado.
- La creación usa una clave de rate limiting específica de operación. El almacenamiento del limitador sigue siendo local al proceso y el cambio al almacén compartido continúa pendiente.

Los nombres y argumentos de las acciones se conservan. Los nuevos rechazos devuelven errores en español. El manual del agente refleja las restricciones de conservación.

## Comprobaciones

149 comprobaciones temporales externas con sesiones y BD simuladas, sin framework nuevo. Se ejecutan con red aislada, entorno ficticio explícito, fuentes/dependencias de solo lectura y límites de CPU/memoria/procesos/archivos/scratch del bloque anterior.

La matriz cubre IDs inválidos, área ausente/ajena, guards de usuario e inactivo, proveedores activos/desactivados, vínculos cruzados, encuesta parcial/inválida, cierre sin encuesta, cierre con encuesta, evaluación existente íntegra, rollback, reapertura y bloqueos de borrado/cambio de proveedor con evaluación. Las carreras de cierre/cierre, edición/edición, reapertura/reapertura, cierre/edición y cierre/borrado dejan una operación ganadora. Se comprueban snapshots modificados, ciclos que vuelven al mismo estado y versión creciente con reloj idéntico.

Además, 146 comprobaciones previas de permisos aprobadas. TypeScript aprobado con `tsc --noEmit --incremental false`; ESLint aprobado con 0 errores y las 3 advertencias conocidas. No se ejecutaron acciones sobre BD, correo o archivos reales.

## Límites

Los dobles comprueban decisiones, predicados y uso de transacción; no certifican bloqueos/concurrencia de PostgreSQL. Vercel aprobó el build de Preview de `d1b05b8`; el recorrido autenticado/visual sigue pendiente.

La versión se compara desde la lectura de la acción del servidor; no se envía una versión del formulario del navegador. Una edición ya finalizada antes de esa lectura no se detecta como conflicto de un formulario antiguo.

La serialización con cambios administrativos de catálogos y los constraints de área siguen pendientes. No se migra la historia ni se reconstruyen cierres anteriores de proveedores. Los cambios de borrado están limitados al módulo de proveedores; no constituyen una revisión de todos los mecanismos de retención de la aplicación.

## Preview

La [Preview de `d1b05b8`](https://vercel.com/hub-de-informacions-projects/requerimientos-hub/HwoBWeNiQrtJLrpsKE5VSzMSHgzm) figura como `success` (registro de GitHub `7376800076`). La rama se integró y desplegó en producción tras su aprobación.

## Producción

El [despliegue de `a85e691`](https://vercel.com/hub-de-informacions-projects/requerimientos-hub/FVtqtYmqUY7UDqcEpCzyhR2VKAJY) figura como `success` (registro de GitHub `7388054394`). En https://requerimientos-hub.vercel.app se verificaron login 200, sesión anónima 200/`null` y dashboard 307 a login. No se ejecutaron migraciones, backfills, comandos de mantenimiento ni operaciones manuales sobre datos, correo o archivos reales. La validación autenticada y de concurrencia real continúa pendiente.

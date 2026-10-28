# Orden e integridad de catálogos

## Estado y alcance

Preparado en `234cab9` (`fix/orden-catalogos`), sobre `448b338`. Pendiente de integración y despliegue en producción. Implementa el bloque de ordenación del plan aprobado. No modifica el esquema ni ejecuta migraciones o backfills.

## Diseño aplicado

Las acciones de administrador y agente delegan en un servicio de catálogo con validación compartida. Cada mutación abre una transacción READ COMMITTED y adquiere el mismo bloqueo transaccional de PostgreSQL antes de leer. Se elige un único dominio para estos catálogos pequeños: evita interbloqueos al cambiar de área o categoría y cubre también creación, edición, activación y borrado. Las escrituras ordinarias del catálogo en la aplicación pasan por este servicio.

El [bloqueo transaccional](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS) se libera al confirmar o revertir; no queda asociado a la sesión del pool. Es cooperativo: no impide escrituras externas que no sigan el protocolo. Los scripts de seed/importación permanecen restringidos a mantenimiento local.

## Cambios

- El orden se calcula y lee dentro de la transacción. Creación usa el máximo del grupo bajo bloqueo, evitando que dos acciones asignen el mismo orden nuevo.
- Categorías se mueven solo dentro de su área, incluyendo un grupo separado sin área. Subcategorías se mueven solo dentro de su categoría. El servidor ignora `currentOrder` del navegador; el padre recibido para un movimiento se comprueba contra el registro real.
- El orden de lectura es estable por `displayOrder` e ID. Un movimiento ajusta las posiciones necesarias de su grupo dentro de una sola transacción, también si hay empates antiguos. No normaliza otros grupos ni ejecuta una limpieza global.
- Si un catálogo sin referencias cambia de área/padre, se añade al final del grupo de destino. Las comprobaciones de pertenencia del agente se realizan después de adquirir el bloqueo, coordinadas con los cambios administrativos.
- Los IDs son enteros positivos; nombres, descripción y booleanos tienen validación compartida. Se conservan los nombres y argumentos de las acciones existentes.
- Se rechaza borrar o cambiar de área/padre un catálogo referenciado por tickets existentes. Se ofrece desactivarlo. La comprobación de una categoría también considera referencias a sus subcategorías, para proteger enlaces históricos inconsistentes.
- Se revalidan las rutas existentes `/dashboard/sistema`, `/dashboard/configuracion` y `/dashboard/tickets/nuevo`. La tabla administrativa agrupa categorías por área y desactiva las flechas en los límites de cada grupo.

No se actualizan tickets, actividad, encuestas ni historial. Solo una acción explícita del catálogo modifica sus propios registros.

## Comprobaciones

84 comprobaciones con BD y sesiones ficticias: guards, ausencia de área, pertenencia, IDs/booleanos inválidos, orden manipulado/obsoleto, extremos del grupo, empates antiguos, grupo sin área, padre cruzado, creación concurrente por administrador/agente, movimiento frente a creación, doble toggle, fallo de la segunda escritura, rollback y liberación del bloqueo, transferencias entre grupos y protección de referencias existentes.

El doble exige que se adquiera el bloqueo antes de cualquier lectura/escritura y que se use READ COMMITTED. Comprueba las rutas revalidadas y ausencia de efectos tras errores. TypeScript aprobado con `tsc --noEmit --incremental false`; ESLint aprobado con 0 errores y las 3 advertencias conocidas. Vercel aprobó el build de Preview del código `234cab9`.

Se usó un directorio temporal privado en la caché del usuario con limpieza automática en `finally`, red aislada, entorno explícito sin credenciales, fuentes/dependencias de solo lectura y scratch limitado. Límites: 180 s de CPU, 6 GiB de espacio de direcciones, 256 procesos, 1024 descriptores, 100 MiB por archivo y scratch de 512 MiB. No se añadió framework de tests ni scripts de validación al repositorio. Las copias, verificadores y logs temporales no se retienen; este documento conserva el alcance y los resultados.

## Límites

Los dobles no certifican concurrencia ni bloqueos del motor PostgreSQL. La validación con dos conexiones reales, el recorrido autenticado y el comportamiento visual siguen pendientes.

El protocolo coordina las mutaciones de catálogos de la aplicación; la serialización con creación/derivación de tickets y con escrituras externas queda pendiente junto con los constraints de clasificación. No se presenta este bloque como una garantía global de integridad de relaciones ante cualquier escritor.

El orden es un campo operativo del catálogo: al mover un grupo con empates se ajusta su presentación, sin reconstruir datos históricos. No se comprueba ni se transforma el contenido de producción durante el despliegue.

## Preview

La [Preview de `234cab9`](https://vercel.com/hub-de-informacions-projects/requerimientos-hub/3xxkphQ8VWn8Kas9CNW1wpz5HnNf) figura como `success` (registro de GitHub `7388382483`). La rama continúa pendiente de merge y despliegue en producción. La compilación no acredita el recorrido autenticado ni las comprobaciones con PostgreSQL real.

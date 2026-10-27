# Integridad de tickets

## Alcance

Commit `d1f961d`, integrado en `main` y desplegado en producción el 27 de octubre de 2026, sobre el bloque previo `709e333`. No requiere cambios de esquema ni migraciones de datos.

- Aprobación, rechazo, cancelación, solicitud de validación y cambio manual de estado comparten una transición condicional. Se comprueban estado, creador, área, asignación y solicitud de validación esperados al escribir.
- Estado, historial y comentario de validación se confirman en una sola transacción. Un conflicto devuelve un error controlado antes de programar correo o revalidación; un fallo de historial/comentario revierte los cambios.
- Reabrir limpia los campos de cierre. Cerrar registra fecha y actor; la solicitud de validación anterior se conserva al cerrar y se limpia al volver a un estado activo.
- El selector genérico de estados no puede omitir el flujo específico de solicitud de validación. La desasignación también comprueba que el estado no haya cambiado desde su lectura.
- Código, ticket, historial inicial y vinculación de archivos se confirman juntos. Solo se vinculan adjuntos propios, pendientes y con el token validado por la acción. El contador mantiene su UPSERT atómico; el año se calcula explícitamente en Lima.
- El cierre automático actualiza únicamente filas que siguen pendientes y vencidas. Genera historial para las filas devueltas por UPDATE RETURNING, en lotes de hasta 500 y dentro de la misma transacción.
- Los reintentos acotados de creación reconocen UNIQUE tanto en el error directo como en la causa de un error envuelto por Drizzle.

## Interfaces

Las acciones conservan nombres, argumentos y respuesta `{ error: string }`/`{ success: true }`. El helper interno de creación admite un segundo argumento opcional para vincular adjuntos dentro de su transacción. El helper de transición recibe un snapshot autorizado por la acción; no reemplaza los guards ni la validación de permisos.

La comparación de la fecha de validación usa precisión de milisegundos, coherente con Date, para admitir registros históricos con microsegundos. También evita cerrar usando una solicitud de validación anterior aunque el estado haya vuelto a ser `pending_validation`.

## Comprobaciones

Se usan verificadores temporales fuera del repositorio, con BD/sesiones/correo simulados y sin añadir un framework de pruebas. Se ejecutan con red aislada, entorno explícito sin credenciales reales, fuentes/dependencias de solo lectura y límites de recursos.

Los casos cubren aprobación/rechazo concurrentes, repetición, fallo de historial o comentario, solicitud renovada, reapertura, anulación, cron repetido, límites de lote y rollback entre lotes. También cubren creación con adjuntos propios/ajenos, rollback de contador/ticket/historial/vinculación, reintentos y cambio de año UTC/Lima. Se repite la matriz previa de permisos para detectar regresiones.

Resultado: 59 comprobaciones de integridad y 146 de regresión de permisos aprobadas en memoria. Tipos aprobados con `tsc --noEmit --incremental false`; ESLint aprobado con 0 errores y las 3 advertencias conocidas de navegación/React Hook Form. No se suprimieron reglas para aprobarlas.

Estos dobles transaccionales comprueban las decisiones y el uso de la transacción en el código; no prueban el motor de PostgreSQL ni sus bloqueos reales. El recorrido autenticado y la concurrencia real siguen pendientes. No se invocó el cron real ni se operó manualmente sobre datos, archivos o correo de producción.

## Despliegue

Vercel aprobó los builds de Preview y Production para `d1f961d`. El [despliegue de producción](https://vercel.com/hub-de-informacions-projects/requerimientos-hub/831Cc7cYCr7jsdENv9yc4gCf36cG) figura como `success` (registro de GitHub `7373155419`). En https://requerimientos-hub.vercel.app se comprobaron `/login` (200), `/api/auth/get-session` sin sesión (200, `null`) y `/dashboard` sin sesión (307 hacia `/login`).

No se ejecutaron migraciones, reset, drop, seed ni operaciones manuales sobre la BD. El código conserva los registros de historial existentes y añade eventos al confirmar las transiciones normales. La guía `AGENTS.md` recoge explícitamente la protección de producción y la compatibilidad exigida para futuros cambios de esquema.

## Límites y siguientes pasos

- El esquema del historial exige un usuario incluso para eventos automáticos. Se conserva la referencia al responsable/creador en el historial; el ticket queda marcado como cierre de sistema y sin autor humano de cierre. Representar un actor de sistema independiente requiere un cambio de esquema separado.
- La disponibilidad de áreas/catálogos se valida antes de crear; la serialización con cambios administrativos concurrentes y los constraints de clasificación requieren revisión adicional.
- Falta el cron de recordatorios recuperable con claim/lease y reintentos, compensación de archivos, rate limiting compartido y protección de scripts destructivos.
- El arreglo del año del código no resuelve por sí solo la visualización de fechas de calendario ni el cálculo de horarios/SLA; esos hallazgos continúan pendientes.

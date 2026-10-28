# Integridad y métricas de encuestas de usuarios

## Estado y alcance

Preparado en `fix/integridad-encuestas`, sobre `ae8d659`. Pendiente de integración y despliegue en producción. Continúa la validación de respuestas y la corrección de muestras comparables del plan aprobado. No modifica el esquema ni aplica migraciones o backfills.

## Envío de respuestas

- IDs enteros positivos y cuatro calificaciones enteras de 1 a 5 antes de consultar BD. Se conservan los campos y argumentos de la acción.
- Solo el creador activo de un ticket resuelto y con área puede enviar una encuesta. Se mantiene la elegibilidad actual de la aplicación, sin introducir una restricción nueva por slug de área.
- La lectura del ticket usa `FOR UPDATE` dentro de una transacción. Una reapertura que gane antes de esa lectura impide enviar la encuesta; una encuesta confirmada antes de reabrir se conserva.
- La inserción usa el vínculo único de encuesta por ticket ya definido en el modelo y `ON CONFLICT DO NOTHING` con RETURNING. Dos envíos devuelven un éxito y un error controlado, sin sobrescribir la evaluación original.
- Se revalida solo tras confirmar una respuesta nueva. Un fallo de inserción revierte la transacción y no devuelve éxito.

## Tasa y periodo

Numerador y denominador usan el mismo conjunto de tickets actualmente resueltos, filtrado por área y asignación actual del agente. Las fechas se aplican al **cierre del ticket en el calendario de Lima**: desde inclusivo, hasta inclusivo mediante un límite superior exclusivo al inicio del día siguiente. La conversión a UTC está en el SQL parametrizado, coherente con los timestamps del modelo.

Ejemplo: dos tickets del agente A cerrados el 1 de octubre y una respuesta recibida el 10 de octubre. El periodo de cierre del 1 de octubre muestra 1/2 = 50 %, incluyendo esa respuesta posterior. La tabla conserva la fecha real de respuesta y la etiqueta como tal.

Respuestas y total se consultan en una transacción de solo lectura con aislamiento REPEATABLE READ. Se evita mezclar estados de momentos distintos. El filtro de agente se ejecuta en BD; no se descarga toda la colección para filtrarla después en memoria. El selector incluye agentes con tickets resueltos aún sin respuesta.

Sin respuestas se mantiene el número real de tickets resueltos (0/N). Pantalla y reporte explican el criterio temporal; el reporte ahora también propaga `areaId` y presenta sus fechas en Lima. Se conserva el escape de texto libre.

## Datos históricos

No se corrigen ni eliminan respuestas anteriores. Los promedios y distribuciones omiten calificaciones históricas fuera del dominio, conservando las filas en la tabla y mostrando un aviso si aparecen. El total de respuestas sigue contando esas filas; las medias de cada criterio usan solo sus valores válidos.

La encuesta sigue siendo única por ticket, no por ciclo de reapertura. Una respuesta anterior se cuenta para ese ticket cuando vuelve a estar resuelto; no se inventa una vinculación a un ciclo histórico ni un agente histórico. Los tickets reabiertos quedan fuera de la muestra de resueltos mientras estén abiertos. Un cierre de fecha desconocida se incluye sin filtro temporal y se excluye al elegir un periodo, sin inferir fechas almacenadas.

El alcance de agentes exige tanto el área del ticket actual como el área almacenada en la encuesta. Datos de áreas inconsistentes no se reparan mediante este cambio.

## Comprobaciones

78 comprobaciones temporales: 70 con datos/sesiones/BD simulados y 8 del SQL generado por el Drizzle instalado, usando `drizzle.mock` sin conectarse al motor.

Se cubren calificaciones/IDs inválidos, promedios y distribuciones conocidos, conservación de valores históricos, cero respuestas, filtros por área/agente, ambos límites del día de Lima, respuestas posteriores al cierre, registros sin fecha de cierre, lectura consistente ante cambio concurrente, selector con agentes sin respuestas, roles, duplicados, fallo de inserción, carrera con reapertura, exportación por área y escape de texto libre. El SQL compilado conserva la subconsulta de tickets y sus columnas sin mezclar aliases de encuestas.

TypeScript aprobado con `tsc --noEmit --incremental false`; ESLint aprobado con 0 errores y las 3 advertencias conocidas. El build de Preview sigue pendiente. Las comprobaciones no se presentan como concurrencia real de PostgreSQL ni validación visual/autenticada.

Los verificadores, copias y logs temporales se eliminan automáticamente; no se añade framework de tests ni se recrea `.codex-validation-tickets`. La ejecución usa aislamiento de red, entorno ficticio explícito, fuentes/dependencias de solo lectura y los límites de CPU/memoria/procesos/archivos/scratch de los bloques anteriores.

## Pendientes relacionados

Paginación/agregación de colecciones grandes, métricas de proveedores/dashboard/SLA y sus periodos/ciclos, índices/constraints efectivos y validación real. No se inspeccionó la BD de producción ni se certificaron sus constraints; la aplicación usa el vínculo único ya declarado en el modelo.

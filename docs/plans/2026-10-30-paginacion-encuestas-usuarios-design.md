# Paginación de encuestas de usuarios

## Alcance aprobado

Continúa la paginación/agregación de D08 del plan de auditoría aprobado, después de integrar estadísticas personales. Rama local `fix/paginacion-encuestas-usuarios`, sin Preview ni cambios de datos. Se limita a encuestas de usuarios; proveedores y sus listados siguen separados. El merge de este bloque se presenta después de la validación.

## Alternativas

Paginar solo en el cliente seguiría cargando todas las respuestas y sus relaciones. Aplicar LIMIT al lector actual y calcular indicadores con esa página cambiaría los promedios y la tasa. Se elige agregación SQL sobre toda la cohorte y lectura de 25 detalles por página. La exportación completa mantiene un lector interno sin paginación, protegido por el mismo alcance autenticado; no se ofrece un modo público de server action que permita omitir el límite de tabla.

## Consulta y autorización

Se conservan filtros de área, agente y fecha de cierre en Lima, el estado resolved y la consistencia entre respuestas y denominador. Agentes quedan forzados a su área; admin puede consultar área o alcance global. La acción sigue usando requireAgent y Zod. El reporte valida filtros y deriva su área desde la sesión antes de invocar el lector interno.

Una transacción REPEATABLE READ READ ONLY obtiene agregados de calificaciones y cantidad de tickets resueltos, calcula la página efectiva y lee los detalles. Los promedios/distribuciones usan todo el conjunto filtrado, nunca la página. SQL agrupa cada criterio/calificación válida (1–5); calificaciones inválidas se agrupan en un bucket nulo, con máximo 24 buckets para los cuatro criterios. Se conserva la exclusión histórica de valores inválidos de promedios/distribuciones y el conteo de inválidos por calificación. No se altera ninguna respuesta.

La tabla ordena por createdAt DESC e ID DESC para desempatar. La página se valida como entero positivo; URL ausente/inválida/repetida normaliza a uno. Se acota a la última página disponible antes de calcular OFFSET. Cambiar filtros reinicia page, como ya hace SurveyFilters. Se muestra rango de filas, total, página efectiva y enlaces anterior/siguiente conservando filtros. Cero respuestas conserva el estado vacío. El render aclara que los indicadores incluyen todas las respuestas filtradas.

La descarga HTML imprimible conserva todas las filas del filtro y el mismo resumen, sin depender de la página visible. Su coste de exportación completa se documenta como límite pendiente; no se introduce una cuota de datos ni se trunca el informe.

## Implementación y verificación

1. Helper de página/URL y schema Zod; resumen común a partir de distribuciones y buckets SQL.
2. Lector transaccional interno compartido, acción siempre paginada y descarga completa autorizada.
3. Controles accesibles de navegación y conexión con searchParams, conservando filtros/reset de página.
4. Tipos, ESLint y build local; fuente ejecutada con BD/auth ficticios y SQL generado; EXPLAIN sin ANALYZE y SELECT con CTE/VALUES ficticios en READ ONLY, sin tests en el repositorio.
5. Registrar despliegue anterior, resultados, límites y pendientes; commit local de esta entrega.

Quedan pendientes recorrido autenticado de navegación/descarga, concurrencia entre solicitudes, planes/índices con volumen real, exportación streaming, paginación de proveedores y demás calidad/observación. No se ejecutan migraciones, escrituras, worker, correo o Drive.

El [registro del bloque](../dev/2026-10-30-paginacion-encuestas-usuarios.md) conserva implementación, verificaciones y límites.

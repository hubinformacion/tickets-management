# Paginación y agregados de encuestas de usuarios

## Estado

Implementado originalmente en `fix/paginacion-encuestas-usuarios` e integrado/desplegado después como `e8c46e7`. Production `7449414166` aprobada, SHA público confirmado y rama integrada eliminada. Continúa D08 del plan aprobado. El [diseño](../plans/2026-10-30-paginacion-encuestas-usuarios-design.md) delimita alcance, autorización y alternativas. No requiere migraciones ni escrituras en BD.

La entrega anterior de estadísticas personales se integró y desplegó como `28fadb64f18e41776e1fa7bcc81f7a4be5055140`. Production `7449141858` aprobada y SHA confirmado en el dominio público; cola disponible y corte fijo `2026-10-28T17:00:00.000Z`. Login/sesión anónima 200 y dashboard 307. Se verificó igualdad de contenido con main antes de eliminar `fix/estadisticas-personales`. Sin Preview ni ejecución del worker, correo o borrados reales.

## Comportamiento

La tabla muestra 25 respuestas por página. Su acción pública siempre pagina, incluso si se omite el argumento page; no incorpora un parámetro de exportación o un límite configurable que permita cargar todas las filas por esa vía. La página URL se valida con Zod; ausente, inválida o repetida normaliza a uno. Se acota a la última página disponible antes de calcular OFFSET, evitando desbordamientos con valores grandes.

Los indicadores y distribuciones consideran todas las respuestas del filtro. El lector interno obtiene primero los agregados y el denominador de tickets resueltos y después lee los detalles. Todo ocurre en una transacción REPEATABLE READ READ ONLY, conservando la consistencia del render entre resumen, cantidad y página. La cohorte conserva área efectiva, agente, estado resolved y fechas de cierre en Lima, además de la restricción del área almacenada en la encuesta. Los agentes quedan forzados a su área; admin conserva su selección o alcance global.

Los cuatro criterios se agregan por calificación válida 1–5. Valores inválidos, incluidos nulos, se agrupan en un bucket nulo por criterio; se retornan como máximo 24 buckets. Promedios y distribuciones excluyen inválidos, pero el total de respuestas conserva todas las encuestas y el aviso mantiene su conteo de calificaciones inválidas. La finalización del resumen es común para la lectura por buckets y el helper anterior por filas. No se normaliza ni modifica historia.

El orden de tabla usa createdAt DESC e ID DESC. La navegación muestra rango de filas, cantidad total y página efectiva, con Anterior/Siguiente, nombre accesible y controles deshabilitados en los extremos. Conserva los filtros en los enlaces; SurveyFilters ya reinicia page al modificarlos y mantiene ese comportamiento. La UI aclara que los indicadores incluyen todo el filtro y la tabla muestra una página.

La descarga HTML imprimible usa el lector interno sin paginación, después de autenticar, validar filtros y derivar el alcance por área desde la sesión. Conserva todas las filas y el mismo resumen, aunque la página visible sea la segunda u otra. No se trunca el reporte. Los errores devuelven un mensaje genérico y el registro del servidor no incluye datos sensibles.

## Verificación

- TypeScript sin emisión, ESLint completo sin advertencias y build local completo aprobados; 23 páginas generadas.
- Catorce observaciones de fuente con BD/auth ficticios: normalización/clamp de página, URL y filtros, dos páginas sin solapamiento con resumen completo idéntico, área forzada de agente, última página, acción siempre limitada/reporte interno completo, descarga completa con page en URL, navegación accesible, compilación de filtros, selección de admin, rechazos antes de SQL, autenticación, cohorte vacía y opciones transaccionales.
- Con 50 respuestas y 60 resueltos, dos páginas de 25 conservaron total=50 y tasa=83,3%. Tres calificaciones inválidas no entraron a promedios y distribuciones; el resumen por buckets coincidió con el helper por filas. La descarga incluyó la primera y última respuesta del conjunto ficticio.
- Ocho formas SQL reales generadas por Drizzle, incluidas relaciones, filtros y variantes con/sin LIMIT/OFFSET: EXPLAIN sin ANALYZE en READ ONLY. No se ejecutaron para medir filas reales o latencias.
- Ocho SELECT con tablas sustituidas por CTE/VALUES ficticios: total de cohorte, buckets acotados y valores inválidos/fraccionarios, área actual/almacenada, fechas de cierre/agente, límite/desplazamiento, desempate por ID y exportación completa. Las fixtures usaron numeric para comprobar también exclusión de fracciones; las columnas de producción siguen siendo smallint. Sin tablas temporales ni escrituras.

El código de aplicación se ejecutó aislado sin red, sin variables reales y con fuentes/dependencias de solo lectura. El build usó copia sin archivos de entorno, variables ficticias y fuentes públicas. Las conexiones de planificación/fixtures verificaron destino y utilizaron READ ONLY con timeout. No se añadieron framework o tests al proyecto. El material temporal se retiró al terminar.

## Límites y pendientes

La navegación React inspeccionada verifica props/enlaces; no sustituye el recorrido autenticado, teclado, render visual o impresión en navegador. El snapshot pertenece a cada solicitud: inserciones/cambios entre solicitudes pueden desplazar páginas OFFSET. El desempate por ID estabiliza el orden, pero no fija un snapshot entre páginas. Una URL fuera de rango muestra la última página efectiva sin reescribir automáticamente la URL.

SQL sigue recorriendo el conjunto filtrado para los agregados, aunque el lector devuelve pocos buckets y solo 25 detalles. No se afirma una latencia con volumen real ni se añaden índices sin revisar sus planes. OFFSET profundo y exportación completa siguen teniendo coste; streaming y datos de volumen se revisan por separado. Esta entrega pagina únicamente encuestas de usuarios: proveedores, sus encuestas y otros listados continúan pendientes.

Pendientes: navegación/descarga autenticada, planes e índices con volumen representativo, paginación restante, CI/accesibilidad/Doctor y observación de Gmail/Drive/PG/colas. La reconciliación de huérfanos continúa separada y la revisión de carpeta/OAuth sigue cerrada por decisión del usuario.

La [paginación posterior de tickets de proveedores](2026-10-30-paginacion-proveedores.md) comparte las primitivas de página/URL mediante wrappers compatibles de este módulo. Sigue preparada en rama local independiente.

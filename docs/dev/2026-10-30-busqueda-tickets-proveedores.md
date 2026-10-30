# Búsqueda remota de tickets vinculados a proveedores

## Estado

Implementado en `perf/busqueda-tickets-proveedores`, pendiente de merge/despliegue. Continúa el selector remoto previsto tras la paginación. El [diseño](../plans/2026-10-30-busqueda-tickets-proveedores-design.md) delimita autorización, selección existente y límites. No requiere tablas, índices ni migraciones adicionales.

La paginación y la sincronización de los [tres índices aplicados](2026-10-30-aplicacion-indices.md) se integraron/desplegaron como `d214f412474e8ae8888de38a6803d6dfe7202d37`. Production `7450399708` aprobada; el dominio público confirmó SHA, cola disponible y corte fijo `2026-10-28T17:00:00.000Z`. La rama `fix/paginacion-proveedores` se eliminó después de verificar igualdad con main. No hubo Preview ni invocación de worker/correo/Drive. Los índices se crearon por autorización específica, sin borrar o reescribir datos históricos.

## Comportamiento

La página de proveedores ya no consulta/envía todos los tickets del área para poblar el selector. Conserva solo las lecturas de la tabla paginada y proveedores activos. El selector obtiene hasta 25 coincidencias de id/código/título mediante una acción autenticada; consulta 26 para indicar si hay más, sin un COUNT global.

Al abrir muestra recientes. Desde dos caracteres busca literalmente por código o título; escapa porcentaje, guion bajo y barra inversa de LIKE. Una letra muestra indicación sin consultar y Zod valida tipo/término de hasta 120 caracteres. Vacío conserva la búsqueda de recientes. La acción deriva el área exclusivamente de requireAgent y la sesión, también para admin; sin área o autenticación no consulta. El contador independiente providers:ticket-search permite 30 consultas/minuto por usuario y falla cerrado si el almacenamiento no confirma el límite. No comparte el presupuesto de altas de proveedores.

El cliente espera 300ms desde el último cambio, limpia resultados anteriores e ignora respuestas obsoletas o de un selector cerrado. Desactiva el filtro local de Command para respetar los resultados de servidor. Muestra búsqueda en curso, error/reintento, mínimo de caracteres y aviso para precisar si hay más de 25 resultados. No ejecuta una búsqueda completa solo para reconstruir la etiqueta actual.

La selección existente se obtiene de la relación ticket que ya carga la fila de proveedor: un ticket antiguo sigue visible aunque no esté entre recientes. Una selección nueva se conserva localmente al cambiar/cerrar la búsqueda; limpiar asigna null. No se cambian las validaciones de vínculos, acciones de alta/edición/cierre/reapertura/borrado, formatos, cuotas ni permisos.

## Verificación

- TypeScript sin emisión, ESLint sin advertencias y build local completo aprobados, con 23 páginas.
- Ocho observaciones de fuente con BD/auth/limitador y hooks React controlados: recientes acotados/hasMore, caracteres LIKE literales/parametrizados, validación antes de límite/BD, fallo cerrado de limitador/área/auth, área de admin, selección antigua y respuesta obsoleta, selección nueva conservada y limpieza/cierre que ignoran respuesta tardía.
- Se ejecutaron efectos reales del componente con timers y respuestas controladas; no se montó un navegador ni se ejecutó React DOM. El limitador fue sustituido: no se escribieron contadores reales como prueba. Error/reintento y accesibilidad completos en navegador siguen pendientes.
- Cuatro consultas generadas por la acción se planificaron con EXPLAIN sin ANALYZE en READ ONLY; sin medir filas o latencias reales.
- Cuatro SELECT con la tabla sustituida por CTE/VALUES ficticios: sonda de 26, orden fecha/ID, porcentaje/guion bajo/barra inversa literales, ticket histórico fuera de recientes y aislamiento de áreas de agente/admin. No hubo tablas temporales ni escrituras.

La ejecución de aplicación se aisló sin red, sin archivos de entorno/variables reales y con fuentes/dependencias de solo lectura. El build usó variables ficticias y fuentes públicas. Las consultas operativas verificaron destino y utilizaron READ ONLY con timeout. No se añadieron framework/tests al repositorio. El material temporal de validación y operación se retiró después de documentar los resultados.

## Límites y siguientes pasos

La búsqueda con comodín inicial puede recorrer los tickets del área; no se añadieron trigram/GIN ni nuevos índices para esta consulta. La cantidad retornada está acotada, pero no se afirma una mejora de latencia con volumen real. El debounce limita consultas mientras se escribe y el límite persistente controla frecuencia; no sustituyen autorización ni garantías de rendimiento.

Descartar una respuesta obsoleta no cancela la consulta que ya llegó al servidor. La selección histórica depende de la relación que ya devuelve la fila; no se reconstruyen vínculos ausentes o inválidos. Las opciones de proveedores y las exportaciones completas conservan su coste anterior.

Pendientes: merge/despliegue de este bloque, navegación autenticada/teclado y errores/reintentos en navegador, paginación de encuestas de proveedores/otros listados, exports grandes, observación de índices con uso representativo y calidad/CI/Doctor. Reconciliación de huérfanos y servicios reales siguen separados; la revisión de carpeta/OAuth permanece cerrada.

# Paginación de evaluaciones de proveedores

Continúa D08 tras la búsqueda remota. El usuario autorizó todos los despliegues necesarios y continuar los pendientes: este bloque se integra/publica después de validar, sin Preview, manteniendo cambios independientes y datos históricos intactos.

Paginar solo el cliente seguiría cargando todo; limitar el lector anterior cambiaría los indicadores y truncaría la descarga. Se elige un lector interno REPEATABLE READ READ ONLY con resumen SQL de toda la selección y 25 detalles por página. La acción pública siempre pagina; el reporte autenticado conserva la lectura completa. Orden createdAt DESC e ID DESC y clamp de página antes de OFFSET.

Agentes quedan restringidos al área almacenada en la encuesta; admin mantiene alcance global. El filtro agente sigue siendo submittedById. Las fechas filtran el registro de la evaluación por días de Lima, corrigiendo los límites UTC del código anterior, sin alterar timestamps. Las opciones de agentes se obtienen con SELECT DISTINCT en vez de cargar todas las encuestas con relaciones.

El resumen consulta COUNT y promedios por criterio (cinco). Solo calificaciones enteras 1–5 participan; las inválidas se conservan en detalle y se cuentan para un aviso. El promedio global conserva para datos válidos la fórmula anterior: promedio de medias por criterio redondeadas a un decimal y nuevo redondeo final. Si algún criterio no tiene valores válidos, no se presume cero en el promedio global. No se reescribe historia.

Se reutilizan helpers/paginador existentes; cambiar filtros ya reinicia page. La UI aclara que los indicadores incluyen todo el filtro, la tabla solo la página y las fechas corresponden a respuestas registradas en Lima. La exportación mantiene todas las filas del filtro y avisa si hay ratings inválidos.

Pasos: resumen/cohorte/lector interno, acción paginada/opciones DISTINCT y reporte completo, página/navegación/aviso; tipos/lint/build aislados; fuente con auth/BD ficticias y comprobaciones SQL con EXPLAIN sin ANALYZE y CTE/VALUES READ ONLY; documentar, merge/despliegue autorizados y verificar Production/SHA. No se añaden tests al proyecto ni DDL/DML, workers, Gmail o Drive.

Quedan pendientes navegador/teclado/impresión, volumen real, exportaciones grandes, otros listados y calidad/CI/Doctor. No se añaden índices específicos sin evidencia de necesidad.

El [registro del bloque](../dev/2026-10-30-paginacion-encuestas-proveedores.md) conserva implementación, comprobaciones y límites.

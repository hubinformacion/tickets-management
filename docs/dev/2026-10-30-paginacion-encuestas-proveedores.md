# Paginación de evaluaciones de proveedores

## Entrega

Implementado y validado en `fix/paginacion-encuestas-proveedores`. El usuario autorizó todos los despliegues necesarios y continuar pendientes; esta entrega se integra y publica tras las comprobaciones. El [diseño](../plans/2026-10-30-paginacion-encuestas-proveedores-design.md) delimita alcance y decisiones. No requiere DDL, índices ni escrituras de negocio.

La búsqueda remota anterior se integró/desplegó en `a7bdd2e7273a8385bcb1b50310351bac50463b1c`. Production `7450809609` aprobada y SHA confirmado en el dominio público, cola disponible y corte fijo `2026-10-28T17:00:00.000Z`. La rama integrada se eliminó tras verificar igualdad con main. Sin Preview ni ejecución de worker/Gmail/Drive. Los tres índices de la entrega anterior permanecen aplicados; no se reconstruyeron ni añadieron más.

## Consulta y coherencia

La acción pública devuelve 25 evaluaciones por página y los indicadores de toda la selección. El lector interno agrupa COUNT y medias de cinco criterios en SQL, normaliza/clampa la página y consulta detalles con orden createdAt DESC e ID DESC. Resumen y detalles comparten una transacción REPEATABLE READ READ ONLY. Ya no se cargan todas las relaciones para calcular los indicadores o las opciones de agentes; estas últimas usan SELECT DISTINCT con su alcance por área.

Agentes quedan forzados al área almacenada en la evaluación. Admin conserva su alcance global, incluso sin área asignada. El filtro agente sigue representando al usuario que registró la respuesta. No se introduce una restricción por el estado actual del ticket de proveedor: se conservan las evaluaciones históricas después de una reapertura.

Las fechas se aplican a createdAt por días de Lima, desde inicio inclusive hasta inicio del día posterior exclusivo. Se corrigen los límites UTC del código anterior, sin modificar timestamps. La UI aclara fecha de registro de evaluación, población completa de indicadores y página de detalle. El paginador reutilizado admite etiquetas de evaluaciones y conserva sus valores predeterminados para encuestas de usuarios.

Solo ratings enteros de 1–5 participan en promedios; inválidos y nulos quedan visibles en detalle y se cuentan por calificación para un aviso. Para datos válidos se conserva la fórmula anterior del promedio global: medias por criterio redondeadas a un decimal, promedio de esas medias y redondeo final. Un criterio sin ningún valor válido no se presume cero en ese promedio global. Las respuestas no se normalizan ni eliminan.

La descarga HTML imprimible autentica, valida filtros y deriva el alcance antes de utilizar el lector interno sin paginación. Conserva todas las evaluaciones filtradas, independientemente de page en URL. El reporte también avisa de calificaciones históricas inválidas. Se conserva el escape HTML y los fallos se registran con mensajes genéricos, sin imprimir errores/filas sensibles.

## Verificación

- TypeScript sin emisión, ESLint sin advertencias y build completo aprobados; 23 páginas generadas.
- Once observaciones de fuente con BD/auth ficticios: páginas con resumen completo, clamp/límite obligatorio, reporte completo con page en URL, filtros/SELECT DISTINCT, rechazo antes de SQL, autenticación, alcance global de admin, vacío, medias disponibles/fórmula, navegación y opciones transaccionales.
- Con 50 evaluaciones se devolvieron dos páginas de 25 con los mismos indicadores; el reporte incluyó la primera y última. Sin datos, página uno y medias cero. Sin área, un agente no consulta; admin mantiene su alcance global.
- Diez formas SQL generadas por Drizzle (resumen, relaciones, filtros, LIMIT/OFFSET y opciones globales/por área) planificadas con EXPLAIN sin ANALYZE en READ ONLY, sin medir filas reales o latencias.
- Diez SELECT con tablas sustituidas por CTE/VALUES ficticios comprobaron áreas, agregados completos, ratings inválidos/fraccionarios, límites 04:59/05:00 UTC alrededor del día de Lima, agente registrador, orden fecha/ID, páginas/reporte completo y opciones DISTINCT. Sin tablas temporales ni escrituras.

La fuente se ejecutó sin red, archivos de entorno ni variables reales, con código/dependencias de solo lectura. El build utilizó configuración ficticia y fuentes públicas. Las consultas operativas verificaron destino y usaron READ ONLY con timeout. No se añadieron framework/tests al repositorio; el material temporal se retira al finalizar.

## Límites pendientes

La inspección React verifica props/enlaces, no navegación/teclado/impresión en navegador. El snapshot es por solicitud: OFFSET puede desplazarse entre páginas por nuevas respuestas. El agregado sigue recorriendo la selección aunque retorne pocos campos; la exportación completa conserva su coste anterior. No se afirma una mejora de latencia con volumen real.

Continúan validación autenticada de Google/Gmail/Drive/colas y permisos, exportaciones grandes, otros listados, observación de índices/constraints compatibles, calidad/CI/accesibilidad/Doctor y reconciliación de huérfanos. No se reabre la revisión de carpeta/OAuth cerrada por el usuario ni se disparan recordatorios como prueba.

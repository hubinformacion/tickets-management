# Estadísticas personales por estado real

## Alcance

Continúa el bloque de métricas personales y paralelización del plan de auditoría aprobado, tras integrar periodos/tendencias. Se trabaja en `fix/estadisticas-personales`. No añade selector, tablas, migraciones, escrituras ni cambios de permisos. El siguiente merge requiere aprobación del usuario sobre la entrega.

## Hallazgo y alternativas

El gráfico resta pendientes y resueltos del total para obtener Abiertos. Como pendientes ya incluye abiertos, en progreso y validación, el resultado corresponde a anulados; además, todos los pendientes aparecen como En progreso. Corregir solo esa etiqueta mantendría la agrupación engañosa. Se elige consultar y mostrar los estados reales y aprovechar ese agrupado para los KPIs. Una tabla materializada de métricas sería innecesaria para esta corrección.

## Comportamiento

Una consulta agrupa todos los tickets creados por el usuario por estado; el total se deriva de ese mismo resultado. Pendientes suma únicamente open/in_progress/pending_validation y resueltos suma resolved. La tasa mantiene resueltos/total, incluidos anulados en el total, con alcance histórico y estado actual. No incluye tickets observados o asignados que otro usuario creó.

En paralelo se consulta el promedio numérico de las respuestas de encuesta enviadas por el usuario, conservando la población original por userId. Sin respuestas se conserva cero y la UI muestra un guion. No se mezclan otros usuarios ni se incorpora un periodo implícito.

El gráfico recibe statusCounts y muestra open, in_progress, pending_validation, resolved y voided con sus etiquetas y colores existentes. Un estado histórico no reconocido conserva su cantidad con una etiqueta neutral; no se reescribe ni se oculta del total. No se infiere ningún estado por resta. Las etiquetas aclaran alcance histórico, estado actual y respuestas enviadas. Se conserva el diseño visual.

## Implementación y verificación

1. Sustituir cuatro lecturas en serie por dos consultas independientes en Promise.all; reutilizar el agrupado para conteos y exponer statusCounts.
2. Usar statusCounts en el gráfico y describir pendientes/histórico/satisfacción sin modificar la página principal Mi panel.
3. Verificar tipos, ESLint y build con variables ficticias; comprobaciones aisladas con cliente de BD ficticio y árbol React del componente; SQL con EXPLAIN sin ANALYZE y SELECT sobre CTE/VALUES en READ ONLY.
4. Registrar el despliegue anterior, validación y límites; commit local sin publicar esta rama ni generar Preview.

No se añaden tests al proyecto ni se usan tickets reales como fixtures. Quedan pendientes recorrido autenticado/visual, datos de volumen, paginación, índices, calidad y observación de servicios. No se invoca correo, Drive, worker ni borrado real.

El [registro del bloque](../dev/2026-10-30-estadisticas-personales.md) conserva comprobaciones, límites y pendientes.

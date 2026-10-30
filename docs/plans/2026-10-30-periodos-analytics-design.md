# Periodos y tendencias de analytics

## Alcance

Continúa D08 y las consultas independientes de D07 del plan aprobado. La corrección SLA anterior se integra primero en main; este bloque se desarrolla en `fix/periodos-analytics`, sin Preview, migraciones ni cambios históricos. La aprobación de continuidad del usuario cubre esta corrección prevista; el siguiente merge se presenta como entrega separada.

## Alternativas y elección

Cambiar solo las etiquetas dejaría gráficos fuera del selector y el error de Todo. Filtrar todas las métricas por creación mezclaría poblaciones: encuestas y cierres ocurren después de la creación. Se elige un intervalo compartido con fecha de evento explícita por métrica, dentro del diseño del plan aprobado. Persistir snapshots de métricas requeriría almacenamiento y sincronización adicionales fuera de este bloque.

## Periodo y poblaciones

Se valida con Zod y se normaliza el parámetro URL a week/month/quarter/year/all; ausente, inválido o repetido vuelve a month. Todo se conserva explícitamente como range=all, sin el corte artificial de 2020. La página calcula una sola fecha final y la comparte con las consultas; los periodos son móviles, calculados en Lima, con meses/años acotados al último día válido. Todo incluye todos los eventos hasta ese instante, sin fecha inicial.

Volumen/áreas/prioridades/categorías y tasa de resolución describen tickets creados en el intervalo y su estado actual. Satisfacción promedio y tendencia mensual describen encuestas respondidas en el intervalo, por el área guardada en la encuesta. SLA conserva ciclos cerrados en el intervalo. La tendencia semanal cuenta altas por creación y cierres resolved registrados en el historial por changed_at, incluidos cierres de un ticket reabierto después. No usa updatedAt ni infiere eventos ausentes. Las semanas y meses se agrupan en calendario de Lima; se explicita que se comparan altas y cierres, no cohortes idénticas.

La carga de agentes es una fotografía actual, independiente del periodo, y se etiqueta así. La tarjeta Sin asignar del agente usa la misma condición del KPI de tickets abiertos sin responsable, no todo open. Las estadísticas personales siguen siendo históricas sin selector.

## Consultas y UI

Las consultas independientes de KPIs se ejecutan con Promise.all; el total se deriva del agrupado por estado para evitar una consulta redundante. Se preservan alcance por área y autorización de página. Promedios de encuestas se convierten a número en SQL. Los gráficos reciben el periodo compartido y se conservan sus tipos de resultados. No se rediseña la interfaz ni se añaden buckets artificiales vacíos; los intervalos inicial/final de semana o mes pueden ser parciales.

## Pasos y verificación

1. Helper puro de normalización/periodo y corrección de URL Todo.
2. Adaptar consultas y dashboard para compartir el intervalo, filtrar por fecha de evento y agrupar en Lima.
3. Corregir etiquetas, Sin asignar y paralelización de KPI.
4. Tipos, ESLint y build local con configuración ficticia; escenarios aislados de límites de calendario/URL y generación de SQL; EXPLAIN sin ANALYZE y SELECT sobre CTE/VALUES ficticios en READ ONLY cuando corresponda.
5. Registrar publicación previa, resultado, límites y pendientes; commit local sin nuevo merge ni push de esta rama.

No se añaden tests al repositorio ni se invocan worker, correo, cargas o borrados reales. Quedan pendientes paginación, métricas personales restantes, índices/volumen real, integración autenticada y observación de servicios.

El [registro del bloque](../dev/2026-10-30-periodos-analytics.md) conserva resultados, límites y pendientes.

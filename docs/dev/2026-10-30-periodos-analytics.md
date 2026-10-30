# Periodos y tendencias de analytics

## Estado

Implementado en `fix/periodos-analytics`, pendiente de merge/despliegue. Continúa D08 y la paralelización de D07 del plan aprobado. El [diseño](../plans/2026-10-30-periodos-analytics-design.md) describe poblaciones, alternativas y verificación. No añade tablas/columnas ni modifica datos.

El bloque SLA anterior se integró como `5453fd1669b29bdf1ea0e118a7c350078e03e9c8`. Production `7444876029` aprobó el despliegue y el dominio público confirmó ese SHA, queueReady=true y el corte fijo `2026-10-28T17:00:00.000Z`. No se invocó el worker ni se enviaron correos. Tras verificar igualdad de contenido con main se eliminó la rama `fix/metricas-sla-ciclos`. No se generó Preview.

## Fallos corregidos

La opción Todo borraba range de la URL y la página volvía a month. Ahora conserva range=all y los demás parámetros. El servidor valida el rango con Zod y normaliza valores ausentes, inválidos o repetidos a month. Las consultas sin selector mantienen el alcance histórico por defecto. Todo retira la fecha inicial artificial de 2020 y conserva la fecha final compartida.

La página construye un solo intervalo antes de consultar. Semana resta siete días; mes/trimestre/año restan meses/años de calendario en Lima, acotando el día al final válido del mes y preservando la hora. El intervalo incluye sus extremos. Todos los filtros del render reciben los mismos instantes; no se afirma que consultas paralelas compartan un snapshot de PostgreSQL.

Satisfacción y sus tendencias ignoraban el selector. Ahora usan la fecha de respuesta de la encuesta, conservando el área guardada en ella. Los promedios se convierten a double precision en SQL para retornar números. Volumen y distribución continúan describiendo los tickets creados en el intervalo y su estado actual. La tasa de resolución divide resueltos actuales entre ese mismo conjunto de tickets creados; no representa cantidad de cierres ocurridos en el intervalo. La UI identifica estas poblaciones.

La tendencia semanal dejaba ocho semanas fijas y agrupaba resueltos actuales por updatedAt. Ahora sigue el selector y cuenta eventos resolved válidos del historial por changedAt, conservando cierres aunque el ticket se reabra después. Dos cierres legítimos del mismo ticket cuentan dos eventos. No se infieren cierres ausentes a partir de updatedAt. La leyenda usa Cierres y aclara que compara altas y cierres registrados, que son poblaciones distintas. Se excluyen transiciones de resolved a resolved y eventos sin estado de origen.

Las semanas/meses se agrupan explícitamente en Lima a partir de los timestamps UTC sin zona almacenados. Las consultas independientes de tendencia y KPIs usan Promise.all. El total de tickets se deriva del agrupado por estado y se elimina una consulta redundante. La tarjeta Sin asignar del agente usa el conteo de open sin responsable y no todos los open. La carga del equipo se etiqueta como actual e independiente del selector.

El helper de URL y normalización está separado del cálculo de fechas, para que el selector cliente no importe el módulo de fechas con timezone. No cambia el diseño de gráficos, los permisos, las políticas de adjuntos o los plazos de recordatorios.

## Verificación

- TypeScript sin emisión, ESLint completo sin advertencias y build local completo aprobados, incluidas 23 páginas.
- Nueve observaciones de código de aplicación con cliente de BD ficticio, ejecutadas en UTC, Lima y Nueva York: normalización de rangos, Todo y parámetros ajenos, límite de mes en Lima, año bisiesto, intervalo compartido/Todo, paralelización de tendencias, paralelización/derivación de KPIs, ausencia de límite inicial en Todo y mismos extremos en todas las consultas acotadas.
- Dieciséis variantes SQL generadas con Drizzle: EXPLAIN sin ANALYZE en READ ONLY contra destino verificado. No se ejecutaron para medir filas reales ni se afirman latencias.
- Dieciséis SELECT con las tablas sustituidas por CTE/VALUES ficticios: aislamiento por área, exclusión de futuros, Todo incluye tickets anteriores a 2020, abiertos asignados no cuentan como Sin asignar, semanas/meses de Lima, cierres conservados tras reapertura, transiciones duplicadas excluidas, fecha de respuesta de encuesta y promedio numérico. Sin tablas temporales ni escrituras.

El código se ejecutó sin red ni variables reales y con fuentes/dependencias de solo lectura. El build usó copia sin archivos de entorno y variables ficticias, con acceso a fuentes públicas. Las conexiones de planificación/fixtures verificaron primero el destino y usaron READ ONLY con timeout. No se añadieron tests ni framework al repositorio; se retiró el material temporal al finalizar. No se ejecutaron borrados, cargas, Gmail ni workers.

## Límites y pendientes

Los límites del selector son móviles y no equivalen a meses/semanas completos. Las agrupaciones iniciales/finales pueden ser parciales; no se generan buckets vacíos. Todo puede abarcar periodos largos: no se afirma rendimiento con volumen real sin medición. Las lecturas paralelas pueden observar cambios concurrentes entre sentencias. El área de tickets es la actual y el área de encuestas es la almacenada en su respuesta.

La tendencia cuenta cierres registrados aunque carezcan de inicio para medir SLA; SLA conserva su exclusión de ciclos incompletos. Sin historia no se inventan cierres ni se hace backfill. Las estadísticas personales siguen siendo históricas sin selector. La carga de agentes mantiene su población actual open/in_progress; no se rediseña esa definición.

Pendientes: merge/despliegue de este bloque, navegación autenticada y revisión visual, métricas personales restantes, paginación/agregación de listados grandes, índices con volumen representativo, CI/accesibilidad/Doctor, observación Gmail/Drive/PG y reconciliación de huérfanos. La revisión de carpeta/OAuth continúa cerrada por decisión del usuario.

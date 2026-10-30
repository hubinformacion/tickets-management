# Estadísticas personales por estado real

## Estado

Implementado originalmente en `fix/estadisticas-personales` e integrado/desplegado después como `28fadb6`. Production `7449141858` aprobada, SHA público confirmado y rama integrada eliminada. Continúa las métricas personales y la paralelización de D07 del plan aprobado. El [diseño](../plans/2026-10-30-estadisticas-personales-design.md) describe el alcance. No requiere migraciones ni escrituras en BD.

El bloque anterior de periodos/tendencias se integró y desplegó como `3c46c0be18d2a46e872226be64993eff6d28bbf2`. Production `7448888498` aprobó el despliegue y el dominio público confirmó ese SHA, cola disponible y corte fijo `2026-10-28T17:00:00.000Z`. Login/sesión anónima devolvieron 200 y dashboard 307. Se verificó igualdad de contenido con main antes de eliminar `fix/periodos-analytics`. Sin Preview, invocación del worker, correo ni borrados reales.

## Corrección

El gráfico calculaba Abiertos restando pendientes y resueltos del total, aunque pendientes ya incluía abiertos: el resultado correspondía a anulados. Además, presentaba todos los pendientes bajo En progreso y omitía la validación como estado independiente.

Ahora una consulta agrupa los tickets creados por el usuario por su estado real. El total se deriva de ese mismo agrupado; pendientes suma open, in_progress y pending_validation; resueltos usa resolved. La tasa conserva resueltos/total, con anulados incluidos en el denominador. Es una población histórica con estado actual, sin selector temporal. Tickets creados por otras personas no se incorporan por estar asignados al usuario o tenerlo como observador.

El resultado incorpora statusCounts y el gráfico usa cada cantidad/etiqueta/color real: abiertos, en progreso, validación, resueltos y anulados. Ya no infiere estados por diferencia. Un estado histórico desconocido conserva su cantidad con etiqueta/color neutrales; la consulta de etiquetas comprueba propiedades propias para evitar confundir nombres como constructor con valores del prototipo. Los estados desconocidos se incluyen en el total y el gráfico, pero no se presumen pendientes ni resueltos. No se cambia ningún registro.

En paralelo se consulta el promedio de las respuestas de encuesta enviadas por el usuario, con la misma población original por userId y conversión numérica en SQL. Sin respuestas retorna cero y la UI conserva el guion. Las etiquetas aclaran pendientes, respuestas enviadas y alcance histórico. Se conservan diseño, permisos de la página y comportamiento de Mi panel.

Se reducen cuatro consultas en serie a dos independientes en Promise.all. Esto no implica un snapshot único entre sentencias ni certifica una latencia con volumen real.

## Verificación

- TypeScript sin emisión, ESLint completo sin advertencias y build local completo aprobados, con 23 páginas generadas.
- Seis observaciones del código con cliente de BD ficticio y árbol React del componente real (componentes hijos sustituidos): dos consultas simultáneas/conteos, cinco segmentos y total coherente, tasa de resolución, usuario sin datos/promedio nulo, estado desconocido seguro e IDs opacos parametrizados.
- Dataset mixto: 2 abiertos, 3 en progreso, 1 validación, 4 resueltos y 5 anulados producen total 15, pendientes 6 y tasa 27%; el gráfico conserva Abiertos=2 y Anulados=5. No presenta anulados como abiertos ni toda la cola como progreso.
- Ocho consultas generadas con Drizzle (dos formas SQL, cuatro IDs ficticios) planificadas con EXPLAIN sin ANALYZE en READ ONLY. No se ejecutaron sobre filas reales para medir resultados o latencias.
- Ocho SELECT con tablas sustituidas por CTE/VALUES ficticios en READ ONLY: pertenencia por creador, exclusión de tickets ajenos observados/asignados, encuestas de otro usuario, ausencia de datos, estado desconocido e identificador que contiene texto SQL. Sin crear tablas temporales ni escribir filas.

El código de aplicación se ejecutó aislado, sin red ni variables reales y con fuentes/dependencias de solo lectura. El build utilizó copia sin archivos de entorno, variables ficticias y fuentes públicas. La conexión de planificación/fixtures verificó el destino y usó READ ONLY y timeout. No se añadieron framework o tests al proyecto; el material temporal se retiró al terminar.

## Límites y siguientes pasos

La inspección del árbol React verifica props y datos del gráfico, no el render de Recharts ni la interacción en navegador. Quedan pendientes navegación autenticada, revisión visual/accesibilidad y volumen real. Si varios valores históricos desconocidos existen, pueden compartir etiqueta neutral: no se normalizan ni se hace backfill.

Los KPIs siguen sujetos a cambios concurrentes entre el agrupado de tickets y el promedio de encuesta. El promedio no representa una tasa de respuesta ni una cohorte de cierres; representa respuestas enviadas por ese usuario. Continúan paginación/agregación de listados grandes, índices compatibles, calidad/CI/Doctor, observación real de Gmail/Drive/colas y reconciliación de huérfanos. La revisión de carpeta/OAuth permanece cerrada por decisión del usuario.

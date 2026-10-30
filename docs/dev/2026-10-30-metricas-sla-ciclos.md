# Métricas de SLA por ciclo

## Estado

Implementado en la rama local `fix/metricas-sla-ciclos`, pendiente de merge/despliegue. Continúa D07 y la parte de periodo de SLA de D08 del plan aprobado. El [diseño](../plans/2026-10-30-metricas-sla-ciclos-design.md) delimita el alcance. No requiere migraciones ni escrituras en BD.

Antes de este bloque se integraron borrado individual y purga administrativa como `00d949078be1f3e4b1acb320a9183f09d4664200`. GitHub/Vercel Production `7444425019` aprobó el despliegue; el dominio público confirmó ese SHA, queueReady=true y corte fijo `2026-10-28T17:00:00.000Z`. Login y sesión anónima devolvieron 200, dashboard 307. No se invocó el worker ni se ejecutaron borrados reales. Se verificó igualdad entre el contenido integrado y la rama aprobada, así como la dependencia del borrado individual, antes de eliminar ambas ramas locales. Sin Preview.

## Corrección

Antes, cada cierre buscaba el último in_progress de toda la historia del ticket. Una reapertura posterior podía convertir la duración del cierre anterior en negativa y contar como cumplimiento. Además, el cálculo ejecutaba una consulta extra por cada cierre. El promedio tenía el mismo defecto temporal.

Ahora una consulta SQL agrupa eventos en ciclos con ventanas: cada resolved/voided termina el ciclo; el primer in_progress del grupo inicia la medición. Volver de validación a atención mantiene ese inicio; reabrir tras un terminal crea otro ciclo. Se ordenan los eventos por fecha e ID, incluso si comparten timestamp. Se excluyen cierres sin inicio o transición de resolución válida, sin reconstruir ni modificar su historia.

El horario y los días hábiles actuales del área, en Lima, determinan la duración. El helper conserva el redondeo predeterminado para sus consumidores anteriores y permite desactivarlo para SLA: un segundo por encima del umbral no se redondea a cumplimiento. Horarios inválidos se excluyen. Un ciclo con duración válida y sin SLA contribuye al promedio, pero no al denominador del cumplimiento.

El selector del dashboard se pasa al SLA: filtra por fecha de cierre, después de obtener el inicio desde toda la historia. Un inicio anterior al periodo sigue siendo válido. Sin periodo o con Todo no se introduce el antiguo corte artificial de 2020 en esta métrica. El porcentaje global pondera por cantidad de ciclos evaluados, en lugar de dar el mismo peso a cada área. Por ejemplo, 100 de 100 y 0 de 1 producen 99%, no 50%. Las etiquetas indican ciclos cerrados en el periodo y horas hábiles.

## Verificación

- TypeScript sin emisión, ESLint completo sin advertencias y build local completo aprobados; generación de 23 páginas.
- Nueve observaciones de fuente con datos ficticios en UTC y America/Lima: horario hábil/fin de semana, fechas inválidas/invertidas, horario inválido, precisión del umbral, SLA ausente, porcentaje ponderado/vacío/cero, una consulta para cumplimiento, promedio coherente y filtros de área/cierre.
- Tres variantes de la consulta generada planificadas con EXPLAIN sin ANALYZE en READ ONLY. No se ejecutaron sobre registros reales para medir resultados o latencias.
- Cuatro SELECT adicionales con tablas sustituidas por CTE/VALUES de datos ficticios, en READ ONLY: nueve ciclos esperados; devolución de validación, reapertura, anulación, inicio faltante, empates de timestamp, filtro de área, periodo por cierre e inicio anterior al periodo comprobados en el motor SQL. No se crearon tablas temporales ni se escribieron filas.

La ejecución de código de aplicación se hizo en proceso aislado sin red, sin variables reales y con fuentes/dependencias de solo lectura. El build usó una copia sin archivos de entorno, configuración ficticia y descarga de fuentes públicas. Las consultas operativas verificaron primero el destino y usaron transacciones READ ONLY con timeout. No se añadieron framework o archivos de tests al proyecto. El material temporal se retiró al finalizar.

## Límites y pendientes

La prioridad, SLA, área y horario son los vigentes; el modelo no conserva versiones históricas. La medición incluye la espera de validación que cae dentro del horario hábil; no incorpora feriados o pausas adicionales. La consulta devuelve un registro por ciclo cerrado evaluable, no un ticket distinto. Un ticket reabierto puede aportar varios ciclos. Cierres sin historia suficiente quedan fuera; no se infieren a partir de updatedAt ni se hace backfill.

La lectura se agrupó en una consulta, pero no se afirma una mejora de latencia con datos reales. Quedan pendientes planes con volumen representativo, posibles índices compatibles y navegación autenticada. Los relojes del selector existente siguen usando el helper de rango actual; su revisión general y validación de parámetros continúan en el siguiente bloque.

Este bloque no resuelve periodos de satisfacción y otras tarjetas, tendencias (incluido el uso de updatedAt en resoluciones), KPI personales, paginación ni carga de agentes. Tampoco certifica las integraciones Drive/Gmail, concurrencia de las colas o reconciliación de huérfanos. Esos pendientes siguen en el estado general.

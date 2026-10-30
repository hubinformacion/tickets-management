# Métricas de SLA por ciclo de atención

## Alcance aprobado

Continúa el bloque D07/D08 del plan de auditoría aprobado: vincular cada inicio con su cierre, consultar el historial en lote, usar horarios hábiles y dar contexto al periodo. No modifica tickets, historial, plazos de recordatorios, configuración de horarios ni datos históricos. Se trabaja en `fix/metricas-sla-ciclos`, pendiente de aprobación de merge.

## Alternativas

Corregir solamente el filtro temporal de la consulta por ticket evita negativos, pero conserva N+1 y reinicios indebidos del reloj al rechazar una validación. Consultar el historial en lote y separar ciclos con ventanas SQL resuelve ambos problemas sin cambiar el esquema; es la opción elegida dentro del plan aprobado. Persistir una tabla de métricas exigiría migraciones y sincronización innecesarias para esta corrección.

## Cálculo

Cada evento resolved/voided termina un ciclo. Dentro de cada ciclo resuelto se usa el primer in_progress y el cierre correspondiente. Volver de validación a in_progress no reinicia el reloj; reabrir después de resolved o voided sí abre otro ciclo. Los eventos se ordenan por changed_at e ID para desempatar. Un cierre sin inicio válido se excluye, sin inventar un inicio ni reescribir su historia.

Se mide tiempo hábil con el helper existente y los días/horarios actuales del área en Lima. Incluye la espera de validación que cae en horario hábil. No implementa pausas, feriados ni históricos de configuración que no existen en el modelo. El SLA y la prioridad vigentes se aplican a los ciclos históricos y esa limitación se documenta.

Una consulta SQL de solo lectura obtiene los ciclos y la configuración de área/prioridad. No se ejecutan consultas por ticket. La comparación del SLA usa horas sin redondear para no considerar cumplidos ciclos que exceden el límite por segundos. Promedio y cumplimiento usan el mismo cálculo temporal; faltas de SLA excluyen solo el cumplimiento. Se conserva el tipo público de resultados; totalResolved representa ciclos evaluables, no tickets distintos.

El selector de periodo filtra los cierres de SLA por fecha de cierre, sin cortar el historial previo necesario para encontrar su inicio. Sin periodo o con Todo se consideran todos los cierres disponibles. Las otras tarjetas y tendencias conservan su comportamiento en este bloque: la coherencia general de periodos sigue pendiente.

El porcentaje global se pondera por ciclos (suma dentro de SLA / suma evaluables), en vez de promediar porcentajes de áreas con tamaños distintos. La UI indica ciclos y horas hábiles. No se cambia el diseño visual.

## Implementación y verificación

1. Crear consulta común de ciclos y agregadores puros para promedio/cumplimiento.
2. Sustituir las dos implementaciones actuales y pasar el rango del dashboard al SLA.
3. Ajustar porcentaje global y etiquetas para describir la población medida.
4. Verificar tipos, lint y build con variables ficticias; ejecutar escenarios temporales aislados sin añadir tests al proyecto y planificar la consulta con EXPLAIN sin ANALYZE en READ ONLY.
5. Registrar resultados y pendientes. No ejecutar escrituras, borrados, worker ni servicios de correo/Drive como prueba.

Quedan fuera la coherencia de periodos de las demás tarjetas, tendencias, métricas personales, índices nuevos, paginación y reconciliación de archivos. Esos bloques continúan después de esta corrección.

El [registro de implementación](../dev/2026-10-30-metricas-sla-ciclos.md) recoge las comprobaciones y límites; el bloque permanece local hasta aprobar merge/despliegue.

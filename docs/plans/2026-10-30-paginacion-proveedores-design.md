# Paginación de tickets de proveedores y revisión de índices

## Alcance

Continúa D08/D09 del plan aprobado. El usuario solicitó expresamente avanzar con paginación e índices a la par: la revisión de índices es de solo lectura y prepara recomendaciones sin ejecutar DDL. La rama local `fix/paginacion-proveedores` incorpora paginación del listado y la evidencia de índices. No modifica datos históricos ni las mutaciones de proveedores.

## Alternativas y comportamiento

Paginar únicamente en el cliente seguiría cargando todo el listado. Aplicar LIMIT y mantener filtros locales perdería resultados/proveedores de otras páginas. Se elige filtrar y ordenar en SQL, con 25 detalles por página y un conteo sobre todo el filtro, dentro de una transacción REPEATABLE READ READ ONLY. El área sigue siendo la asignada al usuario; la página requiere requireAgent y conserva el requisito existente de área también para admin.

Los filtros providerId/status se validan con Zod y se guardan en URL. Cambiarlos reinicia page y conserva otros parámetros. No se filtra en el cliente ni se reordena una página parcial. El orden conserva cerrados al final, luego createdAt DESC e ID DESC para desempatar. Se normaliza/clampa page antes de calcular OFFSET.

Las opciones de proveedores provienen de todos los tickets del área, no de la página visible, e incluyen proveedores desactivados que aún aparecen en registros históricos. El formulario sigue recibiendo proveedores activos para altas. El selector de ticket vinculado se conserva completo: no se trunca una selección existente sin implementar antes una búsqueda en servidor; ese coste queda pendiente separado. La descarga Excel conserva su alcance completo original y no se trunca por la página o sus nuevos parámetros.

Se reutilizan primitivas de validación/página/URL con las encuestas mediante un helper común y wrappers compatibles para su API anterior. La navegación muestra rango/total y anterior/siguiente accesibles. No se modifica el diseño de formularios o acciones de alta/edición/cierre/reapertura/borrado.

## Índices

Se revisan catálogo, estimaciones agregadas y EXPLAIN sin ANALYZE, nunca filas de negocio ni DML/DDL. Las propuestas deben evitar duplicar PK/UNIQUE existentes. No se atribuye latencia real a costes estimados ni se aplican índices por defecto. Se deja un script de propuesta separado, si la evidencia lo justifica, con precondiciones y limitaciones para una operación posterior.

## Pasos y verificación

1. Helper común de página y schemas de filtros; lector de proveedores con conteo/opciones/detalles.
2. Conectar página, URL/filtros y navegación, preservando formulario y exportación completa.
3. Revisar en paralelo catálogo/planes e integrar informe y propuesta de índices sin ejecutar.
4. Tipos, lint y build con variables ficticias; fuente con BD/auth/React ficticios y consultas sobre CTE/VALUES en READ ONLY, sin tests nuevos al repositorio.
5. Registrar despliegue anterior, límites y pendientes; commit local pendiente de aprobación del siguiente merge.

No se ejecutan cambios de índices, escrituras, workers, correo ni Drive. Quedan pendientes selector remoto, exports grandes, paginación de encuestas de proveedores/otros listados, volumen real, navegación autenticada y calidad.

El [registro del bloque](../dev/2026-10-30-paginacion-proveedores.md) recoge comprobaciones y límites; el [informe de índices](../dev/2026-10-30-revision-indices.md) documenta la revisión paralela y sus candidatos sin aplicar.

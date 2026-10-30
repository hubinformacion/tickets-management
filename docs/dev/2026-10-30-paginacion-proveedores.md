# Paginación de tickets de proveedores

## Estado

Implementado en `fix/paginacion-proveedores`, pendiente de merge/despliegue. Continúa D08 y, por petición expresa del usuario, se acompaña de la [revisión paralela de índices](2026-10-30-revision-indices.md). El [diseño](../plans/2026-10-30-paginacion-proveedores-design.md) delimita ambos trabajos. La implementación inicial no aplicó cambios de BD; después el usuario autorizó expresamente añadir los tres índices de la revisión. La [aplicación aditiva](2026-10-30-aplicacion-indices.md) registra esa operación sin DML ni cambios históricos.

El bloque anterior de encuestas se integró y desplegó como `e8c46e73a5944f72cb2aa72e39903123ace220cf`. Production `7449414166` aprobada y SHA público confirmado, con cola disponible y corte fijo `2026-10-28T17:00:00.000Z`. Se verificó igualdad de contenido con main antes de eliminar `fix/paginacion-encuestas-usuarios`. Sin Preview ni invocación de worker, correo o borrados reales.

## Consulta y navegación

La tabla carga 25 tickets de proveedor por página. Proveedor y estado se filtran en SQL antes del límite, dentro del área asignada al usuario. La página usa requireAgent y conserva el requisito previo de área también para admin. No se toma un área desde la URL.

Los filtros se validan con Zod; providerId debe ser un entero positivo representable por el ID integer de PostgreSQL y status uno de los dos estados admitidos. Filtros inválidos/repetidos detienen la lectura con mensaje de error. Page inválida/repetida normaliza a uno y se acota al número de páginas antes de calcular OFFSET. Los cambios de filtros se guardan en URL, reinician page y conservan otros parámetros.

El lector obtiene conteo de todo el filtro, opciones de proveedores de todos los registros del área y detalles de la página, en una transacción REPEATABLE READ READ ONLY. Las opciones no dependen de la página o estado seleccionado e incluyen proveedores inactivos con registros históricos. El formulario de altas sigue recibiendo proveedores activos.

Se conserva el orden anterior de cerrados al final y fecha de creación descendente; el ID descendente desempata fechas iguales. El cliente ya no filtra o reordena una página parcial. La navegación muestra rango/total, página efectiva y anterior/siguiente con nombre accesible y controles deshabilitados en extremos. Las operaciones de crear, editar, cerrar, reabrir y eliminar no se modificaron.

La validación/página/URL se comparte mediante `lib/utils/pagination.ts`; el módulo de encuestas conserva sus nombres y tamaño de página mediante wrappers compatibles. No se cambia el comportamiento de la tabla de encuestas desplegada.

La exportación Excel mantiene su alcance completo original, independiente de página/filtros de tabla: agentes exportan su área y admin conserva su alcance global existente. No se trunca la descarga. El selector de ticket vinculado conserva su lista completa del área: no se impone un límite que vuelva inaccesibles tickets antiguos. Su búsqueda remota se prepara como trabajo separado.

## Verificación

- TypeScript sin emisión, ESLint completo sin advertencias y build local completo aprobados, con 23 páginas generadas.
- Ocho observaciones de fuente con BD/auth/React ficticios: validación/clamp y compatibilidad de encuestas, páginas sin solapamiento/orden, filtros antes de página/opciones históricas, callbacks reales de filtro/URL/navegación, área de sesión y enlace de exportación, rechazo de filtros inválidos/repetidos/fuera de rango o sin área, autenticación y vacío/opciones transaccionales.
- Dataset de 60 registros en el área: páginas de 25, 25 y 10; filtro proveedor/estado sobre todo el conjunto; proveedor inactivo conservado en opciones; callbacks reinician page sin perder otros filtros. El árbol React inspeccionado no ejecuta mutaciones ni renderiza los formularios internos.
- Once formas SQL generadas por Drizzle (conteos, opciones, relaciones, filtros, OFFSET y selector vinculado): EXPLAIN sin ANALYZE en READ ONLY contra destino verificado. No se ejecutaron para medir filas reales o latencias.
- Once SELECT con tablas sustituidas por CTE/VALUES ficticios: aislamiento por área, filtros proveedor/estado, cerrados al final, desempate por ID, LIMIT/OFFSET, opciones inactivas, exclusión de proveedor ajeno y alcance del selector vinculado. Sin tablas temporales ni escrituras.

El código de aplicación se ejecutó sin red ni variables reales, con fuentes/dependencias de solo lectura. El build usó copia sin archivos de entorno, variables ficticias y fuentes públicas. Las conexiones de planificación/fixtures verificaron destino y usaron READ ONLY con timeout. No se añadieron framework/tests al repositorio; el material temporal se retiró al terminar.

## Revisión de índices y límites

En paralelo se revisaron metadatos y diez planes adicionales, sin filas de negocio o cambios en BD. Se documentan tres candidatos y sus costes/limitaciones; la [propuesta SQL](../migrations/2026-10-30-indices-consultas.sql) original sigue comentada como registro histórico. La aplicación posterior autorizada usa una migración manual independiente. Los PK/UNIQUE existentes de encuestas no se duplican. Con el volumen estimado pequeño, no hay urgencia o mejora de latencia demostradas que justifiquen aplicar índices en este despliegue.

El snapshot pertenece a cada solicitud; nuevas altas o cambios de estado entre solicitudes pueden desplazar páginas OFFSET. El selector vinculado aún carga todos los tickets del área y la exportación completa mantiene su coste anterior. Las opciones/conteos requieren recorrer el alcance filtrado aunque solo se devuelvan 25 detalles. No se afirma una mejora de latencia con volumen real.

Pendientes: merge/despliegue de este bloque, navegación autenticada/teclado/revisión visual, búsqueda remota del selector vinculado, exportaciones grandes, paginación de encuestas de proveedores y otros listados, aplicación/observación de índices si se justifica, CI/calidad/Doctor y observación de Gmail/Drive/PG/colas. No se reabre la revisión de carpeta/OAuth cerrada por el usuario.

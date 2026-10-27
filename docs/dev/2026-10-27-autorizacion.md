# Autorización y validación de tickets

## Estado actual

El commit `709e333` fue integrado en `main` con aprobación del usuario. Vercel completó Preview y Production (deployment `BftMKTab1cDSDxYaXvTMNo2scPx5`, registro GitHub `7372804488`). Las ramas `fix/autorizacion-tickets` y `chore/organizacion-mantenimiento` se cerraron después de integrarse. No se modificó el esquema ni se ejecutaron operaciones manuales sobre datos o recursos de producción.

La comprobación pública confirmó `/login` → 200, `/api/auth/get-session` sin cookies → 200 con `null`, y `/dashboard` → 307 a `/login`. No certifica el recorrido autenticado ni los permisos efectivos de usuarios reales.

La política compartida distingue lectura/participación, gestión del ticket y administración de observadores. Un administrador activo tiene alcance global; un agente activo gestiona únicamente tickets de su área válida. Creador y observador autorizado pueden leer y participar; el observador no puede redistribuir acceso. Tener el ticket asignado no concede acceso de gestión fuera del área.

## Cambios por hallazgo

| Hallazgo | Implementación preparada |
|---|---|
| S01 | Permisos del recurso en comentarios, vinculación de adjuntos, asignación/desasignación, cambio de estado, derivación y solicitud de validación. IDs y mensajes validados. |
| S02 | El adjunto debe pertenecer al ticket indicado; borrado limitado al uploader con acceso, admin o agente del área. Un fallo de Drive conserva la referencia de BD. |
| S03 | Solo creador/admin/agente del área administra observadores. Máximo diez entradas, deduplicadas y de usuarios activos existentes; misma validación al crear tickets. Tickets cerrados no admiten cambios de observadores. |
| S04 | Agentes sin área no consultan resultados ni listas de agentes de encuestas y reciben 403 al exportar proveedores. Las encuestas de la exportación se limitan a los tickets exportados. |
| S05, parcial | Usuarios inactivos reciben 403 antes de procesar uploads o borrados pendientes. Token de carga e ID de archivo validados como UUID. Formatos/contenido, tamaño global/cantidad y rate limiting distribuido siguen pendientes. |
| S06 | Escape de texto en ambos reportes HTML; fechas ISO y orden del rango validados antes de consultar. |
| S07 | Metadata y detalle comparten un lector autorizado; quien no puede leer recibe metadata genérica. Las consultas de usuarios e historial ocurren después del control de acceso. |
| S09 | Actividad de sistema renderizada como texto; comentarios internos filtrados para creador/observadores. Las props del sidebar proyectan solo los campos necesarios. |
| D01, parcial | Autoasignación solo desde abierto y sin responsable, con UPDATE condicional e historial en la misma transacción. Cambio genérico de estado también es condicional y transaccional. El helper de historial admite executor transaccional. |
| D03, parcial | Área activa, clasificación activa y coherente, pausa global y listas de observadores comprobadas antes de insertar. La atomicidad completa de la creación se aborda en el bloque de integridad. |
| O02, parcial | Los borrados de adjuntos conservan metadata si falla Drive. Aún faltan compensaciones de upload, recuperación persistente y limpieza de huérfanos. |

La UI usa los permisos calculados en el servidor para mostrar la gestión de observadores. Solo quienes pueden administrar la lista reciben el directorio de usuarios activos; el resto recibe las personas que ya observan el ticket. Los adjuntos respetan TSI/DIF y la configuración de la subcategoría FED tanto en el detalle como al vincular archivos.

## Verificación y límites

Se comprobó el comportamiento con fixtures en memoria y dobles de BD, sesión, correo y Drive. El verificador se ejecutó fuera del repositorio, sin framework nuevo, dentro de un proceso con red aislada, variables permitidas explícitas, fuentes/dependencias de solo lectura y límites de recursos. Los casos cubren permisos por rol/área, denegación sin efectos, IDs cruzados, observadores inválidos, fallos de Drive, conflictos de asignación, pausa/clasificación y escape de reportes.

Resultado: 146 comprobaciones en memoria aprobadas; `tsc --noEmit --incremental false` aprobado; ESLint aprobado con 0 errores y las 3 advertencias ya conocidas (navegación de páginas de error y React Hook Form/compilador). El verificador temporal no se incorpora al repositorio ni configura un framework de pruebas.

Estas comprobaciones no certifican carreras reales de PostgreSQL, OAuth, permisos efectivos de Drive ni el recorrido visual/autenticado completo. Ninguno de esos flujos se probó contra producción. El build de este bloque fue aprobado por Vercel antes del merge.

Continúan pendientes las comprobaciones autenticadas y el resto de la estabilización. Transiciones, creación y cierre automático se preparan en `fix/integridad-tickets`; compensaciones, límites de uploads, protección de scripts, rate limiting compartido, fechas, métricas, migraciones y accesibilidad siguen en el plan. Cada bloque nuevo requiere revisión antes de integrarse; la autorización de código no incluye aplicar cambios de datos.

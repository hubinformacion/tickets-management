# Estado de la estabilización

## Integrado y desplegado

El último despliegue verificado es `e8c46e7`, integrado en `main` y publicado en [producción](https://requerimientos-hub.vercel.app). Incluye los bloques de dependencias, permisos, integridad de tickets/proveedores, protección de scripts, sesión, fechas, catálogos, validación de adjuntos, integridad de encuestas, recordatorios recuperables de 48 horas, coordinación de adjuntos pendientes y registro de cargas con reintentos.

La entrega más reciente aprobó build local y Production, sin Preview; las anteriores conservan sus registros históricos de validación. Se verificaron login público, sesión anónima, redirección del dashboard y versión/estado autenticado del cron. El recorrido real de Google/Drive y los escenarios con datos reales siguen pendientes. Se aplicaron únicamente las migraciones aditivas autorizadas para tablas independientes de recordatorios, cancelaciones, intentos de carga, contadores de frecuencia y formularios de archivos. No se ejecutaron reset, drop, seed, backfills ni modificaciones de registros históricos.

Las ramas de limpieza y autorización se eliminaron después de integrarlas. El alcance de permisos y sus verificaciones están en [Autorización y validación](2026-10-27-autorizacion.md).

## Integridad integrada

`d1f961d` incorpora transiciones condicionales con historial/comentarios en la misma transacción, creación atómica con adjuntos, año del código en Lima y cierre automático sin sobrescribir una transición ganadora. Preview y Production aprobados; las comprobaciones públicas devolvieron login 200, sesión anónima 200/null y dashboard 307 a login. Ver [Integridad de tickets](2026-10-27-integridad.md).

La guía operativa exige preservar los datos históricos y preparar cambios de esquema aditivos y compatibles, con campos nuevos nullable o valores predeterminados cuando corresponda. Este despliegue no incluye cambios de esquema ni migraciones de datos.

## Trabajo actual

La [protección de scripts de BD](2026-10-27-proteccion-scripts.md) (`3463601`) y la [recuperación de sesiones inactivas](2026-10-27-sesion-inactiva.md) (`e089be3`) están integradas y desplegadas. Preview y Production aprobados; login 200, sesión anónima 200/null y dashboard 307 a login.

El [bloque de fechas](2026-10-27-fechas-calendario.md) está integrado y desplegado en `8562497`: calendario separado de instantes, validación estricta y helper de horas hábiles en Lima. Preview y Production aprobados; comprobaciones públicas de login/sesión/dashboard aprobadas.

El [bloque de proveedores](2026-10-27-integridad-proveedores.md) está integrado y desplegado en `a85e691`: referencias del área, encuesta completa o ausente, transiciones condicionales y conservación de evaluaciones. Preview y Production aprobados; login 200, sesión anónima 200/null y dashboard 307 a login.

El [bloque de catálogos](2026-10-28-orden-catalogos.md) está integrado y desplegado en `d100754`: orden por área/categoría, transacciones y bloqueo para todas sus escrituras en la aplicación. Preview y Production aprobados; comprobaciones públicas aprobadas.

El [bloque de adjuntos](2026-10-28-validacion-adjuntos.md) está integrado y desplegado en `a4a225c`: PDF/Office/imágenes/texto/ZIP, firmas y cuerpos acotados, 4 MB por archivo. Preview y Production aprobados; comprobaciones públicas aprobadas.

El [bloque de encuestas de usuarios](2026-10-28-integridad-encuestas.md) está integrado y desplegado en `a606073`: respuestas enteras y únicas, coordinación con el ticket, tasa sobre el mismo conjunto de cierres y exportación por área. Preview y Production aprobados; login 200, sesión anónima 200/null y dashboard 307 a login. La rama integrada se eliminó.

El [bloque de recordatorios](2026-10-28-recordatorios.md) está integrado y desplegado en `3a598b7`. La tabla independiente se creó vacía con autorización específica y snapshot confirmados por el usuario, sin modificar tablas ni datos históricos. Preview y Production aprobados; estado autenticado 200 con `queue`, corte fijo y tabla disponible, login 200, sesión anónima 200/null y dashboard 307 a login. Solo se incluyen cierres desde el 28 de octubre a las 12:00 de Lima, con recordatorio elegible 48 horas después del cierre efectivo. No se ejecutó el worker ni se enviaron correos de prueba.

La [coordinación de cargas pendientes](2026-10-28-coordinacion-adjuntos.md) está integrada y desplegada en `504fc86`: intención persistente antes de Drive, bloqueo compartido con la vinculación, retención de referencias y validación del ticket dentro de la transacción. La tabla operativa se creó vacía con autorización de cambios aditivos. Build local, tipos, lint y 123 comprobaciones aprobados. El primer push no generó deployment y se reintentó una vez con el registro de cierre. Vercel aprobó un único Production, sin Preview. El dominio público confirmó el SHA nuevo y el estado de recordatorios; no se probaron uploads o borrados reales.

El usuario confirmó cantidad ilimitada de archivos con máximo de 4 MB por archivo/carga. Se retiran las cuotas de cantidad o espacio del alcance de estabilización. En `e2e1596` está integrado y desplegado el registro previo a Drive con identificador estable, ID remoto anticipado, reserva y reintentos de la misma carga. La tabla nueva se creó vacía con autorización de cambios aditivos; build local, tipos, lint y 255 comprobaciones aprobados, además de 11 consultas planificadas en READ ONLY. El [registro de cargas](2026-10-28-registro-cargas-drive.md) recoge compatibilidad, comportamiento ante fallos y límites de validación real. La ruta de estado confirmó la versión, la tabla y la política; Drive devolvió 404 para la carpeta configurada. Se actualizó el ID local al destino corregido por el usuario. Por decisión expresa del usuario se cerró la revisión de carpeta/permisos, conservando el refresh token institucional y sin cambios adicionales en Drive. No se probaron uploads/borrados reales.

La carpeta temporal `.codex-validation-tickets` se eliminó el 28 de octubre. Contenía copias de código, verificadores con datos ficticios y logs; los resultados resumidos se conservan en estos documentos. Las comprobaciones siguientes eliminan su material temporal al terminar.

El [bloque de calidad de ESLint](2026-10-28-calidad-eslint.md) elimina las tres advertencias conocidas mediante `useWatch` y enlaces internos de Next.js. TypeScript, ESLint completo con cero advertencias y build local aprobados. Se integró y desplegó con el cierre de cargas en `84961c7`, Production aprobada y versión confirmada por la ruta de estado. No requirió migraciones ni cambios de Google.

El [rate limiting compartido](2026-10-30-rate-limiting.md) está integrado y desplegado en `9838afd`, con Production aprobada y SHA confirmado en el dominio público. Los diez namespaces conservan sus límites y todos los consumidores usan await.

La [vinculación de cargas tardías](2026-10-30-vinculacion-cargas-tardias.md), elegida por el usuario, está integrada y desplegada en `bb0b870`. Production aprobada, SHA confirmado en el dominio público y rama de trabajo eliminada.

La [conservación de la cola de adjuntos](2026-10-30-cola-adjuntos-confirmados.md) está integrada y desplegada en `87d1930`, con Production aprobada y SHA confirmado.

La [eliminación recuperable de adjuntos vinculados](2026-10-30-eliminacion-adjuntos.md) está integrada y desplegada en `00d9490`. Usa el registro operativo existente y conserva referencias ante fallos, sin migración. La eliminación administrativa del ticket completo debe seguir siendo destructiva, según la corrección del usuario; no se convirtió en anulación.

La [purga administrativa completa](2026-10-30-purga-administrativa.md) está integrada y desplegada en `00d9490`, junto al borrado individual. Production `7444425019` aprobada y SHA confirmado en el dominio público. Incluye registros operativos, progreso de Drive, coordinación con cargas/recordatorios y confirmación explícita de UI. Sin migraciones ni borrados reales de validación; las dos ramas integradas se eliminaron.

La [corrección de SLA por ciclo](2026-10-30-metricas-sla-ciclos.md) está integrada y desplegada en `5453fd1`, Production `7444876029` aprobada y SHA confirmado en el dominio público. La rama integrada se eliminó. Usa horas hábiles, consulta en lote, periodo por fecha de cierre y porcentaje global ponderado; no modifica datos.

La [corrección de periodos y tendencias](2026-10-30-periodos-analytics.md) está integrada y desplegada en `3c46c0b`, con Production `7448888498` aprobada y SHA público confirmado. La rama integrada se eliminó. Corrige Todo, comparte el intervalo, filtra encuestas por respuesta, cuenta cierres del historial y agrupa en Lima; también paraleliza KPIs y corrige Sin asignar. Sin escrituras ni migraciones.

La [corrección de estadísticas personales](2026-10-30-estadisticas-personales.md) está integrada y desplegada en `28fadb6`, con Production `7449141858` aprobada y SHA público confirmado. La rama integrada se eliminó. El gráfico muestra los estados reales, conserva anulados y validación, y los KPIs usan dos consultas paralelas con alcance por usuario. Sin migraciones ni escrituras.

La [paginación de encuestas de usuarios](2026-10-30-paginacion-encuestas-usuarios.md) está integrada y desplegada en `e8c46e7`, Production `7449414166` aprobada y SHA público confirmado. La rama integrada se eliminó. La tabla carga 25 respuestas por página, los indicadores usan agregados de todo el filtro y la descarga conserva el reporte completo. Sin migraciones ni escrituras.

La [paginación de tickets de proveedores](2026-10-30-paginacion-proveedores.md) está preparada en `fix/paginacion-proveedores`, pendiente de merge/despliegue. Filtros y orden se resuelven en servidor, con 25 detalles por página y opciones de todo el área. La [revisión paralela de índices](2026-10-30-revision-indices.md) identificó tres candidatos. Después el usuario autorizó su [aplicación aditiva](2026-10-30-aplicacion-indices.md): los tres índices quedaron válidos/listos, sin tocar datos históricos, y su declaración de Drizzle se sincronizó.

## Pendientes

| Prioridad | Bloque | Trabajo restante |
|---|---|---|
| Alta | Recordatorios | Cola, reservas, reintentos y corte de 48 h desplegados. Pendientes observación de ejecuciones reales e integración Gmail/OAuth/PG; límite de duplicados ante confirmación incierta documentado. |
| Alta | Archivos | Coordinación vinculación/revert desplegada; registro previo y reintentos de altas desplegados; revisión de carpeta/permisos cerrada por el usuario; vinculación de cargas tardías desplegada; cola del widget desplegada; borrado individual recuperable desplegado en 00d9490. Pendientes integración, recorrido real/concurrencia y reconciliación de huérfanos. Cantidad ilimitada, 4 MB por carga. |
| Alta | Rate limiting | Integrado y desplegado en 9838afd. Pendientes concurrencia real y observación entre instancias. |
| Alta | Purga administrativa | Integrada y desplegada en 00d9490. Incluye historial y registros operativos, conserva recursos compartidos y permite reintentar fallos de Drive. Pendientes recorrido autenticado y concurrencia real. |
| Alta | Validación real | Drive/Gmail (sin nuevas gestiones de carpeta o consentimiento por decisión del usuario), permisos con sesión real, concurrencia de PostgreSQL y observación operativa; [límites y escenarios](2026-10-27-validacion-funcional-pendiente.md). |
| Media | Métricas y consultas | SLA por ciclo y periodos/tendencias desplegados (5453fd1 y 3c46c0b). Estadísticas personales desplegadas en 28fadb6. Paginación/agregados de encuestas de usuarios desplegados en e8c46e7. Tabla de tickets de proveedores preparada en rama local. Pendientes merge/despliegue, selector remoto, encuestas de proveedores/otros listados, otros indicadores y validación autenticada. |
| Media | Esquema y operación | Catálogo y planes revisados: tres índices creados con autorización específica y verificados; 112 KiB observados. Pendientes observación/volumen, constraints compatibles y respaldo/restauración verificables. |
| Media | Calidad | CI con entorno ficticio, accesibilidad/teclado y revisión visual, React Doctor y avisos transitivos registrados. |

Los bloques siguientes de persistencia pueden requerir tablas/columnas nuevas y deben ser aditivos y compatibles. Se crearon únicamente las tablas aditivas autorizadas de recordatorios, cancelaciones pendientes, intentos de carga, contadores de frecuencia y formularios de archivos; no se ejecutaron operaciones destructivas ni backfills. No se certifican los servicios o datos reales por haber aprobado un build.

La secuencia general está en el [Plan de ejecución](2026-10-27-plan-ejecucion.md). Las siguientes funcionalidades se incorporarán después de estabilizar los riesgos aplicables.

## Registros históricos

- [Auditoría del 6 de octubre](2026-10-06-auditoria.md).
- [Plan original](2026-10-06-plan-estabilizacion.md), sustituido por el plan de ejecución actual.
- [Validación original](2026-10-06-validacion.md) y [evidencia](evidencias/2026-10-06.json).
- [Actualización de dependencias y primer despliegue](2026-10-27-estabilizacion.md).

La propuesta de sandbox de demos fue cancelada. Los documentos históricos no autorizan configurar recursos ni operar sobre producción. React Doctor usa sus valores predeterminados; su comprobación completa continúa pendiente.

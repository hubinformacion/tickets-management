# Estado de la estabilización

## Integrado y desplegado

El código `3a598b7` está en `main` y [producción](https://requerimientos-hub.vercel.app). Incluye los bloques de dependencias, permisos, integridad de tickets/proveedores, protección de scripts, sesión, fechas, catálogos, validación de adjuntos, integridad de encuestas y recordatorios recuperables de 48 horas.

Vercel aprobó Preview y Production. Se verificaron login público, sesión anónima y redirección del dashboard. El recorrido autenticado de Google y los escenarios con datos reales no se presentan como aprobados. No se ejecutaron migraciones, reset, drop, seed ni operaciones manuales sobre datos de producción.

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

En `fix/coordinacion-adjuntos` está preparada la [coordinación de cargas pendientes](2026-10-28-coordinacion-adjuntos.md): intención persistente antes de Drive, bloqueo compartido con la vinculación, retención de referencias y validación del ticket dentro de la transacción. La tabla operativa se creó vacía con autorización de cambios aditivos. Se valida localmente y se publicará una sola vez desde main, sin Preview.

La carpeta temporal `.codex-validation-tickets` se eliminó el 28 de octubre. Contenía copias de código, verificadores con datos ficticios y logs; los resultados resumidos se conservan en estos documentos. Las comprobaciones siguientes eliminan su material temporal al terminar.

## Pendientes

| Prioridad | Bloque | Trabajo restante |
|---|---|---|
| Alta | Recordatorios | Cola, reservas, reintentos y corte de 48 h desplegados. Pendientes observación de ejecuciones reales e integración Gmail/OAuth/PG; límite de duplicados ante confirmación incierta documentado. |
| Alta | Archivos | Coordinación vinculación/revert preparada; pendientes cuotas globales/cantidad y reservas antes del upload, altas inciertas, reconciliación y revisión del borrado de vinculados/huérfanos. |
| Alta | Rate limiting | Almacén compartido entre instancias y namespaces de operación en todos los consumidores. |
| Alta | Validación real | Google, Drive/Gmail, permisos con sesión real, concurrencia de PostgreSQL y observación operativa; [límites y escenarios](2026-10-27-validacion-funcional-pendiente.md). |
| Media | Métricas y consultas | SLA por ciclo de cierre/reapertura, periodos del dashboard, métricas restantes y paginación/agregación de listados grandes. |
| Media | Esquema y operación | Revisar índices/constraints con datos/planes reales y preparar migraciones compatibles; respaldo y restauración verificables antes de operar sobre producción. |
| Media | Calidad | CI con entorno ficticio, accesibilidad/teclado y revisión visual, tres advertencias de ESLint, React Doctor y avisos transitivos registrados. |

Los bloques siguientes de persistencia pueden requerir tablas/columnas nuevas y deben ser aditivos y compatibles. Se crearon únicamente las tablas aditivas autorizadas de recordatorios y cancelaciones pendientes; no se ejecutaron operaciones destructivas ni backfills. No se certifican los servicios o datos reales por haber aprobado un build.

La secuencia general está en el [Plan de ejecución](2026-10-27-plan-ejecucion.md). Las siguientes funcionalidades se incorporarán después de estabilizar los riesgos aplicables.

## Registros históricos

- [Auditoría del 6 de octubre](2026-10-06-auditoria.md).
- [Plan original](2026-10-06-plan-estabilizacion.md), sustituido por el plan de ejecución actual.
- [Validación original](2026-10-06-validacion.md) y [evidencia](evidencias/2026-10-06.json).
- [Actualización de dependencias y primer despliegue](2026-10-27-estabilizacion.md).

La propuesta de sandbox de demos fue cancelada. Los documentos históricos no autorizan configurar recursos ni operar sobre producción. React Doctor usa sus valores predeterminados; su comprobación completa continúa pendiente.

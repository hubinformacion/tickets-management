# Estado de la estabilización

## Integrado y desplegado

El commit `a4a225c` está en `main` y [producción](https://requerimientos-hub.vercel.app). Incluye los bloques de dependencias, permisos, integridad de tickets/proveedores, protección de scripts, sesión, fechas, catálogos y validación de adjuntos.

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

En `fix/integridad-encuestas` está preparado el [bloque de encuestas de usuarios](2026-10-28-integridad-encuestas.md): respuestas enteras y únicas, coordinación con el ticket, tasa sobre el mismo conjunto de cierres y exportación por área. El código `213c846` tiene build de Preview aprobado; continúa pendiente de integrar y desplegar en producción.

La carpeta temporal `.codex-validation-tickets` se eliminó el 28 de octubre. Contenía copias de código, verificadores con datos ficticios y logs; los resultados resumidos se conservan en estos documentos. Las comprobaciones siguientes eliminan su material temporal al terminar.

## Pendientes

| Prioridad | Bloque | Trabajo restante |
|---|---|---|
| Alta | Recordatorios | Selección recuperable de vencidos, claim/lease persistente, reintentos y lotes; sin enviar dos veces por carreras. |
| Alta | Archivos | Cuotas globales/cantidad con reserva atómica, coordinación vinculación/revert, recuperación de persistencia incierta y borrados/huérfanos revisables. |
| Alta | Rate limiting | Almacén compartido entre instancias y namespaces de operación en todos los consumidores. |
| Alta | Validación real | Google, Drive/Gmail, permisos con sesión real, concurrencia de PostgreSQL y observación operativa; [límites y escenarios](2026-10-27-validacion-funcional-pendiente.md). |
| Media | Métricas y consultas | Integrar la corrección de encuestas en curso; SLA por ciclo de cierre/reapertura, periodos del dashboard, métricas restantes y paginación/agregación de listados grandes. |
| Media | Esquema y operación | Revisar índices/constraints con datos/planes reales y preparar migraciones compatibles; respaldo y restauración verificables antes de operar sobre producción. |
| Media | Calidad | CI con entorno ficticio, accesibilidad/teclado y revisión visual, tres advertencias de ESLint, React Doctor y avisos transitivos registrados. |

Los bloques de persistencia pueden requerir tablas/columnas nuevas. Su preparación debe ser aditiva y compatible; este despliegue no aplica migraciones ni autoriza operaciones sobre datos. No se certifican los servicios o datos reales por haber aprobado un build.

La secuencia general está en el [Plan de ejecución](2026-10-27-plan-ejecucion.md). Las siguientes funcionalidades se incorporarán después de estabilizar los riesgos aplicables.

## Registros históricos

- [Auditoría del 6 de octubre](2026-10-06-auditoria.md).
- [Plan original](2026-10-06-plan-estabilizacion.md), sustituido por el plan de ejecución actual.
- [Validación original](2026-10-06-validacion.md) y [evidencia](evidencias/2026-10-06.json).
- [Actualización de dependencias y primer despliegue](2026-10-27-estabilizacion.md).

La propuesta de sandbox de demos fue cancelada. Los documentos históricos no autorizan configurar recursos ni operar sobre producción. React Doctor usa sus valores predeterminados; su comprobación completa continúa pendiente.

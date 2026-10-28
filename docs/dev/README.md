# Estado de la estabilización

## Integrado y desplegado

El commit `d100754` está en `main` y [producción](https://requerimientos-hub.vercel.app). Incluye dependencias actualizadas, limpieza de mantenimiento, autorización por ticket/área, integridad transaccional, protección de scripts, recuperación de sesiones inactivas, fechas, integridad de proveedores y ordenación de catálogos.

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

El siguiente bloque se trabaja en `fix/limites-adjuntos`: formatos y contenido, tamaño real de solicitudes y alineación con el límite de Vercel. Incluye ZIP según la preferencia del usuario y excluye videos y archivos de diseño. No está integrado ni desplegado.

La carpeta temporal `.codex-validation-tickets` se eliminó el 28 de octubre. Contenía copias de código, verificadores con datos ficticios y logs; los resultados resumidos se conservan en estos documentos. Las comprobaciones siguientes eliminan su material temporal al terminar.

## Pendientes

- [Validación de concurrencia real y recorrido autenticado](2026-10-27-validacion-funcional-pendiente.md) antes de cerrar los hallazgos de integridad; validar en navegador la corrección desplegada para la redirección circular con sesión inactiva.
- Recordatorios recuperables, compensaciones de archivos y limpieza de huérfanos.
- Formatos/contenido, tamaño global/cantidad de uploads y rate limiting compartido.
- Índices/constraints; métricas de SLA pendientes aunque el helper de horas hábiles ya usa Lima.
- Métricas, paginación, CI y accesibilidad; tres advertencias de ESLint y cuatro avisos transitivos.

La secuencia general está en el [Plan de ejecución](2026-10-27-plan-ejecucion.md). Las siguientes funcionalidades se incorporarán después de estabilizar los riesgos aplicables.

## Registros históricos

- [Auditoría del 6 de octubre](2026-10-06-auditoria.md).
- [Plan original](2026-10-06-plan-estabilizacion.md), sustituido por el plan de ejecución actual.
- [Validación original](2026-10-06-validacion.md) y [evidencia](evidencias/2026-10-06.json).
- [Actualización de dependencias y primer despliegue](2026-10-27-estabilizacion.md).

La propuesta de sandbox de demos fue cancelada. Los documentos históricos no autorizan configurar recursos ni operar sobre producción. React Doctor usa sus valores predeterminados; su comprobación completa continúa pendiente.

# Estado de la estabilización

## Integrado y desplegado

El commit `709e333` está en `main` y [producción](https://requerimientos-hub.vercel.app). Incluye las dependencias actualizadas, la limpieza de mantenimiento, la retirada de `doctor.config.ts` y el bloque de autorización por ticket/área.

Vercel aprobó Preview y Production. Se verificaron login público, sesión anónima y redirección del dashboard. El recorrido autenticado de Google y los escenarios con datos reales no se presentan como aprobados. No se ejecutaron migraciones, reset, drop, seed ni operaciones manuales sobre datos de producción.

Las ramas de limpieza y autorización se eliminaron después de integrarlas. El alcance de permisos y sus verificaciones están en [Autorización y validación](2026-10-27-autorizacion.md).

## Trabajo actual

`fix/integridad-tickets` prepara transiciones condicionales con historial/comentarios en la misma transacción, creación atómica con adjuntos, año del código en Lima y cierre automático sin sobrescribir una transición ganadora. Este bloque no está integrado ni desplegado. Ver [Integridad de tickets](2026-10-27-integridad.md).

## Pendientes

- Validación de concurrencia real y recorrido autenticado antes de cerrar los hallazgos de integridad.
- Recordatorios recuperables, compensaciones de archivos y limpieza de huérfanos.
- Formatos/contenido, tamaño global/cantidad de uploads y rate limiting compartido.
- Protección de scripts destructivos, fechas, proveedores, ordenamiento e índices/constraints.
- Métricas, paginación, CI y accesibilidad; tres advertencias de ESLint y cuatro avisos transitivos.

La secuencia general está en el [Plan de ejecución](2026-10-27-plan-ejecucion.md). Las siguientes funcionalidades se incorporarán después de estabilizar los riesgos aplicables.

## Registros históricos

- [Auditoría del 6 de octubre](2026-10-06-auditoria.md).
- [Plan original](2026-10-06-plan-estabilizacion.md), sustituido por el plan de ejecución actual.
- [Validación original](2026-10-06-validacion.md) y [evidencia](evidencias/2026-10-06.json).
- [Actualización de dependencias y primer despliegue](2026-10-27-estabilizacion.md).

La propuesta de sandbox de demos fue cancelada. Los documentos históricos no autorizan configurar recursos ni operar sobre producción. React Doctor usa sus valores predeterminados; su comprobación completa continúa pendiente.

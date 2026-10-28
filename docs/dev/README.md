# Estado de la estabilización

## Integrado y desplegado

El commit `d1f961d` está en `main` y [producción](https://requerimientos-hub.vercel.app). Incluye las dependencias actualizadas, la limpieza de mantenimiento, la retirada de `doctor.config.ts`, la autorización por ticket/área y el bloque de integridad transaccional.

Vercel aprobó Preview y Production. Se verificaron login público, sesión anónima y redirección del dashboard. El recorrido autenticado de Google y los escenarios con datos reales no se presentan como aprobados. No se ejecutaron migraciones, reset, drop, seed ni operaciones manuales sobre datos de producción.

Las ramas de limpieza y autorización se eliminaron después de integrarlas. El alcance de permisos y sus verificaciones están en [Autorización y validación](2026-10-27-autorizacion.md).

## Integridad integrada

`d1f961d` incorpora transiciones condicionales con historial/comentarios en la misma transacción, creación atómica con adjuntos, año del código en Lima y cierre automático sin sobrescribir una transición ganadora. Preview y Production aprobados; las comprobaciones públicas devolvieron login 200, sesión anónima 200/null y dashboard 307 a login. Ver [Integridad de tickets](2026-10-27-integridad.md).

La guía operativa exige preservar los datos históricos y preparar cambios de esquema aditivos y compatibles, con campos nuevos nullable o valores predeterminados cuando corresponda. Este despliegue no incluye cambios de esquema ni migraciones de datos.

## Trabajo actual

La [protección de scripts de BD](2026-10-27-proteccion-scripts.md) está en `3463601` (`fix/proteccion-scripts-bd`): bloqueo por defecto, simulación sin conexión, ejecución local confirmada y retirada de drop/reset/limpieza masiva FED. La rama `fix/sesion-inactiva` parte de ese commit y añade la [recuperación de sesiones inactivas](2026-10-27-sesion-inactiva.md). Ambos bloques están pendientes de integrar y desplegar en producción. No se realizaron operaciones sobre la BD.

## Pendientes

- [Validación de concurrencia real y recorrido autenticado](2026-10-27-validacion-funcional-pendiente.md) antes de cerrar los hallazgos de integridad; integrar y validar en navegador la corrección preparada para la redirección circular con sesión inactiva.
- Recordatorios recuperables, compensaciones de archivos y limpieza de huérfanos.
- Formatos/contenido, tamaño global/cantidad de uploads y rate limiting compartido.
- Integrar la protección de scripts destructivos preparada; fechas, proveedores, ordenamiento e índices/constraints.
- Métricas, paginación, CI y accesibilidad; tres advertencias de ESLint y cuatro avisos transitivos.

La secuencia general está en el [Plan de ejecución](2026-10-27-plan-ejecucion.md). Las siguientes funcionalidades se incorporarán después de estabilizar los riesgos aplicables.

## Registros históricos

- [Auditoría del 6 de octubre](2026-10-06-auditoria.md).
- [Plan original](2026-10-06-plan-estabilizacion.md), sustituido por el plan de ejecución actual.
- [Validación original](2026-10-06-validacion.md) y [evidencia](evidencias/2026-10-06.json).
- [Actualización de dependencias y primer despliegue](2026-10-27-estabilizacion.md).

La propuesta de sandbox de demos fue cancelada. Los documentos históricos no autorizan configurar recursos ni operar sobre producción. React Doctor usa sus valores predeterminados; su comprobación completa continúa pendiente.

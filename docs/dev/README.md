# Documentación de auditoría

El primer bloque está integrado en `main` y desplegado en [producción](https://requerimientos-hub.vercel.app). El código publicado corresponde a `1fe7997`. Las ramas de sandbox y estabilización inicial ya fueron cerradas.

Quedó publicado: actualización de dependencias, correcciones de calidad/autenticación y comprobación de fallo de envío de recordatorios. La auditoría funcional completa sigue pendiente.

Pendiente, en orden: permisos y validación de entradas; transiciones y fechas; recuperación de recordatorios/archivos y rate limiting; métricas, esquema, CI y accesibilidad. También falta el recorrido autenticado de Google y el análisis de cuatro avisos transitivos. No se han aplicado migraciones ni cambios de datos en producción.

Los detalles y comprobaciones están en [Estabilización del 27 de octubre](2026-10-27-estabilizacion.md).

La secuencia vigente está en el [Plan de ejecución](2026-10-27-plan-ejecucion.md).

Los documentos fechados son registros de revisión y planes de trabajo, no instrucciones operativas vigentes. La propuesta de crear un sandbox fue cancelada y no debe usarse para configurar Neon, Vercel, Google ni el entorno local.

- [Auditoría integral](2026-10-06-auditoria.md): hallazgos sobre el estado revisado.
- [Plan de estabilización](2026-10-06-plan-estabilizacion.md): borrador que requiere actualizar sus supuestos antes de ejecutar fases.
- [Registro de validación](2026-10-06-validacion.md): evidencia histórica y escenarios propuestos en esa fecha.
- [Evidencia resumida](evidencias/2026-10-06.json): inventario sin credenciales.

No se ha aplicado ninguna corrección de base de datos ni se debe interpretar esta documentación como autorización para operar sobre producción.

# Dependencias, calidad, rendimiento y revisión de recordatorios

Alcance autorizado: continuar las correcciones pendientes en paralelo, sin retomar recorridos de aceptación real. Ponytail, revisión de seguridad enfocada, Impeccable para controles existentes y prácticas Vercel para lecturas/render. Rama local de estabilización `fix/dependencias-calidad-rendimiento`; sin funcionalidades nuevas, Preview, CI, servicios de pago, suites/tests persistentes o cambios destructivos.

## Dependencias

Auditoría actual aislada (solo package/lock) y revisión de rangos/caminos alcanzables. Corregir parches compatibles concretos, sin actualizaciones masivas ni overrides que salten major. Propuesta acotada: resolver tsx de Drizzle dentro del rango permitido, parser CSS de Typography en 6.x y gaxios 7.x para retirar la rama glob/rimraf vulnerable. Los pins exactos del proveedor necesitan tres overrides dirigidos en el pnpm-workspace.yaml existente; conservar allowBuilds e ignoredOptionalDependencies, revisar notas/API y validar árbol nuevo, no solo el node_modules anterior. Resto de avisos se documenta por alcance real y compatibilidad.

## Calidad

Limpieza de formulario/vínculo tras crear ticket de proveedor con éxito, conservando borrador ante error/cancelación. Evitar truncar representación SLA de 25/47 horas a un día completo. Nombres accesibles de controles de catálogos de agente y asociación del campo categoría. Sin refactor masivo de complejidad o supresiones de Doctor; 64 avisos históricos no se convierten en 64 bugs.

## Rendimiento

Eliminar la consulta y prop SLA que el dashboard de agente calcula/serializa pero no representa; conservar administración y métricas visibles. Revisar una ronda secuencial evitable en detalle de ticket con lecturas ya autorizadas independientes. Sin nuevas consultas/escrituras, índices, truncamientos o cambios de permisos.

## Recordatorios

No hay defecto demostrado de fechas tras la entrega anterior. Revisar almacenamiento/reintentos y dimensionar el límite existente de hasta 20 reservas/25 segundos por cron diario. Consultar únicamente conteos agregados en transacción READ ONLY si el destino configurado está accesible, sin correo/worker ni datos personales. No elevar capacidad ni introducir servicios sin evidencia de acumulación.

## Cierre

Validación integrada una vez con dependencias actualizadas: tipos, ESLint y build en copia sin secretos, instalación congelada/scripts deshabilitados. Comprobaciones técnicas pequeñas cuando sean necesarias para el cambio; sin matrices reales nuevas ni pnpm test. Revisión independiente final, docs agrupadas y commit local pendiente de aprobación de merge/despliegue. Los tres agentes tienen archivos de propiedad exclusiva y no gestionan git.

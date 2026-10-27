# Estabilización de la auditoría — 27 de octubre de 2026

## Cierre del primer despliegue

El commit `1fe7997` fue integrado en `main` con autorización del usuario. Vercel completó Preview y Production correctamente (deployment de producción `BpsYoAoBtuirvSc1rXtFcSXqUDHv`, registro GitHub `7371288474`). El build del proveedor queda aprobado; las limitaciones de build local descritas más abajo se conservan como evidencia histórica.

En `https://requerimientos-hub.vercel.app` se verificó GET `/login` → 200 con título de la aplicación, GET `/api/auth/get-session` sin cookies → 200 con `null`, y GET `/dashboard` → 307 a `/login`. La URL individual del deployment tiene protección SSO de Vercel. No se probó el flujo autenticado de Google ni se realizaron operaciones sobre tickets, correos, archivos o datos de producción.

No se ejecutaron migraciones, reset, drop ni seed. Las ramas `fix/auditoria-estabilizacion` y `feat/sandbox-seguro` se eliminaron después de integrarse; el resto de la auditoría continúa pendiente según el plan. Las secciones siguientes describen el trabajo y sus resultados antes de este cierre.

## Estado y ramas

El usuario autorizó ejecutar las correcciones de auditoría. Se cerraron los cambios locales anteriores en `03d10dd`, sobre `feat/sandbox-seguro`, y se abrió `fix/auditoria-estabilizacion` desde ese estado. No se hizo merge, push ni despliegue. La propuesta de sandbox de demos está cancelada.

La auditoría del 6 de octubre se conserva como evidencia histórica. Este registro distingue el trabajo actual de sus recomendaciones originales. La BD y las variables locales de producción no se modificaron.

## Dependencias actualizadas

| Familia | Versión anterior | Versión preparada |
|---|---|---|
| Next.js y eslint-config-next | 16.2.7 | 16.4.3 |
| Zod | 4.4.3 | 4.6.7 |
| Better Auth | 1.6.15 | 1.7.14 |
| Tiptap | 3.26.0 | 3.32.0 |
| Drizzle Kit | 0.31.10 | 0.31.11 |
| tsx | 4.21.0 | 4.23.15 |

Se refrescó el lockfile dentro de los rangos declarados, incluyendo Recharts, Tailwind, ESLint y transitivas. La instalación deshabilitó scripts. No se usó `audit --fix` ni overrides para forzar cambios mayores en transitivas.

Next requiere al menos 16.4.1 por los [avisos del 14 de octubre](https://nextjs.org/blog/nextjs-security-update-october-14-2026). Zod requiere al menos 4.6.6 por [consumo excesivo de memoria](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). Better Auth 1.6.22 introducía otros rangos afectados; se eligió 1.7.14 después de revisar su guía de actualización y el esquema de sus paquetes instalados. El esquema básico mantiene los campos usados por esta aplicación; no se activaron plugins ni se ejecutaron migraciones. El login real y la ausencia de identidades duplicadas siguen pendientes de verificación antes del despliegue.

`pnpm audit --json` pasó de 83 entradas (6 críticas, 45 altas, 29 moderadas y 3 bajas) a 4 (0 críticas, 0 altas, 3 moderadas y 1 baja). Los conteos son entradas del registro, no incidentes ni explotabilidad demostrada. [Evidencia](evidencias/2026-10-27-dependencias.json).

Avisos restantes:

- Esbuild antiguo, transitivo de Drizzle Kit: aviso del servidor de desarrollo; no se encontró que la app inicie ese servidor. No forzar su versión mayor dentro de herramientas de migración.
- Esbuild transitivo de tsx: lectura de archivos en servidor de desarrollo Windows. La condición de plataforma y uso debe verificarse donde se ejecuten estas herramientas.
- UUID transitivo de ExcelJS: comprobación de límites en variantes con buffer. Falta confirmar el camino de uso real; no sustituir UUID 8 por UUID 11 mediante override sin validar compatibilidad.
- Postcss-selector-parser transitivo de Typography: revisar el procesamiento de CSS y disponibilidad de un parche compatible antes de cerrar el aviso.

## Comprobaciones

Tipos: aprobado con `tsc --noEmit --incremental false`. Lint: aprobado con 0 errores y 64 advertencias. La actualización de ESLint detectó dos errores nuevos de sincronización de estado: se corrigieron el indicador de montaje del selector de tema y el rango local de los filtros de fecha, conservando la selección parcial y su reinicio al cambiar la URL.

Estas comprobaciones usaron Bubblewrap con red aislada, entorno vacío con variables permitidas explícitas, fuentes y dependencias de solo lectura, sin `.env`, HOME temporal, almacenamiento temporal limitado y límites de CPU, memoria, procesos y archivos. Esto es aislamiento del proceso de verificación; no crea recursos ni un entorno de demos.

Build: no aprobado. En la copia temporal, Turbopack intentó descargar Inter de Google Fonts (red bloqueada) y abortó por una asignación de memoria bajo el límite de memoria virtual del proceso. No se deshabilitaron tipos ni se cambió la configuración del proyecto para ocultar el fallo. El build completo sigue pendiente en un entorno de compilación con recursos adecuados y acceso controlado a fuentes, usando únicamente variables ficticias.

El hook de commit emitió un aviso genérico de React Doctor y permitió el commit. La ejecución aislada posterior de la versión disponible localmente (0.0.30) terminó con resultados incompletos: oxlint abortó por memoria bajo los límites del proceso. El hook elimina su salida detallada, por lo que su mensaje no demuestra una regresión de fuente. React Doctor permanece pendiente; su salida 0 tampoco constituye aprobación porque omitió los checks fallidos.

## Trabajo pendiente

1. S01–S06: autorización por ticket/área, observadores, agentes sin área, adjuntos y escape de reportes HTML.
2. D01–D03 y D06: transiciones atómicas, historial, creación, recordatorios y fechas. D02 solo tiene corregido el marcador de envío fallido.
3. O03 y O05: rate limiting compartido y protección de scripts destructivos independiente del sandbox cancelado.
4. S07–S09, D04–D05, D09 y O02: metadata, actividad interna, proveedores, ordenamiento, constraints/índices y recuperación de archivos.
5. D07–D08, O04 y Q01–Q04: métricas, paginación, CI, rutas, advertencias y accesibilidad. S08 y la redirección de Q01 tienen cambios locales ya guardados, pero sus escenarios autenticados no están aprobados.
6. Revisar las migraciones y la configuración efectiva antes de cualquier despliegue. Las pruebas de compilación y tipos no certifican OAuth ni datos reales. No ejecutar reset/drop/seed como comprobación de producción.

La estabilización completa permanece en curso; este bloque no cierra los hallazgos funcionales ni autoriza desplegar.

# CI de calidad sin acceso a producción

Continúa el bloque CI del plan de auditoría aprobado. Los bloques anteriores ya están integrados/desplegados en main (6c3e631), sin cambios pendientes de commit/merge al iniciar. Se trabaja en `ci/calidad-aislada` y se agrupan workflow y documentación.

Alternativas: conservar solo comprobaciones manuales deja regresiones sin detectar; reutilizar secretos/entorno de producción es innecesario y queda descartado. Se elige un workflow con instalación limpia y variables ficticias, sin servicios de BD ni recursos de Preview.

Se ejecuta por push a main, pull_request hacia main y workflow_dispatch. No usa pull_request_target, secrets ni environments de producción. Permisos contents:read y checkout sin persistir credenciales. Las acciones se fijan por commit completo de sus repositorios oficiales; Node 24.22.1 y pnpm 11.3.0 coinciden con la validación local. Se usa ubuntu-24.04, timeout y cancelación de ejecuciones obsoletas por referencia.

Instalación con lockfile congelado, ignore-scripts e ignore-pnpmfile, sin caché inicial. Se comprueba que una instalación limpia soporta tipos/lint/build sin lifecycle scripts. Esto no cambia la política allowBuilds del desarrollo o Vercel. Tipos sin emitir/incremental, ESLint sin advertencias y build completo, sin framework ni ejecución de tests. Variables ficticias para auth/DB/Google/cron, sin refresh tokens; no se envían correos, archivos ni workers. Los recursos de Node/workers se acotan solo en CI, sin cambiar configuración de producción.

Pasos: verificar SHAs/inputs oficiales, escribir workflow, validar estructura y comandos, instalar/build en copia aislada sin .env y con dependencias nuevas, documentar límites, commit/merge autorizados y comprobar primera ejecución de GitHub Actions y cualquier despliegue de main. No se afirma CI aprobado por haber pasado localmente. Si una política/cuota externa impide ejecutar, se informa el bloqueo concreto sin modificar permisos de cuenta.

Quedan pendientes integración autenticada, accesibilidad/Doctor, métricas/exports grandes y observación real. La CI no garantiza que Google/Drive/cron o carreras de PostgreSQL funcionen y no hace migraciones ni cambios de datos.

El [registro del bloque](../dev/2026-10-31-ci-calidad.md) conserva configuración, fuentes, comprobaciones y límites.

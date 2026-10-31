# CI de calidad con configuración ficticia

## Entrega

Se incorpora [.github/workflows/calidad.yml](../../.github/workflows/calidad.yml) para automatizar tipos, ESLint y build. Continúa el bloque CI aprobado del plan. Al iniciar, main/origin estaban limpios y los cambios anteriores ya estaban integrados en `6c3e631`; no se creó un commit vacío ni se repitió aquel merge.

La paginación de evaluaciones de proveedores ya fue desplegada/verificada en `6c3e631`, Production `7450920773`. La búsqueda remota anterior está en `a7bdd2e`. Sus comprobaciones no certifican navegación autenticada de Google, proveedores, encuestas o adjuntos reales. Este bloque no hace migraciones ni cambia configuración de Vercel/BD/auth/Drive/Gmail.

## Workflow

Se ejecuta por push a main, pull_request hacia main y workflow_dispatch. No usa pull_request_target, secretos, environments de producción o despliegues Preview. Permisos contents:read y checkout sin credenciales persistidas. Un único job ubuntu-24.04 tiene timeout de 20 minutos; ejecuciones obsoletas de la misma referencia se cancelan. No modifica reglas de protección de main ni las convierte en obligatorias automáticamente.

Acciones fijadas a commits completos verificados contra sus tags oficiales:

| Acción | Versión | Commit |
|---|---|---|
| actions/checkout | v7.0.1 | 3d3c42e5aac5ba805825da76410c181273ba90b1 |
| actions/setup-node | v7.1.0 | 949feb2413d6458794dcd2491c4babbbce0c15c1 |
| pnpm/action-setup | v6.1.0 | ea17c68df8912ef543352723c149a84f56e3d413 |

Node 24.22.1 y pnpm 11.3.0 coinciden con la validación local. Estas versiones son de CI: no se alteran packageManager/engines ni el runtime seleccionado en Vercel. Setup-node no activa caché automática; pnpm no instala dependencias durante su acción de preparación ni guarda caché. No se comparten node_modules, store o .next entre ejecuciones en esta primera configuración.

Los comandos son instalación con frozen-lockfile/ignore-scripts/ignore-pnpmfile, tsc --noEmit --incremental false, ESLint --max-warnings 0 y pnpm build. Los cuatro pasos fijan PNPM_CONFIG_IGNORE_SCRIPTS, PNPM_CONFIG_IGNORE_PNPMFILE y PNPM_CONFIG_FROZEN_LOCKFILE a true, además de los flags explícitos de instalación. pnpm 11 usa PNPM_CONFIG_* para estas opciones; se verificó localmente que las tres se leen como true. Se aplican después de preparar pnpm, para no interferir con su instalador.

Los scripts lifecycle y hooks de pnpm se omiten en CI. Esto no cambia allowBuilds del desarrollo/Vercel. Los comandos de calidad/build se ejecutan expresamente, sin tests ni framework nuevo. No se ejecutan setup, seed, reset, drop, push de esquema, workers, correo o Drive.

El job utiliza DB local ficticia en 127.0.0.1:1 y valores ficticios para auth/Google/cron, sin refresh tokens. Se acota heap a 3 GiB y workers de Next a dos mediante el valor que interpreta Next.js 16.4.3; es configuración de CI, no una modificación permanente del proceso de producción. El build conserva las descargas públicas de fuentes existentes.

## Verificación

- YAML parseado y comprobados eventos, permisos, siete pasos, SHAs, versiones, ausencia de secretos/entornos reales, políticas de pnpm y comandos exactos.
- Una instalación inicial limpia de 819 paquetes, sin reutilizar node_modules, permitió tipos/lint/build. Después se fijaron las opciones PNPM_CONFIG_* para todos los pasos y se repitió la instalación limpia con la configuración final; la configuración final aprobó tipos, ESLint sin advertencias y build de 23 páginas estáticas, con el lockfile intacto. Se verificó código de salida 0.
- La copia local excluyó .git, node_modules, .next, archivos de entorno y tsbuildinfo. Se usaron código de solo lectura y scratch limitado en un proceso con entorno vacío salvo valores ficticios/proxy público/certificados, sin credenciales de producción.
- El runner local ejecuta los comandos y variables leídos del workflow; comprueba al finalizar que el SHA-256 del lockfile no cambió. El Node local añade una opción de aislamiento de memoria WASM para su límite de espacio de direcciones; no se añade al workflow.
- La ejecución real de GitHub Actions se comprueba después del merge/push. No se afirma CI aprobada por el resultado local. Los logs del workflow son el registro de esa ejecución; este documento se agrupa con código para evitar un despliegue posterior de solo documentación.

## Límites y pendientes

Las acciones/runner, instalación desde registro y descarga de fuentes se verifican realmente al ejecutar en GitHub; la reproducción local no sustituye esa comprobación. El sistema operativo ubuntu-24.04 recibe actualizaciones de imagen. Se fijan herramientas y lockfile, pero no se promete una compilación hermética o idéntica bit a bit.

Esta CI comprueba tipos/lint/build; no ejecuta postinstall autorizados de producción ni acredita OAuth, correo/Drive, permisos con sesión real, concurrencia de PostgreSQL o flujo visual/teclado. Caches, protección obligatoria de main, React Doctor, accesibilidad, exportaciones grandes y validación real siguen separados. No se instala React Doctor latest ni se añade una excepción para ignorar fallos de calidad.

Referencias: [setup-node](https://github.com/actions/setup-node), [pnpm/action-setup](https://github.com/pnpm/action-setup), [configuración de pnpm](https://pnpm.io/configuring), [instalación de pnpm](https://pnpm.io/cli/install). El material temporal local se retira al terminar.

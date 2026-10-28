# Recuperación de una sesión inactiva

## Problema y comportamiento

La página de login redirigía a dashboard cuando existía cualquier sesión. `requireAuth()` devuelve las cuentas inactivas a login. Ambas reglas juntas podían producir redirecciones repetidas.

Login ahora redirige únicamente a cuentas activas. Si existe una sesión sin actividad válida, presenta el aviso de cuenta desactivada y un botón para cerrar sesión. El cierre usa Better Auth; solo tras éxito se refresca la página. Un error muestra un mensaje y permite reintentar. Las personas sin sesión conservan el ingreso con Google.

La condición coincide con el guard del servidor: también falla de forma cerrada si falta `isActive`. No se modifican cuentas, roles, permisos, tablas ni registros de historial. El cierre de sesión solo se solicita como acción explícita del usuario, no al renderizar la página.

## Estado y validación

Integrado en `main` y desplegado en producción como `e089be3`, sobre el bloque de scripts `3463601`.

33 comprobaciones temporales externas con sesiones ficticias: cuenta activa, inactiva, actividad ausente, sesión caducada/ausente, paso del guard al login sin una segunda redirección, mensaje y acción adecuados, logout exitoso, fallo devuelto y excepción. Comprueban recuperación del botón y ausencia de actualización como éxito ante un fallo. Se ejecutan sin red, credenciales ni BD, con los mismos límites de aislamiento del bloque de scripts.

TypeScript aprobado con `tsc --noEmit --incremental false`; ESLint aprobado con 0 errores y las 3 advertencias conocidas. Vercel aprobó los builds de Preview y Production de `e089be3`.

El mock de Better Auth verifica cómo se usa su contrato, no su servicio real. El login Google, la revocación efectiva de cookies y el recorrido en navegador siguen pendientes. No se han usado cuentas reales ni ejecutado operaciones contra producción.

## Despliegue

El [despliegue de producción](https://vercel.com/hub-de-informacions-projects/requerimientos-hub/8AThuPNvnhA2mSqNtLU9YDjLJGYe) figura como `success` (registro de GitHub `7376579039`). Se verificaron `/login` (200), `/api/auth/get-session` anónimo (200, `null`) y `/dashboard` sin sesión (307 a `/login`) en https://requerimientos-hub.vercel.app. No se ejecutaron migraciones, comandos de mantenimiento ni operaciones manuales sobre datos, correo o archivos de producción.

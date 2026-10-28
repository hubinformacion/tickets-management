# Recuperación de una sesión inactiva

## Problema y comportamiento

La página de login redirigía a dashboard cuando existía cualquier sesión. `requireAuth()` devuelve las cuentas inactivas a login. Ambas reglas juntas podían producir redirecciones repetidas.

Login ahora redirige únicamente a cuentas activas. Si existe una sesión sin actividad válida, presenta el aviso de cuenta desactivada y un botón para cerrar sesión. El cierre usa Better Auth; solo tras éxito se refresca la página. Un error muestra un mensaje y permite reintentar. Las personas sin sesión conservan el ingreso con Google.

La condición coincide con el guard del servidor: también falla de forma cerrada si falta `isActive`. No se modifican cuentas, roles, permisos, tablas ni registros de historial. El cierre de sesión solo se solicita como acción explícita del usuario, no al renderizar la página.

## Estado y validación

Preparado en `fix/sesion-inactiva`, sobre el bloque de scripts `3463601`; pendiente de integrar y desplegar.

33 comprobaciones temporales externas con sesiones ficticias: cuenta activa, inactiva, actividad ausente, sesión caducada/ausente, paso del guard al login sin una segunda redirección, mensaje y acción adecuados, logout exitoso, fallo devuelto y excepción. Comprueban recuperación del botón y ausencia de actualización como éxito ante un fallo. Se ejecutan sin red, credenciales ni BD, con los mismos límites de aislamiento del bloque de scripts.

TypeScript aprobado con `tsc --noEmit --incremental false`; ESLint aprobado con 0 errores y las 3 advertencias conocidas. El build de este bloque está pendiente; el build aprobado de producción corresponde a `d1f961d`.

El mock de Better Auth verifica cómo se usa su contrato, no su servicio real. El login Google, la revocación efectiva de cookies y el recorrido en navegador siguen pendientes. No se han usado cuentas reales ni ejecutado operaciones contra producción.

# Validación funcional pendiente

## Qué está comprobado

El despliegue `e089be3` tiene build aprobado y comprobaciones anónimas registradas en [Integridad](2026-10-27-integridad.md). Las matrices de permisos e integridad usan dobles de BD; no certifican OAuth ni concurrencia del motor PostgreSQL.

## Recorrido autenticado

Pendiente de una sesión del responsable del proyecto: no hay una sesión de navegador autorizada disponible para completar Google. No se pedirán cookies, tokens ni contraseñas para hacerlo.

1. Con una cuenta activa ya existente, completar Google y comprobar llegada al dashboard, recarga y navegación a un ticket propio. Registrar únicamente resultado y mensaje de error, sin identificadores personales ni contenido del ticket. El login crea o actualiza datos de autenticación como parte del flujo normal.
2. Revisar con identidades de prueba autorizadas la matriz de creador, observador, usuario ajeno, agente de la misma/otra área, agente sin área, admin e inactivo. Preparar esa matriz fuera de producción; no acceder a tickets de otras personas para probar permisos en producción.
3. Ejercitar creación, asignación, validación, rechazo, reapertura, adjuntos y correo con datos ficticios fuera de producción, conservando un único historial ganador por transición.
4. Revisar sesión caducada y sesión de cuenta inactiva, incluyendo ausencia de bucles entre login y dashboard.

La inspección detectó una redirección circular entre login y dashboard para sesiones inactivas. La [corrección y sus 33 comprobaciones aisladas](2026-10-27-sesion-inactiva.md) están integradas y desplegadas en `e089be3`. El recorrido real continúa pendiente; no se ha probado con cuentas reales.

## Concurrencia de PostgreSQL

No hay ejecutables `postgres`/`psql` disponibles en este entorno. No se instalaron ni crearon servicios para suplirlos. Queda pendiente ejecutar la matriz de conflictos y rollback sobre una BD local desechable, nunca contra producción: dos conexiones que aprueben/rechacen simultáneamente, solicitud renovada, cron frente a cambio manual y fallo de historial. Comprobar una sola transición confirmada, historia consistente y rollback completo.

La preparación o aplicación de migraciones sobre producción requiere propuesta, respaldo y autorización propios. Ninguno de estos pendientes autoriza reset, drop, seed o limpiezas de datos reales.

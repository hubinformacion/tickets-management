# Recuperar el acceso tras un error del proveedor

El usuario autorizó ejecutar los pendientes. Tras contrastar el contrato de Better Auth 1.7.14 con Context7 y reproducir un HTTP 400 con LoginForm/cliente reales, se confirma un bloqueo del botón por ignorar el error devuelto. Se prepara una corrección independiente sobre la rama local de controles.

Se inspecciona el resultado data/error: error devuelto o falta de redirección utilizable muestra el mensaje español existente y habilita reintentar. Excepciones siguen el mismo camino. Un finally libera el estado de carga salvo cuando el cliente ya recibió una redirección válida. Se conserva la navegación automática de Better Auth, proveedor Google, callback y configuración de sesión. Es preferible a cambiar el modo throw de todo el cliente o reimplementar OAuth.

No se cambia BD, tokens, consentimiento, variables o proveedor. Se comprueban en navegador local los errores HTTP devueltos, fallo de transporte, respuesta sin redirección y éxito con destino ficticio; no hay petición externa ni acceso de usuario real. Tipos, ESLint y build con valores ficticios y escaneo Doctor fijo; no se añade framework. El merge/despliegue de este bloque queda pendiente de aprobación.

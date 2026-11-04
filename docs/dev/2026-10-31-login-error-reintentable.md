# Reintentar el login tras un error del proveedor

## Entrega

Corrección local en `fix/login-error-reintentable`, basada en `fix/accesibilidad-controles`; integra por tanto el registro de Doctor y las tres correcciones de controles al realizar el futuro merge de esta rama. Pendiente de aprobación de integración/despliegue. Producción permanece en `e47e29d`. El [diseño](../plans/2026-10-31-login-error-design.md) concreta el contrato y los límites.

Better Auth 1.7.14 devuelve por defecto {data,error} en el cliente. El handleLogin anterior solo recuperaba isLoading cuando se lanzaba una excepción; ignoraba un error HTTP resuelto y dejaba el botón bloqueado en «Redirigiendo…». El defecto se reprodujo con LoginForm y cliente reales, sustituyendo únicamente el fetch por una respuesta HTTP 400 ficticia.

Ahora se comprueba error y que exista redirección con URL. Ante error devuelto, excepción o respuesta sin redirección, se muestra el mensaje español existente y finally habilita reintentar. Una redirección válida conserva el estado ocupado mientras el plugin instalado de Better Auth inicia la navegación. No se reimplementa OAuth ni se cambian proveedor, callback, cliente global, permisos, variables, cookies o datos.

## Verificación

TypeScript estricto, ESLint completo sin advertencias y build aprobados (exit 0), con valores ficticios en una copia sin .env, herramientas acotadas y lockfile intacto. Node 24.22.1/pnpm 11.3.0. No se ejecutó framework de tests ni se añadieron dependencias.

Chromium ejecutó el componente y Better Auth 1.7.14 reales en un entorno sin red externa, con dominio/destino y respuestas ficticios. Navegaciones se atendieron localmente mediante interceptación, sin petición a ese dominio. Se verificó:

- HTTP 400 devuelto por el cliente sin lanzar: mensaje de error y botón habilitado.
- Fallo de transporte: mensaje y posibilidad de reintentar.
- Respuesta 200 sin redirección: mensaje y recuperación.
- Excepción al invocar el cliente: recuperación mediante catch/finally.
- Respuesta pendiente: botón bloqueado hasta resolver; al resolver con error vuelve a estar disponible.
- Respuesta correcta con redirect/url: se conserva la navegación automática del cliente al destino ficticio.

Cada caso de error produjo una notificación, sin excepciones no controladas en el navegador. No se ejecutó Google OAuth ni se usaron cuentas, tokens o correo reales. La integración real y los problemas de navegación posteriores a una redirección siguen fuera de esta comprobación.

Doctor 0.9.17 mantiene **9 errores y 67 advertencias** en 285 archivos. La regla no-loading-flag-reset-outside-finally continúa avisando aunque el reset está en finally y los errores se verificaron en navegador: su análisis no acredita el camino de redirección conservado. No se alteró el flujo para satisfacer la heurística ni se silenció la regla. Doctor global sigue pendiente, con los falsos positivos y limitaciones ya documentados.

Se consultó [Context7/Better Auth](https://www.better-auth.com/docs/concepts/client) y el código instalado (client/config.mjs, client/fetch-plugins.mjs). El material temporal de navegador/Doctor/build se retira al terminar; no se publica Preview.

## Resto priorizado

Siguen las escalas de encuestas (pregunta/selección anunciadas y recorrido de teclado), el encabezado/etiqueta real de FilePond, contraste/lector real y exportaciones grandes. En la encuesta flotante se observó además ancho fijo de 480 px; hay que comprobar y corregir su ajuste a pantallas estrechas junto al grupo de valoración, sin cambiar las respuestas o datos guardados. No se afirma haber cerrado las 67 advertencias ni la integración con servicios reales.

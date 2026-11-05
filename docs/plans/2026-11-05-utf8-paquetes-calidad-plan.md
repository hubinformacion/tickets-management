# Corrección UTF-8, paquetes actuales y calidad

El usuario autorizó puntos 1, 2 y 3 en paralelo y pidió revisar todos los paquetes a fecha de 5 de noviembre de 2026. Rama local `fix/utf8-dependencias-calidad`, sin Preview/CI, pruebas de aceptación reales, servicios nuevos ni escrituras en producción. Se conservan todos los datos y las reglas de recordatorios.

## Codificación compartida

Sustituir el quoted-printable defectuoso del cuerpo por base64 sobre bytes UTF-8, con líneas MIME de 76 caracteres/CRLF. Reutilizar Buffer y el cliente Gmail existente; preservar destinatarios, remitente, asunto, threading y opciones de timeout/retry. Reproducción ficticia del defecto y comprobación del MIME real generado, sin enviar mensajes ni acceder a credenciales. La campaña histórica ya fue enviada y no se repite.

## Dependencias a la fecha

Consultar metadatos primarios del registro para los 59 paquetes directos/de desarrollo, comparar installed/manifest/latest/objetivo y auditar el árbol completo. pnpm outdated puede usar una caché anterior; la tabla se basa en el snapshot HTTP de hoy. Actualizar a estables vigentes donde sean compatibles, incluidas mayores con API compatible usada por el proyecto, y documentar excepciones concretas por peers/runtime. Alinear Next/config, React/DOM/tipos, TipTap y Tailwind. Conservar Node24 de producción y reglas estrictas; no añadir casts/supresiones para ocultar rupturas.

Resolver e instalar en copia temporal sin .env, scripts o pnpmfile; conservar exactamente allowBuilds/ignoredOptionalDependencies y revisar los tres overrides dirigidos existentes. No introducir excepciones permanentes de antigüedad de publicación sin demostrar que sean necesarias. Instalación frozen del lock final y validación integrada con ese árbol nuevo, no con node_modules anterior.

## Calidad mínima

Bloquear el editor de comentarios durante la acción pendiente, coherente con los otros editores, para no perder texto escrito tras pulsar enviar. Asociar etiquetas de proveedor/fecha de derivación a sus controles mediante useId, sin cambiar estilos, consultas o flujo de negocio. Aplicar Impeccable sobre el refinamiento existente; no descargar Doctor ni cambiar reglas de autenticación por falsos positivos.

## Verificación y entrega

MIME ficticio, comprobaciones focalizadas y revisión independiente; tipos, ESLint y build del conjunto en copia de solo lectura sin secretos y con valores ficticios. Red externa bloqueada durante ejecución de fuentes; fuentes Inter públicas precargadas se sirven por loopback aislado. Corregir incompatibilidades reales sin ignorar errores, justificar cualquier versión mantenida y guardar solo evidencia resumida sin datos personales. Commit local con código/documentación agrupados, pendiente de autorización de merge/despliegue.

Actualizar el estado documentado de abb8bf2/Production7582780847 y de la campaña completada (30 envíos/158 tickets), porque las notas de preparación previas ya no describen el estado actual. No publicar el manifiesto, destinatarios o contenido de tickets.

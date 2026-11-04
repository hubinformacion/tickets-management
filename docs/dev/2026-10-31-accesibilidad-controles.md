# Controles accesibles de filtros, usuarios y título

## Entrega

El usuario pidió ejecutar los pendientes después del diagnóstico de Doctor. Se implementa el [diseño propuesto](../plans/2026-10-31-accesibilidad-controles-design.md) en `fix/accesibilidad-controles`, rama local basada en el registro del diagnóstico. Se agrupan documentación y código; pendiente de integración/publicación, sin Preview. Producción permanece en `e47e29d`.

- Limpiar rango de fechas usa un botón hermano del disparador de calendario, con nombre e indicador de foco. Mantiene filtros ajenos al rango, reinicia página con el helper existente y devuelve foco al disparador. El rango visible se conserva como descripción accesible mediante ID por instancia.
- Quitar una persona tiene nombre contextual, tamaño de 24 px, visibilidad permanente y foco visible. El foco vuelve al selector estable al desaparecer la fila. No cambia cómo se eligen o guardan destinatarios.
- El título tiene FormLabel visualmente oculto, asociado por FormControl; conserva placeholder, obligatoriedad y validación.

No cambia esquema, datos, dependencias, autenticación ni reglas de Doctor.

## Verificación

TypeScript estricto y ESLint sin advertencias aprobados. La comprobación final de tipos/lint/build aprobó en copia sin .env, con valores ficticios y lockfile intacto (exit 0). No se utilizan servicios de producción.

Chromium local verificó los componentes reales, incluido NewTicketForm con clasificación ficticia. La navegación de Next y las acciones del servidor se sustituyeron; el navegador no tuvo red externa ni credenciales. Se comprobó:

- Limpieza con Enter: conserva estado/asignado, elimina desde/hasta/pagina, no abre calendario y restaura foco. El calendario sigue abriendo con teclado y cierra con Escape.
- Quitar personas con Enter y Espacio: nombre correcto, visibilidad/foco y retorno al selector; volver a añadir desde el selector conserva el comportamiento.
- Seleccionar área/categoría/subcategoría y escribir en el título real mantiene el nombre «Título del ticket» y required.
- Sin button dentro de button; controles visibles a 360/768/1440 px en claro/oscuro y sin errores de ejecución en el recorrido ficticio. No equivale a revisión visual completa, lector de pantalla o navegación autenticada.

React Doctor 0.9.17 sobre 285 archivos: **76 diagnósticos, 9 errores y 67 advertencias**, frente a 79/9/70 del diagnóstico inicial. Desaparecen los tres avisos afectados (control-has-associated-label en filtros/selector y shadcn-form-item-requires-label en título), sin nuevas supresiones. No se atribuye una mejora global de seguridad a ese conteo; las nueve alertas de autenticación siguen siendo los falsos positivos ya contrastados. Cadena de suministro y telemetría desactivadas durante el análisis local.

## Continuación: login

Se consultó Context7 y el código instalado de Better Auth 1.7.14. Con LoginForm real y cliente real, sustituyendo únicamente fetch por un HTTP 400 ficticio, se confirmó que signIn.social resuelve con error en lugar de lanzar y el botón queda bloqueado en «Redirigiendo…». Se prepara una corrección independiente, con retorno a estado reintentable en error devuelto/excepción y conservación del estado de redirección correcta. No hubo OAuth o petición real.

El material temporal se retira al terminar. Pendientes lector/sesión real, encuestas, adjuntos, otras advertencias, exportaciones grandes y observación de servicios.

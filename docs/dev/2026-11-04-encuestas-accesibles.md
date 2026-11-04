# Encuestas accesibles y ajuste móvil

## Estado

El push autorizado integró controles de tickets, registro de Doctor y login reintentable en `6c6a5fc7f2cf7506f9abc08e95d34485799b2e21`. Revisión independiente sin bloqueos; tipos y ESLint locales aprobados. [CI real](https://github.com/hubinformacion/tickets-management/actions/runs/41861157103) aprobada, Production `7550658075` aprobada y SHA confirmado en requerimientos-hub.vercel.app. Login 200, sesión anónima 200/null y dashboard 307 a login. Estado autenticado de recordatorios 200, queue disponible y corte fijo `2026-10-28T17:00:00.000Z`. No se ejecutaron workers ni operaciones reales de archivos, correo o datos. Las tres ramas locales integradas se eliminaron después de verificar contenido y ascendencia.

Continúa el pendiente aprobado de encuestas en `fix/encuestas-accesibles`, rama local sin Preview, pendiente de integración/despliegue. [Diseño](../plans/2026-11-04-encuestas-accesibles-design.md) y [plan](../plans/2026-11-04-encuestas-accesibles-plan.md). Se aplicaron Impeccable, Ponytail y ejecución inline, respetando la regla del proyecto de no crear tests/frameworks.

## Cambio

`SurveyRatingField` reemplaza la escala duplicada de FloatingSurvey y CloseProviderTicketDialog. Un fieldset con legend da nombre a cada pregunta y radios nativos 1–5 anuncian exclusividad/selección y aportan flechas/Tab/Espacio. Cada instancia genera nombres e IDs propios. Se mantienen las preguntas, valores numéricos, callbacks, validación, obligatoriedad efectiva existente y evaluación opcional del proveedor.

Los extremos de escala pasan debajo de las opciones en móvil. Los tonos se conservan, con texto más oscuro en opciones claras y fondos seleccionados más oscuros para mejorar contraste. El foco se indica sobre la etiqueta visible del radio. Se evita interpolar simultáneamente colores de texto/fondo para no perder contraste durante la selección.

El panel flotante ocupa el ancho disponible con margen y máximo 480 px. Se conserva el botón de plegado entre estados para mantener foco; anuncia aria-expanded. Se limitan las transiciones a color y se respeta movimiento reducido, evitando que una transición de ancho lo recorte durante resize. Las acciones se apilan en móvil para respetar margen interior a 320 px. El ID de sugerencias también es único por instancia.

Sin cambios de esquema, dependencias, datos, encuestas enviadas, respuestas guardadas, Drive, correo o autenticación. Las acciones del servidor mantienen sus contratos.

## Evidencia de validación

- Chromium con componentes reales (panel y lista/diálogo de proveedores), datos ficticios y acciones sustituidas por promesas controladas. Entorno vacío, red aislada, código/dependencias de solo lectura y temporales acotados. No hubo peticiones a servicios externos.
- Dos encuestas simultáneas: nombres de radio e IDs independientes, sin cambiar respuestas de otra instancia. Flechas cambian selección, Espacio la confirma y Tab avanza a la siguiente pregunta. El plegado conserva foco/valor y Omitir afecta solo al panel seleccionado.
- Envío ficticio del usuario: ticketId y cuatro calificaciones numéricas idénticos al contrato, sugerencia recortada como antes. Durante espera, radios/Omitir/envío bloqueados. Un error devuelto conserva respuestas y permite reintentar; el éxito retira la encuesta.
- Cierre ficticio de proveedor desde lista real y calendario real: id/fecha y cinco calificaciones serializadas como antes; radios deshabilitados mientras espera; resolución correcta cierra el diálogo. No se ejecutó cierre ni encuesta en BD.
- Anchos 320/360/768/1440 px en claro/oscuro, incluida altura 480 px: panel y acciones dentro del viewport, sin desbordamiento horizontal del panel. Se revisaron capturas de ambos temas y del diálogo de proveedor. No sustituye pruebas de dispositivos/lector reales o auditoría visual completa.
- Contraste calculado desde colores renderizados y fondos compuestos de los radios, para las cinco selecciones y hover en ambos temas: mínimo observado **4,93:1**, superior a 4,5:1. No se extrapola a toda la aplicación.
- Detector mecánico Impeccable final: `[]`, sin hallazgos para los tres componentes. No es una certificación general de accesibilidad.
- Tipos, ESLint sin advertencias y build final con configuración ficticia aprobados (exit 0), con lockfile intacto. Se usan dependencias existentes de solo lectura y `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false` solo en el proceso de validación para evitar reinstalaciones en la copia. La opción se contrastó con la documentación y pnpm 11.3.0. No modifica CI, Vercel, package.json ni lockfile. El build comprueba el hash del lockfile al finalizar.
- Revisión independiente aprobada tras ajustar la fila de acciones móvil. No se detectaron otras regresiones de selección, SSR, IDs, payloads o evaluación opcional.

Doctor 0.9.17, sin telemetría ni escaneo de dependencias: 286 archivos analizados, complete=true, skippedChecks vacío y **9 errores/65 advertencias**, frente a 9/67 en main. Los tres componentes de encuestas ya no presentan diagnósticos. Las nueve alertas de autenticación corresponden al contraste previo; no hubo supresiones nuevas ni se declara Doctor global aprobado.

## Límites y continuación

Pendientes lector de pantalla y sesión real, errores de transporte de server actions, revisión de etiqueta/encabezado de adjuntos, exportaciones grandes y observación operativa de servicios. La comprobación ficticia no envía encuestas o correo ni acredita una integración de producción por haber aprobado el build. Las capturas, JSON y scripts temporales se retiran al finalizar; este registro conserva el resultado mínimo.

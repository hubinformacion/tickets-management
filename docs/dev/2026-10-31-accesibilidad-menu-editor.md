# Accesibilidad del menú móvil y editor

## Entrega

Corrección aprobada por el usuario tras la revisión de accesibilidad, implementada originalmente en `fix/accesibilidad-menu-editor`. El [diseño](../plans/2026-10-31-accesibilidad-menu-editor-design.md) documenta el alcance. Integrada y desplegada en `e47e29d`, Production `7463472478`, con SHA público confirmado y CI real aprobada. La rama integrada se eliminó después de verificar igualdad de contenido. Sin Preview.

## Cambios

- El panel móvil usa Dialog/Trigger/Close/Title existentes. Cerrado se desmonta; abierto recibe foco inicial, contiene Tab/Shift+Tab y aísla el fondo. Escape y clic exterior cierran, y se devuelve el foco al disparador. Se retira el listener global que podía interferir con capas anidadas.
- Al pasar a escritorio (768 px) se cierra el diálogo y se enfoca el contenido principal visible. Se conservan las opciones, permisos y navegación. Los subenlaces anuncian la página actual y el disparador tiene indicador de foco visible.
- Encabezado fijo y cuerpo flex con min-height cero permiten desplazar todo el contenido sin recortar el cierre de sesión, incluso con poca altura.
- Tiptap recibe id, nombre, descripción, estado de error y obligatoriedad en el contenteditable. Los formularios usan IDs por instancia y asociaciones ARIA explícitas; la ayuda de descripción usa FormDescription. El editor expone focus a React Hook Form y notifica blur, para enfocar el campo inválido.
- Se nombran los seis controles de formato y los colores; sus botones son type=button. Se conserva el contenido al cambiar a lectura y se sincroniza el estado editable sin emitir una actualización de contenido por ese cambio.

No se añaden dependencias, migraciones ni cambios de contenido almacenado. No se ejecutan acciones de negocio, crons, Drive, Gmail ni operaciones de datos reales.

## Verificación

TypeScript estricto, ESLint completo sin advertencias y build aprobados. La comprobación final ejecutó los tres comandos en una copia sin archivos de entorno, con configuración ficticia, recursos acotados y hash del lockfile intacto. Se usaron pnpm 11.3.0 y Node 24.22.1.

Se verificaron los componentes reales en Chromium local con una página temporal: navegación de Next, sesión, ajustes y acciones del servidor se sustituyeron por valores ficticios. El navegador solo pudo cargar recursos de la dirección local. Se reutilizaron herramientas disponibles; no se añadió un framework de tests ni archivos de verificación al repositorio.

Recorridos aprobados: menú cerrado fuera de tabulación, foco inicial y fondo fuera del árbol accesible, Tab/Shift+Tab contenidos, Escape del selector de tema sin cerrar el panel, Escape del panel y retorno de foco, clic exterior, acceso a cierre de sesión, cambio móvil/escritorio, cierre al pulsar enlace y aria-current. Editor: nombre y ayuda/error válidos, obligatoriedad, foco tras validación, botones de formato, selección de color y lectura dinámica sin pérdida de texto.

Geometría comprobada en claro/oscuro a 320×320, 360×640, 768×640 y 1440×900: sin desbordamiento horizontal y con cierre de sesión alcanzable en móvil. No equivale a una auditoría completa de contraste o revisión visual humana.

La comprobación local no certifica OAuth, navegación de Next con sesión real, NVDA/VoiceOver, todos los dispositivos o la CI futura de esta rama. Esos recorridos continúan pendientes. La CI de `b6418ae` sí está aprobada en [GitHub](https://github.com/hubinformacion/tickets-management/actions/runs/41234157431); no se atribuye ese resultado al código nuevo.

Referencias de implementación: [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog), [Tiptap Editor](https://tiptap.dev/docs/editor/api/editor). Se consultó Context7 y se contrastó el comportamiento con las versiones instaladas. El material temporal se retira al terminar.

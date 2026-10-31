# Accesibilidad del menú móvil y editor

El usuario aprobó la corrección tras revisar los hallazgos de teclado y nombres accesibles. Se conserva la navegación, permisos y apariencia lateral. No hay cambios de BD, dependencias ni recursos de Preview.

Se elige reutilizar el diálogo modal existente frente a programar manualmente contención/retorno de foco, Escape y aislamiento del fondo. El panel cerrado se desmonta; el abierto tiene título, botón de cierre, fondo modal y desplazamiento interior. Al pasar a escritorio se cierra y el foco pasa al contenido visible. Los subenlaces anuncian la página actual y el botón de apertura tiene foco visible.

El editor mantiene Tiptap y recibe id, nombre y atributos de ayuda/error en el contenteditable. Se nombran los controles de formato y colores y se fijan botones de formato a type=button. Los formularios aportan nombres específicos y referencias válidas para sus etiquetas, ayudas y errores. No se cambia el contenido guardado ni su validación de negocio.

Implementación: sustituir panel/overlay manual por Dialog/Trigger/Close/Title, eliminar listener global Escape, cerrar en el breakpoint de escritorio; corregir geometría flex y desplazamiento. Completar contrato ARIA del editor y consumidores. Revisar diff, ejecutar tipos, ESLint y build con configuración ficticia; si hay navegador disponible, comprobar Tab/Shift+Tab, Escape, retorno, tema anidado, resize y etiquetas. Sin framework de tests ni operaciones reales de auth/Drive/correo/BD. Documentar los límites de navegador y lector de pantalla.

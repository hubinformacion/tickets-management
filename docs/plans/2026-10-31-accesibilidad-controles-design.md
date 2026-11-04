# Etiquetas y teclado de los controles restantes

Se ejecuta el bloque propuesto en el diagnóstico de React Doctor y autorizado por el usuario al pedir continuar con lo pendiente. Se conserva el comportamiento de filtros, destinatarios y validación de tickets. La documentación del diagnóstico se agrupa con esta corrección, sin Preview ni cambios de BD.

El botón de limpiar fechas será un hermano del disparador del calendario, con nombre propio; conserva los parámetros ajenos al rango y reinicia la paginación mediante la lógica existente. Es preferible a simular un botón con un span, que requeriría programar interacciones de teclado. El disparador mantiene el rango visible y recibe foco al desaparecer el botón de limpieza.

Los botones de quitar usuarios tendrán nombre con la persona seleccionada, tamaño accesible, indicador de foco y visibilidad permanente, útil también en pantallas táctiles. Es más sencillo que ocultarlos hasta hover/focus. Tras quitar una persona se devuelve foco al selector estable.

El título conserva su diseño y placeholder, y gana una etiqueta FormLabel visualmente oculta, asociada por FormControl. No se cambian reglas o contenido de formularios.

Implementación y validación: editar los tres componentes, comprobar HTML sin botones anidados y recorrido de teclado con componentes reales y datos ficticios; tipos, ESLint sin advertencias y build sin entorno de producción. Repetir el escaneo local fijo de Doctor para comprobar los diagnósticos afectados, sin silenciar reglas. Mantener los límites de navegación real/lector de pantalla. El resultado queda en rama local hasta aprobación del merge/despliegue.

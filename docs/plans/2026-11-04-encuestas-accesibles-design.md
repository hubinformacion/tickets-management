# Encuestas accesibles y ajuste móvil

Continúa el pendiente de escalas y ajuste móvil del plan aprobado, tras el push de controles/login a main en 6c6a5fc. El usuario pidió continuar. La implementación se hace en una rama local del checkout existente, con documentación y código agrupados y sin Preview, migraciones, envíos o datos reales.

Se conservan preguntas, escala 1–5, tonos, respuestas, validaciones, encuestas opcionales de proveedores y acciones existentes. El defecto es de interacción: botones sin semántica de selección única y etiquetas de pregunta sin control asociado; el panel flotante además fija 480 px y recorta contenido en móvil.

Se elige un campo de valoración compartido, con fieldset/legend e inputs radio nativos. Frente a añadir ARIA y navegación manual a botones, el navegador aporta exclusividad, flechas y Tab; los dos consumidores reutilizan el mismo control. Cada instancia genera nombres/IDs propios, declara los extremos de escala y anuncia valor/selección. Se preservan tonos y foco visible; los fondos seleccionados se oscurecen dentro de la misma escala para que el texto blanco alcance contraste 4.5:1. En móvil los extremos se disponen debajo de las opciones; las cinco opciones caben sin desplazamiento horizontal.

El panel flotante se limita al ancho disponible y a 480 px como máximo; se conservan plegado, desplazamiento, omisión y envío. El área de sugerencias usa ID por instancia. Al plegar/desplegar se conserva el foco del botón que mantiene su identidad. El formulario de proveedores conserva el cambio opcional de evaluación y sus fechas.

La verificación usa componentes reales con datos y acciones ficticias, sin red externa: Tab/flechas, selección independiente entre preguntas y encuestas, pending/errores, payload idéntico y panel a 320/360/768/1440 en ambos temas. Tipos, ESLint y build con configuración ficticia; no se crea framework ni suite de tests. Se documentan límites de lector y sesión reales. El nuevo bloque queda local para revisión antes del siguiente merge.

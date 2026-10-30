# Búsqueda remota de tickets para proveedores

Continúa el selector remoto pendiente del plan aprobado, después de publicar paginación/índices. Rama local `perf/busqueda-tickets-proveedores`; el siguiente merge se presenta como entrega independiente. No modifica tickets ni vínculos existentes ni añade índices/tablas.

Truncar la lista actual dejaría tickets antiguos inaccesibles; mantenerla completa conserva el coste por render. Se elige búsqueda autenticada en servidor por código/título, dentro del área de sesión, con hasta 25 resultados y aviso si hay más. Al abrir sin búsqueda se muestran recientes. Desde dos caracteres se buscan coincidencias literales, escapando comodines de LIKE; una sola letra muestra una indicación sin consultar. El término se valida con Zod (máximo 120 caracteres).

El ticket vinculado existente se conserva en la etiqueta mediante los datos de relación que ya carga la fila paginada. Una selección nueva se conserva localmente aunque no esté en los resultados de la siguiente consulta; limpiar sigue siendo posible. No se hace un fetch global para reconstruir la selección.

La acción requiere requireAgent y área asignada, consulta solo id/código/título y ordena por creación e ID descendentes. Usa un contador independiente de 30 búsquedas/minuto por usuario, con fallo cerrado del almacenamiento. El cliente espera 300ms desde el último cambio y descarta respuestas de una búsqueda anterior o de un selector cerrado. Carga/error/reintento y límite de resultados se indican en el selector. El filtrado local de Command se desactiva para respetar los resultados del servidor.

Pasos: schema/acción de búsqueda, componente del selector, retirar carga completa de tickets del área y propagar selección existente, validar permisos/literalidad/límite/estado con datos ficticios, tipos/lint/build y EXPLAIN sin ANALYZE/SELECT sobre fixtures en READ ONLY. Sin tests nuevos al proyecto, escrituras de negocio, workers ni llamadas reales autenticadas de prueba. La frecuencia operativa solo se usa en solicitudes reales; verificadores la sustituyen.

Quedan pendientes recorrido de navegador/teclado y volumen real; búsquedas con LIKE y comodín inicial pueden seguir escaneando dentro del área. No se propone trigram/GIN ni índices por intuición. El coste de opciones de proveedor y exportaciones completas sigue separado.

El [registro del bloque](../dev/2026-10-30-busqueda-tickets-proveedores.md) conserva resultados, límites y pendientes.

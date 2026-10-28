# Manual de agente

Este manual describe las funcionalidades adicionales disponibles para agentes del sistema de gestión de tickets. Como agente, tienes acceso a todas las funciones de usuario más herramientas específicas para gestionar tickets de tu área de atención.

---

## Rol del agente

Un agente es responsable de:

- Atender los tickets asignados a su área.
- Asignar tickets a sí mismo y gestionar su resolución.
- Comunicarse con los usuarios a través de comentarios.
- Derivar trabajo a proveedores cuando sea necesario.
- Gestionar tickets de proveedores.
- Configurar las categorías y prioridades de su área.

---

## Tickets del área

La sección **"Tickets del área"** muestra todos los tickets que pertenecen a tu área de atención, independientemente de quién los creó o si están asignados.

Desde aquí puedes:

- Filtrar tickets por estado, prioridad o fecha.
- Ver de un vistazo cuáles están sin asignar.
- Acceder al detalle de cualquier ticket.

---

## Gestión de tickets

### Asignar un ticket

Cuando un ticket está en estado **"Abierto"** y no tiene agente asignado, puedes tomarlo haciendo clic en el botón de asignación desde el detalle del ticket. Al asignarte, el estado cambia automáticamente a **"En progreso"**.

### Cambiar estado

Desde el detalle del ticket, puedes cambiar el estado según las transiciones permitidas:

| Estado actual | Puede cambiar a |
|---|---|
| Abierto | En progreso (al asignarse), Anulado |
| En progreso | Pendiente de validación, Resuelto, Anulado, Abierto (desasignar) |
| Pendiente de validación | En progreso (si el usuario rechaza o se retira la solicitud) |
| Resuelto | En progreso (reabrir) |

### Solicitar validación

Cuando consideres que un ticket fue resuelto:

1. Haz clic en **"Solicitar validación"** desde los controles del ticket.
2. Opcionalmente, agrega un mensaje explicando la resolución.
3. El usuario recibirá una notificación para que confirme o rechace la solución.
4. Si el usuario no responde en 48 horas, el sistema cerrará el ticket automáticamente.

### Comentarios

Puedes agregar comentarios en la sección de actividad del ticket. Los comentarios se envían con formato enriquecido (negrita, listas, enlaces) y generan notificaciones por correo tanto al creador como a los seguidores.

---

## Derivaciones a proveedores

Cuando un ticket requiere la intervención de un proveedor externo, puedes registrar una derivación:

1. En el detalle del ticket, busca la sección de **derivación**.
2. Selecciona el **proveedor** de la lista (solo los proveedores activos de tu área).
3. Opcionalmente, indica una **fecha estimada de resolución**.
4. Haz clic en **"Registrar derivación"**.

La derivación quedará registrada en la línea de actividad del ticket como un evento destacado y se enviará una notificación por correo.

---

## Tickets de proveedores

La sección **"Tickets de proveedores"** es un módulo independiente para dar seguimiento al trabajo enviado a proveedores externos.

### Crear un ticket de proveedor

1. Haz clic en **"Nuevo ticket de proveedor"**.
2. Completa los campos:
   - **Código externo**: Referencia o número del proveedor.
   - **Título**: Descripción breve del trabajo.
   - **Descripción**: Detalles del trabajo solicitado.
   - **Proveedor**: Selecciona un proveedor activo de tu área.
   - **Fecha de solicitud**: Cuándo se envió el trabajo.
   - **Prioridad** (opcional): Baja, Media, Alta o Crítica.
   - **Ticket vinculado** (opcional): Enlaza con un ticket del sistema de tu misma área si corresponde.

### Gestionar tickets de proveedor

Desde la tabla de tickets de proveedor puedes:

- **Filtrar** por proveedor, estado o prioridad.
- **Editar** los detalles de un ticket en proceso. Si ya tiene una evaluación, se conserva el proveedor evaluado.
- **Cerrar** un ticket cuando el proveedor complete el trabajo, indicando fecha de finalización. Puedes omitir la encuesta o completar sus cinco calificaciones.
- **Reabrir** un ticket cerrado si es necesario. La evaluación previa se conserva; al cerrarlo otra vez debes omitir una nueva encuesta si ya existe una.
- **Eliminar** únicamente tickets en proceso sin evaluación. Los tickets cerrados y las evaluaciones se conservan.

Los tickets de proveedor solo tienen 2 estados: **En proceso** y **Cerrado**.

---

## Encuestas de satisfacción

La sección **"Encuestas"** en el menú lateral te permite ver los resultados de las encuestas de satisfacción completadas por los usuarios de tu área.

La página muestra:

- **KPIs**: Promedio general, promedio por pregunta, tasa de respuesta y total de encuestas.
- **Gráficos**: Distribución de calificaciones por pregunta (1 al 5).
- **Tabla**: Detalle de cada respuesta individual con código de ticket, fecha, calificaciones y comentarios.

> Las encuestas aplican solo al área TSI por el momento.

---

## Configuración del área

En **"Configuración del área"** puedes personalizar los siguientes aspectos de tu área de atención:

### Categorías
- Ver las categorías de tickets disponibles para tu área.
- Crear nuevas categorías o editar las existentes.
- Activar o desactivar categorías.
- Cambiar el orden de presentación.

### Subcategorías
- Gestionar las subcategorías dentro de cada categoría.
- Crear, editar, activar o desactivar subcategorías.

### Prioridades
- Cada área tiene 4 niveles de prioridad: Baja, Media, Alta y Urgente.
- Puedes editar la **descripción** de cada nivel para tu área.
- Puedes ajustar las **horas de SLA** (acuerdo de nivel de servicio) por prioridad.

### Proveedores
- Gestionar los proveedores externos vinculados a tu área.
- Crear nuevos proveedores o editar los existentes.
- Activar o desactivar proveedores.

---

## Seguidores y visibilidad

- Puedes agregar o quitar seguidores de cualquier ticket de tu área.
- Los seguidores reciben notificaciones por correo de todos los eventos del ticket.
- El sistema registra cuándo viste un ticket por última vez, permitiendo identificar tickets con actividad nueva.

---

## Archivos adjuntos

Como agente puedes:

- Subir archivos adjuntos a tickets de tu área (hasta 4 MB por archivo).
- Eliminar archivos adjuntos que tú hayas subido o que pertenezcan a tickets de tu área.
- El área de Difusión no admite archivos adjuntos.

# Eliminación recuperable de adjuntos vinculados

## Estado y política

Implementado en la rama local `fix/eliminacion-adjuntos-recuperable`, según el [diseño](../plans/2026-10-30-eliminacion-adjuntos-design.md). Código pendiente de merge y despliegue. Se reutiliza attachment_revert: no se añade tabla, columna, FK física ni migración.

El usuario corrigió su elección sobre tickets completos: «Eliminar ticket definitivamente» debe seguir siendo destructiva y eliminar también su historial. No se convirtió en anulación ni se deshabilitó; la acción y el control administrativos no se modificaron en este bloque. La excepción de producto quedó registrada en AGENTS.md y no autoriza ejecutar borrados reales de producción como prueba.

El widget anterior se integró y desplegó como `87d1930`. Production `7441690946` aprobó la entrega y el dominio público confirmó ese SHA completo, queue de recordatorios y corte fijo `2026-10-28T17:00:00.000Z`. No se invocó el worker ni se enviaron correos. La rama anterior se eliminó después de verificar igualdad con main.

## Eliminación individual de archivo

La acción valida IDs y autenticación como antes. El helper bloquea ticket y adjunto, comprueba que corresponden y valida acceso junto con permiso de uploader/admin/agente del área. Conserva las reglas actuales: un agente de otra área no obtiene permiso por su rol, y este bloque no añade restricciones nuevas según estado del ticket.

Antes de Drive se confirma en BD una reserva de cinco minutos con UUID propio. Una reserva vigente responde ocupado; removed responde éxito sin repetir el borrado. Un fallo o lease vencido puede retomarse con autorización nueva. Se conserva el solicitante original y se actualizan intentos/estado operativo.

Drive se invoca fuera de la transacción, con señal/timeout de veinte segundos. Ante error se intenta confirmar failed, sin eliminar metadata; ante éxito se actualiza removed/drive_deleted_at únicamente si el lease sigue perteneciendo al intento. Una confirmación fallida o UPDATE sin filas devuelve resultado incierto, no éxito inventado. El nuevo camino no ejecuta DELETE sobre ticket_attachment.

El detalle excluye solo removed. Removing/failed permanecen visibles con aviso de eliminación pendiente y botón de reintento para quien mantiene permiso. El botón captura excepciones de transporte y no presenta respuestas desconocidas como éxito. Se invalida la ruta después de obtener un resultado autorizado, incluso si necesita recuperación.

La relación de Drizzle permite leer solo el estado operativo, sin exponer tokens de reserva ni solicitantes al cliente. La confirmación del widget excluye cualquier intención de eliminación; el registro de uploads ya impide reconstruir referencias canceladas. No hay crons nuevos ni recorridos/borrados de huérfanos históricos.

## Validación

- TypeScript completo aprobado: --noEmit --incremental false.
- ESLint completo aprobado con --max-warnings 0: cero errores/advertencias.
- Build local completo Next.js 16.4.3/Turbopack aprobado, incluidos tipos y generación de 23 páginas.
- Ocho consultas generadas/compiladas con Drizzle, incluidos detalle relacional/filtro e IDs confirmados: EXPLAIN sin ANALYZE en READ ONLY aprobado. No se ejecutaron sus INSERT/UPDATE ni bloqueos como prueba.
- Fuente ejecutada localmente con BD/Drive ficticios: éxito devolvió removed; fallo de Drive devolvió failed; fallo al confirmar devolvió unconfirmed; reserva vigente devolvió busy sin llamar a Drive; removed fue idempotente sin otra llamada; un observador sin permiso de eliminación fue rechazado antes de Drive.

Esas observaciones no comprueban concurrencia del motor PostgreSQL ni el proveedor real. Se ejecutaron en red aislada, entorno vacío, código/dependencias de solo lectura y scratch limitado. El build usó copia sin .env.local, variables ficticias y HTTPS para fuentes públicas, sin credenciales de producción. No se añadieron framework ni archivos de tests al proyecto. Los inspectores y copias temporales se eliminan al terminar.

## Límites y siguientes pasos

Un 404 de Drive no se transforma en éxito: puede significar ausencia o falta de acceso. Si se pierde la confirmación de un borrado y después llega 404, el caso puede requerir revisión manual. La referencia queda disponible para investigar, sin ampliar OAuth ni permisos de carpeta. [Errores de Drive](https://developers.google.com/workspace/drive/api/guides/handle-errors).

Los timeouts SQL locales y los de la petición a Drive no son un límite global de adquisición de conexión o refresh OAuth. Las reservas evitan carreras ordinarias; no garantizan una única llamada externa ante toda confirmación perdida. Falta la validación real de permisos, doble clic/concurrencia, lease vencido y recuperación en navegador.

La [purga administrativa completa](2026-10-30-purga-administrativa.md) se preparó después en una rama apilada, pendiente de merge/despliegue. Cubre las tablas operativas nuevas y los fallos de Drive, según el comportamiento destructivo solicitado expresamente. No se ejecutaron purgas reales. Reconciliación de huérfanos y observación de servicios reales siguen pendientes.

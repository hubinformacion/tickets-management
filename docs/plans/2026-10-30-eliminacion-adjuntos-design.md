# Eliminación de adjuntos conservando referencias

## Alcance

Se continúa la revisión de borrados del plan aprobado. El widget anterior se integró en main como `87d1930`. Este bloque conserva el comportamiento de eliminar de Drive un archivo cuando su propietario o un responsable autorizado lo pide desde el ticket, pero retiene el registro histórico de BD y registra/reintenta la operación.

Se reutiliza attachment_revert y su reserva persistente, frente a añadir una cola duplicada o mantener el DELETE de la referencia después de Drive. No se necesitan tablas ni columnas nuevas. La operación actual no puede recuperar de forma segura la confirmación si Drive terminó pero falló la escritura posterior; conservar la intención y referencia permite revisar el caso sin perder el ID.

## Flujo

Una transacción bloquea ticket y adjunto en ese orden, comprueba que coinciden y vuelve a validar acceso y permiso de uploader/admin/agente del área. Conserva las reglas actuales, sin añadir permisos por rol genérico ni cambiar la política de cierre. Registra la reserva de cinco minutos en attachment_revert antes de llamar a Drive. Una reserva vigente impide otro intento; removed devuelve éxito idempotente sin otra llamada.

Drive se ejecuta fuera de la transacción con señal/timeout de veinte segundos, como la cancelación pendiente existente. Un fallo conserva metadata y marca failed si puede confirmarse ese estado. El éxito actualiza solo la fila operativa con lease token vigente y drive_deleted_at; jamás elimina ticket_attachment. Una confirmación de BD incierta devuelve un error, sin inventar éxito ni borrar referencias. Las reservas vencidas pueden retomarse desde la UI, revalidando permisos.

No se interpreta un 404 de Drive como prueba de borrado: también puede ser falta de acceso. Una respuesta perdida seguida de 404 puede quedar pendiente de revisión manual. No se amplían OAuth ni permisos de carpeta para resolver esa incertidumbre, ni se ejecutan borrados reales como prueba.

## Lecturas y UI

El detalle excluye únicamente registros cuya operación se confirmó removed. Los estados removing/failed se conservan visibles con aviso de eliminación pendiente y botón de reintento solo para quien mantiene permiso. Se añade una relación lógica de Drizzle con el registro existente, sin FK ni migración física.

La confirmación del widget no devuelve IDs con intención de eliminación, evitando ocultarlos como si acabaran de vincularse. Los reintentos de upload ya rechazan marcadores de cancelación; no se reconstruyen archivos retirados. El botón de eliminación captura excepciones de transporte y no anuncia éxito ante una respuesta desconocida. Se invalida el detalle tras registrar un resultado autorizado, incluido un error recuperable.

No se programan crons nuevos ni se recorren archivos históricos. El usuario corrigió su primera elección: la eliminación administrativa definitiva del ticket completo debe seguir siendo destructiva y borrar todos sus datos relacionados, incluido el historial. No se convierte en anulación ni se deshabilita. Esa excepción es una operación de producto confirmada por admin, no una autorización para ejecutar borrados reales como prueba o durante despliegues. Este bloque conserva las referencias de la eliminación individual de adjuntos; la revisión completa de la purga administrativa y sus registros operativos sigue separada.

## Verificación

Tipos y lint completos, build local con configuración ficticia y revisión/planificación de las consultas generadas. No se añaden framework ni archivos de tests. El recorrido de UI, las carreras reales de PostgreSQL y el caso de confirmación incierta de Drive quedan explícitos si no pueden comprobarse de forma local. No se usa producción para ensayar eliminaciones.

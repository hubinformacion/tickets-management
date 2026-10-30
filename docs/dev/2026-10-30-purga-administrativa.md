# Purga administrativa completa

## Estado y alcance

Implementado en la rama local `fix/purga-administrativa-completa`, apilada sobre `fix/eliminacion-adjuntos-recuperable` (`28753bd`). Ambos bloques están pendientes de merge y despliegue. El último main/Production verificado sigue siendo `87d1930`. No se generó Preview ni se ejecutaron borrados reales.

Se aplica la corrección expresa del usuario: «Eliminar ticket permanentemente» destruye el ticket y sus datos asociados, incluido su historial. No lo convierte en anulación ni conserva un archivo histórico del ticket. El diseño está en [Purga administrativa](../plans/2026-10-30-purga-administrativa-design.md). No requiere migración, tablas ni columnas nuevas.

## Comportamiento

La acción requiere administrador activo, ID validado y límite persistente de 30 solicitudes/minuto por administrador en el namespace `tickets:admin:delete`. Si la verificación del límite falla, la operación no continúa. Los contadores compartidos del usuario no pertenecen a un ticket ni se eliminan durante su purga.

Antes de Drive se captura una instantánea y se bloquean ticket, referencias e intentos asociados. También incluye archivos pendientes de formularios ya vinculados y cargas stored sin metadata cuyo destino todavía puede atribuirse. Una carga no confirmada o un recordatorio con reserva vigente bloquea la operación antes de iniciar borrados. Los archivos referenciados fuera del alcance, incluso por otros intentos, se conservan en Drive.

Las eliminaciones físicas usan el registro attachment_revert existente, con hasta cuatro llamadas simultáneas fuera de transacciones. Los archivos confirmados no se vuelven a borrar al reintentar. Fallos del proveedor impiden finalizar la purga de BD. Para esta operación administrativa se acepta 404 como ausencia/no disponibilidad del recurso y se registra temporalmente drive_not_found; un 404 no certifica ausencia física si el proveedor oculta falta de acceso. La eliminación individual mantiene su tratamiento conservador de 404. No se amplían permisos ni se retoma la investigación de carpeta/OAuth cerrada por el usuario.

La transacción final obtiene primero los advisory locks de los formularios conocidos, en orden estable, y después ticket, referencias e intentos. Los bloqueos de referencias coordinan también cancelaciones de archivos pendientes que no bloquean el ticket. Se compara la identidad de la instantánea; cargas/formularios nuevos obligan a reintentar. Las llamadas a Drive ya confirmadas conservan su progreso hasta completar la operación.

La misma transacción elimina, en orden compatible con las referencias: encuestas de proveedor, atenciones de proveedor, encuestas del usuario, historial, actividad, recordatorios, registros de eliminación de archivos, intentos, metadata de adjuntos, formularios y ticket. Sus once DELETE están restringidos al ID seleccionado o al conjunto de adjuntos/intentos obtenido de ese alcance. Se preservan usuarios, catálogos, configuración de proveedores, secuencia compartida de códigos y recursos de otros tickets.

El widget de un ticket existente envía su destino explícito. El servidor valida/bloquea ese ticket y vincula el formulario antes de registrar el intento e ir a Drive. Si ya fue eliminado, revierte la transacción sin recrear formularios sin destino. El formulario de ticket nuevo conserva el flujo sin ID. La cola de recordatorios toma un bloqueo compatible con lectura que entra en conflicto con la purga; su confirmación bloquea primero el ticket y después la entrega para evitar invertir el orden.

La UI captura fallos de transporte, conserva la posibilidad de reintento y anuncia éxito solo ante una respuesta explícita tras confirmar la transacción. No cambia los tiempos de cierre, las 48 horas adicionales para encuesta, el corte de activación ni los destinatarios.

## Verificación

- TypeScript sin emisión, ESLint completo sin advertencias y build local completo aprobados.
- Dieciséis observaciones de la fuente con BD y Drive ficticios: grafo vacío/completo, orden de locks, 404 administrativo/individual, fallo del proveedor, intento stored sin metadata, archivo compartido, reintento confirmado, eliminación activa, cambio de instantánea, carga activa, recordatorio activo, autorización, ticket ya ausente, rechazo de destino eliminado y coordinación de recordatorios.
- Treinta y tres sentencias generadas: EXPLAIN sin ANALYZE en una transacción READ ONLY contra el destino verificado. Se planificaron SELECT/INSERT/UPDATE/DELETE; no se ejecutaron sus escrituras ni sus bloqueos de fila como prueba.
- Comprobaciones de fuente en proceso sin red, sin variables reales y con código/dependencias de solo lectura. Build en copia temporal sin archivos de entorno, con variables ficticias y acceso a fuentes públicas. Sin framework ni archivos de tests nuevos; material temporal retirado al terminar.

Estas comprobaciones no certifican concurrencia real de PostgreSQL, el proveedor ni navegación autenticada. No se invocó el worker, no se enviaron correos y no se borraron archivos o tickets reales.

## Límites pendientes

Drive y PostgreSQL no comparten una transacción: un fallo puede dejar archivos físicos ya eliminados y referencias pendientes de completar. El reintento conserva el progreso, pero una petición muy grande puede superar el tiempo de la plataforma y requerir varios intentos. La confirmación de un correo ya aceptado por Gmail no permite retirarlo. Las reservas vencidas no pueden garantizar que un proveedor haya detenido todo trabajo externo.

Los clientes antiguos que aún no envían destino y las cargas no registradas/no asociadas no pueden atribuirse después de borrar todas sus relaciones. No se eliminan huérfanos globales para cubrir ese caso. La reconciliación sigue separada. Un ticket ya ausente permite retirar restos que aún puedan atribuirse con seguridad; no reconstruye referencias ni inventa pertenencia.

Pendientes: merge/despliegue aprobado, recorrido autenticado y concurrencia real con datos autorizados, observación de Gmail/Drive/colas, reconciliación y bloques restantes de métricas, esquema y calidad.

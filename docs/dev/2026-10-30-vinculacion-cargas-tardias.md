# Vinculación automática de cargas tardías

## Estado

Integrado y desplegado en `bb0b870`, según el [diseño elegido por el usuario](../plans/2026-10-30-vinculacion-cargas-tardias-design.md). Production `7441161433` aprobada y SHA completo confirmado en el dominio público. No se generó Preview y la rama integrada se eliminó tras verificar igualdad con main. Se conserva la creación inmediata del ticket y se vinculan las cargas que llegan a confirmarse después, sin bloquear el formulario.

El rate limiting anterior se integró en `9838afd`; Production `7440258138` aprobó el despliegue. El estado autenticado de recordatorios confirmó SHA completo, queue activa y corte fijo `2026-10-28T17:00:00.000Z`. No se ejecutó el worker ni se enviaron correos como prueba. Su rama se eliminó tras verificar igualdad de contenido con main.

## Comportamiento

`upload_batch` fija un destino por usuario/token de formulario. Reutilizarlo para otro ticket provoca conflicto y rollback de la creación completa. La creación confirma la relación en su transacción de ticket/código/historial y vincula los archivos ya terminados; la confirmación posterior vincula los elegibles en la transacción del adjunto/intento. Ambos órdenes se coordinan con un advisory lock por formulario, sin depender del navegador.

Orden de bloqueo: formulario, ticket existente, intento y adjuntos. La acción de adjuntar a un ticket existente también toma el formulario antes del ticket. La creación tiene un ticket nuevo todavía no visible para otros procesos y no espera el destino anterior del formulario. No hay llamadas a Google dentro de las transacciones.

La finalización consulta usuario activo/rol/acceso vigentes y bloquea el ticket para comprobar estado y política de área/subcategoría. Si deja de admitir archivos, se confirma la referencia pendiente y el intento stored, se marca el error operativo y se devuelve 409 después del commit. Un reintento puede vincular cuando vuelva a ser válido; uncertain no degrada stored. No se borra el archivo remoto.

Los reintentos de archivos ya vinculados conservan su ID sin volver a adjuntar ni cambiar relación, incluso después de cerrar el ticket; si contradicen el destino del formulario se rechazan. Los cancelados/eliminados no se reconstruyen. Un formulario sin ticket conserva sus archivos pendientes.

La respuesta de upload sigue siendo el ID de texto plano. Después del éxito, after consulta el destino e invalida el detalle fuera de la transacción; un fallo de caché no altera el éxito del almacenamiento. Readiness incluye upload_attempt y upload_batch, sin consultas nuevas a Drive.

## Migración y validación

Se aplicó exclusivamente [2026-10-30-upload-batches.sql](../migrations/2026-10-30-upload-batches.sql), SHA-256 `1be7174f2992a666ccffd79d61ee0ee39fbbba40ebbd2ad76c135c6aa5a96028`, bajo la autorización aditiva vigente. Se comprobaron destino Neon y SSL, con timeouts de conexión/consulta y locales de DDL.

Resultado: seis columnas, cinco restricciones propias (PK y cuatro CHECK), un índice y cero filas. Destino, fecha de vinculación y error son nullable. Sin FKs con cascada, ALTER, borrados, seeds, backfills ni cambios históricos. El código anterior no usa la tabla nueva.

TypeScript completo, ESLint con cero errores/advertencias y build local completo de Next.js 16.4.3/Turbopack aprobados. Once consultas de helpers/readiness se inspeccionaron con el Drizzle instalado y aprobaron EXPLAIN sin ANALYZE en READ ONLY, incluyendo el join de permisos y los bloqueos. La tabla seguía vacía; no se ejecutaron los advisory locks, INSERT o UPDATE durante la planificación.

Tipos/lint e inspección de SQL usan red aislada, entorno vacío, fuente/dependencias de solo lectura y scratch con límites de recursos. El build usa copia sin .env.local, variables ficticias y HTTPS para fuentes públicas, sin credenciales de producción. No se añaden framework ni archivos de tests al proyecto. Se elimina el material temporal al terminar.

## Límites y siguientes pendientes

EXPLAIN y build no prueban carreras reales entre conexiones ni conflictos con cancelaciones o el recorrido autenticado en navegador. Esos escenarios siguen pendientes; no se ensayan contra producción. La invalidación no actualiza en vivo una página ya abierta.

Una desconexión puede interrumpir una transferencia; el intento conserva su recuperación anterior, sin reanudación automática o reconciliador de Drive. Solicitudes con código anterior durante el despliegue no participan del bloqueo nuevo. Timeouts locales limitan las esperas SQL, no el tiempo global de conexión/transporte.

No se deducen ni reasignan destinos históricos. Quedan separados el reconciliador, recuperación de borrados vinculados y la [corrección del reset del widget](2026-10-30-cola-adjuntos-confirmados.md), preparada en una rama local. No cambian permisos/carpetas de Google ni cantidad ilimitada/4 MB.

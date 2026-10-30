# Rate limiting compartido

## Estado

Implementado en la rama local `fix/rate-limiting-compartido`, según el [diseño del bloque aprobado](../plans/2026-10-30-rate-limiting-design.md). Código pendiente de merge y despliegue; no se publicó la rama ni se generó Preview. La tabla aditiva ya se creó bajo la autorización vigente del usuario. El código de producción anterior conserva su Map hasta integrar esta entrega.

## Comportamiento

Se reemplaza el Map y su temporizador por un contador persistente por operación y hash SHA-256 del identificador autenticado. Una sola sentencia INSERT/ON CONFLICT DO UPDATE coordina las instancias. Se conserva la ventana fija desde la primera solicitud; se renueva la fila vencida y se satura el contador en límite + 1, sin extender el vencimiento al rechazar. El reloj de PostgreSQL decide expiración y Retry-After.

La fábrica es síncrona; la comprobación es async. Se adaptaron todos los consumidores y se exigen namespaces tipados:

| Operación | Namespace | Límite conservado |
|---|---|---|
| Crear ticket | tickets:create | 10/minuto |
| Comentar | comments:create | 10/minuto |
| Derivar | derivations:create | 10/minuto |
| Enviar encuesta | surveys:submit | 10/minuto |
| Editar observadores | watchers:update | 10/minuto |
| Crear ticket de proveedor | providers:create | 10/minuto |
| Editar prioridades como admin | priorities:admin:update | 10/minuto |
| Editar prioridades como agente | priorities:agent:update | 10/minuto |
| Cargar adjunto | uploads:post | 30/minuto |
| Cancelar adjunto pendiente | uploads:delete | 30/minuto |

La guía general anterior decía 30/minuto para admin, pero los consumidores de prioridades ya usaban MODERATE=10. Se conserva el comportamiento real y se corrige esa descripción. No se añaden limitadores a operaciones que no los tenían. La cantidad ilimitada de adjuntos y los 4 MB por carga se mantienen.

Ante un fallo de almacenamiento no se permite continuar mediante un contador local. Las acciones devuelven un error temporal específico en español; el API de archivos distingue 503 por falta de verificación y 429 por límite alcanzado, ambos con Retry-After. La autenticación precede al contador. No se registran identificadores, hashes ni errores crudos del driver.

## Migración aplicada

Se aplicó exclusivamente [2026-10-30-rate-limit-counters.sql](../migrations/2026-10-30-rate-limit-counters.sql), SHA-256 `b8e66ae39aa46aaf9ac25d7fa4e8e7b28a0ee21060cd1a34403c119c9f6158ef`. La operación confirmó explícitamente el destino autorizado de Neon y su SSL antes de conectarse, con timeout de conexión/consulta y timeouts locales de DDL. Se verificaron esquema, columnas y restricciones mediante metadata.

Resultado: `rate_limit_counter` con cuatro columnas NOT NULL, cuatro restricciones (PK compuesta y tres CHECK), un índice propio y cero filas. No hay relaciones ni cascadas. No se alteraron tablas existentes ni se ejecutaron borrados, seeds, resets, backfills o cambios en historia. La tabla es independiente y compatible con el código anterior; dejarla vacía no requiere rollback destructivo.

## Validación

- TypeScript completo: aprobado con `--noEmit --incremental false`.
- ESLint completo: aprobado con `--max-warnings 0`, sin errores ni advertencias.
- Build local completo: Next.js 16.4.3/Turbopack, tipos, generación de 23 páginas y optimización aprobados.
- Inspección del SQL de las diez operaciones con el Drizzle instalado: un upsert por comprobación, parámetros por namespace y hash; sin consultas ejecutadas durante la generación.
- Diez EXPLAIN sin ANALYZE en READ ONLY: aprobados; la tabla seguía con cero filas al terminar. No se ejecutaron incrementos ni acciones de negocio como prueba.

Tipos/lint e inspección de SQL usaron un entorno vacío, sin credenciales ni red, con fuentes/dependencias de solo lectura, scratch temporal y límites de recursos. El build usó una copia sin `.env.local`, configuración ficticia y HTTPS para fuentes públicas, sin credenciales ni servicios de producción. Los límites y el aislamiento siguen el bloque de calidad anterior; los verificadores temporales se eliminan al terminar. No se añaden framework ni archivos de tests al proyecto.

La planificación SQL no comprueba resultados reales de los incrementos ni carreras entre conexiones. Siguen pendientes la matriz local de concurrencia/expiración, observación entre instancias después del despliegue y recorrido autenticado de los mensajes de límite e indisponibilidad. No se prueban límites haciendo solicitudes repetidas a producción.

## Límites operativos

Cada comprobación añade una transacción corta sobre PostgreSQL. Lock timeout de un segundo y statement timeout de dos segundos se configuran localmente; no modifican sesiones posteriores del pool. No son un límite global de adquisición de conexión o transporte. Una confirmación perdida puede consumir una plaza aunque la acción no se ejecute, de forma conservadora.

La tabla conserva una fila por usuario/operación, renovada por ventana; no crece por solicitud. Las solicitudes rechazadas todavía consultan y actualizan el contador saturado: este control no reemplaza protección de infraestructura frente a volumen externo. No se agrega limpieza automática de registros.

No se modificaron Google, Gmail, OAuth, permisos de carpeta ni datos de adjuntos. La integración y el despliegue de código quedan para el siguiente paso autorizado desde main, con una única entrega y sin Preview.

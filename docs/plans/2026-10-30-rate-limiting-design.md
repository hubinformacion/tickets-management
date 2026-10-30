# Rate limiting compartido

## Alcance aprobado

Se concreta el bloque de PostgreSQL, claves por operación/usuario, límites actuales y API async del [plan de estabilización](../dev/2026-10-27-plan-ejecucion.md). El usuario pidió continuar y autorizó cambios aditivos compatibles con snapshot confirmado. La rama permanece local durante implementación y validación; no se publica Preview ni se despliega este bloque sin su integración posterior.

Se consideran un servicio Redis adicional, persistencia en PostgreSQL y conservar el Map local. Se elige PostgreSQL por existir ya en la infraestructura y coordinar instancias sin otro servicio. El Map no coordina procesos; Redis añadiría configuración y dependencia operativa para este alcance.

## Contadores y concurrencia

Una tabla independiente `rate_limit_counter`, sin relaciones ni cascadas, tiene una fila por namespace y hash SHA-256 del identificador autenticado. No guarda el ID de usuario en texto ni crea filas por petición o por ventana. Contiene contador y vencimiento; al expirar se renueva la misma fila. Son contadores operativos mutables, sin cambios sobre tickets, adjuntos, usuarios ni historia.

La ventana sigue siendo fija desde la primera solicitud aceptada, como el algoritmo actual; no se presenta como sliding window. Un INSERT con ON CONFLICT DO UPDATE actualiza contador y vencimiento en una operación atómica. Usa `statement_timestamp()` de PostgreSQL para decidir expiración y calcular el tiempo de reintento. El contador se satura en límite + 1: solo las primeras N solicitudes de la ventana reciben éxito y no puede desbordarse tras muchos rechazos. Se mantiene el vencimiento al rechazar, sin extender el bloqueo.

Una transacción corta configura timeout de sentencia y bloqueo locales antes del upsert. No incluye consultas de negocio ni llamadas a Google. Esos timeouts no limitan estrictamente la adquisición de conexión ni el transporte del pool compartido; no se promete una duración global estricta. Una confirmación perdida puede consumir una plaza sin realizar la acción, un resultado conservador.

## API y consumidores

`createRateLimiter(preset, namespace)` sigue siendo una fábrica síncrona; la función retornada es async y debe esperarse. El namespace es obligatorio y tipado para las diez operaciones existentes: tickets, comentarios, derivaciones, encuestas, observadores, creación de proveedor, prioridades de admin/agente y POST/DELETE de adjuntos. No se agregan límites a operaciones que aún no los tenían.

Se preservan los presets actuales, incluyendo MODERATE=10/minuto en las acciones de prioridades aunque la guía general mencione 30 para admin. No se cambian cantidad ilimitada ni 4 MB por adjunto. POST y DELETE de adjuntos conservan contadores separados, ambos de 30/minuto.

Se devuelve un resultado distinguible de límite alcanzado o almacenamiento temporalmente no disponible. Ante fallo no hay fallback permisivo al Map. Las acciones retornan un error temporal en español; la ruta de archivos devuelve 503 si no puede verificar y 429 si se alcanzó el límite, con Retry-After. Se conserva autenticación antes de consultar el contador y no se registran identificadores, hashes ni errores crudos con parámetros de BD.

## Migración y verificación

Solo se crea la tabla vacía con su PK y CHECK propios, sin modificar tablas anteriores, borrar filas ni realizar backfills. No se usan comandos de sincronización general del esquema. La migración se revisa y verifica por separado bajo la autorización aditiva vigente; el código anterior no consulta esta tabla.

Se revisan todos los consumidores para confirmar await y namespace. Tipos y ESLint completos, compilación local y revisión del SQL generado. No se añade framework ni archivos de tests al proyecto y no se usan acciones reales de producción como prueba. La aprobación de esas comprobaciones no certifica carreras reales de PostgreSQL; cualquier validación que no se ejecute se registra como pendiente.

## Referencias

- [Drizzle: upsert](https://orm.drizzle.team/docs/guides/upsert).
- [PostgreSQL: INSERT y atomicidad de ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html).
- [PostgreSQL: reloj de sentencia](https://www.postgresql.org/docs/current/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT).

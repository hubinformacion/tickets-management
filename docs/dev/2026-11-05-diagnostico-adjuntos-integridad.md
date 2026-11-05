# Diagnóstico de adjuntos y restricciones compatibles

## Publicación anterior

UTF-8/paquetes/calidad integrados y publicados en `6455c6b`, Production `7584759821` aprobada. El estado autenticado del cron en el dominio público devolvió HTTP 200, ese SHA, `queueReady: true` y `mode: queue`. No se ejecutó el worker. Rama integrada eliminada; sin Preview ni CI.

## Adjuntos

Lectura agregada con transacción `REPEATABLE READ READ ONLY` el 5 de noviembre de 2026, a las 20:43 UTC:

- 109 referencias de adjuntos; 106 anteriores al registro moderno de intentos.
- Tres intentos registrados, almacenados y consistentes; siete lotes vinculados a su destino.
- Cero duplicados de referencias remotas, reservas vencidas, cargas registradas sin referencia, destinos ausentes o discrepancias detectadas entre intento y adjunto.
- 14 adjuntos pendientes sin lote/intento moderno. Todos pertenecen al legado; cero casos equivalentes con intento registrado.

No se determina por antigüedad que un archivo sea huérfano. Un ID reservado tampoco acredita existencia física. No se consultó inventario de Drive, no se modificaron permisos ni se cancelaron, borraron o reasignaron archivos/registros. Los 14 casos de legado quedan conservados; resolver su destino exige contexto funcional que estos agregados no aportan. Las categorías del reporte se solapan y no deben sumarse como total de errores.

## Cinco restricciones aplicadas

El usuario autorizó expresamente «Aplicar las cinco restricciones compatibles». Se repitió la comprobación de compatibilidad antes de escribir y se completó la operación el **2026-11-05 a las 20:48:49 UTC**:

| Tabla | Restricción | Estado final |
| --- | --- | --- |
| ticket | ticket_domain_check | Validada |
| ticket_status_history | ticket_status_history_domain_check | Validada |
| provider_ticket | provider_ticket_domain_check | Validada |
| satisfaction_survey | satisfaction_survey_ratings_check | Validada |
| provider_satisfaction_survey | provider_satisfaction_survey_ratings_check | Validada |

Validan estados/prioridades permitidos y calificaciones entre 1 y 5; conservan los `NULL` de prioridad y estado anterior. Las notas ya eran enteras y no nulas. No se añadieron obligaciones de `NOT NULL`, cascadas ni conversiones de tipos.

Cada `ADD CHECK … NOT VALID` se confirmó por separado antes de `VALIDATE CONSTRAINT`, con `lock_timeout = 2s` y `statement_timeout = 15s`. `NOT VALID` evita el escaneo inicial, pero sí controla las escrituras siguientes. La comprobación previa encontró cero incompatibilidades. La validación posterior confirmó las cinco restricciones, las 15 nulabilidades y los mismos agregados: 407 tickets, 1.146 cambios de estado, 58 tickets de proveedores, 238 encuestas de usuario y 14 de proveedor. Se conservaron 407 estados anteriores nulos de creación y dos prioridades nulas de proveedor.

**Cero filas reescritas y cero objetos eliminados.** Esta operación autorizada no ejecutó backfills, cambios históricos ni borrados. El [SQL de referencia](../migrations/2026-11-05-domain-checks.sql) permanece completamente comentado para no repetirla accidentalmente. Las declaraciones Drizzle reflejan el catálogo efectivo; no hay una migración automática al arrancar o desplegar la aplicación.

## Código de diagnóstico

`src/scripts/diagnose-project-integrity.ts` solo acepta `--read-only`, antes de cargar configuración o abrir conexiones. Usa TLS con verificación de certificado, elimina parámetros SSL de URL que pudieran sobrescribir esa política, limita tiempos y cierra el Pool incluso ante errores. Consulta agregados/catálogo en una transacción de solo lectura; las consultas de esa única conexión se esperan en secuencia. No importa el cliente global de la app ni accede a Gmail/Drive. Devuelve conteos, catálogo y nulabilidad, sin contenido de tickets o datos personales.

Ejecución explícita de diagnóstico, sin reparaciones:

```bash
pnpm exec tsx src/scripts/diagnose-project-integrity.ts --read-only
```

El script no ejecuta las restricciones. Su salida registra `repairsApplied: 0` y `remoteInventory: not_scanned`.

## Verificación y límites

Comprobación efímera con dependencias reales y almacenamiento simulado, sin red ni credenciales: rechazo de argumentos antes de conectar, TLS ante parámetros incompatibles, transacción solo lectura, consultas secuenciales, 33 contadores con separación de legado, catálogo y cierre de conexión al fallar. SQL histórico sin sentencias activas. Sin suite ni framework nuevos.

Tipos (`tsc --noEmit --incremental false`), ESLint (`eslint . --max-warnings 0`) y build final aprobados con Node 24 y el árbol actual de dependencias, en copia aislada sin red externa ni credenciales reales. Build generó las 23 páginas estáticas. Revisión independiente final sin bloqueantes. El diagnóstico/esquema/documentación permanecen en rama local para integración posterior; la aplicación de los CHECK ya está completada y no depende de ese merge.

Por decisión del usuario se omiten respaldo/recuperación (punto 6) y nuevos recorridos de aceptación funcional real. No se añaden servicios, cuotas de adjuntos o tareas periódicas. Los avisos transitivos moderados y las excepciones de versiones siguen documentados en el bloque de paquetes.

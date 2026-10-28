# Protección de scripts de BD

## Estado

Implementado en `3463601`, sobre `bb22104`, e integrado con `e089be3` en `main`. Desplegado en producción el 27 de octubre de 2026 con build de Vercel aprobado. No incluye cambios en el esquema, migraciones ni el comportamiento de tickets de la aplicación.

Se ejecuta el bloque de operación segura del plan aprobado. Se eligió retirar los borrados de esquema y área, en lugar de mantener una vía de confirmación que pudiera borrar historial. Para los scripts restantes se añade simulación sin conexión y confirmación local explícita, en lugar de depender únicamente de `NODE_ENV` o de una pregunta interactiva.

## Cambios

- `db:drop`, `db:reset` y la limpieza FED ya no ejecutan SQL destructivo. Se mantienen los puntos de entrada para que los comandos antiguos fallen de forma segura.
- Los scripts de escritura y Studio quedan bloqueados sin flags. `--dry-run` explica el alcance sin credenciales, conexión, conteos ni subprocesos.
- La ejecución exige una `MAINTENANCE_DATABASE_URL` separada de `DATABASE_URL`, IP literal de loopback, URL sin parámetros y confirmación de operación/destino. Se bloquean entornos producción y Vercel.
- Seeds, migración antigua y backfill validan antes de importar el cliente o crear conexiones. La migración también exige origen local distinto del destino y ya no reporta éxito tras un fallo.
- El config por defecto de Drizzle deja de leer `.env.local` y no incluye credenciales. Push/Studio usan un config local separado que vuelve a validar destino y confirmación. Setup instala el esquema y los seeds locales, pero ya no instala paquetes; un subproceso fallido detiene los siguientes pasos.
- Los manuales dejan de recomendar reset como verificación. Las instrucciones de uso están en [Mantenimiento seguro de BD](../mantenimiento-bd.md).

## Validación y límites

Verificadores temporales externos al repositorio, sin incorporar framework de tests. Se usan TypeScript/Node y dependencias ya instaladas, con red aislada, entorno ficticio explícito, fuentes/dependencias de solo lectura y límites de recursos (180 s de CPU, 6 GiB de espacio de direcciones, 256 procesos, 1024 descriptores, 100 MiB por archivo y scratch de 512 MiB).

Resultado: 224 comprobaciones aprobadas. TypeScript aprobado con `tsc --noEmit --incremental false`; ESLint aprobado con 0 errores y las 3 advertencias conocidas.

La matriz comprueba bloqueo sin argumentos, flags incompatibles, destinos remotos, host por parámetros, falta de destino explícito, confirmación de otra operación, producción/Vercel, loopback IPv4/IPv6 y origen/destino de migración. Ejecuta las entradas CLI reales solo en simulación o rechazo y verifica que no se expongan credenciales ficticias ni se cargue dotenv. Con subprocesos simulados comprueba que un fallo impida el seed siguiente y que Push/Studio reciban el config y la confirmación local.

No se ejecutan tareas aprobadas de escritura, Drizzle push/Studio reales, seed, backfill ni migración. La simulación no inspecciona filas ni calcula un diff de BD. Los controles no detectan túneles locales hacia servicios remotos; no deben usarse con producción. Las herramientas externas invocadas con credenciales explícitas quedan fuera de este control.

El seed principal sigue sin ser idempotente y solo se documenta para BD local nueva. El backfill y la importación antigua conservan sus transformaciones y requieren una revisión propia antes de reutilizarse. No se crean recursos, bases de datos ni un sandbox de aplicación.

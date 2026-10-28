# Mantenimiento seguro de la base de datos

La aplicación sigue usando `DATABASE_URL`. Los scripts de mantenimiento no la aceptan como destino implícito y no cargan `.env.local` para decidir dónde ejecutarse. La configuración por defecto de Drizzle no contiene credenciales y permite preparar SQL sin conectarse.

## Comportamiento por defecto

- `setup`, `db:push`, `db:seed` y `db:studio` terminan con error si no reciben una ejecución local confirmada.
- Los seeds de FED, backfill de historial y migración antigua aplican el mismo control incluso si se invocan directamente con `tsx`.
- `db:drop`, `db:reset` y `clean-fed-tickets.ts` están retirados. No contienen una ruta de ejecución que borre esquema, tickets ni historial, aunque se solicite `--execute`.
- `--dry-run` muestra el alcance sin importar el cliente de BD, leer archivos de credenciales, conectarse, contar filas ni ejecutar subprocesos. Es una simulación del comando, no un diff de datos o esquema.
- Los errores del control no imprimen URLs con contraseñas. Un fallo real de mantenimiento devuelve código distinto de cero y detiene los pasos posteriores.

## Simulación sin conexión

```bash
pnpm setup --dry-run
pnpm db:push --dry-run
pnpm db:seed --dry-run
pnpm db:studio --dry-run
pnpm db:drop --dry-run
pnpm db:reset --dry-run
pnpm exec tsx src/scripts/clean-fed-tickets.ts --dry-run
pnpm exec tsx src/scripts/seed-fed-categories.ts --dry-run
pnpm exec tsx src/scripts/backfill-status-history.ts --dry-run
pnpm exec tsx src/scripts/migrate-data.ts --dry-run
```

Sin argumentos o con una combinación de flags desconocida, el comando falla antes de importar el cliente de BD. `--dry-run` no se combina con `--execute`.

## Ejecución sobre una BD local nueva

Instalar dependencias por separado con `pnpm install --frozen-lockfile`. `setup` ya no instala paquetes.

Solo se admite `MAINTENANCE_DATABASE_URL` explícita con protocolo PostgreSQL, IP literal `127.0.0.1` o `[::1]`, nombre de BD y ningún parámetro de consulta o fragmento. No se admiten dominios, `localhost`, destinos remotos, sustituciones de host por query string ni entornos `NODE_ENV=production`/Vercel.

Ejemplo únicamente para una BD local nueva con datos desechables:

```bash
export MAINTENANCE_DATABASE_URL='postgresql://usuario:clave@127.0.0.1:5432/tickets_local'
pnpm setup --execute --confirm setup@127.0.0.1:5432/tickets_local
```

El formato de confirmación es `<operación>@<host>:<puerto>/<bd>`; el puerto omitido en la URL equivale a 5432. Las operaciones son `setup`, `push`, `seed`, `studio`, `seed-fed`, `backfill` y `migrate-data`. La confirmación de una operación no autoriza otra. El runner fija `DATABASE_URL` al destino validado antes de importar el cliente y transmite la confirmación al config local de Drizzle.

Para `migrate-data` también se exige `MAINTENANCE_SOURCE_DATABASE_URL` local y distinta del destino. El script antiguo conserva sus transformaciones de importación; esta protección no certifica su idempotencia ni compatibilidad de datos. El backfill tampoco garantiza ausencia de duplicados. El seed principal solo se admite para una BD nueva, pues repetirlo puede duplicar categorías.

La validación comprueba el destino de la URL, no el servidor detrás de un túnel local: no apuntar estas variables a túneles o proxies hacia producción. Herramientas externas con credenciales explícitas quedan fuera del control de estos scripts.

## Producción

No usar estos comandos sobre producción. Un merge o despliegue de código no autoriza operar sobre datos.

Los cambios de esquema se preparan como migraciones revisables, aditivas y compatibles con registros existentes. Usar columnas nullable o valores predeterminados cuando corresponda y comprobar datos antes de constraints nuevos. Las migraciones y backfills requieren revisión, respaldo restaurable y autorización específica; no se ejecutan como parte de un build o despliegue de código. No eliminar ni reescribir historial.

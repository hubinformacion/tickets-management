type Environment = Record<string, string | undefined>;

const OPERATIONS = {
  push: "Sincronizar el esquema de una BD local; puede modificar o eliminar columnas.",
  studio: "Abrir una interfaz con capacidad de escritura sobre una BD local.",
  seed: "Insertar catálogos en una BD local nueva; el seed no es repetible.",
  "seed-fed": "Insertar categorías FED ausentes en una BD local.",
  setup: "Sincronizar el esquema y cargar catálogos en una BD local nueva.",
  backfill: "Insertar historial inferido en una BD local; requiere revisión de duplicados.",
  "migrate-data": "Importar datos entre dos BD locales; conserva transformaciones históricas del script.",
  drop: "Retirado: no se permite eliminar el esquema desde este proyecto.",
  reset: "Retirado: no se permite borrar y recrear la BD desde este proyecto.",
  "clean-fed": "Retirado: no se permite borrar tickets ni su historial por área.",
} as const;

export type MaintenanceOperation = keyof typeof OPERATIONS;

export class MaintenanceError extends Error {}

export interface LocalDatabaseTarget {
  connectionString: string;
  label: string;
}

// No usa DATABASE_URL, archivos .env, DNS ni parámetros que puedan sustituir el host.
export function getLocalDatabaseTarget(value: string | undefined): LocalDatabaseTarget {
  if (!value) {
    throw new MaintenanceError("Falta MAINTENANCE_DATABASE_URL explícita para una BD local.");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new MaintenanceError("La URL de mantenimiento no es válida.");
  }

  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.search || url.hash || !/^\/[a-zA-Z0-9_-]+$/.test(url.pathname)
  ) {
    throw new MaintenanceError("Solo se admiten IPs de loopback literales, una BD explícita y URLs sin parámetros.");
  }

  return {
    connectionString: value,
    label: `${url.hostname}:${url.port || "5432"}${url.pathname}`,
  };
}

export function getMaintenancePlan(
  operation: MaintenanceOperation,
  args: string[],
  env: Environment,
): { dryRun: true; description: string } | { dryRun: false; target: LocalDatabaseTarget } {
  if (args.length === 1 && args[0] === "--dry-run") {
    return { dryRun: true, description: OPERATIONS[operation] };
  }

  if (args.length !== 3 || args[0] !== "--execute" || args[1] !== "--confirm") {
    throw new MaintenanceError("Operación bloqueada. Use --dry-run sin conexión; la ejecución local exige --execute --confirm <operación>@<host>:<puerto>/<bd>.");
  }

  if (["drop", "reset", "clean-fed"].includes(operation)) {
    throw new MaintenanceError(OPERATIONS[operation]);
  }

  if (env.NODE_ENV === "production" || env.VERCEL || env.VERCEL_ENV) {
    throw new MaintenanceError("El mantenimiento está bloqueado en entornos de producción y Vercel.");
  }

  const target = getLocalDatabaseTarget(env.MAINTENANCE_DATABASE_URL);
  if (args[2] !== `${operation}@${target.label}`) {
    throw new MaintenanceError("La confirmación no coincide con la operación y el destino local.");
  }

  if (operation === "migrate-data") {
    const source = getLocalDatabaseTarget(env.MAINTENANCE_SOURCE_DATABASE_URL);
    if (source.label === target.label) {
      throw new MaintenanceError("Origen y destino deben ser BD locales distintas.");
    }
  }

  return { dryRun: false, target };
}

export async function runMaintenance(
  operation: MaintenanceOperation,
  task: (target: LocalDatabaseTarget) => Promise<void>,
) {
  try {
    const plan = getMaintenancePlan(operation, process.argv.slice(2), process.env);
    if (plan.dryRun) {
      console.log(`Simulación sin conexión: ${plan.description}`);
      console.log("No se consultan credenciales, filas ni servicios externos.");
      return;
    }

    // Fija el destino antes de importar módulos que creen conexiones.
    process.env.DATABASE_URL = plan.target.connectionString;
    if (operation === "migrate-data") {
      process.env.OLD_DATABASE_URL = process.env.MAINTENANCE_SOURCE_DATABASE_URL;
    }
    console.log(`Mantenimiento local: ${operation}@${plan.target.label}`);
    await task(plan.target);
    process.exit(0);
  } catch (error) {
    // Los errores del driver pueden contener credenciales o datos de filas.
    console.error(error instanceof MaintenanceError ? error.message : "Falló el mantenimiento local. Revise el destino y la operación sin publicar credenciales ni datos.");
    process.exit(1);
  }
}

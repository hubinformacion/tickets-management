import { defineConfig } from "drizzle-kit";
import { getMaintenancePlan, MaintenanceError } from "./src/scripts/maintenance-safety";

// Configuración separada: la configuración por defecto solo genera SQL sin credenciales.
const operation = process.env.MAINTENANCE_SCHEMA_OPERATION;
if (operation !== "push" && operation !== "studio") {
  throw new MaintenanceError("Use los comandos de mantenimiento local con confirmación explícita.");
}
const plan = getMaintenancePlan(operation, [
  "--execute", "--confirm", process.env.MAINTENANCE_SCHEMA_CONFIRM ?? "",
], process.env);
if (plan.dryRun) {
  throw new MaintenanceError("La configuración local exige una ejecución confirmada.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: plan.target.connectionString },
});

import { spawnSync } from "node:child_process";
import { MaintenanceError, runMaintenance } from "@/scripts/maintenance-safety";

const operation = process.argv[2];
if (operation !== "push" && operation !== "setup" && operation !== "reset" && operation !== "studio") {
  console.error("Operación de BD no reconocida.");
  process.exitCode = 1;
} else {
  process.argv.splice(2, 1);
  void runMaintenance(operation, async (target) => {
    function run(args: string[]) {
      const result = spawnSync("pnpm", args, {
        stdio: "inherit",
        env: {
          ...process.env,
          MAINTENANCE_SCHEMA_OPERATION: operation === "studio" ? "studio" : "push",
          MAINTENANCE_SCHEMA_CONFIRM: `${operation === "studio" ? "studio" : "push"}@${target.label}`,
        },
        shell: false,
      });
      if (result.error || result.status !== 0) {
        throw new MaintenanceError("Subproceso interrumpido; no se ejecutarán los pasos restantes.");
      }
    }

    run(["exec", "drizzle-kit", operation === "studio" ? "studio" : "push", "--config=drizzle.local.config.ts"]);
    if (operation === "setup") {
      run(["exec", "tsx", "src/scripts/seed.ts", "--execute", "--confirm", `seed@${target.label}`]);
    }
  });
}

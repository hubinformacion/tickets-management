import { runMaintenance } from "@/scripts/maintenance-safety";

// Se conserva el punto de entrada para que los comandos antiguos fallen de forma segura.
void runMaintenance("drop", async () => {});

import { runMaintenance } from "@/scripts/maintenance-safety";

// Un área no identifica datos de prueba. Se retira también el borrado de su historial.
void runMaintenance("clean-fed", async () => {});

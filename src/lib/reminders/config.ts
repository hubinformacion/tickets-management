import { z } from "zod";

export type ReminderConfig =
  | { mode: "legacy" }
  | { mode: "paused" }
  | { mode: "queue"; startAt: Date };

// La fecha es fija entre despliegues: calcularla por ejecución excluiría los cierres vencidos.
export function getReminderConfig(env: NodeJS.ProcessEnv): ReminderConfig {
  const mode = env.SURVEY_REMINDER_MODE || "legacy";
  if (mode === "legacy" || mode === "paused") return { mode };
  const date = z.iso.datetime().safeParse(env.SURVEY_REMINDER_START_AT);
  if (mode !== "queue" || !date.success) {
    throw new Error("Configuración de recordatorios inválida");
  }
  return { mode, startAt: new Date(date.data) };
}

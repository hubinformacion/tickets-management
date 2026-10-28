import { z } from "zod";
import { PRODUCTION_REMINDER_START_AT } from "@/lib/reminders/production-rollout";

export type ReminderConfig =
  | { mode: "legacy" }
  | { mode: "paused" }
  | { mode: "queue"; startAt: Date };

// La fecha es fija entre despliegues: calcularla por ejecución excluiría los cierres vencidos.
export function getReminderConfig(env: NodeJS.ProcessEnv): ReminderConfig {
  const isProduction = env.VERCEL_ENV === "production";
  const mode = env.SURVEY_REMINDER_MODE || (isProduction ? "queue" : "legacy");
  if (mode === "legacy" || mode === "paused") return { mode };
  const date = z.iso.datetime().safeParse(
    env.SURVEY_REMINDER_START_AT || (isProduction ? PRODUCTION_REMINDER_START_AT : undefined),
  );
  if (mode !== "queue" || !date.success) {
    throw new Error("Configuración de recordatorios inválida");
  }
  return { mode, startAt: new Date(date.data) };
}

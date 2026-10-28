import { NextResponse } from "next/server";
import { sendSurveyReminderEmail } from "@/lib/email/send-emails";
import { getReminderConfig } from "@/lib/reminders/config";
import { runLegacySurveyReminders } from "@/lib/reminders/legacy";
import { reminderStore } from "@/lib/reminders/store";
import { runReminderQueue } from "@/lib/reminders/worker";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const config = getReminderConfig(process.env);
    if (config.mode === "paused") {
      return NextResponse.json({ success: true, mode: config.mode, sent: 0 });
    }
    // Compatible con producción sin la tabla nueva. Activación explícita después de la migración.
    if (config.mode === "legacy") return runLegacySurveyReminders(request);
    const counts = await runReminderQueue(
      reminderStore,
      (params, signal) => sendSurveyReminderEmail(params, { signal, timeout: 20_000 }),
      config.startAt,
    );
    console.info("Resultado del lote de recordatorios", counts);
    return NextResponse.json({ success: true, mode: config.mode, ...counts });
  } catch {
    // No publicar errores del driver/OAuth ni recurrir al flujo anterior si falla la cola.
    console.error("No se pudo completar el lote de recordatorios");
    return NextResponse.json({ error: "Recordatorios no disponibles" }, { status: 503 });
  }
}

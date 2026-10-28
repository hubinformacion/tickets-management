import { NextResponse } from "next/server";
import { getReminderConfig } from "@/lib/reminders/config";
import { isReminderQueueReady } from "@/lib/reminders/store";

export const dynamic = "force-dynamic";

// Ruta independiente: nunca ejecuta el worker, tampoco durante un cambio de versión.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const config = getReminderConfig(process.env);
    const ready = config.mode === "queue" ? await isReminderQueueReady() : null;
    return NextResponse.json({
      mode: config.mode,
      startAt: config.mode === "queue" ? config.startAt.toISOString() : null,
      queueReady: ready,
      deployment: process.env.VERCEL_GIT_COMMIT_SHA || null,
    }, { status: ready === false ? 503 : 200 });
  } catch {
    return NextResponse.json({ error: "Estado de recordatorios no disponible" }, { status: 503 });
  }
}

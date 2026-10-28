import type { SendSurveyReminderEmailParams } from "@/lib/email/send-emails";

export interface ReminderClaim {
  id: string;
  token: string;
  attempts: number;
}

export interface ReminderStore {
  enqueue(startAt: Date): Promise<void>;
  claim(startAt: Date): Promise<ReminderClaim | undefined>;
  load(claim: ReminderClaim, startAt: Date): Promise<SendSurveyReminderEmailParams | undefined>;
  cancel(claim: ReminderClaim): Promise<void>;
  retry(claim: ReminderClaim, delayMs: number): Promise<void>;
  complete(claim: ReminderClaim, messageId?: string | null): Promise<void>;
}

export function retryDelayMs(attempts: number): number {
  return Math.min(24 * 60, 15 * 2 ** Math.min(Math.max(attempts - 1, 0), 7)) * 60_000;
}

type Sender = (params: SendSurveyReminderEmailParams, signal: AbortSignal) => Promise<{
  success: boolean;
  data?: { id?: string | null };
}>;

export async function runReminderQueue(
  store: ReminderStore,
  send: Sender,
  startAt: Date,
  clock: () => number = Date.now,
) {
  const startedAt = clock();
  const counts = { sent: 0, failed: 0, cancelled: 0, claimed: 0 };
  await store.enqueue(startAt);
  // Una reserva por vez; nunca se reserva un lote que quedaría sin procesar al agotar el tiempo.
  while (counts.claimed < 20 && clock() - startedAt < 25_000) {
    const claim = await store.claim(startAt);
    if (!claim) break;
    counts.claimed++;
    const params = await store.load(claim, startAt);
    if (!params) {
      await store.cancel(claim);
      counts.cancelled++;
      continue;
    }
    let result: Awaited<ReturnType<Sender>>;
    try {
      result = await send(params, AbortSignal.timeout(20_000));
    } catch {
      result = { success: false };
    }
    if (!result.success) {
      await store.retry(claim, retryDelayMs(claim.attempts));
      counts.failed++;
      continue;
    }
    // Un fallo de confirmación detiene el lote y conserva la reserva. No reenvía inmediatamente.
    await store.complete(claim, result.data?.id);
    counts.sent++;
  }
  return counts;
}

import { VALIDATION_TIMEOUT_HOURS } from "@/lib/constants/tickets";
import { dayjs, PERU_TIMEZONE } from "@/lib/utils/date";

export function isWeekday(now: Date): boolean {
  const day = dayjs(now).tz(PERU_TIMEZONE).day();
  return day >= 1 && day <= 5;
}

export function canSendSurveyReminder(now: Date): boolean {
  return isWeekday(now) && dayjs(now).tz(PERU_TIMEZONE).hour() >= 9;
}

/** Límite inclusivo tras 48 horas: cuentan noches de lunes a viernes, nunca sábados/domingo. */
export function getWeekdayCutoff(now: Date): Date {
  let cursor = dayjs(now).tz(PERU_TIMEZONE);
  let remaining = VALIDATION_TIMEOUT_HOURS * 60 * 60 * 1000;
  while (remaining > 0) {
    // En medianoche, el intervalo inmediatamente anterior pertenece al día anterior.
    const previous = cursor.subtract(1, "millisecond");
    const start = previous.startOf("day");
    if (previous.day() !== 0 && previous.day() !== 6) {
      const available = cursor.valueOf() - start.valueOf();
      if (remaining <= available) return new Date(cursor.valueOf() - remaining);
      remaining -= available;
    }
    cursor = start;
  }
  return cursor.toDate();
}

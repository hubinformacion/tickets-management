import { dayjs, PERU_TIMEZONE } from "@/lib/utils/date";
import { normalizeAnalyticsRange } from "@/lib/analytics/range";
import type { AnalyticsRange } from "@/lib/analytics/range";

export interface AnalyticsPeriod {
  range: AnalyticsRange;
  from: Date | null;
  to: Date;
}
export type AnalyticsPeriodInput = string | AnalyticsPeriod;

/** Un solo instante final por render; meses/años de calendario en Lima, sin overflow. */
export function getAnalyticsPeriod(input?: AnalyticsPeriodInput, now = new Date()): AnalyticsPeriod {
  if (typeof input === "object") return input;
  const range = input === undefined ? "all" : normalizeAnalyticsRange(input);
  const end = dayjs(now).tz(PERU_TIMEZONE);
  let start: Date | null = null;
  switch (range) {
    case "week": start = end.subtract(7, "day").toDate(); break;
    case "month": start = end.subtract(1, "month").toDate(); break;
    case "quarter": start = end.subtract(3, "month").toDate(); break;
    case "year": start = end.subtract(1, "year").toDate(); break;
  }
  return { range, from: start, to: end.toDate() };
}

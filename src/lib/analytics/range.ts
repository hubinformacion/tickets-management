import { z } from "zod";
import { DATE_RANGE_OPTIONS } from "@/lib/constants/analytics";

export type AnalyticsRange = typeof DATE_RANGE_OPTIONS[number]["value"];
const analyticsRangeSchema = z.enum(DATE_RANGE_OPTIONS.map(option => option.value));

export function normalizeAnalyticsRange(value: unknown): AnalyticsRange {
  const result = analyticsRangeSchema.safeParse(value);
  return result.success ? result.data : "month";
}

/** Conserva Todo explícito y los demás filtros de la página. */
export function buildAnalyticsRangeQuery(current: string, value: string): string {
  const params = new URLSearchParams(current);
  params.set("range", normalizeAnalyticsRange(value));
  return `?${params.toString()}`;
}

import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimitCounters } from "@/db/schema";

interface RateLimitWindow {
  remaining: number;
  reset: number;
  limit: number;
  retryAfterSeconds: number;
}

export type RateLimitResult = RateLimitWindow & (
  | { success: true }
  | { success: false; reason: "limited" | "unavailable"; error?: string }
);

type RateLimitNamespace =
  | "tickets:create"
  | "tickets:admin:delete"
  | "comments:create"
  | "derivations:create"
  | "surveys:submit"
  | "watchers:update"
  | "providers:create"
  | "priorities:admin:update"
  | "priorities:agent:update"
  | "uploads:post"
  | "uploads:delete";

const RateLimitPresets = {
  STRICT: { limit: 5, window: 60_000 },
  MODERATE: { limit: 10, window: 60_000 },
  RELAXED: { limit: 30, window: 60_000 },
  CRITICAL: { limit: 3, window: 10_000 },
} as const;

function unavailable(limit: number): RateLimitResult {
  return {
    success: false,
    reason: "unavailable",
    error: "No se pudo verificar el límite de solicitudes. Intenta nuevamente en un momento.",
    remaining: 0,
    reset: Date.now() + 30_000,
    limit,
    retryAfterSeconds: 30,
  };
}

/** Fábrica síncrona; el consumidor debe esperar la comprobación compartida. */
export function createRateLimiter(preset: keyof typeof RateLimitPresets, namespace: RateLimitNamespace) {
  const { limit, window } = RateLimitPresets[preset];

  return async (identifier: string): Promise<RateLimitResult> => {
    if (!identifier || identifier.length > 512) return unavailable(limit);
    const identifierHash = createHash("sha256").update(identifier).digest("hex");

    try {
      // La sentencia usa un solo instante de PostgreSQL, independiente del reloj de Vercel.
      const nextReset = sql`statement_timestamp() + ${window}::double precision * interval '1 millisecond'`;
      const expired = sql`${rateLimitCounters.resetAt} <= statement_timestamp()`;
      const counter = await db.transaction(async tx => {
        await tx.execute(sql`SET LOCAL lock_timeout = '1s'`);
        await tx.execute(sql`SET LOCAL statement_timeout = '2s'`);
        const [row] = await tx.insert(rateLimitCounters).values({
          namespace,
          identifierHash,
          requestCount: 1,
          resetAt: nextReset,
        }).onConflictDoUpdate({
          target: [rateLimitCounters.namespace, rateLimitCounters.identifierHash],
          set: {
            requestCount: sql`CASE WHEN ${expired} THEN 1 ELSE least(${rateLimitCounters.requestCount}, ${limit}) + 1 END`,
            resetAt: sql`CASE WHEN ${expired} THEN ${nextReset} ELSE ${rateLimitCounters.resetAt} END`,
          },
        }).returning({
          count: rateLimitCounters.requestCount,
          resetAt: rateLimitCounters.resetAt,
          retryAfterSeconds: sql<number>`greatest(0, ceil(extract(epoch FROM (${rateLimitCounters.resetAt} - statement_timestamp()))))::integer`,
        });
        if (!row) throw new Error("El contador no confirmó la solicitud");
        return row;
      });

      const reset = counter.resetAt.getTime();
      if (!Number.isFinite(reset) || !Number.isInteger(counter.count) || counter.count < 1 ||
          counter.count > limit + 1 || !Number.isInteger(counter.retryAfterSeconds)) {
        return unavailable(limit);
      }
      const result = { remaining: Math.max(0, limit - counter.count), reset, limit };
      return counter.count <= limit
        ? { ...result, success: true, retryAfterSeconds: 0 }
        : { ...result, success: false, reason: "limited", retryAfterSeconds: Math.max(1, counter.retryAfterSeconds) };
    } catch {
      // No exponer errores del driver: pueden contener parámetros o credenciales.
      console.error("No se pudo verificar el contador compartido de solicitudes.");
      return unavailable(limit);
    }
  };
}

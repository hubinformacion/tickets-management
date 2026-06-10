/**
 * Simple in-memory rate limiter
 * Para producción, considera usar Upstash Redis o similar
 */

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitStore>();

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (value.resetTime < now) {
      store.delete(key);
    }
  }
}, 10 * 60 * 1000);

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
  limit: number;
}

/**
 * Rate limiter usando sliding window algorithm
 * @param identifier - Identificador único (ej: userId, IP)
 * @param limit - Número máximo de requests
 * @param window - Ventana de tiempo en milisegundos
 */
function rateLimit(
  identifier: string,
  limit: number,
  window: number
): RateLimitResult {
  const now = Date.now();
  const key = identifier;

  const record = store.get(key);

  // Si no existe o expiró, crear nuevo
  if (!record || record.resetTime < now) {
    store.set(key, {
      count: 1,
      resetTime: now + window,
    });

    return {
      success: true,
      remaining: limit - 1,
      reset: now + window,
      limit,
    };
  }

  // Si alcanzó el límite
  if (record.count >= limit) {
    return {
      success: false,
      remaining: 0,
      reset: record.resetTime,
      limit,
    };
  }

  // Incrementar contador
  record.count += 1;

  return {
    success: true,
    remaining: limit - record.count,
    reset: record.resetTime,
    limit,
  };
}

/**
 * Presets de rate limiting comunes
 */
const RateLimitPresets = {
  /** 5 requests por minuto */
  STRICT: { limit: 5, window: 60 * 1000 },
  /** 10 requests por minuto */
  MODERATE: { limit: 10, window: 60 * 1000 },
  /** 30 requests por minuto */
  RELAXED: { limit: 30, window: 60 * 1000 },
  /** 3 requests por 10 segundos (para operaciones críticas) */
  CRITICAL: { limit: 3, window: 10 * 1000 },
} as const;

/**
 * Helper para crear rate limiters específicos
 */
export function createRateLimiter(preset: keyof typeof RateLimitPresets) {
  const config = RateLimitPresets[preset];
  return (identifier: string) => rateLimit(identifier, config.limit, config.window);
}

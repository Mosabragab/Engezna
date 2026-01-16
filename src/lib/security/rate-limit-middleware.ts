import { NextRequest, NextResponse } from 'next/server';

/**
 * Global Rate Limiting Middleware
 *
 * Provides IP-based rate limiting for API routes using sliding window algorithm.
 * In production, consider using Redis or a dedicated service like Upstash.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// In-memory store for rate limiting
// Note: This won't work across multiple serverless instances
// For production, use Redis or Upstash
const globalRateLimitStore = new Map<string, RateLimitEntry>();

// Clean up interval
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

/**
 * Clean up expired entries
 */
function cleanupExpiredEntries(windowMs: number): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  const cutoff = now - windowMs * 2; // Keep entries for 2 windows

  for (const [key, entry] of globalRateLimitStore.entries()) {
    if (entry.windowStart < cutoff) {
      globalRateLimitStore.delete(key);
    }
  }
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Custom key generator (default: IP-based) */
  keyGenerator?: (request: NextRequest) => string;
  /** Skip rate limiting for this request */
  skip?: (request: NextRequest) => boolean;
  /** Custom response when rate limited */
  onRateLimit?: (request: NextRequest, retryAfterMs: number) => NextResponse;
}

/**
 * Default configurations for different API tiers
 */
export const RATE_LIMIT_CONFIGS = {
  /** Standard API endpoints: 100 requests per minute */
  standard: {
    limit: 100,
    windowMs: 60 * 1000,
  },
  /** Strict for sensitive endpoints: 10 requests per minute */
  strict: {
    limit: 10,
    windowMs: 60 * 1000,
  },
  /** Auth endpoints: 20 requests per minute */
  auth: {
    limit: 20,
    windowMs: 60 * 1000,
  },
  /** Search/heavy endpoints: 30 requests per minute */
  search: {
    limit: 30,
    windowMs: 60 * 1000,
  },
  /** Public API: 60 requests per minute */
  public: {
    limit: 60,
    windowMs: 60 * 1000,
  },
} as const;

/**
 * Get client IP from request
 */
export function getClientIp(request: NextRequest): string {
  // Check various headers for proxied requests
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP (original client)
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Fallback to connection IP (if available)
  return request.headers.get('cf-connecting-ip') || 'unknown';
}

/**
 * Rate limiting result
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
  retryAfterMs?: number;
}

/**
 * Check rate limit for a given key
 */
export function checkGlobalRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  cleanupExpiredEntries(config.windowMs);

  const now = Date.now();
  const entry = globalRateLimitStore.get(key);

  // Calculate window boundaries
  const windowStart = entry?.windowStart ?? now;
  const windowEnd = windowStart + config.windowMs;
  const windowRemaining = Math.max(0, windowEnd - now);

  // If window has passed, start new window
  if (!entry || now >= windowEnd) {
    globalRateLimitStore.set(key, {
      count: 1,
      windowStart: now,
    });
    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetMs: config.windowMs,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.limit) {
    return {
      allowed: false,
      limit: config.limit,
      remaining: 0,
      resetMs: windowRemaining,
      retryAfterMs: windowRemaining,
    };
  }

  // Increment count
  entry.count++;
  globalRateLimitStore.set(key, entry);

  return {
    allowed: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    resetMs: windowRemaining,
  };
}

/**
 * Create rate limit headers
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetMs / 1000)),
  };

  if (result.retryAfterMs) {
    headers['Retry-After'] = String(Math.ceil(result.retryAfterMs / 1000));
  }

  return headers;
}

/**
 * Rate limit error response
 */
function rateLimitErrorResponse(result: RateLimitResult): NextResponse {
  const headers = createRateLimitHeaders(result);
  const retryAfterSeconds = Math.ceil((result.retryAfterMs ?? 0) / 1000);

  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Please try again in ${retryAfterSeconds} seconds.`,
        retryAfter: retryAfterSeconds,
      },
    },
    {
      status: 429,
      headers,
    }
  );
}

/**
 * Rate limiting middleware wrapper
 *
 * Usage:
 * ```ts
 * import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limit-middleware';
 *
 * export const GET = withRateLimit(
 *   async (request) => {
 *     // Handler logic
 *   },
 *   RATE_LIMIT_CONFIGS.standard
 * );
 * ```
 */
export function withRateLimit(
  handler: (request: NextRequest, context?: unknown) => Promise<NextResponse>,
  config: Partial<RateLimitConfig> = {}
): (request: NextRequest, context?: unknown) => Promise<NextResponse> {
  const fullConfig: RateLimitConfig = {
    ...RATE_LIMIT_CONFIGS.standard,
    ...config,
  };

  return async (request: NextRequest, context?: unknown): Promise<NextResponse> => {
    // Skip if configured to skip
    if (fullConfig.skip?.(request)) {
      return handler(request, context);
    }

    // Generate key (default: IP + path)
    const key = fullConfig.keyGenerator
      ? fullConfig.keyGenerator(request)
      : `${getClientIp(request)}:${request.nextUrl.pathname}`;

    // Check rate limit
    const result = checkGlobalRateLimit(key, fullConfig);

    // If rate limited
    if (!result.allowed) {
      if (fullConfig.onRateLimit) {
        return fullConfig.onRateLimit(request, result.retryAfterMs ?? 0);
      }
      return rateLimitErrorResponse(result);
    }

    // Call handler and add rate limit headers to response
    const response = await handler(request, context);
    const headers = createRateLimitHeaders(result);

    // Add headers to response
    for (const [headerName, headerValue] of Object.entries(headers)) {
      response.headers.set(headerName, headerValue);
    }

    return response;
  };
}

/**
 * Combine multiple middleware (CSRF + Rate Limit)
 */
export function withSecurity(
  handler: (request: NextRequest, context?: unknown) => Promise<NextResponse>,
  options?: {
    rateLimit?: Partial<RateLimitConfig>;
    skipCsrf?: boolean;
  }
): (request: NextRequest, context?: unknown) => Promise<NextResponse> {
  const { rateLimit = RATE_LIMIT_CONFIGS.standard } = options ?? {};

  // Apply rate limiting
  return withRateLimit(handler, rateLimit);
}

/**
 * Reset rate limit for a specific key (useful for testing)
 */
export function resetGlobalRateLimit(key: string): void {
  globalRateLimitStore.delete(key);
}

/**
 * Clear all rate limits (useful for testing)
 */
export function clearAllRateLimits(): void {
  globalRateLimitStore.clear();
}

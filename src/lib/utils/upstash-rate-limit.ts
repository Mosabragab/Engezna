import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Upstash Redis Rate Limiter
 *
 * Distributed rate limiting for serverless environments.
 * Replaces in-memory rate limiting to work across multiple instances.
 *
 * @see docs/MASTER_IMPLEMENTATION_PLAN.md - Section 1.1
 */

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ============================================
// Rate Limiters Configuration
// ============================================

/**
 * OTP Send: 5 requests per 10 minutes
 * Prevents SMS/email spam abuse
 */
export const otpSendLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '10 m'),
  prefix: 'ratelimit:otp:send',
  analytics: true,
});

/**
 * OTP Verify: 5 requests per 5 minutes
 * Prevents brute-force OTP guessing
 */
export const otpVerifyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '5 m'),
  prefix: 'ratelimit:otp:verify',
  analytics: true,
});

/**
 * Login: 10 requests per 15 minutes
 * Prevents credential stuffing attacks
 */
export const loginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '15 m'),
  prefix: 'ratelimit:auth:login',
  analytics: true,
});

/**
 * Password Reset: 3 requests per hour
 * Prevents email bombing
 */
export const passwordResetLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  prefix: 'ratelimit:auth:reset',
  analytics: true,
});

/**
 * Chat API: 30 requests per minute
 * Balances UX with cost control for AI calls
 */
export const chatLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'ratelimit:api:chat',
  analytics: true,
});

/**
 * Voice Order: 10 requests per minute
 * Controls voice processing API usage
 */
export const voiceOrderLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'ratelimit:api:voice',
  analytics: true,
});

/**
 * Order Creation: 20 requests per 5 minutes
 * Prevents order spam and duplicate submissions
 */
export const orderCreationLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '5 m'),
  prefix: 'ratelimit:order:create',
  analytics: true,
});

/**
 * Search: 60 requests per minute
 * Standard rate for search endpoints
 */
export const searchLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  prefix: 'ratelimit:api:search',
  analytics: true,
});

// ============================================
// Helper Types & Functions
// ============================================

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for a given identifier
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<RateLimitResult> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier);
  return { success, limit, remaining, reset };
}

/**
 * Get client identifier from request
 * Combines IP with optional user ID for more precise limiting
 */
export function getClientIdentifier(request: Request, userId?: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfIp = request.headers.get('cf-connecting-ip');

  const ip = forwarded?.split(',')[0]?.trim() || realIp?.trim() || cfIp || 'unknown';

  return userId ? `${ip}:${userId}` : ip;
}

/**
 * Create rate limit headers for response
 */
export function rateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.reset.toString());
  return headers;
}

/**
 * Create standard rate limit error response (429)
 */
export function rateLimitErrorResponse(result: RateLimitResult): Response {
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      message_ar: `تم تجاوز الحد المسموح. حاول مرة أخرى بعد ${retryAfter} ثانية.`,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        ...Object.fromEntries(rateLimitHeaders(result)),
      },
    }
  );
}

// ============================================
// Limiter Registry (for dynamic access)
// ============================================

export const limiters = {
  otpSend: otpSendLimiter,
  otpVerify: otpVerifyLimiter,
  login: loginLimiter,
  passwordReset: passwordResetLimiter,
  chat: chatLimiter,
  voiceOrder: voiceOrderLimiter,
  orderCreation: orderCreationLimiter,
  search: searchLimiter,
} as const;

export type LimiterType = keyof typeof limiters;

/**
 * Get limiter by type name
 */
export function getLimiter(type: LimiterType): Ratelimit {
  return limiters[type];
}

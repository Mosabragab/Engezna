/**
 * Simple in-memory rate limiter for OTP and authentication endpoints
 * In production, consider using Redis for distributed rate limiting
 */

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blockedUntil: number | null;
}

// Store rate limit data in memory (per-instance)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  const oneHourAgo = now - 60 * 60 * 1000;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.firstAttempt < oneHourAgo && (!entry.blockedUntil || entry.blockedUntil < now)) {
      rateLimitStore.delete(key);
    }
  }
}

interface RateLimitConfig {
  maxAttempts: number; // Maximum attempts allowed
  windowMs: number; // Time window in milliseconds
  blockDurationMs: number; // How long to block after exceeding limit
}

interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterMs: number | null;
  message: string;
}

/**
 * Check rate limit for a given identifier (e.g., IP + phone/email combination)
 */
export function checkRateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  cleanupExpiredEntries();

  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Check if currently blocked
  if (entry?.blockedUntil && now < entry.blockedUntil) {
    const retryAfterMs = entry.blockedUntil - now;
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterMs,
      message: `Too many attempts. Please try again in ${Math.ceil(retryAfterMs / 1000)} seconds.`,
    };
  }

  // If no entry or window has passed, create new entry
  if (!entry || now - entry.firstAttempt > config.windowMs) {
    rateLimitStore.set(identifier, {
      count: 1,
      firstAttempt: now,
      blockedUntil: null,
    });
    return {
      allowed: true,
      remainingAttempts: config.maxAttempts - 1,
      retryAfterMs: null,
      message: 'OK',
    };
  }

  // Increment count
  entry.count++;

  // Check if limit exceeded
  if (entry.count > config.maxAttempts) {
    entry.blockedUntil = now + config.blockDurationMs;
    rateLimitStore.set(identifier, entry);

    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterMs: config.blockDurationMs,
      message: `Too many attempts. Please try again in ${Math.ceil(config.blockDurationMs / 1000)} seconds.`,
    };
  }

  rateLimitStore.set(identifier, entry);

  return {
    allowed: true,
    remainingAttempts: config.maxAttempts - entry.count,
    retryAfterMs: null,
    message: 'OK',
  };
}

/**
 * Reset rate limit for an identifier (e.g., after successful verification)
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Get rate limit identifier from IP and target (phone/email)
 */
export function getRateLimitKey(ip: string, target: string, action: string): string {
  return `${action}:${ip}:${target}`;
}

// Pre-configured rate limiters for common use cases

/**
 * OTP Send rate limit: 5 attempts per 10 minutes, block for 30 minutes
 */
export const OTP_SEND_LIMIT: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 10 * 60 * 1000, // 10 minutes
  blockDurationMs: 30 * 60 * 1000, // 30 minutes block
};

/**
 * OTP Verify rate limit: 5 attempts per 5 minutes, block for 15 minutes
 */
export const OTP_VERIFY_LIMIT: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 5 * 60 * 1000, // 5 minutes
  blockDurationMs: 15 * 60 * 1000, // 15 minutes block
};

/**
 * Login rate limit: 10 attempts per 15 minutes, block for 30 minutes
 */
export const LOGIN_LIMIT: RateLimitConfig = {
  maxAttempts: 10,
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 30 * 60 * 1000, // 30 minutes block
};

/**
 * Password reset rate limit: 3 attempts per hour, block for 1 hour
 */
export const PASSWORD_RESET_LIMIT: RateLimitConfig = {
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 60 * 60 * 1000, // 1 hour block
};

/**
 * Security Module
 *
 * Centralized security utilities for the Engezna application.
 */

// CSRF Protection
export {
  generateCsrfToken,
  setCsrfCookie,
  getCsrfTokenFromCookie,
  getCsrfTokenFromHeader,
  validateCsrfToken,
  requiresCsrfProtection,
  withCsrf,
  getOrCreateCsrfToken,
  isCsrfExempt,
} from './csrf';

// XSS Sanitization
export {
  escapeHtml,
  unescapeHtml,
  stripHtml,
  sanitizeHtml,
  sanitizeUrl,
  sanitizeObject,
  sanitizeInput,
  containsDangerousContent,
  type SanitizeInputOptions,
} from './xss';

// Rate Limiting Middleware
export {
  withRateLimit,
  withSecurity,
  getClientIp,
  checkGlobalRateLimit,
  createRateLimitHeaders,
  resetGlobalRateLimit,
  clearAllRateLimits,
  RATE_LIMIT_CONFIGS,
  type RateLimitConfig,
  type RateLimitResult,
} from './rate-limit-middleware';

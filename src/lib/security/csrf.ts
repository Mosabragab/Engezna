import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * CSRF Protection Module
 *
 * Implements Double Submit Cookie pattern for CSRF protection.
 * - Server generates a random token and sets it as an HttpOnly cookie
 * - Client must send the same token in a header (X-CSRF-Token)
 * - Server validates that both values match
 */

const CSRF_COOKIE_NAME = '__csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure random token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Set CSRF token cookie in the response
 */
export function setCsrfCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JavaScript for Double Submit Cookie pattern
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
  return response;
}

/**
 * Get CSRF token from request cookie
 */
export function getCsrfTokenFromCookie(request: NextRequest): string | null {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value ?? null;
}

/**
 * Get CSRF token from request header
 */
export function getCsrfTokenFromHeader(request: NextRequest): string | null {
  return request.headers.get(CSRF_HEADER_NAME);
}

/**
 * Validate CSRF token - compare cookie and header values
 */
export function validateCsrfToken(request: NextRequest): boolean {
  const cookieToken = getCsrfTokenFromCookie(request);
  const headerToken = getCsrfTokenFromHeader(request);

  // Both must be present and match
  if (!cookieToken || !headerToken) {
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(cookieToken, headerToken);
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Methods that require CSRF protection
 */
const CSRF_PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Check if request method requires CSRF protection
 */
export function requiresCsrfProtection(request: NextRequest): boolean {
  return CSRF_PROTECTED_METHODS.includes(request.method.toUpperCase());
}

/**
 * CSRF Middleware - validates token for state-changing requests
 *
 * Usage in API route:
 * ```ts
 * import { withCsrf } from '@/lib/security/csrf';
 *
 * export const POST = withCsrf(async (request) => {
 *   // Handler logic
 * });
 * ```
 */
export function withCsrf(
  handler: (request: NextRequest, context?: unknown) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: unknown): Promise<NextResponse> => {
    // Skip CSRF check for safe methods
    if (!requiresCsrfProtection(request)) {
      return handler(request, context);
    }

    // Validate CSRF token
    if (!validateCsrfToken(request)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CSRF_VALIDATION_FAILED',
            message: 'Invalid or missing CSRF token',
          },
        },
        { status: 403 }
      );
    }

    return handler(request, context);
  };
}

/**
 * Get or create CSRF token for server components
 * Use this in layouts to ensure token is set
 */
export async function getOrCreateCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  let token = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!token) {
    token = generateCsrfToken();
    // Note: In Server Components, setting cookies requires Server Actions
    // The token will be set via middleware or API route
  }

  return token;
}

/**
 * API endpoint paths that should skip CSRF validation
 * (e.g., webhooks, public APIs)
 */
const CSRF_EXEMPT_PATHS = [
  '/api/webhooks/',
  '/api/public/',
  '/api/health',
  '/api/payment/kashier/webhook', // Kashier payment callbacks
  '/api/payment/kashier/refund-webhook', // Kashier refund callbacks
  '/api/cron/', // Vercel cron jobs (protected by CRON_SECRET)
  '/api/auth/', // Auth callbacks from Supabase
];

/**
 * Check if path is exempt from CSRF validation
 */
export function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PATHS.some((path) => pathname.startsWith(path));
}

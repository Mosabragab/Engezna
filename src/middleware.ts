import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';
import { updateSession } from '@/lib/supabase/middleware';
import { NextRequest, NextResponse } from 'next/server';
import {
  generateCsrfToken,
  setCsrfCookie,
  getCsrfTokenFromCookie,
  validateCsrfToken,
  requiresCsrfProtection,
  isCsrfExempt,
} from '@/lib/security/csrf';

// Create the internationalization middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeDetection: false, // Disable browser language detection - always use Arabic by default
});

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ─── API Routes: CSRF validation ────────────────────────────────────────
  // Phase 1: Log-only mode (like CSP report-only) - monitors without blocking
  // Phase 2: Set CSRF_ENFORCE=true in env vars to block invalid requests
  if (pathname.startsWith('/api/')) {
    if (requiresCsrfProtection(request) && !isCsrfExempt(pathname)) {
      if (!validateCsrfToken(request)) {
        const enforce = process.env.CSRF_ENFORCE === 'true';
        if (enforce) {
          return NextResponse.json({ error: 'Invalid or missing CSRF token' }, { status: 403 });
        }
        // Log-only mode: let the request through but flag the violation
        const response = NextResponse.next();
        response.headers.set('X-CSRF-Warning', 'missing-or-invalid-token');
        return response;
      }
    }
    return NextResponse.next();
  }

  // ─── Page Routes: Auth + i18n + CSRF cookie ────────────────────────────

  // First, handle Supabase session refresh and auth checks
  const supabaseResponse = await updateSession(request);

  // IMPORTANT: If updateSession returned a redirect, use it immediately
  // This ensures auth redirects (login required, unauthorized) are respected
  if (supabaseResponse.status === 307 || supabaseResponse.status === 302) {
    return supabaseResponse;
  }

  // Then apply internationalization
  const intlResponse = intlMiddleware(request);

  // Merge headers from both responses (keep Supabase auth cookies)
  supabaseResponse.headers.forEach((value, key) => {
    intlResponse.headers.set(key, value);
  });

  // Merge cookies from both responses
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value);
  });

  // Set CSRF cookie if not already present
  const existingToken = getCsrfTokenFromCookie(request);
  if (!existingToken) {
    const csrfToken = generateCsrfToken();
    setCsrfCookie(intlResponse, csrfToken);
  }

  return intlResponse;
}

export const config = {
  // Include API routes for CSRF validation
  matcher: ['/', '/(ar|en)/:path*', '/api/:path*', '/((?!_next|_vercel|.*\\..*).*)'],
};

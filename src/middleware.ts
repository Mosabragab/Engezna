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
  // Enforced: blocks requests without valid CSRF token (Double Submit Cookie)
  // Set CSRF_ENFORCE=false to revert to log-only mode for debugging
  if (pathname.startsWith('/api/')) {
    if (requiresCsrfProtection(request) && !isCsrfExempt(pathname)) {
      if (!validateCsrfToken(request)) {
        const enforce = process.env.CSRF_ENFORCE !== 'false';
        if (enforce) {
          return NextResponse.json({ error: 'Invalid or missing CSRF token' }, { status: 403 });
        }
        // Log-only fallback mode (set CSRF_ENFORCE=false to enable)
        const response = NextResponse.next();
        response.headers.set('X-CSRF-Warning', 'missing-or-invalid-token');
        return response;
      }
    }
    return NextResponse.next();
  }

  // ─── Page Routes: Auth + i18n + CSRF cookie ────────────────────────────

  // ─── Performance: Skip auth for public-only pages ─────────────────────
  // Pages like /welcome, /about, /privacy, /terms, /offline never need auth.
  // Skipping updateSession() for these saves 200-800ms TTFB per request
  // by avoiding the Supabase Auth HTTP round-trip.
  const pathWithoutLocale = pathname.replace(/^\/(ar|en)/, '') || '/';
  const publicOnlyPages = [
    '/welcome',
    '/about',
    '/privacy',
    '/terms',
    '/offline',
    '/maintenance',
    '/contact',
    '/handle',
  ];
  const isPublicOnlyPage = publicOnlyPages.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(p + '/')
  );

  // ─── Guest Location Check (before auth, for faster redirect) ──────────
  // Without this, the server renders the homepage skeleton and the client
  // redirects after hydration, causing a visible flash for new visitors.
  const isHomePage = pathname === '/' || /^\/(ar|en)\/?$/.test(pathname);
  if (isHomePage) {
    const hasLocation = request.cookies.get('engezna_has_location');
    if (!hasLocation) {
      // Don't redirect authenticated users — client-side handles their case
      const hasAuth = request.cookies
        .getAll()
        .some((c) => c.name.startsWith('sb-') && c.name.includes('auth'));
      if (!hasAuth) {
        const locale = pathname.startsWith('/en') ? 'en' : defaultLocale;
        return NextResponse.redirect(new URL(`/${locale}/welcome`, request.url));
      }
    }
  }

  // For public-only pages: skip Supabase auth entirely (saves ~500ms TTFB)
  if (isPublicOnlyPage) {
    const intlResponse = intlMiddleware(request);

    // Set CSRF cookie if not already present
    const existingToken = getCsrfTokenFromCookie(request);
    if (!existingToken) {
      const csrfToken = generateCsrfToken();
      setCsrfCookie(intlResponse, csrfToken);
    }

    return intlResponse;
  }

  // For pages that may need auth: handle Supabase session refresh
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

import createMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { locales, defaultLocale } from '@/i18n/config'
import { updateSession } from '@/lib/supabase/middleware'

// Create the next-intl middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always', // Always use locale prefix in URLs
})

export async function middleware(request: NextRequest) {
  // First, handle locale routing with next-intl
  const response = intlMiddleware(request)

  // Then update Supabase session
  // We need to pass the response from intl middleware to maintain locale routing
  const supabaseResponse = await updateSession(request)

  // Merge cookies from both middlewares
  response.cookies.getAll().forEach(cookie => {
    supabaseResponse.cookies.set(cookie)
  })

  return supabaseResponse
}

export const config = {
  // Match all pathnames except for
  // - API routes
  // - _next (Next.js internals)
  // - _static (inside /public)
  // - favicon.ico, sitemap.xml, robots.txt (public files)
  matcher: ['/((?!api|_next|_static|.*\\..*).*)']
}

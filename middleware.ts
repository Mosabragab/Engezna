import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Define locales directly
const locales = ['ar', 'en'] as const
const defaultLocale = 'ar'

// Define protected and auth routes
const protectedRoutes = ['/checkout', '/orders', '/profile', '/_customer', '/_provider', '/_admin']
const authRoutes = ['/auth/login', '/auth/signup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and API routes early
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check if pathname has a locale prefix
  const pathnameHasLocale = locales.some(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  // Redirect to default locale if no locale in path
  if (!pathnameHasLocale) {
    const url = request.nextUrl.clone()
    url.pathname = `/${defaultLocale}${pathname}`
    return NextResponse.redirect(url)
  }

  // Extract locale from pathname
  const pathnameLocale = locales.find(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  ) || defaultLocale

  // Get path without locale
  const pathWithoutLocale = pathname.replace(`/${pathnameLocale}`, '') || '/'

  // Check if this is a protected or auth route
  const isProtectedRoute = protectedRoutes.some(route => pathWithoutLocale.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathWithoutLocale.startsWith(route))

  // Only check auth for protected/auth routes to minimize Supabase calls
  if (isProtectedRoute || isAuthRoute) {
    try {
      // Create Supabase client
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) => {
                request.cookies.set(name, value)
              })
            },
          },
        }
      )

      const { data: { user } } = await supabase.auth.getUser()

      // Redirect to login if accessing protected route without auth
      if (isProtectedRoute && !user) {
        const loginUrl = new URL(`/${pathnameLocale}/auth/login`, request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
      }

      // Redirect to home if logged in user tries to access auth pages
      if (isAuthRoute && user) {
        return NextResponse.redirect(new URL(`/${pathnameLocale}`, request.url))
      }
    } catch (error) {
      // If Supabase fails, allow the request to continue
      console.error('Middleware auth check failed:', error)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}

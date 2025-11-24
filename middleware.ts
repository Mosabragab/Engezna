import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import createMiddleware from 'next-intl/middleware'

// Define locales directly to avoid import issues
const locales = ['ar', 'en'] as const
const defaultLocale = 'ar'

// Create the next-intl middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always'
})

export async function middleware(request: NextRequest) {
  // First, handle internationalization
  const intlResponse = intlMiddleware(request)
  
  // Create a response that we can modify
  let response = intlResponse || NextResponse.next({ request })

  // Create Supabase client for session management
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Set cookies on the request
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Create a new response with the updated request
          response = intlResponse 
            ? NextResponse.next({
                request,
                headers: intlResponse.headers,
              })
            : NextResponse.next({ request })
          // Set cookies on the response
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: This refreshes the session and must be called
  // Do not add any logic between createServerClient and supabase.auth.getUser()
  const { data: { user } } = await supabase.auth.getUser()

  // Get the pathname from the request
  const { pathname } = request.nextUrl
  
  // Extract locale from pathname
  const pathnameLocale = locales.find(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  ) || defaultLocale

  // DEBUG: Log what's happening
  console.log('🔍 Middleware Debug:', {
    pathname,
    pathnameLocale,
    hasUser: !!user,
    userEmail: user?.email,
    userID: user?.id
  })

  // Define protected routes (routes that require authentication)
  const protectedRoutes = [
    '/checkout',
    '/orders',
    '/profile',
    '/_customer',
    '/_provider',
    '/_admin',
  ]

  // Check if current path (without locale) is protected
  const pathWithoutLocale = pathname.replace(`/${pathnameLocale}`, '') || '/'
  const isProtectedRoute = protectedRoutes.some(route => 
    pathWithoutLocale.startsWith(route)
  )

  // If trying to access protected route without being logged in, redirect to login
  if (isProtectedRoute && !user) {
    const loginUrl = new URL(`/${pathnameLocale}/auth/login`, request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If logged in user tries to access auth pages, redirect to home
  const authRoutes = ['/auth/login', '/auth/signup']
  const isAuthRoute = authRoutes.some(route => 
    pathWithoutLocale.startsWith(route)
  )
  
  if (isAuthRoute && user) {
    console.log('❌ Redirecting logged-in user away from auth page:', { pathname, userEmail: user.email })
    return NextResponse.redirect(new URL(`/${pathnameLocale}`, request.url))
  }

  // Copy over intl headers if present
  if (intlResponse) {
    intlResponse.headers.forEach((value, key) => {
      response.headers.set(key, value)
    })
  }

  return response
}

export const config = {
  // Match all pathnames except static files and API routes
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

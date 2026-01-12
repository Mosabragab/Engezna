import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Creates a Supabase client for middleware operations
 * This handles session refresh and cookie management in middleware
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase is not configured, skip authentication checks
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables missing in middleware')
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Extract locale from pathname (e.g., /ar/admin -> ar)
  const pathname = request.nextUrl.pathname
  const localeMatch = pathname.match(/^\/(ar|en)/)
  const locale = localeMatch ? localeMatch[1] : 'ar'

  // Define protected routes that require authentication
  const protectedPatterns = [
    '/admin',       // Admin dashboard and all sub-routes
    '/provider',    // Provider dashboard (except /provider/login)
    '/checkout',    // Checkout page
    '/profile',     // Profile pages
    '/orders',      // Order history (except viewing confirmation)
  ]

  // Define public routes that don't require authentication
  const publicPatterns = [
    '/auth',
    '/admin/login',     // Admin login page - must be public!
    '/provider/login',
    '/provider/register',
    '/partner',
    '/payment-result',  // CRITICAL: Allow payment callbacks without auth redirect
    '/confirmation',    // Order confirmation page
  ]

  // Check if the current path is protected
  const isProtectedRoute = protectedPatterns.some(pattern =>
    pathname.includes(pattern)
  )

  // Check if the current path is explicitly public
  const isPublicRoute = publicPatterns.some(pattern =>
    pathname.includes(pattern)
  )

  // Redirect unauthenticated users from protected routes
  if (!user && isProtectedRoute && !isPublicRoute) {
    const url = request.nextUrl.clone()

    // Redirect to appropriate login page
    if (pathname.includes('/admin')) {
      url.pathname = `/${locale}/admin/login`
    } else if (pathname.includes('/provider')) {
      url.pathname = `/${locale}/provider/login`
    } else {
      url.pathname = `/${locale}/auth/login`
    }

    // Add redirect parameter to return after login
    url.searchParams.set('redirect', pathname)

    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

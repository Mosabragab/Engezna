import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * User roles as defined in the database
 */
type UserRole = 'customer' | 'provider_owner' | 'provider_staff' | 'admin';

/**
 * Creates a Supabase client for middleware operations
 * This handles session refresh, cookie management, and role-based access control
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured, skip authentication checks
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables missing in middleware');
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Extract locale from pathname (e.g., /ar/admin -> ar)
  const pathname = request.nextUrl.pathname;
  const localeMatch = pathname.match(/^\/(ar|en)/);
  const locale = localeMatch ? localeMatch[1] : 'ar';

  // Define protected routes that require authentication
  const protectedPatterns = [
    '/admin', // Admin dashboard and all sub-routes
    '/provider', // Provider dashboard (except /provider/login)
    '/checkout', // Checkout page
    '/profile', // Profile pages
    '/orders', // Order history (except viewing confirmation)
  ];

  // Define public routes that don't require authentication
  const publicPatterns = [
    '/auth',
    '/admin/login', // Admin login page - must be public!
    '/provider/login',
    '/provider/register',
    '/partner',
    '/payment-result', // CRITICAL: Allow payment callbacks without auth redirect
    '/confirmation', // Order confirmation page
  ];

  // Check if the current path is protected
  const isProtectedRoute = protectedPatterns.some((pattern) => pathname.includes(pattern));

  // Check if the current path is explicitly public
  const isPublicRoute = publicPatterns.some((pattern) => pathname.includes(pattern));

  // Helper function to create redirect response
  const createRedirect = (redirectPath: string) => {
    const url = request.nextUrl.clone();
    url.pathname = redirectPath;
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  };

  // Redirect unauthenticated users from protected routes
  if (!user && isProtectedRoute && !isPublicRoute) {
    // Redirect to appropriate login page
    if (pathname.includes('/admin')) {
      return createRedirect(`/${locale}/admin/login`);
    } else if (pathname.includes('/provider')) {
      return createRedirect(`/${locale}/provider/login`);
    } else {
      return createRedirect(`/${locale}/auth/login`);
    }
  }

  // ============================================================================
  // ROLE-BASED ACCESS CONTROL (RBAC)
  // ============================================================================
  // If user is authenticated, check their role for admin/provider routes
  if (user && !isPublicRoute) {
    // Get user role from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole: UserRole | null = profile?.role as UserRole | null;

    // Check admin routes - only 'admin' role allowed
    if (pathname.includes('/admin') && !pathname.includes('/admin/login')) {
      if (userRole !== 'admin') {
        console.warn(
          `[RBAC] User ${user.id} with role '${userRole}' tried to access admin route: ${pathname}`
        );
        return createRedirect(`/${locale}/admin/login`);
      }
    }

    // Check provider routes - only 'provider_owner' and 'provider_staff' allowed
    if (
      pathname.includes('/provider') &&
      !pathname.includes('/provider/login') &&
      !pathname.includes('/provider/register')
    ) {
      if (userRole !== 'provider_owner' && userRole !== 'provider_staff') {
        console.warn(
          `[RBAC] User ${user.id} with role '${userRole}' tried to access provider route: ${pathname}`
        );
        return createRedirect(`/${locale}/provider/login`);
      }
    }
  }

  return supabaseResponse;
}

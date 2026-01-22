import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * User roles as defined in the database
 */
type UserRole = 'customer' | 'provider_owner' | 'provider_staff' | 'admin';

/**
 * Check if maintenance mode is enabled
 * Returns cached result for 30 seconds to reduce DB queries
 */
let maintenanceCache: { enabled: boolean; timestamp: number } | null = null;
const CACHE_DURATION = 30000; // 30 seconds

async function checkMaintenanceMode(
  supabase: ReturnType<typeof createServerClient>
): Promise<boolean> {
  // Return cached result if still valid
  if (maintenanceCache && Date.now() - maintenanceCache.timestamp < CACHE_DURATION) {
    return maintenanceCache.enabled;
  }

  try {
    const { data } = await supabase.from('platform_settings').select('maintenance_mode').single();

    const isEnabled = data?.maintenance_mode === true;
    maintenanceCache = { enabled: isEnabled, timestamp: Date.now() };
    return isEnabled;
  } catch {
    // If query fails, assume not in maintenance mode
    return false;
  }
}

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

  // ============================================================================
  // MAINTENANCE MODE CHECK (Kill Switch)
  // ============================================================================
  // Skip maintenance check for:
  // - Admin routes (so admins can disable maintenance mode)
  // - Maintenance page itself
  // - API routes
  // - Static files
  const pathWithoutLocaleForMaintenance = pathname.replace(/^\/(ar|en)/, '');
  const isAdminRoute = pathWithoutLocaleForMaintenance.startsWith('/admin');
  const isMaintenancePage = pathWithoutLocaleForMaintenance === '/maintenance';
  const isApiRoute = pathname.startsWith('/api');
  const isStaticFile = pathname.includes('.');

  if (!isAdminRoute && !isMaintenancePage && !isApiRoute && !isStaticFile) {
    const isMaintenanceMode = await checkMaintenanceMode(supabase);
    if (isMaintenanceMode) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/maintenance`;
      return NextResponse.redirect(url);
    }
  }

  // Continue with auth checks

  // Remove locale prefix for easier pattern matching (reuse pathWithoutLocaleForMaintenance)
  const pathWithoutLocale = pathWithoutLocaleForMaintenance;

  // Define protected routes that require authentication
  // IMPORTANT: Use specific patterns to avoid matching public routes like /providers
  // NOTE: /checkout is NOT here - it's public so users can see totals, discount codes, etc.
  // The checkout PAGE handles requiring login for completing the order
  const protectedPatterns = [
    '/admin', // Admin dashboard and all sub-routes (but not /admin/login)
    '/provider/', // Provider dashboard routes (note: trailing slash to NOT match /providers)
    '/profile', // Profile pages (except /profile/governorate and /profile/city which are public)
    '/orders', // Order history
  ];

  // Define public routes that don't require authentication
  const publicPatterns = [
    '/auth',
    '/admin/login',
    '/admin/register', // Admin invitation acceptance - must be public for new admins to register
    '/provider/login',
    '/provider/register',
    '/provider/join', // Staff invitation acceptance - must be public for new staff to register
    '/partner',
    '/providers', // PUBLIC: List of all providers/stores
    '/payment-result',
    '/confirmation',
    '/welcome', // Welcome/onboarding page
    '/', // Home page
    // Location selection - must be public for users to browse stores in their city
    '/profile/governorate',
    '/profile/city',
    // Checkout page is PUBLIC so users can see:
    // - Total amount
    // - Discount code field
    // - Address field
    // The page itself shows login requirement for completing the order
    '/checkout',
  ];

  // Helper function to check if path matches protected patterns
  const isProtectedRoute = protectedPatterns.some((pattern) => {
    if (pattern === '/provider/') {
      // Special handling: match /provider but NOT /providers
      return pathWithoutLocale === '/provider' || pathWithoutLocale.startsWith('/provider/');
    }
    return pathWithoutLocale.startsWith(pattern);
  });

  // Check if the current path is explicitly public
  const isPublicRoute = publicPatterns.some((pattern) => {
    if (pattern === '/') {
      return pathWithoutLocale === '' || pathWithoutLocale === '/';
    }
    return pathWithoutLocale.startsWith(pattern);
  });

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
    if (pathWithoutLocale.startsWith('/admin')) {
      return createRedirect(`/${locale}/admin/login`);
    } else if (pathWithoutLocale === '/provider' || pathWithoutLocale.startsWith('/provider/')) {
      return createRedirect(`/${locale}/provider/login`);
    } else {
      return createRedirect(`/${locale}/auth/login`);
    }
  }

  // ============================================================================
  // ROLE-BASED ACCESS CONTROL (RBAC)
  // ============================================================================
  // If user is authenticated, check their role for admin/provider routes
  if (user && !isPublicRoute && isProtectedRoute) {
    // Get user role from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole: UserRole | null = profile?.role as UserRole | null;

    // Check admin routes - only 'admin' role allowed
    if (pathWithoutLocale.startsWith('/admin') && !pathWithoutLocale.startsWith('/admin/login')) {
      if (userRole !== 'admin') {
        console.warn(
          `[RBAC] User ${user.id} with role '${userRole}' tried to access admin route: ${pathname}`
        );
        return createRedirect(`/${locale}/admin/login`);
      }
    }

    // Check provider dashboard routes - only 'provider_owner' and 'provider_staff' allowed
    // NOTE: /providers (public list) is NOT protected, only /provider (dashboard) is
    const isProviderDashboard =
      pathWithoutLocale === '/provider' || pathWithoutLocale.startsWith('/provider/');
    const isProviderPublicPage =
      pathWithoutLocale.startsWith('/provider/login') ||
      pathWithoutLocale.startsWith('/provider/register');

    if (isProviderDashboard && !isProviderPublicPage) {
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

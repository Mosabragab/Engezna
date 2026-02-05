import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

/**
 * User roles as defined in the database
 */
type UserRole = 'customer' | 'provider_owner' | 'provider_staff' | 'admin';

/**
 * Maintenance mode settings structure from app_settings table
 */
interface MaintenanceSettings {
  providers_maintenance: boolean;
  customers_maintenance: boolean;
  maintenance_message_ar?: string;
  maintenance_message_en?: string;
}

/**
 * Get maintenance settings from cache or database
 * Returns cached result for 30 seconds to reduce DB queries
 *
 * Note: Reads from app_settings table (setting_key = 'maintenance_settings')
 * which stores separate flags for providers and customers maintenance
 */
let maintenanceCache: { settings: MaintenanceSettings | null; timestamp: number } | null = null;
const CACHE_DURATION = 30000; // 30 seconds

async function getMaintenanceSettings(
  supabase: ReturnType<typeof createServerClient>
): Promise<MaintenanceSettings | null> {
  // Return cached result if still valid
  if (maintenanceCache && Date.now() - maintenanceCache.timestamp < CACHE_DURATION) {
    return maintenanceCache.settings;
  }

  try {
    // Read from app_settings table (new unified settings system)
    const { data } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'maintenance_settings')
      .single();

    const settings = data?.setting_value as MaintenanceSettings | null;
    maintenanceCache = { settings, timestamp: Date.now() };

    return settings;
  } catch {
    // If query fails, assume not in maintenance mode
    maintenanceCache = { settings: null, timestamp: Date.now() };
    return null;
  }
}

/**
 * Maintenance mode type based on the route being accessed
 */
type MaintenanceType = 'customers' | 'providers' | 'none';

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

  // Collect request context for error reporting
  const requestContext = {
    path: request.nextUrl.pathname,
    method: request.method,
    locale: request.nextUrl.pathname.match(/^\/(ar|en)/)?.[1] || 'ar',
    userAgent: request.headers.get('user-agent') || 'unknown',
    // Cookie names only (not values) for debugging session issues
    cookieNames: request.cookies.getAll().map((c) => c.name),
    hasAuthCookie: request.cookies.getAll().some((c) => c.name.includes('auth')),
  };

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    user = data?.user ?? null;

    // Capture auth errors to Sentry for monitoring
    if (error) {
      // Add breadcrumb for auth flow tracking
      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Auth error in middleware',
        level: 'error',
        data: {
          errorCode: error.code,
          errorMessage: error.message,
          ...requestContext,
        },
      });

      // Capture the error with context
      Sentry.captureException(error, {
        tags: {
          source: 'middleware',
          errorType: 'auth_error',
          authErrorCode: error.code || 'unknown',
          locale: requestContext.locale,
          hasAuthCookie: String(requestContext.hasAuthCookie),
        },
        extra: {
          ...requestContext,
          errorCode: error.code,
          errorMessage: error.message,
        },
      });
    }
  } catch (authError) {
    // Capture unexpected auth errors (network issues, etc.)
    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'Unexpected auth error in middleware',
      level: 'error',
      data: {
        ...requestContext,
        error: authError instanceof Error ? authError.message : String(authError),
      },
    });

    Sentry.captureException(authError, {
      tags: {
        source: 'middleware',
        errorType: 'auth_exception',
        locale: requestContext.locale,
        hasAuthCookie: String(requestContext.hasAuthCookie),
      },
      extra: {
        ...requestContext,
        errorName: authError instanceof Error ? authError.name : 'unknown',
      },
    });

    // User remains null on error, allowing graceful degradation
  }

  // Extract locale from pathname (e.g., /ar/admin -> ar)
  const pathname = request.nextUrl.pathname;
  const localeMatch = pathname.match(/^\/(ar|en)/);
  const locale = localeMatch ? localeMatch[1] : 'ar';

  // ============================================================================
  // MAINTENANCE MODE CHECK (Kill Switch)
  // ============================================================================
  // Separate maintenance modes:
  // - customers_maintenance: blocks public pages (home, stores, products, checkout)
  // - providers_maintenance: blocks provider dashboard (/provider/*)
  // - Admin routes are NEVER blocked (so admins can always manage the platform)
  //
  // Routes that are never blocked:
  // - Admin routes (/admin/*) - admins must always have access
  // - Maintenance page itself (/maintenance)
  // - Auth/Login pages - so users can still log in
  // - API routes
  // - Static files

  const pathWithoutLocaleForMaintenance = pathname.replace(/^\/(ar|en)/, '');
  const isAdminRoute = pathWithoutLocaleForMaintenance.startsWith('/admin');
  const isMaintenancePage = pathWithoutLocaleForMaintenance === '/maintenance';
  const isApiRoute = pathname.startsWith('/api');
  const isStaticFile = pathname.includes('.');
  const isAuthPage =
    pathWithoutLocaleForMaintenance.startsWith('/auth') ||
    pathWithoutLocaleForMaintenance.startsWith('/provider/login') ||
    pathWithoutLocaleForMaintenance.startsWith('/provider/register');

  // Determine which type of maintenance to check
  const isProviderRoute =
    pathWithoutLocaleForMaintenance === '/provider' ||
    (pathWithoutLocaleForMaintenance.startsWith('/provider/') &&
      !pathWithoutLocaleForMaintenance.startsWith('/provider/login') &&
      !pathWithoutLocaleForMaintenance.startsWith('/provider/register'));

  // Skip maintenance check for admin, auth, api, static files, and maintenance page
  const shouldCheckMaintenance =
    !isAdminRoute && !isMaintenancePage && !isApiRoute && !isStaticFile && !isAuthPage;

  if (shouldCheckMaintenance) {
    const maintenanceSettings = await getMaintenanceSettings(supabase);

    if (maintenanceSettings) {
      // Check provider maintenance for provider dashboard routes
      if (isProviderRoute && maintenanceSettings.providers_maintenance) {
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}/maintenance`;
        url.searchParams.set('type', 'provider');
        return NextResponse.redirect(url);
      }

      // Check customer maintenance for public pages (non-provider routes)
      if (!isProviderRoute && maintenanceSettings.customers_maintenance) {
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}/maintenance`;
        url.searchParams.set('type', 'customer');
        return NextResponse.redirect(url);
      }
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

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getDashboardStats,
  getOrdersTimeSeries,
  getRevenueTimeSeries,
  getOrdersByCategory,
  getStatsByGovernorate,
  getPendingProvidersCount,
  getTodayOrdersCount,
  getTodayRevenue,
} from '@/lib/admin/statistics';
import type { StatsFilters } from '@/lib/admin/types';
import { withErrorHandler, successResponse } from '@/lib/api/error-handler';
import { AuthenticationError, AuthorizationError, ValidationError } from '@/lib/errors';

/**
 * API Route for Admin Statistics
 * POST /api/admin/stats
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Verify authentication and admin role
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthenticationError('Unauthorized');
  }

  // Get user role from profiles table
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userError || userData?.role !== 'admin') {
    throw AuthorizationError.adminOnly();
  }

  const body = await request.json();
  const { action, filters = {} } = body;

  switch (action) {
    case 'dashboard': {
      const result = await getDashboardStats(filters as StatsFilters);
      return NextResponse.json(result);
    }

    case 'ordersTimeSeries': {
      const result = await getOrdersTimeSeries(filters as StatsFilters);
      return NextResponse.json(result);
    }

    case 'revenueTimeSeries': {
      const result = await getRevenueTimeSeries(filters as StatsFilters);
      return NextResponse.json(result);
    }

    case 'ordersByCategory': {
      const result = await getOrdersByCategory(filters as StatsFilters);
      return NextResponse.json(result);
    }

    case 'byGovernorate': {
      const result = await getStatsByGovernorate();
      return NextResponse.json(result);
    }

    case 'quick': {
      const [pendingResult, ordersResult, revenueResult] = await Promise.all([
        getPendingProvidersCount(),
        getTodayOrdersCount(),
        getTodayRevenue(),
      ]);

      return successResponse({
        pendingProviders: pendingResult.success ? pendingResult.data : 0,
        todayOrders: ordersResult.success ? ordersResult.data : 0,
        todayRevenue: revenueResult.success ? revenueResult.data : 0,
      });
    }

    default:
      throw ValidationError.field('action', 'Unknown action');
  }
});

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

/**
 * API Route for Admin Statistics
 * POST /api/admin/stats
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication and admin role
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role from profiles table
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, filters = {} } = body;

    switch (action) {
      // ───────────────────────────────────────────────────────────────────
      // إحصائيات لوحة التحكم الرئيسية
      // ───────────────────────────────────────────────────────────────────
      case 'dashboard': {
        const result = await getDashboardStats(filters as StatsFilters);
        return NextResponse.json(result);
      }

      // ───────────────────────────────────────────────────────────────────
      // سلسلة زمنية للطلبات
      // ───────────────────────────────────────────────────────────────────
      case 'ordersTimeSeries': {
        const result = await getOrdersTimeSeries(filters as StatsFilters);
        return NextResponse.json(result);
      }

      // ───────────────────────────────────────────────────────────────────
      // سلسلة زمنية للإيرادات
      // ───────────────────────────────────────────────────────────────────
      case 'revenueTimeSeries': {
        const result = await getRevenueTimeSeries(filters as StatsFilters);
        return NextResponse.json(result);
      }

      // ───────────────────────────────────────────────────────────────────
      // إحصائيات حسب الفئة
      // ───────────────────────────────────────────────────────────────────
      case 'ordersByCategory': {
        const result = await getOrdersByCategory(filters as StatsFilters);
        return NextResponse.json(result);
      }

      // ───────────────────────────────────────────────────────────────────
      // إحصائيات حسب المحافظة
      // ───────────────────────────────────────────────────────────────────
      case 'byGovernorate': {
        const result = await getStatsByGovernorate();
        return NextResponse.json(result);
      }

      // ───────────────────────────────────────────────────────────────────
      // إحصائيات سريعة للكروت
      // ───────────────────────────────────────────────────────────────────
      case 'quick': {
        const [pendingResult, ordersResult, revenueResult] = await Promise.all([
          getPendingProvidersCount(),
          getTodayOrdersCount(),
          getTodayRevenue(),
        ]);

        return NextResponse.json({
          success: true,
          data: {
            pendingProviders: pendingResult.success ? pendingResult.data : 0,
            todayOrders: ordersResult.success ? ordersResult.data : 0,
            todayRevenue: revenueResult.success ? revenueResult.data : 0,
          },
        });
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in admin stats API:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

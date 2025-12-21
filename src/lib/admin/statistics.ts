// ═══════════════════════════════════════════════════════════════════════
// إحصائيات لوحة التحكم - Dashboard Statistics
// ═══════════════════════════════════════════════════════════════════════

import { createAdminClient } from '@/lib/supabase/admin';
import type {
  DashboardStats,
  StatsFilters,
  TimeSeriesData,
  CategoryStats,
  RegionalStats,
  OperationResult,
} from './types';

// ═══════════════════════════════════════════════════════════════════════
// دوال مساعدة - Helper Functions
// ═══════════════════════════════════════════════════════════════════════

/**
 * حساب نسبة التغيير
 * Calculate percentage change
 */
function calculateChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * الحصول على بداية الشهر الحالي
 * Get start of current month
 */
function getStartOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

/**
 * الحصول على بداية الشهر السابق
 * Get start of previous month
 */
function getStartOfPreviousMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
}

/**
 * الحصول على بداية اليوم
 * Get start of today
 */
function getStartOfToday(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

/**
 * الحصول على بداية الأسبوع (آخر 7 أيام)
 * Get start of week (last 7 days)
 */
function getStartOfWeek(): string {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return weekAgo.toISOString();
}

/**
 * الحصول على بداية الأسبوع السابق
 * Get start of previous week
 */
function getStartOfPreviousWeek(): string {
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  return twoWeeksAgo.toISOString();
}

// ═══════════════════════════════════════════════════════════════════════
// إحصائيات لوحة التحكم الرئيسية
// Dashboard Main Statistics
// ═══════════════════════════════════════════════════════════════════════

/**
 * جلب إحصائيات لوحة التحكم الكاملة
 * Fetch complete dashboard statistics
 */
export async function getDashboardStats(
  filters: StatsFilters = {}
): Promise<OperationResult<DashboardStats>> {
  try {
    const supabase = createAdminClient();
    const { governorateId, cityId } = filters;

    // Date ranges
    const startOfMonth = getStartOfMonth();
    const startOfPreviousMonth = getStartOfPreviousMonth();
    const startOfToday = getStartOfToday();
    const startOfWeek = getStartOfWeek();
    const startOfPreviousWeek = getStartOfPreviousWeek();

    // ───────────────────────────────────────────────────────────────────
    // إحصائيات مقدمي الخدمة - Provider Statistics
    // ───────────────────────────────────────────────────────────────────

    let providersQuery = supabase.from('providers').select('status, created_at');
    if (governorateId) providersQuery = providersQuery.eq('governorate_id', governorateId);
    if (cityId) providersQuery = providersQuery.eq('city_id', cityId);

    const { data: providersData, error: providersError } = await providersQuery;

    if (providersError) {
      console.error('Error fetching providers:', providersError);
      return { success: false, error: providersError.message };
    }

    const providers = providersData || [];
    const providersThisMonth = providers.filter(
      (p) => new Date(p.created_at) >= new Date(startOfMonth)
    );
    const providersLastMonth = providers.filter(
      (p) =>
        new Date(p.created_at) >= new Date(startOfPreviousMonth) &&
        new Date(p.created_at) < new Date(startOfMonth)
    );

    const providerStats = {
      total: providers.length,
      pending: providers.filter(
        (p) => p.status === 'pending_approval' || p.status === 'incomplete'
      ).length,
      approved: providers.filter(
        (p) => p.status === 'approved' || p.status === 'open' || p.status === 'closed' || p.status === 'temporarily_paused' || p.status === 'on_vacation'
      ).length,
      rejected: providers.filter((p) => p.status === 'rejected').length,
      suspended: providers.filter((p) => p.status === 'suspended').length,
      newThisMonth: providersThisMonth.length,
      changePercent: calculateChangePercent(
        providersThisMonth.length,
        providersLastMonth.length
      ),
    };

    // ───────────────────────────────────────────────────────────────────
    // إحصائيات المستخدمين - User Statistics
    // ───────────────────────────────────────────────────────────────────

    // Query from profiles table (not users table)
    const profilesQuery = supabase.from('profiles').select('role, created_at');

    const { data: profilesData, error: profilesError } = await profilesQuery;

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return { success: false, error: profilesError.message };
    }

    const profiles = profilesData || [];
    const customersOnly = profiles.filter((p) => p.role === 'customer');
    const customersToday = customersOnly.filter(
      (p) => new Date(p.created_at) >= new Date(startOfToday)
    );
    const profilesThisMonth = profiles.filter(
      (p) => new Date(p.created_at) >= new Date(startOfMonth)
    );
    const profilesLastMonth = profiles.filter(
      (p) =>
        new Date(p.created_at) >= new Date(startOfPreviousMonth) &&
        new Date(p.created_at) < new Date(startOfMonth)
    );

    const userStats = {
      total: profiles.length,
      active: profiles.length, // All profiles are considered active
      inactive: 0,
      customers: customersOnly.length,
      providers: profiles.filter((p) => p.role === 'provider').length,
      admins: profiles.filter((p) => p.role === 'admin').length,
      newToday: customersToday.length, // عملاء جدد اليوم
      newThisMonth: profilesThisMonth.length,
      changePercent: calculateChangePercent(profilesThisMonth.length, profilesLastMonth.length),
    };

    // ───────────────────────────────────────────────────────────────────
    // إحصائيات الطلبات - Order Statistics
    // ───────────────────────────────────────────────────────────────────

    let ordersQuery = supabase
      .from('orders')
      .select('status, total, platform_commission, created_at');

    // Apply geographic filters through provider
    // Note: For simplicity, we're not filtering orders by geography here
    // In production, you might want to join with providers table

    const { data: ordersData, error: ordersError } = await ordersQuery;

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return { success: false, error: ordersError.message };
    }

    const orders = ordersData || [];
    const completedStatuses = ['delivered', 'completed'];
    const cancelledStatuses = ['cancelled', 'refunded'];

    const ordersToday = orders.filter(
      (o) => new Date(o.created_at) >= new Date(startOfToday)
    );
    const ordersThisWeek = orders.filter(
      (o) => new Date(o.created_at) >= new Date(startOfWeek)
    );
    const ordersLastWeek = orders.filter(
      (o) =>
        new Date(o.created_at) >= new Date(startOfPreviousWeek) &&
        new Date(o.created_at) < new Date(startOfWeek)
    );
    const ordersThisMonth = orders.filter(
      (o) => new Date(o.created_at) >= new Date(startOfMonth)
    );
    const ordersLastMonth = orders.filter(
      (o) =>
        new Date(o.created_at) >= new Date(startOfPreviousMonth) &&
        new Date(o.created_at) < new Date(startOfMonth)
    );

    const orderStats = {
      total: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      completed: orders.filter((o) => completedStatuses.includes(o.status)).length,
      cancelled: orders.filter((o) => cancelledStatuses.includes(o.status)).length,
      todayCount: ordersToday.length,
      thisWeekCount: ordersThisWeek.length,
      thisMonthCount: ordersThisMonth.length,
      weekChangePercent: calculateChangePercent(ordersThisWeek.length, ordersLastWeek.length),
      changePercent: calculateChangePercent(ordersThisMonth.length, ordersLastMonth.length),
    };

    // ───────────────────────────────────────────────────────────────────
    // الإحصائيات المالية - Financial Statistics
    // ───────────────────────────────────────────────────────────────────

    const completedOrders = orders.filter((o) => completedStatuses.includes(o.status));

    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalCommission = completedOrders.reduce(
      (sum, o) => sum + (o.platform_commission || 0),
      0
    );

    const completedOrdersToday = ordersToday.filter((o) =>
      completedStatuses.includes(o.status)
    );
    const completedOrdersThisMonth = ordersThisMonth.filter((o) =>
      completedStatuses.includes(o.status)
    );
    const completedOrdersLastMonth = ordersLastMonth.filter((o) =>
      completedStatuses.includes(o.status)
    );

    const todayRevenue = completedOrdersToday.reduce((sum, o) => sum + (o.total || 0), 0);
    const thisMonthRevenue = completedOrdersThisMonth.reduce(
      (sum, o) => sum + (o.total || 0),
      0
    );
    const lastMonthRevenue = completedOrdersLastMonth.reduce(
      (sum, o) => sum + (o.total || 0),
      0
    );

    // Pending settlement - calculate from actual settlements table
    // Sum of net_payout for settlements that are pending or partially_paid
    let pendingSettlement = 0;
    try {
      const { data: pendingSettlementsData, error: settlementsError } = await supabase
        .from('settlements')
        .select('net_payout')
        .in('status', ['pending', 'partially_paid']);

      if (!settlementsError && pendingSettlementsData) {
        pendingSettlement = pendingSettlementsData.reduce(
          (sum, s) => sum + (s.net_payout || 0),
          0
        );
      }
    } catch (err) {
      console.error('Error fetching pending settlements:', err);
      // Fall back to 0 if there's an error
      pendingSettlement = 0;
    }

    const financeStats = {
      totalRevenue,
      totalCommission,
      pendingSettlement,
      todayRevenue,
      thisMonthRevenue,
      changePercent: calculateChangePercent(thisMonthRevenue, lastMonthRevenue),
    };

    // ───────────────────────────────────────────────────────────────────
    // إحصائيات الدعم - Support Statistics
    // ───────────────────────────────────────────────────────────────────
    let openSupportTickets = 0;
    try {
      const { count, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress']);

      if (!ticketsError && count !== null) {
        openSupportTickets = count;
      }
    } catch (err) {
      console.error('Error fetching support tickets:', err);
      openSupportTickets = 0;
    }

    const supportStats = {
      openTickets: openSupportTickets,
    };

    return {
      success: true,
      data: {
        providers: providerStats,
        users: userStats,
        orders: orderStats,
        finance: financeStats,
        support: supportStats,
      },
    };
  } catch (err) {
    console.error('Error in getDashboardStats:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// إحصائيات حسب الفترة الزمنية
// Time Series Statistics
// ═══════════════════════════════════════════════════════════════════════

/**
 * جلب إحصائيات الطلبات حسب الفترة الزمنية
 * Fetch order statistics over time
 */
export async function getOrdersTimeSeries(
  filters: StatsFilters = {}
): Promise<OperationResult<TimeSeriesData[]>> {
  try {
    const supabase = createAdminClient();
    const { dateFrom, dateTo } = filters;

    // Default to last 30 days
    const endDate = dateTo ? new Date(dateTo) : new Date();
    const startDate = dateFrom
      ? new Date(dateFrom)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('orders')
      .select('created_at, total')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    // Group by date
    const groupedData: Record<string, { count: number; revenue: number }> = {};

    for (const order of data || []) {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      if (!groupedData[date]) {
        groupedData[date] = { count: 0, revenue: 0 };
      }
      groupedData[date].count += 1;
      groupedData[date].revenue += order.total || 0;
    }

    // Convert to array
    const result: TimeSeriesData[] = Object.entries(groupedData).map(([date, data]) => ({
      date,
      value: data.count,
      label: `${data.count} طلبات - ${data.revenue.toLocaleString('ar-EG')} ج.م`,
    }));

    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * جلب إحصائيات الإيرادات حسب الفترة الزمنية
 * Fetch revenue statistics over time
 */
export async function getRevenueTimeSeries(
  filters: StatsFilters = {}
): Promise<OperationResult<TimeSeriesData[]>> {
  try {
    const supabase = createAdminClient();
    const { dateFrom, dateTo } = filters;

    const endDate = dateTo ? new Date(dateTo) : new Date();
    const startDate = dateFrom
      ? new Date(dateFrom)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('orders')
      .select('created_at, total, status')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .in('status', ['delivered', 'completed'])
      .order('created_at', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    // Group by date
    const groupedData: Record<string, number> = {};

    for (const order of data || []) {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      groupedData[date] = (groupedData[date] || 0) + (order.total || 0);
    }

    // Convert to array
    const result: TimeSeriesData[] = Object.entries(groupedData).map(([date, value]) => ({
      date,
      value,
      label: `${value.toLocaleString('ar-EG')} ج.م`,
    }));

    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// إحصائيات حسب الفئة
// Category Statistics
// ═══════════════════════════════════════════════════════════════════════

/**
 * جلب إحصائيات الطلبات حسب الفئة
 * Fetch order statistics by category
 */
export async function getOrdersByCategory(
  filters: StatsFilters = {}
): Promise<OperationResult<CategoryStats[]>> {
  try {
    const supabase = createAdminClient();
    const { dateFrom, dateTo } = filters;

    let query = supabase
      .from('orders')
      .select(
        `
        total,
        provider:providers(category)
      `
      )
      .in('status', ['delivered', 'completed']);

    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    // Group by category
    const categoryData: Record<string, { count: number; revenue: number }> = {};
    let totalRevenue = 0;

    for (const order of data || []) {
      // Handle both array and single object response from Supabase
      const providerData = order.provider;
      const provider = Array.isArray(providerData) ? providerData[0] : providerData;
      const category = (provider as { category: string } | null)?.category || 'other';
      if (!categoryData[category]) {
        categoryData[category] = { count: 0, revenue: 0 };
      }
      categoryData[category].count += 1;
      categoryData[category].revenue += order.total || 0;
      totalRevenue += order.total || 0;
    }

    // Convert to array with percentages
    const result: CategoryStats[] = Object.entries(categoryData)
      .map(([category, data]) => ({
        category,
        count: data.count,
        revenue: data.revenue,
        percentage: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// إحصائيات حسب المنطقة
// Regional Statistics
// ═══════════════════════════════════════════════════════════════════════

/**
 * جلب إحصائيات حسب المحافظة
 * Fetch statistics by governorate
 */
export async function getStatsByGovernorate(): Promise<OperationResult<RegionalStats[]>> {
  try {
    const supabase = createAdminClient();

    // Get governorates with provider counts
    const { data: governorates, error: govError } = await supabase
      .from('governorates')
      .select('id, name_ar, name_en');

    if (govError) {
      return { success: false, error: govError.message };
    }

    // Get providers grouped by governorate
    const { data: providers, error: provError } = await supabase
      .from('providers')
      .select('governorate_id');

    if (provError) {
      return { success: false, error: provError.message };
    }

    // Count providers by governorate
    const providerCounts: Record<string, number> = {};
    for (const provider of providers || []) {
      if (provider.governorate_id) {
        providerCounts[provider.governorate_id] =
          (providerCounts[provider.governorate_id] || 0) + 1;
      }
    }

    // Build result
    const result: RegionalStats[] = (governorates || []).map((gov) => ({
      governorateId: gov.id,
      governorateName: gov.name_ar,
      providers: providerCounts[gov.id] || 0,
      orders: 0, // TODO: Add order counts when we have provider_id in orders
      revenue: 0, // TODO: Add revenue when we have the data
    }));

    // Sort by provider count
    result.sort((a, b) => b.providers - a.providers);

    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// إحصائيات سريعة للداشبورد
// Quick Stats for Dashboard Cards
// ═══════════════════════════════════════════════════════════════════════

/**
 * عدد مقدمي الخدمة المعلقين
 * Get pending providers count
 */
export async function getPendingProvidersCount(): Promise<OperationResult<number>> {
  try {
    const supabase = createAdminClient();

    const { count, error } = await supabase
      .from('providers')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending_approval', 'incomplete']);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: count || 0 };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * عدد الطلبات اليوم
 * Get today's orders count
 */
export async function getTodayOrdersCount(): Promise<OperationResult<number>> {
  try {
    const supabase = createAdminClient();
    const startOfToday = getStartOfToday();

    const { count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfToday);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: count || 0 };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * إيرادات اليوم
 * Get today's revenue
 */
export async function getTodayRevenue(): Promise<OperationResult<number>> {
  try {
    const supabase = createAdminClient();
    const startOfToday = getStartOfToday();

    const { data, error } = await supabase
      .from('orders')
      .select('total')
      .gte('created_at', startOfToday)
      .in('status', ['delivered', 'completed']);

    if (error) {
      return { success: false, error: error.message };
    }

    const revenue = (data || []).reduce((sum, order) => sum + (order.total || 0), 0);

    return { success: true, data: revenue };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

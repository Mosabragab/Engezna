'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ProviderLayout } from '@/components/provider';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  RefreshCw,
  Award,
  Banknote,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  CalendarDays,
  Timer,
  UserCheck,
  BarChart3,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

type TopProduct = {
  id: string;
  name_ar: string;
  name_en: string;
  total_quantity: number;
  total_revenue: number;
};

type DailyRevenue = {
  date: string;
  revenue: number;
  orders: number;
};

type PeakHour = {
  hour: number;
  orders: number;
  percentage: number;
};

type CancellationReason = {
  reason: string | null;
  cancelled_by: string | null;
  count: number;
};

type ReviewStats = {
  totalReviews: number;
  avgRating: number;
  distribution: { [key: number]: number };
};

type AnalyticsData = {
  // Revenue
  totalRevenue: number;
  totalCommission: number;
  netRevenue: number;
  periodRevenue: number;
  previousPeriodRevenue: number;

  // Orders
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;

  // Payment Methods
  codOrders: number;
  codRevenue: number;
  onlineOrders: number;
  onlineRevenue: number;

  // Customers
  totalCustomers: number;
  returningCustomers: number;
  newCustomers: number;
  avgOrderValue: number;

  // Time metrics
  avgPreparationTime: number; // in minutes
  avgDeliveryTime: number; // in minutes

  // Charts
  dailyRevenue: DailyRevenue[];
  peakHours: PeakHour[];

  // Cancellations
  cancellationReasons: CancellationReason[];

  // Reviews
  reviewStats: ReviewStats;

  // Top Products
  topProducts: TopProduct[];
};

type DateFilter = 'today' | 'week' | 'month' | 'last_month' | 'custom';

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function AnalyticsPage() {
  const locale = useLocale();
  const router = useRouter();
  const isRTL = locale === 'ar';

  const [providerId, setProviderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Date filter state
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [data, setData] = useState<AnalyticsData>({
    totalRevenue: 0,
    totalCommission: 0,
    netRevenue: 0,
    periodRevenue: 0,
    previousPeriodRevenue: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
    codOrders: 0,
    codRevenue: 0,
    onlineOrders: 0,
    onlineRevenue: 0,
    totalCustomers: 0,
    returningCustomers: 0,
    newCustomers: 0,
    avgOrderValue: 0,
    avgPreparationTime: 0,
    avgDeliveryTime: 0,
    dailyRevenue: [],
    peakHours: [],
    cancellationReasons: [],
    reviewStats: { totalReviews: 0, avgRating: 0, distribution: {} },
    topProducts: [],
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Date Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  const getDateStr = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const getDateRange = useCallback(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    let prevStartDate: Date;
    let prevEndDate: Date;

    switch (dateFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - 1);
        prevEndDate = new Date(prevStartDate);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 6);
        prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - 7);
        prevEndDate = new Date(startDate);
        prevEndDate.setDate(prevEndDate.getDate() - 1);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        prevStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        prevEndDate = new Date(now.getFullYear(), now.getMonth() - 1, 0);
        break;
      case 'custom':
        startDate = customStartDate ? new Date(customStartDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = customEndDate ? new Date(customEndDate) : now;
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        prevEndDate = new Date(startDate);
        prevEndDate.setDate(prevEndDate.getDate() - 1);
        prevStartDate = new Date(prevEndDate);
        prevStartDate.setDate(prevStartDate.getDate() - daysDiff);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
    }

    return {
      startDate: getDateStr(startDate),
      endDate: getDateStr(endDate),
      prevStartDate: getDateStr(prevStartDate),
      prevEndDate: getDateStr(prevEndDate),
    };
  }, [dateFilter, customStartDate, customEndDate]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Data Loading
  // ═══════════════════════════════════════════════════════════════════════════

  const loadAnalytics = useCallback(
    async (provId: string) => {
      const supabase = createClient();
      const { startDate, endDate, prevStartDate, prevEndDate } = getDateRange();

      // Fetch all data in parallel
      const [ordersResult, orderItemsResult, reviewsResult] = await Promise.all([
        supabase
          .from('orders')
          .select(
            `id, status, total, subtotal, delivery_fee, discount, platform_commission,
           created_at, customer_id, payment_status, payment_method,
           accepted_at, preparing_at, ready_at, out_for_delivery_at, delivered_at,
           cancelled_at, cancellation_reason, cancelled_by`
          )
          .eq('provider_id', provId),
        supabase
          .from('order_items')
          .select(
            `quantity, unit_price, menu_item_id,
           menu_items!inner(id, name_ar, name_en, provider_id)`
          )
          .eq('menu_items.provider_id', provId),
        supabase.from('reviews').select('rating, created_at').eq('provider_id', provId),
      ]);

      const orders = ordersResult.data || [];
      const orderItems = orderItemsResult.data || [];
      const reviews = reviewsResult.data || [];

      // Filter orders by date range
      const periodOrders = orders.filter((o) => {
        const dateStr = getDateStr(new Date(o.created_at));
        return dateStr >= startDate && dateStr <= endDate;
      });

      const prevPeriodOrders = orders.filter((o) => {
        const dateStr = getDateStr(new Date(o.created_at));
        return dateStr >= prevStartDate && dateStr <= prevEndDate;
      });

      // Order counts (for current period)
      const completedOrders = periodOrders.filter((o) => o.status === 'delivered').length;
      const cancelledOrders = periodOrders.filter((o) => ['cancelled', 'rejected'].includes(o.status)).length;
      const pendingOrders = periodOrders.filter(
        (o) => !['delivered', 'cancelled', 'rejected'].includes(o.status)
      ).length;

      // Confirmed orders for revenue (current period)
      const confirmedOrders = periodOrders.filter(
        (o) => o.status === 'delivered' && o.payment_status === 'completed'
      );

      const prevConfirmedOrders = prevPeriodOrders.filter(
        (o) => o.status === 'delivered' && o.payment_status === 'completed'
      );

      // Revenue calculations
      const periodRevenue = confirmedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const previousPeriodRevenue = prevConfirmedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const totalCommission = confirmedOrders.reduce((sum, o) => sum + (o.platform_commission || 0), 0);
      const netRevenue = periodRevenue - totalCommission;

      // All-time revenue for comparison
      const allTimeConfirmed = orders.filter(
        (o) => o.status === 'delivered' && o.payment_status === 'completed'
      );
      const totalRevenue = allTimeConfirmed.reduce((sum, o) => sum + (o.total || 0), 0);

      // COD vs Online
      const codOrders = confirmedOrders.filter((o) => o.payment_method === 'cash');
      const onlineOrders = confirmedOrders.filter((o) => o.payment_method !== 'cash');

      // Customer analysis
      const customerOrderCount: { [key: string]: number } = {};
      periodOrders.forEach((o) => {
        if (o.customer_id) {
          customerOrderCount[o.customer_id] = (customerOrderCount[o.customer_id] || 0) + 1;
        }
      });
      const totalCustomers = Object.keys(customerOrderCount).length;
      const returningCustomers = Object.values(customerOrderCount).filter((count) => count > 1).length;
      const newCustomers = totalCustomers - returningCustomers;

      // Average order value
      const avgOrderValue = confirmedOrders.length > 0 ? periodRevenue / confirmedOrders.length : 0;

      // Time metrics (preparation and delivery time)
      let totalPrepTime = 0;
      let prepCount = 0;
      let totalDeliveryTime = 0;
      let deliveryCount = 0;

      confirmedOrders.forEach((o) => {
        if (o.accepted_at && o.ready_at) {
          const prepTime = (new Date(o.ready_at).getTime() - new Date(o.accepted_at).getTime()) / 60000;
          if (prepTime > 0 && prepTime < 300) {
            // Sanity check: less than 5 hours
            totalPrepTime += prepTime;
            prepCount++;
          }
        }
        if (o.out_for_delivery_at && o.delivered_at) {
          const deliveryTime =
            (new Date(o.delivered_at).getTime() - new Date(o.out_for_delivery_at).getTime()) / 60000;
          if (deliveryTime > 0 && deliveryTime < 300) {
            totalDeliveryTime += deliveryTime;
            deliveryCount++;
          }
        }
      });

      const avgPreparationTime = prepCount > 0 ? Math.round(totalPrepTime / prepCount) : 0;
      const avgDeliveryTime = deliveryCount > 0 ? Math.round(totalDeliveryTime / deliveryCount) : 0;

      // Daily revenue chart (last 7 days or period)
      const dailyRevenueMap: { [key: string]: { revenue: number; orders: number } } = {};
      const chartDays = dateFilter === 'today' ? 1 : dateFilter === 'week' ? 7 : 30;
      const chartStartDate = new Date();
      chartStartDate.setDate(chartStartDate.getDate() - chartDays + 1);

      for (let i = 0; i < chartDays; i++) {
        const d = new Date(chartStartDate);
        d.setDate(d.getDate() + i);
        const dateStr = getDateStr(d);
        dailyRevenueMap[dateStr] = { revenue: 0, orders: 0 };
      }

      confirmedOrders.forEach((o) => {
        const dateStr = getDateStr(new Date(o.created_at));
        if (dailyRevenueMap[dateStr]) {
          dailyRevenueMap[dateStr].revenue += o.total || 0;
          dailyRevenueMap[dateStr].orders += 1;
        }
      });

      const dailyRevenue: DailyRevenue[] = Object.entries(dailyRevenueMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Peak hours analysis
      const hourlyOrders: { [key: number]: number } = {};
      for (let i = 0; i < 24; i++) hourlyOrders[i] = 0;

      periodOrders.forEach((o) => {
        const hour = new Date(o.created_at).getHours();
        hourlyOrders[hour]++;
      });

      const totalPeriodOrders = periodOrders.length || 1;
      const peakHours: PeakHour[] = Object.entries(hourlyOrders)
        .map(([hour, orders]) => ({
          hour: parseInt(hour),
          orders,
          percentage: Math.round((orders / totalPeriodOrders) * 100),
        }))
        .filter((h) => h.orders > 0)
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 5);

      // Cancellation analysis
      const cancellationMap: { [key: string]: CancellationReason } = {};
      periodOrders
        .filter((o) => ['cancelled', 'rejected'].includes(o.status))
        .forEach((o) => {
          const key = `${o.cancellation_reason || 'unknown'}_${o.cancelled_by || 'unknown'}`;
          if (!cancellationMap[key]) {
            cancellationMap[key] = {
              reason: o.cancellation_reason,
              cancelled_by: o.cancelled_by,
              count: 0,
            };
          }
          cancellationMap[key].count++;
        });

      const cancellationReasons = Object.values(cancellationMap).sort((a, b) => b.count - a.count);

      // Reviews analysis
      const reviewStats: ReviewStats = {
        totalReviews: reviews.length,
        avgRating: reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
      reviews.forEach((r) => {
        if (r.rating >= 1 && r.rating <= 5) {
          reviewStats.distribution[r.rating]++;
        }
      });

      // Top products
      const productStats: { [key: string]: TopProduct } = {};
      orderItems.forEach((item: any) => {
        const menuItem = item.menu_items;
        if (!menuItem) return;
        const id = menuItem.id;
        if (!productStats[id]) {
          productStats[id] = {
            id,
            name_ar: menuItem.name_ar,
            name_en: menuItem.name_en,
            total_quantity: 0,
            total_revenue: 0,
          };
        }
        productStats[id].total_quantity += item.quantity || 0;
        productStats[id].total_revenue += (item.quantity || 0) * (item.unit_price || 0);
      });
      const topProducts = Object.values(productStats)
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, 5);

      setData({
        totalRevenue,
        totalCommission,
        netRevenue,
        periodRevenue,
        previousPeriodRevenue,
        totalOrders: periodOrders.length,
        completedOrders,
        pendingOrders,
        cancelledOrders,
        codOrders: codOrders.length,
        codRevenue: codOrders.reduce((sum, o) => sum + (o.total || 0), 0),
        onlineOrders: onlineOrders.length,
        onlineRevenue: onlineOrders.reduce((sum, o) => sum + (o.total || 0), 0),
        totalCustomers,
        returningCustomers,
        newCustomers,
        avgOrderValue,
        avgPreparationTime,
        avgDeliveryTime,
        dailyRevenue,
        peakHours,
        cancellationReasons,
        reviewStats,
        topProducts,
      });
    },
    [getDateRange]
  );

  const checkAuthAndLoad = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/provider/analytics`);
      return;
    }

    // Check if user is staff member
    const { data: staffData } = await supabase
      .from('provider_staff')
      .select('provider_id, can_view_analytics')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);

    const staff = staffData?.[0];
    if (staff?.provider_id) {
      if (!staff.can_view_analytics) {
        router.push(`/${locale}/provider`);
        return;
      }
      setProviderId(staff.provider_id);
      await loadAnalytics(staff.provider_id);
      setLoading(false);
      return;
    }

    // Check if user is owner
    const { data: providerData } = await supabase
      .from('providers')
      .select('id, status')
      .eq('owner_id', user.id)
      .limit(1);

    const provider = providerData?.[0];
    if (!provider || provider.status === 'pending_approval') {
      router.push(`/${locale}/provider`);
      return;
    }

    setProviderId(provider.id);
    await loadAnalytics(provider.id);
    setLoading(false);
  }, [loadAnalytics, locale, router]);

  useEffect(() => {
    checkAuthAndLoad();
  }, [checkAuthAndLoad]);

  // Reload when date filter changes
  useEffect(() => {
    if (providerId && !loading) {
      setRefreshing(true);
      loadAnalytics(providerId).then(() => setRefreshing(false));
    }
  }, [dateFilter, customStartDate, customEndDate, providerId]);

  const handleRefresh = async () => {
    if (!providerId) return;
    setRefreshing(true);
    await loadAnalytics(providerId);
    setRefreshing(false);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  const formatCurrency = (amount: number) => {
    return `${Math.round(amount).toLocaleString()} ${locale === 'ar' ? 'ج.م' : 'EGP'}`;
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} ${locale === 'ar' ? 'د' : 'm'}`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}${locale === 'ar' ? 'س' : 'h'} ${mins}${locale === 'ar' ? 'د' : 'm'}`;
  };

  const formatHour = (hour: number) => {
    const suffix = hour >= 12 ? (locale === 'ar' ? 'م' : 'PM') : (locale === 'ar' ? 'ص' : 'AM');
    const h = hour % 12 || 12;
    return `${h} ${suffix}`;
  };

  const getGrowthPercent = () => {
    if (data.previousPeriodRevenue === 0) return data.periodRevenue > 0 ? 100 : 0;
    return ((data.periodRevenue - data.previousPeriodRevenue) / data.previousPeriodRevenue) * 100;
  };

  const completionRate =
    data.totalOrders > 0 ? Math.round((data.completedOrders / data.totalOrders) * 100) : 0;

  const returningRate =
    data.totalCustomers > 0 ? Math.round((data.returningCustomers / data.totalCustomers) * 100) : 0;

  const maxDailyRevenue = Math.max(...data.dailyRevenue.map((d) => d.revenue), 1);

  const dateFilterLabels: { [key in DateFilter]: { ar: string; en: string } } = {
    today: { ar: 'اليوم', en: 'Today' },
    week: { ar: 'هذا الأسبوع', en: 'This Week' },
    month: { ar: 'هذا الشهر', en: 'This Month' },
    last_month: { ar: 'الشهر الماضي', en: 'Last Month' },
    custom: { ar: 'فترة مخصصة', en: 'Custom Range' },
  };

  const getCancelledByLabel = (cancelledBy: string | null) => {
    const labels: { [key: string]: { ar: string; en: string } } = {
      customer: { ar: 'العميل', en: 'Customer' },
      provider: { ar: 'المتجر', en: 'Provider' },
      admin: { ar: 'الإدارة', en: 'Admin' },
      system: { ar: 'النظام', en: 'System' },
      unknown: { ar: 'غير محدد', en: 'Unknown' },
    };
    const key = cancelledBy || 'unknown';
    return labels[key]?.[locale === 'ar' ? 'ar' : 'en'] || key;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Loading
  // ═══════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-slate-500">
            {locale === 'ar' ? 'جاري تحميل التحليلات...' : 'Loading analytics...'}
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <ProviderLayout
      pageTitle={{ ar: 'التحليلات', en: 'Analytics' }}
      pageSubtitle={{
        ar: 'تحليل شامل لأداء متجرك',
        en: 'Comprehensive analysis of your store performance',
      }}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
        {/* ║ DATE FILTER                                                       ║ */}
        {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
        <div className="flex flex-wrap items-center gap-2">
          {(['today', 'week', 'month', 'last_month'] as DateFilter[]).map((filter) => (
            <Button
              key={filter}
              variant={dateFilter === filter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter(filter)}
              className="text-xs"
            >
              {dateFilterLabels[filter][locale === 'ar' ? 'ar' : 'en']}
            </Button>
          ))}
          <div className="relative">
            <Button
              variant={dateFilter === 'custom' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="text-xs"
            >
              <CalendarDays className="w-3 h-3 me-1" />
              {dateFilterLabels.custom[locale === 'ar' ? 'ar' : 'en']}
              <ChevronDown className="w-3 h-3 ms-1" />
            </Button>
            {showDatePicker && (
              <div className="absolute top-full mt-2 start-0 bg-white border rounded-lg shadow-lg p-4 z-50 min-w-[280px]">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">
                      {locale === 'ar' ? 'من' : 'From'}
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">
                      {locale === 'ar' ? 'إلى' : 'To'}
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setDateFilter('custom');
                      setShowDatePicker(false);
                    }}
                  >
                    {locale === 'ar' ? 'تطبيق' : 'Apply'}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="ms-auto"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
        {/* ║ HERO CARD - Net Revenue (Most Important for Merchants)            ║ */}
        {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
        <Card className="bg-gradient-to-br from-primary to-primary/80 border-0 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardContent className="pt-8 pb-8 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-white/80 text-sm">
                    {locale === 'ar' ? 'صافي الربح' : 'Net Revenue'}
                  </p>
                  <p className="text-4xl font-bold">{formatCurrency(data.netRevenue)}</p>
                </div>
              </div>

              {getGrowthPercent() !== 0 && (
                <div
                  className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm ${
                    getGrowthPercent() >= 0 ? 'bg-green-500/30 text-green-100' : 'bg-red-500/30 text-red-100'
                  }`}
                >
                  {getGrowthPercent() >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span className="font-semibold">
                    {getGrowthPercent() >= 0 ? '+' : ''}
                    {getGrowthPercent().toFixed(0)}%
                  </span>
                </div>
              )}
            </div>

            {/* Revenue breakdown */}
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-white/10 rounded-lg px-3 py-2">
                <span className="text-white/70 block text-xs">
                  {locale === 'ar' ? 'الإجمالي' : 'Total'}
                </span>
                <span className="font-semibold">{formatCurrency(data.periodRevenue)}</span>
              </div>
              <div className="bg-white/10 rounded-lg px-3 py-2">
                <span className="text-white/70 block text-xs">
                  {locale === 'ar' ? 'العمولة' : 'Commission'}
                </span>
                <span className="font-semibold">{formatCurrency(data.totalCommission)}</span>
              </div>
              <div className="bg-white/10 rounded-lg px-3 py-2">
                <span className="text-white/70 block text-xs">
                  {locale === 'ar' ? 'الفترة السابقة' : 'Previous'}
                </span>
                <span className="font-semibold">{formatCurrency(data.previousPeriodRevenue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
        {/* ║ QUICK STATS - 5 Cards                                             ║ */}
        {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="pt-4 pb-4 text-center">
              <ShoppingBag className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-900">{data.totalOrders}</p>
              <p className="text-xs text-slate-500">{locale === 'ar' ? 'الطلبات' : 'Orders'}</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="pt-4 pb-4 text-center">
              <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{completionRate}%</p>
              <p className="text-xs text-slate-500">{locale === 'ar' ? 'معدل الإكمال' : 'Completion'}</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="pt-4 pb-4 text-center">
              <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-900">{data.totalCustomers}</p>
              <p className="text-xs text-slate-500">{locale === 'ar' ? 'العملاء' : 'Customers'}</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="pt-4 pb-4 text-center">
              <UserCheck className="w-6 h-6 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">{returningRate}%</p>
              <p className="text-xs text-slate-500">{locale === 'ar' ? 'عملاء متكررون' : 'Returning'}</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm col-span-2 md:col-span-1">
            <CardContent className="pt-4 pb-4 text-center">
              <Star className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-900">
                {data.reviewStats.avgRating.toFixed(1)}
              </p>
              <p className="text-xs text-slate-500">
                {locale === 'ar' ? `${data.reviewStats.totalReviews} تقييم` : `${data.reviewStats.totalReviews} reviews`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
        {/* ║ REVENUE CHART                                                     ║ */}
        {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-900 flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5 text-primary" />
              {locale === 'ar' ? 'الإيرادات اليومية' : 'Daily Revenue'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.dailyRevenue.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{locale === 'ar' ? 'لا توجد بيانات' : 'No data'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-end gap-1 h-32">
                  {data.dailyRevenue.slice(-14).map((day, index) => (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-primary/20 rounded-t transition-all hover:bg-primary/30"
                        style={{
                          height: `${Math.max((day.revenue / maxDailyRevenue) * 100, 4)}%`,
                          minHeight: '4px',
                        }}
                        title={`${day.date}: ${formatCurrency(day.revenue)}`}
                      >
                        <div
                          className="w-full bg-primary rounded-t"
                          style={{ height: '100%' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{data.dailyRevenue[Math.max(0, data.dailyRevenue.length - 14)]?.date.slice(5)}</span>
                  <span>{data.dailyRevenue[data.dailyRevenue.length - 1]?.date.slice(5)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
        {/* ║ TIME METRICS & PEAK HOURS                                         ║ */}
        {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Time Metrics */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-900 flex items-center gap-2 text-base">
                <Timer className="w-5 h-5 text-primary" />
                {locale === 'ar' ? 'متوسط الوقت' : 'Average Time'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <span className="text-sm text-slate-700">
                      {locale === 'ar' ? 'وقت التحضير' : 'Preparation Time'}
                    </span>
                  </div>
                  <span className="font-bold text-blue-700">
                    {data.avgPreparationTime > 0 ? formatTime(data.avgPreparationTime) : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-slate-700">
                      {locale === 'ar' ? 'وقت التوصيل' : 'Delivery Time'}
                    </span>
                  </div>
                  <span className="font-bold text-green-700">
                    {data.avgDeliveryTime > 0 ? formatTime(data.avgDeliveryTime) : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-amber-500" />
                    <span className="text-sm text-slate-700">
                      {locale === 'ar' ? 'متوسط الطلب' : 'Avg Order Value'}
                    </span>
                  </div>
                  <span className="font-bold text-amber-700">{formatCurrency(data.avgOrderValue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Peak Hours */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-900 flex items-center gap-2 text-base">
                <Clock className="w-5 h-5 text-primary" />
                {locale === 'ar' ? 'أوقات الذروة' : 'Peak Hours'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.peakHours.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{locale === 'ar' ? 'لا توجد بيانات' : 'No data'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.peakHours.map((peak, index) => (
                    <div key={peak.hour} className="flex items-center gap-3">
                      <span className="w-16 text-sm text-slate-600">{formatHour(peak.hour)}</span>
                      <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            index === 0 ? 'bg-primary' : index === 1 ? 'bg-primary/70' : 'bg-primary/50'
                          }`}
                          style={{ width: `${peak.percentage}%` }}
                        />
                      </div>
                      <span className="w-16 text-sm text-slate-600 text-end">
                        {peak.orders} {locale === 'ar' ? 'طلب' : 'orders'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
        {/* ║ PAYMENT METHODS                                                   ║ */}
        {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 shadow-sm">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                  <Banknote className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-amber-700">
                    {locale === 'ar' ? 'الدفع عند الاستلام' : 'Cash on Delivery'}
                  </p>
                  <p className="text-2xl font-bold text-amber-900">{formatCurrency(data.codRevenue)}</p>
                </div>
                <div className="text-end">
                  <p className="text-lg font-semibold text-amber-800">{data.codOrders}</p>
                  <p className="text-xs text-amber-600">{locale === 'ar' ? 'طلب' : 'orders'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-blue-700">
                    {locale === 'ar' ? 'الدفع الإلكتروني' : 'Online Payment'}
                  </p>
                  <p className="text-2xl font-bold text-blue-900">{formatCurrency(data.onlineRevenue)}</p>
                </div>
                <div className="text-end">
                  <p className="text-lg font-semibold text-blue-800">{data.onlineOrders}</p>
                  <p className="text-xs text-blue-600">{locale === 'ar' ? 'طلب' : 'orders'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
        {/* ║ ORDER STATUS & CANCELLATION ANALYSIS                              ║ */}
        {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Order Status */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-900 flex items-center gap-2 text-base">
                <Package className="w-5 h-5 text-primary" />
                {locale === 'ar' ? 'حالة الطلبات' : 'Order Status'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden flex">
                  {data.totalOrders > 0 && (
                    <>
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${(data.completedOrders / data.totalOrders) * 100}%` }}
                      />
                      <div
                        className="h-full bg-amber-400"
                        style={{ width: `${(data.pendingOrders / data.totalOrders) * 100}%` }}
                      />
                      <div
                        className="h-full bg-red-400"
                        style={{ width: `${(data.cancelledOrders / data.totalOrders) * 100}%` }}
                      />
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-green-50 rounded-lg">
                  <p className="text-lg font-bold text-green-600">{data.completedOrders}</p>
                  <p className="text-xs text-green-700">{locale === 'ar' ? 'مكتمل' : 'Completed'}</p>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg">
                  <p className="text-lg font-bold text-amber-600">{data.pendingOrders}</p>
                  <p className="text-xs text-amber-700">{locale === 'ar' ? 'قيد التنفيذ' : 'Pending'}</p>
                </div>
                <div className="p-2 bg-red-50 rounded-lg">
                  <p className="text-lg font-bold text-red-600">{data.cancelledOrders}</p>
                  <p className="text-xs text-red-700">{locale === 'ar' ? 'ملغي' : 'Cancelled'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cancellation Analysis */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-900 flex items-center gap-2 text-base">
                <XCircle className="w-5 h-5 text-red-500" />
                {locale === 'ar' ? 'تحليل الإلغاءات' : 'Cancellation Analysis'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.cancellationReasons.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <p className="text-sm">{locale === 'ar' ? 'لا توجد إلغاءات' : 'No cancellations'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.cancellationReasons.slice(0, 4).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm text-slate-700 truncate">
                          {item.reason || (locale === 'ar' ? 'بدون سبب' : 'No reason')}
                        </p>
                        <p className="text-xs text-slate-500">
                          {locale === 'ar' ? 'بواسطة: ' : 'By: '}
                          {getCancelledByLabel(item.cancelled_by)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-red-600 ms-2">{item.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
        {/* ║ CUSTOMERS ANALYSIS                                                ║ */}
        {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-900 flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-primary" />
              {locale === 'ar' ? 'تحليل العملاء' : 'Customer Analysis'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-700">{data.totalCustomers}</p>
                <p className="text-xs text-blue-600">{locale === 'ar' ? 'إجمالي العملاء' : 'Total Customers'}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <UserCheck className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-700">{data.returningCustomers}</p>
                <p className="text-xs text-green-600">{locale === 'ar' ? 'عملاء متكررون' : 'Returning'}</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-xl">
                <Star className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-700">{data.newCustomers}</p>
                <p className="text-xs text-purple-600">{locale === 'ar' ? 'عملاء جدد' : 'New Customers'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
        {/* ║ REVIEWS DISTRIBUTION                                              ║ */}
        {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
        {data.reviewStats.totalReviews > 0 && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-900 flex items-center gap-2 text-base">
                <Star className="w-5 h-5 text-yellow-500" />
                {locale === 'ar' ? 'توزيع التقييمات' : 'Rating Distribution'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-4xl font-bold text-slate-900">{data.reviewStats.avgRating.toFixed(1)}</p>
                  <div className="flex items-center justify-center gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.round(data.reviewStats.avgRating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {data.reviewStats.totalReviews} {locale === 'ar' ? 'تقييم' : 'reviews'}
                  </p>
                </div>
                <div className="flex-1 space-y-1">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating} className="flex items-center gap-2">
                      <span className="w-3 text-xs text-slate-600">{rating}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full"
                          style={{
                            width: `${
                              data.reviewStats.totalReviews > 0
                                ? (data.reviewStats.distribution[rating] / data.reviewStats.totalReviews) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="w-8 text-xs text-slate-500 text-end">
                        {data.reviewStats.distribution[rating] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
        {/* ║ TOP PRODUCTS                                                      ║ */}
        {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-900 flex items-center gap-2 text-base">
              <Award className="w-5 h-5 text-yellow-500" />
              {locale === 'ar' ? 'الأكثر مبيعاً' : 'Top Sellers'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{locale === 'ar' ? 'لا توجد بيانات بعد' : 'No data yet'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.topProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        index === 0
                          ? 'bg-yellow-400 text-yellow-900'
                          : index === 1
                            ? 'bg-slate-300 text-slate-700'
                            : index === 2
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {locale === 'ar' ? product.name_ar : product.name_en}
                      </p>
                      <p className="text-xs text-slate-500">
                        {product.total_quantity} {locale === 'ar' ? 'مبيعات' : 'sold'}
                      </p>
                    </div>
                    <div className="text-end shrink-0">
                      <p className="font-bold text-primary">{formatCurrency(product.total_revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProviderLayout>
  );
}

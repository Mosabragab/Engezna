'use client';

import { useEffect, useState, useCallback } from 'react';
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
  ChevronRight,
  Banknote,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
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

type AnalyticsData = {
  // Revenue
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  lastMonthRevenue: number;

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

  // Other
  totalCustomers: number;
  avgOrderValue: number;

  // Top Products
  topProducts: TopProduct[];
};

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

  const [data, setData] = useState<AnalyticsData>({
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    lastMonthRevenue: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
    codOrders: 0,
    codRevenue: 0,
    onlineOrders: 0,
    onlineRevenue: 0,
    totalCustomers: 0,
    avgOrderValue: 0,
    topProducts: [],
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Data Loading
  // ═══════════════════════════════════════════════════════════════════════════

  const loadAnalytics = useCallback(async (provId: string) => {
    const supabase = createClient();
    const now = new Date();

    // Date helpers
    const getDateStr = (date: Date): string => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const todayStr = getDateStr(now);
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const weekStartStr = getDateStr(weekAgo);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = getDateStr(monthStart);

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthStartStr = getDateStr(lastMonthStart);
    const lastMonthEndStr = getDateStr(lastMonthEnd);

    // Fetch orders and order items
    const [ordersResult, orderItemsResult] = await Promise.all([
      supabase
        .from('orders')
        .select('id, status, total, created_at, customer_id, payment_status, payment_method')
        .eq('provider_id', provId),
      supabase
        .from('order_items')
        .select(
          `
          quantity,
          unit_price,
          menu_item_id,
          menu_items!inner(id, name_ar, name_en, provider_id)
        `
        )
        .eq('menu_items.provider_id', provId),
    ]);

    const orders = ordersResult.data || [];
    const orderItems = orderItemsResult.data || [];

    // Order counts
    const completedOrders = orders.filter((o) => o.status === 'delivered').length;
    const cancelledOrders = orders.filter((o) =>
      ['cancelled', 'rejected'].includes(o.status)
    ).length;
    const pendingOrders = orders.filter(
      (o) => !['delivered', 'cancelled', 'rejected'].includes(o.status)
    ).length;

    // Confirmed orders for revenue
    const confirmedOrders = orders.filter(
      (o) => o.status === 'delivered' && o.payment_status === 'completed'
    );

    // Revenue by period
    let todayRevenue = 0;
    let weekRevenue = 0;
    let monthRevenue = 0;
    let lastMonthRevenue = 0;

    confirmedOrders.forEach((o) => {
      const dateStr = getDateStr(new Date(o.created_at));
      const amount = o.total || 0;

      if (dateStr === todayStr) todayRevenue += amount;
      if (dateStr >= weekStartStr && dateStr <= todayStr) weekRevenue += amount;
      if (dateStr >= monthStartStr && dateStr <= todayStr) monthRevenue += amount;
      if (dateStr >= lastMonthStartStr && dateStr <= lastMonthEndStr) lastMonthRevenue += amount;
    });

    // COD vs Online (this month)
    const monthOrders = orders.filter((o) => {
      const d = new Date(o.created_at);
      return d >= monthStart && o.status === 'delivered';
    });
    const codOrders = monthOrders.filter((o) => o.payment_method === 'cash');
    const onlineOrders = monthOrders.filter((o) => o.payment_method !== 'cash');

    // Average order value
    const avgOrderValue =
      confirmedOrders.length > 0
        ? confirmedOrders.reduce((sum, o) => sum + (o.total || 0), 0) / confirmedOrders.length
        : 0;

    // Unique customers
    const totalCustomers = new Set(orders.map((o) => o.customer_id)).size;

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
      todayRevenue,
      weekRevenue,
      monthRevenue,
      lastMonthRevenue,
      totalOrders: orders.length,
      completedOrders,
      pendingOrders,
      cancelledOrders,
      codOrders: codOrders.length,
      codRevenue: codOrders
        .filter((o) => o.payment_status === 'completed')
        .reduce((sum, o) => sum + (o.total || 0), 0),
      onlineOrders: onlineOrders.length,
      onlineRevenue: onlineOrders
        .filter((o) => o.payment_status === 'completed')
        .reduce((sum, o) => sum + (o.total || 0), 0),
      totalCustomers,
      avgOrderValue,
      topProducts,
    });
  }, []);

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

  const getGrowthPercent = () => {
    if (data.lastMonthRevenue === 0) return data.monthRevenue > 0 ? 100 : 0;
    return ((data.monthRevenue - data.lastMonthRevenue) / data.lastMonthRevenue) * 100;
  };

  const completionRate =
    data.totalOrders > 0 ? Math.round((data.completedOrders / data.totalOrders) * 100) : 0;

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
        ar: 'نظرة سريعة على أداء متجرك',
        en: 'Quick overview of your store performance',
      }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
        {/* ║ HERO CARD - Today's Revenue (Most Important for Merchants)        ║ */}
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
                    {locale === 'ar' ? 'إيرادات اليوم' : "Today's Revenue"}
                  </p>
                  <p className="text-4xl font-bold">{formatCurrency(data.todayRevenue)}</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Quick Comparison */}
            <div className="flex items-center gap-4 text-sm">
              <div className="bg-white/10 rounded-lg px-3 py-2">
                <span className="text-white/70">{locale === 'ar' ? 'الأسبوع:' : 'Week:'}</span>
                <span className="font-semibold ml-1">{formatCurrency(data.weekRevenue)}</span>
              </div>
              <div className="bg-white/10 rounded-lg px-3 py-2">
                <span className="text-white/70">{locale === 'ar' ? 'الشهر:' : 'Month:'}</span>
                <span className="font-semibold ml-1">{formatCurrency(data.monthRevenue)}</span>
              </div>
              {getGrowthPercent() !== 0 && (
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                    getGrowthPercent() >= 0
                      ? 'bg-green-500/20 text-green-100'
                      : 'bg-red-500/20 text-red-100'
                  }`}
                >
                  {getGrowthPercent() >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>
                    {getGrowthPercent() >= 0 ? '+' : ''}
                    {getGrowthPercent().toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
        {/* ║ QUICK STATS - 4 Simple Cards                                      ║ */}
        {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-white border-slate-200 shadow-elegant-sm card-hover">
            <CardContent className="pt-5 pb-5 text-center">
              <ShoppingBag className="w-7 h-7 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-900 font-numbers">{data.totalOrders}</p>
              <p className="text-xs text-slate-500">
                {locale === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-elegant-sm card-hover">
            <CardContent className="pt-5 pb-5 text-center">
              <CheckCircle2 className="w-7 h-7 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600 font-numbers">{completionRate}%</p>
              <p className="text-xs text-slate-500">
                {locale === 'ar' ? 'معدل الإكمال' : 'Completion Rate'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-elegant-sm card-hover">
            <CardContent className="pt-5 pb-5 text-center">
              <Users className="w-7 h-7 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-900 font-numbers">
                {data.totalCustomers}
              </p>
              <p className="text-xs text-slate-500">{locale === 'ar' ? 'عملاء' : 'Customers'}</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-elegant-sm card-hover">
            <CardContent className="pt-5 pb-5 text-center">
              <DollarSign className="w-7 h-7 text-amber-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-900 font-numbers">
                {formatCurrency(data.avgOrderValue)}
              </p>
              <p className="text-xs text-slate-500">
                {locale === 'ar' ? 'متوسط الطلب' : 'Avg Order'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
        {/* ║ PAYMENT METHODS - Simple Summary                                  ║ */}
        {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* COD */}
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 shadow-elegant-sm card-hover">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                  <Banknote className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-amber-700">
                    {locale === 'ar' ? 'الدفع عند الاستلام' : 'Cash on Delivery'}
                  </p>
                  <p className="text-2xl font-bold text-amber-900 font-numbers">
                    {formatCurrency(data.codRevenue)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-amber-800 font-numbers">
                    {data.codOrders}
                  </p>
                  <p className="text-xs text-amber-600">{locale === 'ar' ? 'طلب' : 'orders'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Online */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-elegant-sm card-hover">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-blue-700">
                    {locale === 'ar' ? 'الدفع الإلكتروني' : 'Online Payment'}
                  </p>
                  <p className="text-2xl font-bold text-blue-900 font-numbers">
                    {formatCurrency(data.onlineRevenue)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-blue-800 font-numbers">
                    {data.onlineOrders}
                  </p>
                  <p className="text-xs text-blue-600">{locale === 'ar' ? 'طلب' : 'orders'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
        {/* ║ ORDER STATUS BREAKDOWN                                            ║ */}
        {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
        <Card className="bg-white border-slate-200 shadow-elegant-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-900 flex items-center gap-2 text-base">
              <Package className="w-5 h-5 text-primary" />
              {locale === 'ar' ? 'حالة الطلبات' : 'Order Status'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {/* Progress bar */}
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
            <div className="flex justify-between mt-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-slate-600">
                  {locale === 'ar' ? 'مكتمل' : 'Completed'}: {data.completedOrders}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-amber-400 rounded-full" />
                <span className="text-slate-600">
                  {locale === 'ar' ? 'قيد التنفيذ' : 'Pending'}: {data.pendingOrders}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-red-400 rounded-full" />
                <span className="text-slate-600">
                  {locale === 'ar' ? 'ملغي' : 'Cancelled'}: {data.cancelledOrders}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
        {/* ║ TOP PRODUCTS - What Merchants Care About Most                     ║ */}
        {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
        <Card className="bg-white border-slate-200 shadow-elegant-sm">
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
                    <div className="text-right shrink-0">
                      <p className="font-bold text-primary">
                        {formatCurrency(product.total_revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
        {/* ║ LAST MONTH COMPARISON                                             ║ */}
        {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
        <Card className="bg-slate-50 border-slate-200 shadow-elegant-sm">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  {locale === 'ar' ? 'مقارنة بالشهر الماضي' : 'Compared to last month'}
                </p>
                <p className="text-xl font-bold text-slate-700 mt-1 font-numbers">
                  {formatCurrency(data.lastMonthRevenue)}
                </p>
              </div>
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
                  getGrowthPercent() >= 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {getGrowthPercent() >= 0 ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
                <span className="font-bold text-lg font-numbers">
                  {getGrowthPercent() >= 0 ? '+' : ''}
                  {getGrowthPercent().toFixed(0)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProviderLayout>
  );
}

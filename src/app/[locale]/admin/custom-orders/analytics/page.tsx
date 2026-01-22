'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { User } from '@supabase/supabase-js';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Trophy,
  Target,
  Users,
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Award,
  Zap,
  Star,
  XCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ProviderStats {
  provider_id: string;
  provider_name: string;
  provider_logo: string | null;
  total_requests: number;
  priced_requests: number;
  won_requests: number;
  avg_response_time: number;
  win_rate: number;
  total_revenue: number;
  avg_order_value: number;
}

interface BroadcastMetrics {
  total_broadcasts: number;
  completed_broadcasts: number;
  expired_broadcasts: number;
  cancelled_broadcasts: number;
  avg_providers_per_broadcast: number;
  avg_time_to_first_price: number;
  avg_time_to_selection: number;
  total_order_value: number;
  completion_rate: number;
}

interface DailyStats {
  date: string;
  broadcasts: number;
  completed: number;
  total_value: number;
}

export default function BroadcastAnalyticsPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const { toggle: toggleSidebar } = useAdminSidebar();

  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<BroadcastMetrics | null>(null);
  const [providerStats, setProviderStats] = useState<ProviderStats[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [sortBy, setSortBy] = useState<'win_rate' | 'total_requests' | 'avg_response_time'>(
    'win_rate'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Check auth
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'admin') {
        setIsAdmin(true);
        setAuthLoading(false);
        return;
      }
    }

    setAuthLoading(false);
  }

  // Load analytics data
  const loadAnalytics = useCallback(async () => {
    if (!isAdmin) return;

    setLoading(true);
    const supabase = createClient();

    try {
      const { data: broadcasts, error: broadcastError } = await supabase
        .from('custom_order_broadcasts')
        .select(
          `
          id,
          status,
          created_at,
          completed_at,
          pricing_deadline,
          winning_order_id,
          requests:custom_order_requests(
            id,
            provider_id,
            status,
            quoted_price,
            created_at,
            responded_at,
            provider:providers(
              id,
              name_ar,
              name_en,
              logo_url
            )
          )
        `
        )
        .gte('created_at', `${dateRange.start}T00:00:00`)
        .lte('created_at', `${dateRange.end}T23:59:59`);

      if (broadcastError) {
        console.error('Error loading broadcasts:', broadcastError);
        return;
      }

      // Calculate metrics
      const totalBroadcasts = broadcasts?.length || 0;
      const completedBroadcasts = broadcasts?.filter((b) => b.status === 'completed').length || 0;
      const expiredBroadcasts = broadcasts?.filter((b) => b.status === 'expired').length || 0;
      const cancelledBroadcasts = broadcasts?.filter((b) => b.status === 'cancelled').length || 0;

      let totalProviders = 0;
      let totalTimeToFirstPrice = 0;
      let countWithFirstPrice = 0;
      let totalTimeToSelection = 0;
      let countWithSelection = 0;
      let totalOrderValue = 0;

      const providerMap = new Map<
        string,
        {
          id: string;
          name: string;
          logo: string | null;
          requests: number;
          priced: number;
          won: number;
          totalResponseTime: number;
          responseCount: number;
          revenue: number;
        }
      >();

      const dailyMap = new Map<string, { broadcasts: number; completed: number; value: number }>();

      broadcasts?.forEach((broadcast) => {
        const requests = broadcast.requests || [];
        totalProviders += requests.length;

        const dateKey = broadcast.created_at.split('T')[0];
        const dayStats = dailyMap.get(dateKey) || { broadcasts: 0, completed: 0, value: 0 };
        dayStats.broadcasts++;
        if (broadcast.status === 'completed') {
          dayStats.completed++;
        }

        const pricedRequests = requests
          .filter((r: any) => r.responded_at && r.quoted_price)
          .sort(
            (a: any, b: any) =>
              new Date(a.responded_at).getTime() - new Date(b.responded_at).getTime()
          );

        if (pricedRequests.length > 0) {
          const firstPriced = pricedRequests[0];
          const timeToFirstPrice =
            (new Date(firstPriced.responded_at).getTime() -
              new Date(broadcast.created_at).getTime()) /
            60000;
          if (timeToFirstPrice > 0 && timeToFirstPrice < 180) {
            totalTimeToFirstPrice += timeToFirstPrice;
            countWithFirstPrice++;
          }
        }

        if (broadcast.completed_at && broadcast.winning_order_id) {
          const timeToSelection =
            (new Date(broadcast.completed_at).getTime() -
              new Date(broadcast.created_at).getTime()) /
            60000;
          if (timeToSelection > 0 && timeToSelection < 240) {
            totalTimeToSelection += timeToSelection;
            countWithSelection++;
          }

          const winningRequest = requests.find(
            (r: any) => r.order_id === broadcast.winning_order_id
          );
          if (winningRequest?.quoted_price) {
            totalOrderValue += winningRequest.quoted_price;
            dayStats.value += winningRequest.quoted_price;
          }
        }

        dailyMap.set(dateKey, dayStats);

        requests.forEach((req: any) => {
          const provider = Array.isArray(req.provider) ? req.provider[0] : req.provider;
          if (!provider) return;

          const stats = providerMap.get(provider.id) || {
            id: provider.id,
            name: isRTL ? provider.name_ar : provider.name_en,
            logo: provider.logo_url,
            requests: 0,
            priced: 0,
            won: 0,
            totalResponseTime: 0,
            responseCount: 0,
            revenue: 0,
          };

          stats.requests++;

          if (req.status === 'priced' || req.status === 'customer_approved') {
            stats.priced++;
            if (req.responded_at) {
              const responseTime =
                (new Date(req.responded_at).getTime() - new Date(req.created_at).getTime()) / 60000;
              if (responseTime > 0 && responseTime < 180) {
                stats.totalResponseTime += responseTime;
                stats.responseCount++;
              }
            }
          }

          if (req.status === 'customer_approved') {
            stats.won++;
            if (req.quoted_price) {
              stats.revenue += req.quoted_price;
            }
          }

          providerMap.set(provider.id, stats);
        });
      });

      const calculatedMetrics: BroadcastMetrics = {
        total_broadcasts: totalBroadcasts,
        completed_broadcasts: completedBroadcasts,
        expired_broadcasts: expiredBroadcasts,
        cancelled_broadcasts: cancelledBroadcasts,
        avg_providers_per_broadcast: totalBroadcasts > 0 ? totalProviders / totalBroadcasts : 0,
        avg_time_to_first_price:
          countWithFirstPrice > 0 ? totalTimeToFirstPrice / countWithFirstPrice : 0,
        avg_time_to_selection:
          countWithSelection > 0 ? totalTimeToSelection / countWithSelection : 0,
        total_order_value: totalOrderValue,
        completion_rate: totalBroadcasts > 0 ? (completedBroadcasts / totalBroadcasts) * 100 : 0,
      };

      setMetrics(calculatedMetrics);

      const providerStatsArray: ProviderStats[] = Array.from(providerMap.values()).map((stats) => ({
        provider_id: stats.id,
        provider_name: stats.name,
        provider_logo: stats.logo,
        total_requests: stats.requests,
        priced_requests: stats.priced,
        won_requests: stats.won,
        avg_response_time:
          stats.responseCount > 0 ? stats.totalResponseTime / stats.responseCount : 0,
        win_rate: stats.priced > 0 ? (stats.won / stats.priced) * 100 : 0,
        total_revenue: stats.revenue,
        avg_order_value: stats.won > 0 ? stats.revenue / stats.won : 0,
      }));

      setProviderStats(providerStatsArray);

      const dailyStatsArray: DailyStats[] = Array.from(dailyMap.entries())
        .map(([date, stats]) => ({
          date,
          broadcasts: stats.broadcasts,
          completed: stats.completed,
          total_value: stats.value,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setDailyStats(dailyStatsArray);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, isRTL, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadAnalytics();
    }
  }, [loadAnalytics, isAdmin]);

  const sortedProviders = [...providerStats].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    if (sortOrder === 'desc') return bVal - aVal;
    return aVal - bVal;
  });

  const formatTime = (minutes: number) => {
    if (minutes < 1) return isRTL ? 'أقل من دقيقة' : '< 1 min';
    if (minutes < 60) return `${Math.round(minutes)} ${isRTL ? 'دقيقة' : 'min'}`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}${isRTL ? 'س' : 'h'} ${mins}${isRTL ? 'د' : 'm'}`;
  };

  const formatCurrency = (value: number) => {
    return `${value.toLocaleString()} ${isRTL ? 'ج.م' : 'EGP'}`;
  };

  const exportCSV = () => {
    const headers = [
      'Provider',
      'Total Requests',
      'Priced',
      'Won',
      'Win Rate %',
      'Avg Response (min)',
      'Total Revenue',
      'Avg Order Value',
    ];
    const rows = sortedProviders.map((p) => [
      p.provider_name,
      p.total_requests,
      p.priced_requests,
      p.won_requests,
      p.win_rate.toFixed(1),
      p.avg_response_time.toFixed(1),
      p.total_revenue,
      p.avg_order_value.toFixed(0),
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `broadcast-analytics-${dateRange.start}-to-${dateRange.end}.csv`;
    a.click();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin || !user) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-lg">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            {isRTL ? 'غير مصرح' : 'Unauthorized'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            {isRTL
              ? 'ليس لديك صلاحية للوصول لهذه الصفحة'
              : 'You do not have permission to access this page'}
          </p>
          <Link href={`/${locale}/admin/login`}>
            <Button>{isRTL ? 'تسجيل الدخول' : 'Login'}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <AdminHeader
        user={user}
        title={isRTL ? 'تحليلات البث الثلاثي' : 'Triple Broadcast Analytics'}
        onMenuClick={toggleSidebar}
      />

      <div className="p-6">
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <Link
              href={`/${locale}/admin/custom-orders`}
              className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-2"
            >
              {isRTL ? (
                <ArrowRight className="w-4 h-4 me-1" />
              ) : (
                <ArrowLeft className="w-4 h-4 me-1" />
              )}
              {isRTL ? 'العودة للوحة المراقبة' : 'Back to Monitor'}
            </Link>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-primary" />
              {isRTL ? 'تحليلات البث الثلاثي' : 'Triple Broadcast Analytics'}
            </h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                className="w-36"
              />
              <span className="text-slate-400">-</span>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                className="w-36"
              />
            </div>
            <Button variant="outline" size="icon" onClick={loadAnalytics} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="w-4 h-4 me-2" />
              {isRTL ? 'تصدير' : 'Export'}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Overview Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      (metrics?.completion_rate || 0) >= 70
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                    }`}
                  >
                    {metrics?.completion_rate.toFixed(1)}%
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {metrics?.completed_broadcasts || 0}
                  <span className="text-sm font-normal text-slate-400 ms-1">
                    / {metrics?.total_broadcasts || 0}
                  </span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isRTL ? 'البث المكتمل' : 'Completed Broadcasts'}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm"
              >
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg flex items-center justify-center mb-2">
                  <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {formatTime(metrics?.avg_time_to_first_price || 0)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isRTL ? 'متوسط وقت أول تسعير' : 'Avg Time to First Quote'}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm"
              >
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center mb-2">
                  <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {formatTime(metrics?.avg_time_to_selection || 0)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isRTL ? 'متوسط وقت الاختيار' : 'Avg Time to Selection'}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm"
              >
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center mb-2">
                  <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(metrics?.total_order_value || 0)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isRTL ? 'إجمالي قيمة الطلبات' : 'Total Order Value'}
                </p>
              </motion.div>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                      {metrics?.expired_broadcasts || 0}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isRTL ? 'منتهي الصلاحية' : 'Expired'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                      {metrics?.avg_providers_per_broadcast.toFixed(1) || 0}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isRTL ? 'متوسط التجار/بث' : 'Avg Providers/Broadcast'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                      {dailyStats.length}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isRTL ? 'أيام نشطة' : 'Active Days'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Provider Leaderboard */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden mb-6"
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    {isRTL ? 'ترتيب التجار' : 'Provider Leaderboard'}
                  </h2>
                  <div className="flex items-center gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                      className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800"
                    >
                      <option value="win_rate">{isRTL ? 'نسبة الفوز' : 'Win Rate'}</option>
                      <option value="total_requests">
                        {isRTL ? 'إجمالي الطلبات' : 'Total Requests'}
                      </option>
                      <option value="avg_response_time">
                        {isRTL ? 'وقت الاستجابة' : 'Response Time'}
                      </option>
                    </select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                    >
                      {sortOrder === 'desc' ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronUp className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-900/50">
                    <tr>
                      <th className="text-start px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                        #
                      </th>
                      <th className="text-start px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                        {isRTL ? 'التاجر' : 'Provider'}
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                        {isRTL ? 'الطلبات' : 'Requests'}
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                        {isRTL ? 'المسعرة' : 'Priced'}
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                        {isRTL ? 'الفائزة' : 'Won'}
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                        {isRTL ? 'نسبة الفوز' : 'Win Rate'}
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                        {isRTL ? 'وقت الاستجابة' : 'Resp. Time'}
                      </th>
                      <th className="text-end px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                        {isRTL ? 'الإيرادات' : 'Revenue'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {sortedProviders.map((provider, index) => (
                      <tr
                        key={provider.provider_id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-900/30"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center w-6 h-6">
                            {index === 0 && <Award className="w-5 h-5 text-amber-500" />}
                            {index === 1 && <Award className="w-5 h-5 text-slate-400" />}
                            {index === 2 && <Award className="w-5 h-5 text-amber-700" />}
                            {index > 2 && (
                              <span className="text-sm text-slate-500">{index + 1}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                              {provider.provider_logo ? (
                                <img
                                  src={provider.provider_logo}
                                  alt={provider.provider_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                  {provider.provider_name.charAt(0)}
                                </span>
                              )}
                            </div>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {provider.provider_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                          {provider.total_requests}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                          {provider.priced_requests}
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-emerald-600 dark:text-emerald-400">
                          {provider.won_requests}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span
                              className={`font-bold ${
                                provider.win_rate >= 50
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : provider.win_rate >= 25
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {provider.win_rate.toFixed(1)}%
                            </span>
                            {provider.win_rate >= 50 && (
                              <Star className="w-3 h-3 text-amber-500 fill-current" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {provider.avg_response_time <= 15 ? (
                              <TrendingDown className="w-3 h-3 text-emerald-500" />
                            ) : provider.avg_response_time >= 45 ? (
                              <TrendingUp className="w-3 h-3 text-red-500" />
                            ) : null}
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {formatTime(provider.avg_response_time)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-end font-medium text-slate-800 dark:text-slate-200">
                          {formatCurrency(provider.total_revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {sortedProviders.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400">
                    {isRTL
                      ? 'لا توجد بيانات للتجار في هذه الفترة'
                      : 'No provider data for this period'}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Daily Trend Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6"
            >
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-primary" />
                {isRTL ? 'الاتجاه اليومي' : 'Daily Trend'}
              </h2>

              {dailyStats.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-end gap-1 h-40">
                    {dailyStats.slice(-14).map((day) => {
                      const maxBroadcasts = Math.max(...dailyStats.map((d) => d.broadcasts));
                      const height = maxBroadcasts > 0 ? (day.broadcasts / maxBroadcasts) * 100 : 0;
                      const completionRate =
                        day.broadcasts > 0 ? (day.completed / day.broadcasts) * 100 : 0;

                      return (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full rounded-t-sm transition-all"
                            style={{
                              height: `${height}%`,
                              minHeight: day.broadcasts > 0 ? '8px' : '2px',
                              background: `linear-gradient(to top,
                                ${completionRate >= 70 ? '#10b981' : completionRate >= 50 ? '#f59e0b' : '#ef4444'} 0%,
                                #3b82f6 100%)`,
                            }}
                          />
                          <span className="text-[10px] text-slate-400 transform -rotate-45 origin-left translate-y-2">
                            {day.date.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-center gap-6 pt-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {isRTL ? 'إجمالي البث' : 'Total Broadcasts'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {isRTL ? 'نسبة إتمام عالية' : 'High Completion'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {isRTL ? 'نسبة إتمام متوسطة' : 'Medium Completion'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400">
                    {isRTL ? 'لا توجد بيانات يومية' : 'No daily data available'}
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

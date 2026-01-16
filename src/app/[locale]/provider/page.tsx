'use client';

import { useLocale } from 'next-intl';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { ProviderLayout, SoundTestDebug } from '@/components/provider';
import { useProviderOrderNotifications } from '@/hooks/customer';
import type { User } from '@supabase/supabase-js';
import {
  Package,
  ShoppingBag,
  BarChart3,
  Settings,
  ArrowRight,
  Clock,
  TrendingUp,
  TrendingDown,
  FileWarning,
  XCircle,
  Hourglass,
  Wallet,
  AlertCircle,
  DollarSign,
  RefreshCw,
} from 'lucide-react';
import { EngeznaLogo } from '@/components/ui/EngeznaLogo';
import { getCommissionInfo, type CommissionInfo, COMMISSION_CONFIG } from '@/lib/commission/utils';
import { Gift } from 'lucide-react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Provider type
interface Provider {
  id: string;
  name_ar: string;
  name_en: string;
  logo_url: string | null;
  status:
    | 'incomplete'
    | 'pending_approval'
    | 'approved'
    | 'rejected'
    | 'open'
    | 'closed'
    | 'temporarily_paused'
    | 'on_vacation';
  category: string;
  rejection_reason?: string | null;
  grace_period_start?: string | null;
  grace_period_end?: string | null;
  commission_status?: 'in_grace_period' | 'active' | 'exempt';
  custom_commission_rate?: number | null;
}

// Stats type
interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  activeProducts: number;
  totalOrders: number;
  totalCustomers: number;
  unrespondedReviews: number;
  unreadMessages: number;
  pendingRefunds: number;
  // Today's payment breakdown
  todayCodOrders: number;
  todayCodRevenue: number;
  todayOnlineOrders: number;
  todayOnlineRevenue: number;
  // Yesterday's data for trend calculation
  yesterdayOrders: number;
  yesterdayRevenue: number;
}

// Helper function to format currency
const formatCurrency = (amount: number, locale: string): string => {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Helper function to format numbers with locale-specific digits
const formatNumber = (num: number, locale: string): string => {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG').format(num);
};

// Helper function to calculate trend percentage
const calculateTrend = (
  current: number,
  previous: number
): { value: string; isPositive: boolean } => {
  if (previous === 0) {
    return { value: current > 0 ? '+100%' : '0%', isPositive: current >= 0 };
  }
  const change = ((current - previous) / previous) * 100;
  const isPositive = change >= 0;
  const sign = isPositive ? '+' : '';
  return { value: `${sign}${change.toFixed(1)}%`, isPositive };
};

export default function ProviderDashboard() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const [user, setUser] = useState<User | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    todayOrders: 0,
    todayRevenue: 0,
    pendingOrders: 0,
    activeProducts: 0,
    totalOrders: 0,
    totalCustomers: 0,
    unrespondedReviews: 0,
    unreadMessages: 0,
    pendingRefunds: 0,
    todayCodOrders: 0,
    todayCodRevenue: 0,
    todayOnlineOrders: 0,
    todayOnlineRevenue: 0,
    yesterdayOrders: 0,
    yesterdayRevenue: 0,
  });
  const [commissionInfo, setCommissionInfo] = useState<CommissionInfo | null>(null);

  // Real-time order notifications
  const { newOrderCount } = useProviderOrderNotifications(provider?.id || null);

  // Update stats when real-time count changes
  useEffect(() => {
    if (newOrderCount !== stats.pendingOrders && provider) {
      setStats((prev) => ({ ...prev, pendingOrders: newOrderCount }));
    }
  }, [newOrderCount, provider, stats.pendingOrders]);

  // Realtime subscription for new chat messages
  useEffect(() => {
    if (!provider) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`provider-messages-${provider.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_messages',
          filter: `sender_type=eq.customer`,
        },
        async (payload) => {
          // Check if message is for this provider's order
          const newMessage = payload.new as { order_id: string; message: string };
          const { data: orderData } = await supabase
            .from('orders')
            .select('provider_id, order_number')
            .eq('id', newMessage.order_id)
            .single();

          if (orderData?.provider_id === provider.id) {
            // Increment unread messages count
            setStats((prev) => ({ ...prev, unreadMessages: prev.unreadMessages + 1 }));
            // Play notification sound
            try {
              const audioId = 'engezna-notification-audio';
              let audio = document.getElementById(audioId) as HTMLAudioElement | null;
              if (!audio) {
                audio = document.createElement('audio');
                audio.id = audioId;
                audio.src = '/sounds/notification.mp3';
                audio.volume = 0.5;
                document.body.appendChild(audio);
              }
              audio.currentTime = 0;
              audio.play().catch(() => {});
            } catch {
              // Sound not available
            }
          }
        }
      )
      .subscribe(() => {});

    return () => {
      supabase.removeChannel(channel);
    };
  }, [provider]);

  const loadStats = useCallback(
    async (providerId: string, supabase: ReturnType<typeof createClient>) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate yesterday's date range
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayEnd = new Date(today);

      // Run all queries in parallel for faster loading
      const [
        { data: todayOrdersData },
        { data: pendingData },
        { data: productsData },
        { data: allOrdersData },
        { data: unrespondedReviewsData },
        { data: unreadMessagesData },
        { count: pendingRefundsCount },
        { data: todayRefundsData },
        { data: yesterdayOrdersData },
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('id, total, status, payment_status, payment_method')
          .eq('provider_id', providerId)
          .gte('created_at', today.toISOString()),
        supabase.from('orders').select('id').eq('provider_id', providerId).eq('status', 'pending'),
        supabase
          .from('menu_items')
          .select('id')
          .eq('provider_id', providerId)
          .eq('is_available', true),
        supabase.from('orders').select('id, customer_id').eq('provider_id', providerId),
        supabase
          .from('reviews')
          .select('id')
          .eq('provider_id', providerId)
          .is('provider_response', null),
        // Count unread messages from customers
        supabase
          .from('order_messages')
          .select('id, orders!inner(provider_id)')
          .eq('sender_type', 'customer')
          .eq('is_read', false),
        // Count pending refunds for this provider
        supabase
          .from('refunds')
          .select('*', { count: 'exact', head: true })
          .eq('provider_id', providerId)
          .eq('status', 'pending')
          .eq('provider_action', 'pending'),
        // Get today's processed refunds (all types reduce displayed revenue)
        supabase
          .from('refunds')
          .select('amount, order_id')
          .eq('provider_id', providerId)
          .in('status', ['approved', 'processed'])
          .gte('created_at', today.toISOString()),
        // Get yesterday's orders for trend calculation
        supabase
          .from('orders')
          .select('id, total, status, payment_status')
          .eq('provider_id', providerId)
          .gte('created_at', yesterday.toISOString())
          .lt('created_at', yesterdayEnd.toISOString()),
      ]);

      const uniqueCustomers = new Set(allOrdersData?.map((o) => o.customer_id) || []);
      // Only count confirmed payments for today's revenue
      const confirmedOrders =
        todayOrdersData?.filter(
          (o) => o.status === 'delivered' && o.payment_status === 'completed'
        ) || [];

      // COD vs Online breakdown for today
      const todayCodOrders = todayOrdersData?.filter((o) => o.payment_method === 'cash') || [];
      const todayOnlineOrders = todayOrdersData?.filter((o) => o.payment_method !== 'cash') || [];
      const todayCodConfirmed = todayCodOrders.filter(
        (o) => o.status === 'delivered' && o.payment_status === 'completed'
      );
      const todayOnlineConfirmed = todayOnlineOrders.filter(
        (o) => o.status === 'delivered' && o.payment_status === 'completed'
      );

      // Calculate total refunds processed today (affects today's revenue)
      const totalRefundsToday = (todayRefundsData || []).reduce(
        (sum, r) => sum + (r.amount || 0),
        0
      );

      // Filter unread messages for this provider
      // Note: Supabase join returns orders as an object (not array) for !inner single FK
      const providerUnreadMessages = (unreadMessagesData || []).filter((m) => {
        const orders = m.orders as { provider_id: string } | { provider_id: string }[] | null;
        if (!orders) return false;
        if (Array.isArray(orders)) {
          return orders.some((o) => o.provider_id === providerId);
        }
        return orders.provider_id === providerId;
      });

      // Calculate gross revenue and subtract refunds
      const grossRevenue = confirmedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const grossCodRevenue = todayCodConfirmed.reduce((sum, o) => sum + (o.total || 0), 0);
      const grossOnlineRevenue = todayOnlineConfirmed.reduce((sum, o) => sum + (o.total || 0), 0);

      // Calculate yesterday's stats for trend comparison
      const yesterdayConfirmedOrders =
        yesterdayOrdersData?.filter(
          (o) => o.status === 'delivered' && o.payment_status === 'completed'
        ) || [];
      const yesterdayGrossRevenue = yesterdayConfirmedOrders.reduce(
        (sum, o) => sum + (o.total || 0),
        0
      );

      setStats({
        todayOrders: todayOrdersData?.length || 0,
        todayRevenue: Math.max(0, grossRevenue - totalRefundsToday),
        pendingOrders: pendingData?.length || 0,
        activeProducts: productsData?.length || 0,
        totalOrders: allOrdersData?.length || 0,
        totalCustomers: uniqueCustomers.size,
        unrespondedReviews: unrespondedReviewsData?.length || 0,
        unreadMessages: providerUnreadMessages.length,
        pendingRefunds: pendingRefundsCount || 0,
        todayCodOrders: todayCodOrders.length,
        todayCodRevenue: grossCodRevenue,
        todayOnlineOrders: todayOnlineOrders.length,
        todayOnlineRevenue: grossOnlineRevenue,
        yesterdayOrders: yesterdayOrdersData?.length || 0,
        yesterdayRevenue: yesterdayGrossRevenue,
      });
    },
    []
  );

  const checkAuth = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      // Load provider owned by current user
      const { data: providerData } = await supabase
        .from('providers')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1);

      if (providerData && providerData.length > 0) {
        const providerRecord = providerData[0];
        setProvider(providerRecord);
        // Calculate commission info
        const info = getCommissionInfo(providerRecord);
        setCommissionInfo(info);
        await loadStats(providerRecord.id, supabase);
      }
    }

    setLoading(false);
  }, [loadStats]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
          <div className="flex justify-center mb-4">
            <EngeznaLogo size="lg" static showPen={false} />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-slate-900">
            {locale === 'ar' ? 'لوحة مقدم الخدمة' : 'Provider Dashboard'}
          </h1>
          <p className="text-slate-600 mb-6">
            {locale === 'ar'
              ? 'يجب تسجيل الدخول للوصول إلى لوحة التحكم'
              : 'Please login to access your dashboard'}
          </p>
          <Link href={`/${locale}/auth/login`}>
            <Button size="lg">{locale === 'ar' ? 'تسجيل الدخول' : 'Login'}</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Main dashboard content - wrapped in ProviderLayout for consistent notifications
  return (
    <ProviderLayout
      pageTitle={{ ar: 'لوحة تحكم المتجر', en: 'Store Dashboard' }}
      pageSubtitle={{ ar: 'نظرة عامة على متجرك', en: 'Overview of your store' }}
    >
      {/* Status Messages */}
      {provider?.status === 'incomplete' && (
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-6 border border-amber-200 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileWarning className="w-7 h-7 text-white" />
            </div>
            <div className="flex-grow">
              <h3 className="text-xl font-bold mb-2 text-amber-800">
                {locale === 'ar' ? 'أكمل ملفك الشخصي' : 'Complete Your Profile'}
              </h3>
              <p className="text-slate-700 mb-4 text-sm">
                {locale === 'ar'
                  ? 'معلومات متجرك غير مكتملة. أكمل المعلومات التالية للحصول على الموافقة والبدء في استقبال الطلبات:'
                  : 'Your store information is incomplete. Complete the following to get approved and start receiving orders:'}
              </p>
              <Link href={`/${locale}/provider/complete-profile`}>
                <Button className="!bg-amber-500 hover:!bg-amber-600 !text-white shadow-md">
                  {locale === 'ar' ? 'إكمال الملف' : 'Complete Profile'}
                  <ArrowRight
                    className={`w-4 h-4 !text-white ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`}
                  />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {provider?.status === 'pending_approval' && (
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
              <Hourglass className="w-7 h-7 text-white" />
            </div>
            <div className="flex-grow">
              <h3 className="text-xl font-bold mb-2 text-primary">
                {locale === 'ar' ? 'قيد المراجعة' : 'Under Review'}
              </h3>
              <p className="text-slate-700 text-sm">
                {locale === 'ar'
                  ? 'تم إرسال طلبك وهو قيد المراجعة من فريقنا. سنقوم بإخطارك عند الموافقة على متجرك.'
                  : 'Your application has been submitted and is being reviewed by our team. We will notify you once your store is approved.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {provider?.status === 'rejected' && (
        <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 border border-red-200 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <XCircle className="w-7 h-7 text-white" />
            </div>
            <div className="flex-grow">
              <h3 className="text-xl font-bold mb-2 text-red-700">
                {locale === 'ar' ? 'تم رفض الطلب' : 'Application Rejected'}
              </h3>
              <p className="text-slate-700 mb-2 text-sm">
                {locale === 'ar' ? 'سبب الرفض:' : 'Reason:'}{' '}
                {provider.rejection_reason ||
                  (locale === 'ar' ? 'لم يتم تحديد سبب' : 'No reason provided')}
              </p>
              <Link href={`/${locale}/provider/complete-profile`}>
                <Button className="!bg-red-500 hover:!bg-red-600 !text-white shadow-md">
                  {locale === 'ar' ? 'تعديل وإعادة الإرسال' : 'Edit & Resubmit'}
                  <ArrowRight
                    className={`w-4 h-4 !text-white ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`}
                  />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* No Provider - Show registration prompt */}
      {!provider && user && (
        <div className="bg-gradient-to-br from-primary/5 to-cyan-50 rounded-2xl p-6 border border-primary/20 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-7 h-7 text-white" />
            </div>
            <div className="flex-grow">
              <h3 className="text-xl font-bold mb-2 text-primary">
                {locale === 'ar' ? 'لم يتم إكمال التسجيل' : 'Registration Incomplete'}
              </h3>
              <p className="text-slate-700 mb-4 text-sm">
                {locale === 'ar'
                  ? 'يبدو أنك لم تكمل تسجيلك كشريك. هل تريد التسجيل الآن؟'
                  : "It seems you haven't completed your partner registration. Would you like to register now?"}
              </p>
              <Link href={`/${locale}/partner/register`}>
                <Button className="!bg-primary hover:!bg-primary/90 !text-white shadow-md">
                  {locale === 'ar' ? 'سجل كشريك' : 'Register as Partner'}
                  <ArrowRight
                    className={`w-4 h-4 !text-white ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`}
                  />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Stats - Only for approved/open providers */}
      {(provider?.status === 'approved' ||
        provider?.status === 'open' ||
        provider?.status === 'closed' ||
        provider?.status === 'temporarily_paused') && (
        <>
          {/* Stats Grid - Using brand color system */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
            {/* Today's Orders - Primary Blue Card */}
            <div className="bg-[hsl(var(--card-bg-primary))] rounded-2xl p-4 lg:p-5 border border-primary/20 shadow-elegant hover:shadow-elegant-lg hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-primary/15 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-primary" strokeWidth={1.8} />
                </div>
                {(() => {
                  const trend = calculateTrend(stats.todayOrders, stats.yesterdayOrders);
                  return (
                    <span
                      className={`text-xs flex items-center gap-1 ${trend.isPositive ? 'text-success' : 'text-destructive'}`}
                    >
                      {trend.isPositive ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {trend.value}
                    </span>
                  );
                })()}
              </div>
              <p className="text-2xl font-bold text-[hsl(var(--text-primary))] font-numbers">
                {formatNumber(stats.todayOrders, locale)}
              </p>
              <p className="text-xs text-[hsl(var(--text-secondary))]">
                {locale === 'ar' ? 'طلبات اليوم' : "Today's Orders"}
              </p>
            </div>

            {/* Today's Revenue - Success Green Card */}
            <div className="bg-[hsl(var(--card-bg-success))] rounded-2xl p-4 lg:p-5 border border-success/20 shadow-elegant hover:shadow-elegant-lg hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-success/15 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-success" strokeWidth={1.8} />
                </div>
                {(() => {
                  const trend = calculateTrend(stats.todayRevenue, stats.yesterdayRevenue);
                  return (
                    <span
                      className={`text-xs flex items-center gap-1 ${trend.isPositive ? 'text-success' : 'text-destructive'}`}
                    >
                      {trend.isPositive ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {trend.value}
                    </span>
                  );
                })()}
              </div>
              <p className="text-2xl font-bold text-[hsl(var(--text-primary))] font-numbers">
                {formatCurrency(stats.todayRevenue, locale)}{' '}
                <span className="text-sm text-[hsl(var(--text-muted))]">
                  {locale === 'ar' ? 'ج.م' : 'EGP'}
                </span>
              </p>
              <p className="text-xs text-[hsl(var(--text-secondary))]">
                {locale === 'ar' ? 'إيرادات اليوم' : "Today's Revenue"}
              </p>
            </div>

            {/* Pending Orders - Warning Yellow Card */}
            <div className="bg-[hsl(var(--card-bg-warning))] rounded-2xl p-4 lg:p-5 border border-warning/20 shadow-elegant hover:shadow-elegant-lg hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-warning/15 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[hsl(42_100%_40%)]" strokeWidth={1.8} />
                </div>
              </div>
              <p className="text-2xl font-bold text-[hsl(var(--text-primary))] font-numbers">
                {formatNumber(stats.pendingOrders, locale)}
              </p>
              <p className="text-xs text-[hsl(var(--text-secondary))]">
                {locale === 'ar' ? 'طلبات قيد الانتظار' : 'Pending Orders'}
              </p>
            </div>

            {/* Active Products - Info Cyan Card */}
            <div className="bg-[hsl(var(--card-bg-info))] rounded-2xl p-4 lg:p-5 border border-info/20 shadow-elegant hover:shadow-elegant-lg hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-info/15 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" strokeWidth={1.8} />
                </div>
              </div>
              <p className="text-2xl font-bold text-[hsl(var(--text-primary))] font-numbers">
                {formatNumber(stats.activeProducts, locale)}
              </p>
              <p className="text-xs text-[hsl(var(--text-secondary))]">
                {locale === 'ar' ? 'المنتجات النشطة' : 'Active Products'}
              </p>
            </div>
          </div>

          {/* Grace Period / Commission Status Card */}
          {commissionInfo && (
            <div
              className={`rounded-2xl p-5 border shadow-elegant hover:shadow-elegant-lg transition-all duration-300 mb-6 ${
                commissionInfo.isInGracePeriod
                  ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
                  : 'bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    commissionInfo.isInGracePeriod ? 'bg-emerald-500' : 'bg-slate-500'
                  }`}
                >
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div className="flex-grow">
                  <h3
                    className={`text-lg font-bold mb-1 ${
                      commissionInfo.isInGracePeriod ? 'text-emerald-700' : 'text-slate-700'
                    }`}
                  >
                    {commissionInfo.isInGracePeriod
                      ? locale === 'ar'
                        ? '🎉 فترة السماح المجانية'
                        : '🎉 Free Grace Period'
                      : locale === 'ar'
                        ? 'نسبة العمولة'
                        : 'Commission Rate'}
                  </h3>
                  {commissionInfo.isInGracePeriod ? (
                    <div>
                      <p className="text-emerald-600 text-sm mb-2">
                        {locale === 'ar'
                          ? `متبقي ${formatNumber(commissionInfo.daysRemaining || 0, locale)} يوم من فترة السماح المجانية (6 أشهر)`
                          : `${formatNumber(commissionInfo.daysRemaining || 0, locale)} days remaining in your free grace period (6 months)`}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>
                          {locale === 'ar' ? 'العمولة الحالية:' : 'Current rate:'}{' '}
                          <strong className="text-emerald-600">0%</strong>
                        </span>
                        {commissionInfo.gracePeriodEndDate && (
                          <span>
                            {locale === 'ar' ? 'تنتهي:' : 'Ends:'}{' '}
                            {commissionInfo.gracePeriodEndDate?.toLocaleDateString(
                              locale === 'ar' ? 'ar-EG' : 'en-US',
                              { year: 'numeric', month: 'long', day: 'numeric' }
                            ) || (locale === 'ar' ? 'غير محدد' : 'N/A')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        {locale === 'ar'
                          ? `بعد انتهاء فترة السماح، ستكون العمولة ${COMMISSION_CONFIG.MAX_RATE}% كحد أقصى`
                          : `After grace period ends, commission will be up to ${COMMISSION_CONFIG.MAX_RATE}%`}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-2xl font-bold text-slate-900">
                        {locale === 'ar'
                          ? `حتى ${commissionInfo.rate}%`
                          : `Up to ${commissionInfo.rate}%`}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {locale === 'ar'
                          ? 'على قيمة الطلبات (بدون رسوم توصيل)'
                          : 'On order value (excluding delivery)'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Today's Payment Breakdown */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-elegant mb-6">
            <h3 className="text-sm font-semibold text-[hsl(var(--text-primary))] mb-3 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              {locale === 'ar' ? 'طلبات اليوم حسب طريقة الدفع' : "Today's Orders by Payment Method"}
            </h3>
            {stats.todayOrders > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {/* COD */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200/60 shadow-sm hover:shadow-elegant transition-all duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-xs font-semibold text-amber-700">
                      {locale === 'ar' ? 'كاش' : 'COD'}
                    </span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 font-numbers">
                    {formatNumber(stats.todayCodOrders, locale)}{' '}
                    <span className="text-sm font-medium text-slate-500">
                      {locale === 'ar' ? 'طلب' : 'orders'}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1 font-numbers">
                    {formatCurrency(stats.todayCodRevenue, locale)}{' '}
                    {locale === 'ar' ? 'ج.م مؤكد' : 'EGP confirmed'}
                  </p>
                </div>
                {/* Online */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200/60 shadow-sm hover:shadow-elegant transition-all duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-xs font-semibold text-blue-700">
                      {locale === 'ar' ? 'إلكتروني' : 'Online'}
                    </span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 font-numbers">
                    {formatNumber(stats.todayOnlineOrders, locale)}{' '}
                    <span className="text-sm font-medium text-slate-500">
                      {locale === 'ar' ? 'طلب' : 'orders'}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1 font-numbers">
                    {formatCurrency(stats.todayOnlineRevenue, locale)}{' '}
                    {locale === 'ar' ? 'ج.م مؤكد' : 'EGP confirmed'}
                  </p>
                </div>
              </div>
            ) : (
              // Empty State
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 text-sm">
                  {locale === 'ar' ? 'لا توجد طلبات اليوم بعد' : 'No orders today yet'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {locale === 'ar'
                    ? 'ستظهر الطلبات هنا عند استلامها'
                    : 'Orders will appear here when received'}
                </p>
              </div>
            )}
          </div>

          {/* Performance Indicators - Using text hierarchy */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-elegant mb-6">
            <h3 className="text-lg font-bold text-[hsl(var(--text-primary))] mb-4">
              {locale === 'ar' ? 'مؤشرات الأداء' : 'Performance Indicators'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-[hsl(var(--text-secondary))] mb-1">
                  {locale === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}
                </p>
                <p className="text-3xl font-bold text-[hsl(var(--text-primary))] font-numbers">
                  {formatNumber(stats.totalOrders, locale)}
                </p>
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--text-secondary))] mb-1">
                  {locale === 'ar' ? 'إجمالي العملاء' : 'Total Customers'}
                </p>
                <p className="text-3xl font-bold text-[hsl(var(--text-primary))] font-numbers">
                  {formatNumber(stats.totalCustomers, locale)}
                </p>
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--text-secondary))] mb-1">
                  {locale === 'ar' ? 'المنتجات النشطة' : 'Active Products'}
                </p>
                <p className="text-3xl font-bold text-[hsl(var(--text-primary))] font-numbers">
                  {formatNumber(stats.activeProducts, locale)}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions - Using unified icon styling */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href={`/${locale}/provider/orders`}
              className="bg-white rounded-2xl p-5 border border-slate-100 shadow-elegant hover:shadow-elegant-lg hover:-translate-y-1 hover:border-primary/30 transition-all duration-300 group"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-6 h-6 text-primary" strokeWidth={1.8} />
              </div>
              <p className="font-semibold text-slate-800">
                {locale === 'ar' ? 'الطلبات' : 'Orders'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {locale === 'ar' ? 'إدارة الطلبات' : 'Manage orders'}
              </p>
            </Link>

            <Link
              href={`/${locale}/provider/products`}
              className="bg-white rounded-2xl p-5 border border-slate-100 shadow-elegant hover:shadow-elegant-lg hover:-translate-y-1 hover:border-primary/30 transition-all duration-300 group"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Package className="w-6 h-6 text-primary" strokeWidth={1.8} />
              </div>
              <p className="font-semibold text-slate-800">
                {locale === 'ar' ? 'المنتجات' : 'Products'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {locale === 'ar' ? 'إدارة القائمة' : 'Manage menu'}
              </p>
            </Link>

            <Link
              href={`/${locale}/provider/reports`}
              className="bg-white rounded-2xl p-5 border border-slate-100 shadow-elegant hover:shadow-elegant-lg hover:-translate-y-1 hover:border-success/30 transition-all duration-300 group"
            >
              <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6 text-success" strokeWidth={1.8} />
              </div>
              <p className="font-semibold text-slate-800">
                {locale === 'ar' ? 'التقارير' : 'Reports'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {locale === 'ar' ? 'عرض الإحصائيات' : 'View analytics'}
              </p>
            </Link>

            <Link
              href={`/${locale}/provider/settings`}
              className="bg-white rounded-2xl p-5 border border-slate-100 shadow-elegant hover:shadow-elegant-lg hover:-translate-y-1 hover:border-slate-300 transition-all duration-300 group"
            >
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Settings className="w-6 h-6 text-slate-600" strokeWidth={1.8} />
              </div>
              <p className="font-semibold text-slate-800">
                {locale === 'ar' ? 'الإعدادات' : 'Settings'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {locale === 'ar' ? 'إعدادات المتجر' : 'Store settings'}
              </p>
            </Link>
          </div>
        </>
      )}

      {/* Debug component for testing sounds - only visible in development */}
      <SoundTestDebug />
    </ProviderLayout>
  );
}

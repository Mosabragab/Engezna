'use client';

import { useLocale } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { csrfHeaders } from '@/lib/security/csrf-client';
import { AdminHeader, useAdminSidebar, AdminLayout } from '@/components/admin';
import { formatNumber, formatDate, formatCurrency } from '@/lib/utils/formatters';
import {
  Shield,
  Store,
  CheckCircle2,
  XCircle,
  Clock,
  PauseCircle,
  PlayCircle,
  Star,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  X,
  Edit2,
  Crown,
  Package,
  DollarSign,
  Percent,
  Calendar,
  User as UserIcon,
  Eye,
  AlertTriangle,
  AlertCircle,
  BadgeCheck,
  Landmark,
  Truck,
  Timer,
} from 'lucide-react';
import { BUSINESS_CATEGORIES } from '@/lib/constants/categories';

// Business hours structure (JSONB in database)
interface BusinessHours {
  monday?: { open: string; close: string; is_open?: boolean };
  tuesday?: { open: string; close: string; is_open?: boolean };
  wednesday?: { open: string; close: string; is_open?: boolean };
  thursday?: { open: string; close: string; is_open?: boolean };
  friday?: { open: string; close: string; is_open?: boolean };
  saturday?: { open: string; close: string; is_open?: boolean };
  sunday?: { open: string; close: string; is_open?: boolean };
}

interface Provider {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  category: string;
  logo_url: string | null;
  cover_image_url: string | null;
  status: string;
  rejection_reason: string | null;
  commission_rate: number;
  rating: number;
  total_reviews: number;
  total_orders: number;
  is_featured: boolean;
  is_verified: boolean;
  verified_at: string | null;
  verified_by: string | null;
  phone: string | null;
  email: string | null;
  address_ar: string | null;
  address_en: string | null;
  business_hours: BusinessHours | null;
  delivery_fee: number;
  min_order_amount: number;
  estimated_delivery_time_min: number;
  created_at: string;
  updated_at: string;
  governorate?: { id: string; name_ar: string; name_en: string } | null;
  city?: { id: string; name_ar: string; name_en: string } | null;
  // Grace period & commission
  commission_status: string | null;
  grace_period_start: string | null;
  grace_period_end: string | null;
  // Bank details
  bank_name: string | null;
  account_holder_name: string | null;
  account_number: string | null;
  iban: string | null;
  // Delivery & pickup
  supports_pickup: boolean;
  pickup_instructions_ar: string | null;
  pickup_instructions_en: string | null;
  operation_mode: string | null;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  customer?: { full_name: string };
}

export default function ProviderDetailPage() {
  const locale = useLocale();
  const params = useParams();
  const router = useRouter();
  const isRTL = locale === 'ar';
  const providerId = params.id as string;

  const { toggle: toggleSidebar } = useAdminSidebar();

  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [provider, setProvider] = useState<Provider | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCommission: 0,
    completedOrders: 0,
    pendingOrders: 0,
    liveRating: 0,
    totalReviews: 0,
  });

  // Modal states
  const [showActionModal, setShowActionModal] = useState(false);
  const [currentAction, setCurrentAction] = useState<
    'approve' | 'reject' | 'suspend' | 'reactivate' | null
  >(null);
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [newCommissionRate, setNewCommissionRate] = useState(0);
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [commissionError, setCommissionError] = useState<string | null>(null);
  const [commissionSuccess, setCommissionSuccess] = useState(false);

  // Define loadProviderStats first (called by loadProvider)
  const loadProviderStats = useCallback(async () => {
    const supabase = createClient();

    // Fetch orders and reviews in parallel
    const [ordersResult, reviewsResult] = await Promise.all([
      supabase
        .from('orders')
        .select('status, total, platform_commission')
        .eq('provider_id', providerId),
      supabase.from('reviews').select('rating').eq('provider_id', providerId),
    ]);

    const orders = ordersResult.data;
    const reviews = reviewsResult.data;

    if (orders) {
      const completed = orders.filter((o) => o.status === 'delivered');
      const pending = orders.filter((o) =>
        ['pending', 'confirmed', 'preparing', 'ready', 'delivering'].includes(o.status)
      );

      // Calculate live rating from reviews
      let liveRating = 0;
      const totalReviews = reviews?.length || 0;
      if (reviews && totalReviews > 0) {
        liveRating =
          Math.round((reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews) * 10) /
          10;
      }

      setStats({
        totalRevenue: completed.reduce((sum, o) => sum + (o.total || 0), 0),
        totalCommission: completed.reduce((sum, o) => sum + (o.platform_commission || 0), 0),
        completedOrders: completed.length,
        pendingOrders: pending.length,
        liveRating,
        totalReviews,
      });
    }
  }, [providerId]);

  // Define loadRecentOrders second (called by loadProvider)
  const loadRecentOrders = useCallback(async () => {
    const supabase = createClient();

    // Query orders without JOIN (customer_id is nullable — separate query per project rules)
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, status, total, created_at, customer_id')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (orders && orders.length > 0) {
      // Fetch customer names separately from profiles
      const customerIds = [...new Set(orders.map((o) => o.customer_id).filter(Boolean))];
      let profileMap = new Map<string, string>();

      if (customerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', customerIds);

        profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);
      }

      setRecentOrders(
        orders.map((o) => ({
          id: o.id,
          order_number: o.order_number,
          status: o.status,
          total: o.total,
          created_at: o.created_at,
          customer: o.customer_id ? { full_name: profileMap.get(o.customer_id) || '' } : undefined,
        }))
      );
    } else {
      setRecentOrders([]);
    }
  }, [providerId]);

  // Define loadProvider third (uses loadProviderStats and loadRecentOrders)
  const loadProvider = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ action: 'get', providerId }),
      });
      const result = await response.json();

      if (result.success && result.data) {
        setProvider(result.data);
        setNewCommissionRate(result.data.commission_rate || 10);
        await loadProviderStats();
        await loadRecentOrders();
      }
    } catch {
      // Error handled silently
    }
  }, [providerId, loadProviderStats, loadRecentOrders]);

  // Define checkAuth fourth (uses loadProvider)
  const checkAuth = useCallback(async () => {
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
        await loadProvider();
      }
    }

    setLoading(false);
  }, [loadProvider]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  function openActionModal(action: 'approve' | 'reject' | 'suspend' | 'reactivate') {
    setCurrentAction(action);
    setActionReason('');
    setShowActionModal(true);
  }

  async function executeAction() {
    if (!currentAction) return;

    setActionLoading(true);

    try {
      const actionMap = {
        approve: 'approve',
        reject: 'reject',
        suspend: 'suspend',
        reactivate: 'reactivate',
      };

      const response = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({
          action: actionMap[currentAction],
          providerId,
          reason: actionReason || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        await loadProvider();
        setShowActionModal(false);
        setCurrentAction(null);
      }
    } catch {
      // Error handled silently
    }

    setActionLoading(false);
  }

  async function updateCommission() {
    setCommissionLoading(true);
    setCommissionError(null);
    setCommissionSuccess(false);

    try {
      const response = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({
          action: 'updateCommission',
          providerId,
          commissionRate: newCommissionRate,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCommissionSuccess(true);
        await loadProvider();
        setTimeout(() => {
          setShowCommissionModal(false);
          setCommissionSuccess(false);
        }, 1500);
      } else {
        setCommissionError(
          result.error || (locale === 'ar' ? 'فشل في تحديث العمولة' : 'Failed to update commission')
        );
      }
    } catch (err) {
      console.error('Commission update error:', err);
      setCommissionError(locale === 'ar' ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred');
    }

    setCommissionLoading(false);
  }

  async function toggleFeatured() {
    try {
      const response = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({
          action: 'toggleFeatured',
          providerId,
          isFeatured: !provider?.is_featured,
        }),
      });

      const result = await response.json();

      if (result.success) {
        await loadProvider();
      }
    } catch {
      // Error handled silently
    }
  }

  async function toggleVerified() {
    try {
      const response = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({
          action: 'toggleVerified',
          providerId,
          isVerified: !provider?.is_verified,
        }),
      });

      const result = await response.json();

      if (result.success) {
        await loadProvider();
      }
    } catch {
      // Error handled silently
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-700';
      case 'closed':
        return 'bg-slate-100 text-slate-700';
      case 'pending_approval':
        return 'bg-amber-100 text-amber-700';
      case 'incomplete':
        return 'bg-orange-100 text-orange-700';
      case 'temporarily_paused':
        return 'bg-yellow-100 text-yellow-700';
      case 'on_vacation':
        return 'bg-blue-100 text-blue-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      open: { ar: 'مفتوح', en: 'Open' },
      closed: { ar: 'مغلق', en: 'Closed' },
      pending_approval: { ar: 'قيد المراجعة', en: 'Pending Approval' },
      incomplete: { ar: 'غير مكتمل', en: 'Incomplete' },
      temporarily_paused: { ar: 'متوقف مؤقتاً', en: 'Paused' },
      on_vacation: { ar: 'في إجازة', en: 'On Vacation' },
      rejected: { ar: 'مرفوض', en: 'Rejected' },
    };
    return labels[status]?.[locale === 'ar' ? 'ar' : 'en'] || status;
  };

  const getCategoryLabel = (category: string) => {
    const cat = BUSINESS_CATEGORIES[category as keyof typeof BUSINESS_CATEGORIES];
    if (cat) {
      return locale === 'ar' ? cat.name_ar : cat.name_en;
    }
    return category;
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const getOrderStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      pending: { ar: 'في الانتظار', en: 'Pending' },
      confirmed: { ar: 'مؤكد', en: 'Confirmed' },
      preparing: { ar: 'قيد التحضير', en: 'Preparing' },
      ready: { ar: 'جاهز', en: 'Ready' },
      delivering: { ar: 'قيد التوصيل', en: 'Delivering' },
      delivered: { ar: 'تم التوصيل', en: 'Delivered' },
      cancelled: { ar: 'ملغي', en: 'Cancelled' },
    };
    return labels[status]?.[locale === 'ar' ? 'ar' : 'en'] || status;
  };

  const getActionConfig = (action: 'approve' | 'reject' | 'suspend' | 'reactivate') => {
    const configs = {
      approve: {
        title: { ar: 'قبول المتجر', en: 'Approve Provider' },
        message: { ar: 'هل تريد قبول هذا المتجر؟', en: 'Approve this provider?' },
        confirmText: { ar: 'قبول', en: 'Approve' },
        color: 'bg-green-600 hover:bg-green-700',
        icon: CheckCircle2,
        requiresReason: false,
      },
      reject: {
        title: { ar: 'رفض المتجر', en: 'Reject Provider' },
        message: { ar: 'هل تريد رفض هذا المتجر؟', en: 'Reject this provider?' },
        confirmText: { ar: 'رفض', en: 'Reject' },
        color: 'bg-red-600 hover:bg-red-700',
        icon: XCircle,
        requiresReason: true,
      },
      suspend: {
        title: { ar: 'إيقاف المتجر', en: 'Suspend Provider' },
        message: { ar: 'هل تريد إيقاف هذا المتجر مؤقتاً؟', en: 'Suspend this provider?' },
        confirmText: { ar: 'إيقاف', en: 'Suspend' },
        color: 'bg-yellow-600 hover:bg-yellow-700',
        icon: PauseCircle,
        requiresReason: true,
      },
      reactivate: {
        title: { ar: 'إعادة تفعيل المتجر', en: 'Reactivate Provider' },
        message: { ar: 'هل تريد إعادة تفعيل هذا المتجر؟', en: 'Reactivate this provider?' },
        confirmText: { ar: 'تفعيل', en: 'Reactivate' },
        color: 'bg-green-600 hover:bg-green-700',
        icon: PlayCircle,
        requiresReason: false,
      },
    };
    return configs[action];
  };

  if (loading) {
    return (
      <>
        <div className="h-16 bg-white border-b border-slate-200 animate-pulse" />
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
        </div>
      </>
    );
  }

  if (!user || !isAdmin) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <h1 className="text-lg font-semibold text-slate-900">
              {locale === 'ar' ? 'غير مصرح' : 'Unauthorized'}
            </h1>
          </div>
        </header>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-slate-900">
              {locale === 'ar' ? 'غير مصرح' : 'Unauthorized'}
            </h1>
            <Link href={`/${locale}/auth/login`}>
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                {locale === 'ar' ? 'تسجيل الدخول' : 'Login'}
              </Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (!provider) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
            <Store className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-slate-900">
              {locale === 'ar' ? 'المتجر غير موجود' : 'Provider Not Found'}
            </h1>
            <Link href={`/${locale}/admin/providers`}>
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                {locale === 'ar' ? 'العودة للقائمة' : 'Back to List'}
              </Button>
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      {/* Header */}
      <AdminHeader
        user={user}
        title={locale === 'ar' ? 'تفاصيل المتجر' : 'Provider Details'}
        onMenuClick={toggleSidebar}
      />

      {/* Page Content */}
      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        {/* Back Button */}
        <Link
          href={`/${locale}/admin/providers`}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{locale === 'ar' ? 'العودة للقائمة' : 'Back to List'}</span>
        </Link>

        {/* Provider Header */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Logo */}
            <div className="w-24 h-24 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
              {provider.logo_url ? (
                <img src={provider.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Store className="w-12 h-12 text-slate-400" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 mb-1">
                    {locale === 'ar' ? provider.name_ar : provider.name_en}
                  </h1>
                  <p className="text-sm text-slate-500">{getCategoryLabel(provider.category)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm px-3 py-1 rounded-full ${getStatusColor(provider.status)}`}
                  >
                    {getStatusLabel(provider.status)}
                  </span>
                  {provider.is_featured && (
                    <span className="text-sm px-3 py-1 rounded-full bg-premium/20 text-foreground flex items-center gap-1">
                      <Crown className="w-4 h-4 text-premium" />
                      {locale === 'ar' ? 'مميز' : 'Featured'}
                    </span>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                {provider.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {provider.phone}
                  </span>
                )}
                {provider.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {provider.email}
                  </span>
                )}
                {(provider.governorate || provider.city) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {locale === 'ar'
                      ? `${provider.city?.name_ar || ''} ${provider.governorate?.name_ar || ''}`
                      : `${provider.city?.name_en || ''} ${provider.governorate?.name_en || ''}`}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {locale === 'ar' ? 'انضم في: ' : 'Joined: '}
                  {formatDate(provider.created_at, locale)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 lg:flex-col">
              {provider.status === 'pending_approval' || provider.status === 'incomplete' ? (
                <>
                  <Button
                    onClick={() => openActionModal('approve')}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle2 className="w-4 h-4 me-2" />
                    {locale === 'ar' ? 'قبول' : 'Approve'}
                  </Button>
                  <Button
                    onClick={() => openActionModal('reject')}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <XCircle className="w-4 h-4 me-2" />
                    {locale === 'ar' ? 'رفض' : 'Reject'}
                  </Button>
                </>
              ) : ['open', 'closed'].includes(provider.status) ? (
                <Button
                  onClick={() => openActionModal('suspend')}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  <PauseCircle className="w-4 h-4 me-2" />
                  {locale === 'ar' ? 'إيقاف مؤقت' : 'Suspend'}
                </Button>
              ) : provider.status === 'temporarily_paused' ? (
                <Button
                  onClick={() => openActionModal('reactivate')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <PlayCircle className="w-4 h-4 me-2" />
                  {locale === 'ar' ? 'إعادة تفعيل' : 'Reactivate'}
                </Button>
              ) : null}

              <Button
                onClick={() => {
                  setCommissionError(null);
                  setCommissionSuccess(false);
                  setShowCommissionModal(true);
                }}
                variant="outline"
                className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400"
              >
                <Percent className="w-4 h-4 me-2" />
                {locale === 'ar' ? 'تعديل العمولة' : 'Edit Commission'}
              </Button>

              <Button
                onClick={toggleFeatured}
                variant="outline"
                className={
                  provider.is_featured
                    ? 'border-premium bg-premium/10 text-foreground hover:bg-premium/20'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400'
                }
              >
                <Crown className="w-4 h-4 me-2" />
                {provider.is_featured
                  ? locale === 'ar'
                    ? 'إزالة التميز'
                    : 'Remove Featured'
                  : locale === 'ar'
                    ? 'تمييز المتجر'
                    : 'Mark Featured'}
              </Button>

              <Button
                onClick={toggleVerified}
                variant="outline"
                className={
                  provider.is_verified
                    ? 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400'
                }
              >
                <BadgeCheck className="w-4 h-4 me-2" />
                {provider.is_verified
                  ? locale === 'ar'
                    ? 'إلغاء التوثيق'
                    : 'Remove Verified'
                  : locale === 'ar'
                    ? 'توثيق المتجر'
                    : 'Verify Provider'}
              </Button>

              <Link href={`/${locale}/admin/providers/${providerId}/products`}>
                <Button
                  variant="outline"
                  className="w-full border-primary text-primary hover:bg-primary/10"
                >
                  <Package className="w-4 h-4 me-2" />
                  {locale === 'ar' ? 'إدارة المنتجات' : 'Manage Products'}
                </Button>
              </Link>
            </div>
          </div>

          {/* Rejection Reason */}
          {provider.rejection_reason && provider.status === 'rejected' && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-700">
                    {locale === 'ar' ? 'سبب الرفض:' : 'Rejection Reason:'}
                  </p>
                  <p className="text-sm text-red-600">{provider.rejection_reason}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Star className="w-5 h-5 text-amber-500" />
              <span className="text-sm text-slate-600">
                {locale === 'ar' ? 'التقييم' : 'Rating'}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatNumber(stats.liveRating, locale)}
              <span className="text-sm text-slate-400 font-normal ms-1">
                ({formatNumber(stats.totalReviews, locale)} {locale === 'ar' ? 'تقييم' : 'reviews'})
              </span>
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-slate-600">
                {locale === 'ar' ? 'الطلبات' : 'Orders'}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatNumber(stats.completedOrders, locale)}
            </p>
            <p className="text-xs text-slate-500">
              {formatNumber(stats.pendingOrders, locale)}{' '}
              {locale === 'ar' ? 'قيد التنفيذ' : 'pending'}
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <span className="text-sm text-slate-600">
                {locale === 'ar' ? 'الإيرادات' : 'Revenue'}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(stats.totalRevenue, locale)}
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Percent className="w-5 h-5 text-purple-500" />
              <span className="text-sm text-slate-600">
                {locale === 'ar' ? 'العمولة' : 'Commission'}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatNumber(provider.commission_rate, locale)}%
            </p>
            <p className="text-xs text-slate-500">
              {formatCurrency(stats.totalCommission, locale)} {locale === 'ar' ? 'إجمالي' : 'total'}
            </p>
          </div>
        </div>

        {/* Provider Info & Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Provider Details */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              {locale === 'ar' ? 'معلومات المتجر' : 'Provider Information'}
            </h2>

            <div className="space-y-4">
              {provider.description_ar && (
                <div>
                  <label className="text-sm text-slate-500 block mb-1">
                    {locale === 'ar' ? 'الوصف' : 'Description'}
                  </label>
                  <p className="text-slate-700">
                    {locale === 'ar' ? provider.description_ar : provider.description_en}
                  </p>
                </div>
              )}

              {(provider.address_ar || provider.address_en) && (
                <div>
                  <label className="text-sm text-slate-500 block mb-1">
                    {locale === 'ar' ? 'العنوان' : 'Address'}
                  </label>
                  <p className="text-slate-700">
                    {locale === 'ar' ? provider.address_ar : provider.address_en}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500 block mb-1">
                    {locale === 'ar' ? 'وقت التوصيل المتوقع' : 'Est. Delivery Time'}
                  </label>
                  <p className="text-slate-700">
                    {formatNumber(provider.estimated_delivery_time_min, locale)}{' '}
                    {locale === 'ar' ? 'دقيقة' : 'min'}
                  </p>
                </div>

                {provider.business_hours && (
                  <div>
                    <label className="text-sm text-slate-500 block mb-1">
                      {locale === 'ar' ? 'ساعات العمل' : 'Working Hours'}
                    </label>
                    <p className="text-slate-700 text-sm">
                      {locale === 'ar' ? 'متاح' : 'Available'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                {locale === 'ar' ? 'آخر الطلبات' : 'Recent Orders'}
              </h2>
              <Button variant="ghost" size="sm" onClick={loadRecentOrders}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-slate-900">#{order.order_number}</p>
                      <p className="text-xs text-slate-500">
                        {order.customer?.full_name || (locale === 'ar' ? 'عميل' : 'Customer')}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="font-medium text-slate-900">
                        {formatCurrency(order.total, locale)}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getOrderStatusColor(order.status)}`}
                      >
                        {getOrderStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500">
                  {locale === 'ar' ? 'لا توجد طلبات بعد' : 'No orders yet'}
                </p>
              </div>
            )}

            {recentOrders.length > 0 && (
              <Link
                href={`/${locale}/admin/orders?provider=${providerId}`}
                className="block text-center text-sm text-primary hover:text-primary/90 mt-4"
              >
                {locale === 'ar' ? 'عرض كل الطلبات' : 'View All Orders'}
              </Link>
            )}
          </div>
        </div>

        {/* Grace Period & Commission Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Timer className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-slate-900">
                {locale === 'ar' ? 'فترة السماح والعمولة' : 'Grace Period & Commission'}
              </h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">
                  {locale === 'ar' ? 'حالة العمولة' : 'Commission Status'}
                </span>
                <span
                  className={`text-sm px-3 py-1 rounded-full ${
                    provider.commission_status === 'in_grace_period'
                      ? 'bg-green-100 text-green-700'
                      : provider.commission_status === 'active'
                        ? 'bg-blue-100 text-blue-700'
                        : provider.commission_status === 'exempt'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {provider.commission_status === 'in_grace_period'
                    ? locale === 'ar'
                      ? 'في فترة السماح'
                      : 'In Grace Period'
                    : provider.commission_status === 'active'
                      ? locale === 'ar'
                        ? 'نشط'
                        : 'Active'
                      : provider.commission_status === 'exempt'
                        ? locale === 'ar'
                          ? 'معفي'
                          : 'Exempt'
                        : locale === 'ar'
                          ? 'غير محدد'
                          : 'Not Set'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">
                  {locale === 'ar' ? 'بداية فترة السماح' : 'Grace Period Start'}
                </span>
                <span className="text-sm text-slate-700">
                  {provider.grace_period_start
                    ? formatDate(provider.grace_period_start, locale)
                    : locale === 'ar'
                      ? 'لم تبدأ بعد'
                      : 'Not started'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">
                  {locale === 'ar' ? 'نهاية فترة السماح' : 'Grace Period End'}
                </span>
                <span className="text-sm text-slate-700">
                  {provider.grace_period_end
                    ? formatDate(provider.grace_period_end, locale)
                    : locale === 'ar'
                      ? 'غير محدد'
                      : 'Not set'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-500">
                  {locale === 'ar' ? 'نسبة العمولة' : 'Commission Rate'}
                </span>
                <span className="text-sm font-medium text-slate-700">
                  {provider.commission_rate}%
                </span>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Landmark className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-slate-900">
                {locale === 'ar' ? 'البيانات البنكية' : 'Bank Details'}
              </h2>
            </div>
            {provider.bank_name || provider.iban || provider.account_number ? (
              <div className="space-y-3">
                {provider.bank_name && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">
                      {locale === 'ar' ? 'اسم البنك' : 'Bank Name'}
                    </span>
                    <span className="text-sm text-slate-700">{provider.bank_name}</span>
                  </div>
                )}
                {provider.account_holder_name && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">
                      {locale === 'ar' ? 'اسم صاحب الحساب' : 'Account Holder'}
                    </span>
                    <span className="text-sm text-slate-700">{provider.account_holder_name}</span>
                  </div>
                )}
                {provider.account_number && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">
                      {locale === 'ar' ? 'رقم الحساب' : 'Account Number'}
                    </span>
                    <span className="text-sm text-slate-700 font-mono">
                      {provider.account_number}
                    </span>
                  </div>
                )}
                {provider.iban && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-500">IBAN</span>
                    <span className="text-sm text-slate-700 font-mono">{provider.iban}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Landmark className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-500">
                  {locale === 'ar' ? 'لم يتم إضافة بيانات بنكية' : 'No bank details added'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Delivery & Pickup Settings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-slate-900">
              {locale === 'ar' ? 'إعدادات التوصيل والاستلام' : 'Delivery & Pickup Settings'}
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">
                {locale === 'ar' ? 'وضع التشغيل' : 'Operation Mode'}
              </p>
              <p className="text-sm font-medium text-slate-700">
                {provider.operation_mode === 'menu'
                  ? locale === 'ar'
                    ? 'قائمة طعام'
                    : 'Menu'
                  : provider.operation_mode === 'custom_order'
                    ? locale === 'ar'
                      ? 'طلبات مخصصة'
                      : 'Custom Order'
                    : provider.operation_mode === 'both'
                      ? locale === 'ar'
                        ? 'كلاهما'
                        : 'Both'
                      : locale === 'ar'
                        ? 'غير محدد'
                        : 'Not set'}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">
                {locale === 'ar' ? 'الاستلام من المتجر' : 'Pickup Available'}
              </p>
              <p className="text-sm font-medium text-slate-700">
                {provider.supports_pickup
                  ? locale === 'ar'
                    ? 'متاح'
                    : 'Yes'
                  : locale === 'ar'
                    ? 'غير متاح'
                    : 'No'}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">
                {locale === 'ar' ? 'رسوم التوصيل' : 'Delivery Fee'}
              </p>
              <p className="text-sm font-medium text-slate-700">
                {formatCurrency(provider.delivery_fee, locale)}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">
                {locale === 'ar' ? 'الحد الأدنى للطلب' : 'Min Order'}
              </p>
              <p className="text-sm font-medium text-slate-700">
                {formatCurrency(provider.min_order_amount, locale)}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Action Modal */}
      {showActionModal && currentAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            {(() => {
              const config = getActionConfig(currentAction);
              const ActionIcon = config.icon;
              return (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-900">
                      {config.title[locale === 'ar' ? 'ar' : 'en']}
                    </h2>
                    <button
                      onClick={() => {
                        setShowActionModal(false);
                        setCurrentAction(null);
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <p className="text-slate-600 mb-4">
                    {config.message[locale === 'ar' ? 'ar' : 'en']}
                  </p>

                  {config.requiresReason && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {locale === 'ar' ? 'السبب (مطلوب)' : 'Reason (required)'}
                      </label>
                      <textarea
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        placeholder={locale === 'ar' ? 'أدخل السبب...' : 'Enter reason...'}
                        rows={3}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowActionModal(false);
                        setCurrentAction(null);
                      }}
                      className="flex-1"
                      disabled={actionLoading}
                    >
                      {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button
                      onClick={executeAction}
                      className={`flex-1 ${config.color}`}
                      disabled={actionLoading || (config.requiresReason && !actionReason.trim())}
                    >
                      {actionLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ActionIcon className="w-4 h-4 me-2" />
                          {config.confirmText[locale === 'ar' ? 'ar' : 'en']}
                        </>
                      )}
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Commission Modal */}
      {showCommissionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">
                {locale === 'ar' ? 'تعديل نسبة العمولة' : 'Edit Commission Rate'}
              </h2>
              <button
                onClick={() => setShowCommissionModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {locale === 'ar' ? 'نسبة العمولة (%)' : 'Commission Rate (%)'}
              </label>
              <input
                type="number"
                value={newCommissionRate}
                onChange={(e) => setNewCommissionRate(Number(e.target.value))}
                min={0}
                max={7}
                step={0.5}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-slate-500 mt-1">
                {locale === 'ar' ? 'النسبة الحالية: ' : 'Current rate: '}
                {provider.commission_rate}%
              </p>
            </div>

            {/* Error Message */}
            {commissionError && (
              <div className="mb-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{commissionError}</span>
              </div>
            )}

            {/* Success Message */}
            {commissionSuccess && (
              <div className="mb-4 flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">
                  {locale === 'ar' ? 'تم تحديث العمولة بنجاح' : 'Commission updated successfully'}
                </span>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCommissionModal(false)}
                className="flex-1"
                disabled={commissionLoading}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={updateCommission}
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={commissionLoading || newCommissionRate === provider.commission_rate}
              >
                {commissionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Edit2 className="w-4 h-4 me-2" />
                    {locale === 'ar' ? 'حفظ' : 'Save'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import { useLocale } from 'next-intl';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import { formatNumber, formatCurrency, formatDateTime, formatDate } from '@/lib/utils/formatters';
import {
  Shield,
  ArrowLeft,
  ArrowRight,
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ShoppingCart,
  DollarSign,
  Ban,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  Truck,
  RefreshCw,
  Eye,
  UserCheck,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Star,
} from 'lucide-react';

interface CustomerOrder {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  provider: {
    name_ar: string;
    name_en: string;
  } | null;
}

interface CustomerDetails {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  is_verified: boolean;
  is_banned: boolean;
  created_at: string;
  updated_at: string;
  // Computed fields
  orders_count: number;
  total_spent: number;
  completed_orders: number;
  cancelled_orders: number;
  avg_order_value: number;
  last_order_at: string | null;
  orders: CustomerOrder[];
  // Address info
  default_address: {
    governorate: string | null;
    city: string | null;
    district: string | null;
    street: string | null;
  } | null;
}

export default function AdminCustomerDetailsPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const { toggle: toggleSidebar } = useAdminSidebar();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadCustomer = useCallback(
    async (supabase: ReturnType<typeof createClient>) => {
      // Load customer profile
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error || !profileData) return;

      // Load customer orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select(
          `
        id,
        order_number,
        status,
        total,
        created_at,
        provider:providers(name_ar, name_en)
      `
        )
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      const orders = (ordersData || []) as unknown as CustomerOrder[];

      // Calculate stats
      const deliveredOrders = orders.filter((o) => o.status === 'delivered');
      const cancelledOrders = orders.filter((o) => ['cancelled', 'rejected'].includes(o.status));
      const total_spent = deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const avg_order_value = deliveredOrders.length > 0 ? total_spent / deliveredOrders.length : 0;
      const last_order_at = orders.length > 0 ? orders[0].created_at : null;

      // Try to get address info
      const { data: addressData } = await supabase
        .from('customer_addresses')
        .select(
          `
        *,
        governorate:governorates(name_ar, name_en),
        city:cities(name_ar, name_en),
        district:districts(name_ar, name_en)
      `
        )
        .eq('customer_id', customerId)
        .eq('is_default', true)
        .single();

      let default_address = null;
      if (addressData) {
        default_address = {
          governorate:
            locale === 'ar' ? addressData.governorate?.name_ar : addressData.governorate?.name_en,
          city: locale === 'ar' ? addressData.city?.name_ar : addressData.city?.name_en,
          district: locale === 'ar' ? addressData.district?.name_ar : addressData.district?.name_en,
          street: addressData.street_address || null,
        };
      }

      setCustomer({
        ...profileData,
        is_banned: profileData.is_banned || false,
        orders_count: orders.length,
        total_spent,
        completed_orders: deliveredOrders.length,
        cancelled_orders: cancelledOrders.length,
        avg_order_value,
        last_order_at,
        orders: orders.slice(0, 10), // Only last 10 orders
        default_address,
      });
    },
    [customerId, locale]
  );

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

        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (adminUser?.role === 'super_admin') {
          setIsSuperAdmin(true);
        }

        await loadCustomer(supabase);
      }
    }

    setLoading(false);
  }, [loadCustomer]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  async function handleBanCustomer(ban: boolean) {
    if (!customer) return;

    setActionLoading(true);
    const supabase = createClient();

    // If banning, first cancel all active orders
    if (ban) {
      // Get all in-progress orders for this customer
      const activeStatuses = [
        'pending',
        'confirmed',
        'accepted',
        'preparing',
        'ready',
        'out_for_delivery',
      ];

      const { data: activeOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('customer_id', customer.id)
        .in('status', activeStatuses);

      if (activeOrders && activeOrders.length > 0) {
        // Cancel all active orders
        const { error: cancelError } = await supabase
          .from('orders')
          .update({
            status: 'cancelled',
            cancellation_reason:
              locale === 'ar'
                ? 'تم إلغاء الطلب بسبب حظر حساب العميل'
                : 'Order cancelled due to customer account ban',
            cancelled_at: new Date().toISOString(),
          })
          .eq('customer_id', customer.id)
          .in('status', activeStatuses);
      }
    }

    // Update customer ban status
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: ban })
      .eq('id', customer.id);

    if (!error) {
      setCustomer({ ...customer, is_banned: ban });
      // Reload customer data to update the orders list
      await loadCustomer(supabase);
    }

    setActionLoading(false);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'accepted':
      case 'preparing':
        return 'bg-blue-100 text-blue-700';
      case 'ready':
        return 'bg-cyan-100 text-cyan-700';
      case 'out_for_delivery':
        return 'bg-purple-100 text-purple-700';
      case 'cancelled':
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      pending: { ar: 'معلق', en: 'Pending' },
      accepted: { ar: 'مقبول', en: 'Accepted' },
      preparing: { ar: 'قيد التحضير', en: 'Preparing' },
      ready: { ar: 'جاهز', en: 'Ready' },
      out_for_delivery: { ar: 'في الطريق', en: 'Out for Delivery' },
      delivered: { ar: 'تم التسليم', en: 'Delivered' },
      cancelled: { ar: 'ملغي', en: 'Cancelled' },
      rejected: { ar: 'مرفوض', en: 'Rejected' },
    };
    return labels[status]?.[locale === 'ar' ? 'ar' : 'en'] || status;
  };

  if (loading) {
    return (
      <>
        <div className="h-16 bg-white border-b border-slate-200 animate-pulse" />
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent"></div>
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
              {locale === 'ar' ? 'تفاصيل العميل' : 'Customer Details'}
            </h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-slate-900">
              {locale === 'ar' ? 'غير مصرح' : 'Unauthorized'}
            </h1>
            <Link href={`/${locale}/auth/login`}>
              <Button size="lg" className="bg-red-600 hover:bg-red-700">
                {locale === 'ar' ? 'تسجيل الدخول' : 'Login'}
              </Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
          <UserIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2 text-slate-900">
            {locale === 'ar' ? 'العميل غير موجود' : 'Customer Not Found'}
          </h1>
          <Link href={`/${locale}/admin/customers`}>
            <Button className="bg-red-600 hover:bg-red-700 mt-4">
              {locale === 'ar' ? 'العودة للعملاء' : 'Back to Customers'}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminHeader
        user={user}
        title={locale === 'ar' ? 'تفاصيل العميل' : 'Customer Details'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        {/* Back Button */}
        <div className="flex items-center justify-between mb-6">
          <Link href={`/${locale}/admin/customers`}>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              {locale === 'ar' ? 'العودة' : 'Back'}
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadCustomer(createClient())}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {locale === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Customer Header */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden">
                {customer.avatar_url ? (
                  <img src={customer.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-slate-600 text-3xl">
                    {customer.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-slate-900">
                    {customer.full_name || (locale === 'ar' ? 'بدون اسم' : 'No name')}
                  </h1>
                  {customer.is_verified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">
                      <CheckCircle2 className="w-3 h-3" />
                      {locale === 'ar' ? 'موثق' : 'Verified'}
                    </span>
                  )}
                  {customer.is_banned && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs">
                      <Ban className="w-3 h-3" />
                      {locale === 'ar' ? 'محظور' : 'Banned'}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                  {customer.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      <a href={`tel:${customer.phone}`} className="hover:text-red-600">
                        {customer.phone}
                      </a>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      <a href={`mailto:${customer.email}`} className="hover:text-red-600">
                        {customer.email}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {locale === 'ar' ? 'انضم' : 'Joined'}{' '}
                      {formatDate(customer.created_at, locale)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {customer.is_banned ? (
                <Button
                  variant="outline"
                  className="text-green-600 border-green-200 hover:bg-green-50"
                  onClick={() => handleBanCustomer(false)}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin me-2" />
                  ) : (
                    <UserCheck className="w-4 h-4 me-2" />
                  )}
                  {locale === 'ar' ? 'إلغاء الحظر' : 'Unban'}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleBanCustomer(true)}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin me-2" />
                  ) : (
                    <Ban className="w-4 h-4 me-2" />
                  )}
                  {locale === 'ar' ? 'حظر' : 'Ban'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <ShoppingCart className="w-5 h-5 text-slate-600" />
              <span className="text-sm text-slate-600">
                {locale === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatNumber(customer.orders_count, locale)}
            </p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-700">
                {locale === 'ar' ? 'مكتملة' : 'Completed'}
              </span>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {formatNumber(customer.completed_orders, locale)}
            </p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <div className="flex items-center gap-3 mb-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm text-red-700">
                {locale === 'ar' ? 'ملغاة' : 'Cancelled'}
              </span>
            </div>
            <p className="text-2xl font-bold text-red-700">
              {formatNumber(customer.cancelled_orders, locale)}
            </p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span className="text-sm text-emerald-700">
                {locale === 'ar' ? 'إجمالي الإنفاق' : 'Total Spent'}
              </span>
            </div>
            <p className="text-xl font-bold text-emerald-700">
              {formatCurrency(customer.total_spent, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
            </p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-700">
                {locale === 'ar' ? 'متوسط الطلب' : 'Avg Order'}
              </span>
            </div>
            <p className="text-xl font-bold text-blue-700">
              {formatCurrency(customer.avg_order_value, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orders List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-slate-600" />
                  {locale === 'ar' ? 'آخر الطلبات' : 'Recent Orders'}
                </h2>
                <Link href={`/${locale}/admin/orders?customer=${customer.id}`}>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                    {locale === 'ar' ? 'عرض الكل' : 'View All'}
                  </Button>
                </Link>
              </div>

              {customer.orders.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {customer.orders.map((order) => (
                    <div key={order.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-medium text-slate-900">
                              #{order.order_number}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}
                            >
                              {getStatusLabel(order.status)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">
                            {order.provider
                              ? locale === 'ar'
                                ? order.provider.name_ar
                                : order.provider.name_en
                              : '-'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatDateTime(order.created_at, locale)}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(order.total, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                          </span>
                          <Link href={`/${locale}/admin/orders/${order.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="w-4 h-4 text-slate-500" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-500">
                    {locale === 'ar' ? 'لا توجد طلبات' : 'No orders yet'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* Address */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-slate-600" />
                  {locale === 'ar' ? 'العنوان الافتراضي' : 'Default Address'}
                </h2>
              </div>
              <div className="p-4">
                {customer.default_address ? (
                  <div className="space-y-2 text-sm">
                    {customer.default_address.governorate && (
                      <p className="text-slate-600">
                        <span className="text-slate-400">
                          {locale === 'ar' ? 'المحافظة:' : 'Governorate:'}
                        </span>{' '}
                        {customer.default_address.governorate}
                      </p>
                    )}
                    {customer.default_address.city && (
                      <p className="text-slate-600">
                        <span className="text-slate-400">
                          {locale === 'ar' ? 'المدينة:' : 'City:'}
                        </span>{' '}
                        {customer.default_address.city}
                      </p>
                    )}
                    {customer.default_address.district && (
                      <p className="text-slate-600">
                        <span className="text-slate-400">
                          {locale === 'ar' ? 'الحي:' : 'District:'}
                        </span>{' '}
                        {customer.default_address.district}
                      </p>
                    )}
                    {customer.default_address.street && (
                      <p className="text-slate-600">
                        <span className="text-slate-400">
                          {locale === 'ar' ? 'الشارع:' : 'Street:'}
                        </span>{' '}
                        {customer.default_address.street}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">
                    {locale === 'ar' ? 'لم يتم تحديد عنوان' : 'No address set'}
                  </p>
                )}
              </div>
            </div>

            {/* Account Info */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-slate-600" />
                  {locale === 'ar' ? 'معلومات الحساب' : 'Account Info'}
                </h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    {locale === 'ar' ? 'تاريخ الانضمام' : 'Joined'}
                  </span>
                  <span className="text-slate-900">{formatDate(customer.created_at, locale)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    {locale === 'ar' ? 'آخر طلب' : 'Last Order'}
                  </span>
                  <span className="text-slate-900">
                    {customer.last_order_at ? formatDate(customer.last_order_at, locale) : '-'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{locale === 'ar' ? 'الحالة' : 'Status'}</span>
                  {customer.is_banned ? (
                    <span className="text-red-600 flex items-center gap-1">
                      <Ban className="w-3 h-3" />
                      {locale === 'ar' ? 'محظور' : 'Banned'}
                    </span>
                  ) : (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {locale === 'ar' ? 'نشط' : 'Active'}
                    </span>
                  )}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    {locale === 'ar' ? 'التحقق' : 'Verification'}
                  </span>
                  {customer.is_verified ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {locale === 'ar' ? 'موثق' : 'Verified'}
                    </span>
                  ) : (
                    <span className="text-yellow-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {locale === 'ar' ? 'غير موثق' : 'Unverified'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-slate-600" />
                  {locale === 'ar' ? 'إحصائيات سريعة' : 'Quick Stats'}
                </h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    {locale === 'ar' ? 'معدل الإكمال' : 'Completion Rate'}
                  </span>
                  <span className="text-slate-900 font-medium">
                    {customer.orders_count > 0
                      ? `${Math.round((customer.completed_orders / customer.orders_count) * 100)}%`
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    {locale === 'ar' ? 'معدل الإلغاء' : 'Cancellation Rate'}
                  </span>
                  <span className="text-slate-900 font-medium">
                    {customer.orders_count > 0
                      ? `${Math.round((customer.cancelled_orders / customer.orders_count) * 100)}%`
                      : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

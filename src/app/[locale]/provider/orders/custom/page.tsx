'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ProviderLayout } from '@/components/provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ACTIVE_PROVIDER_STATUSES } from '@/types/database';
import {
  Clock,
  FileText,
  Mic,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  RefreshCw,
  User,
  Phone,
  DollarSign,
  Package,
  Truck,
  ChefHat,
} from 'lucide-react';

type CustomOrderRequest = {
  id: string;
  broadcast_id: string;
  provider_id: string;
  input_type: 'text' | 'voice' | 'image' | 'mixed';
  original_text: string | null;
  voice_url: string | null;
  image_urls: string[] | null;
  customer_notes: string | null;
  status: 'pending' | 'priced' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  items_count: number;
  subtotal: number;
  delivery_fee: number;
  total: number;
  created_at: string;
  pricing_expires_at: string | null;
  priced_at: string | null;
  order_id: string | null;
  broadcast: {
    original_text: string | null;
    transcribed_text: string | null;
    customer_notes: string | null;
    customer: {
      id: string;
      full_name: string | null;
      phone: string | null;
    } | null;
  } | null;
  order: {
    id: string;
    order_number: string;
    status: string;
  } | null;
};

const STATUS_CONFIG: Record<
  string,
  { icon: typeof Clock; color: string; bgColor: string; label_ar: string; label_en: string }
> = {
  pending: {
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    label_ar: 'بانتظار التسعير',
    label_en: 'Awaiting Pricing',
  },
  priced: {
    icon: DollarSign,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    label_ar: 'تم التسعير',
    label_en: 'Priced',
  },
  approved: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label_ar: 'موافق عليه',
    label_en: 'Approved',
  },
  rejected: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    label_ar: 'مرفوض',
    label_en: 'Rejected',
  },
  expired: {
    icon: AlertCircle,
    color: 'text-slate-500',
    bgColor: 'bg-slate-100',
    label_ar: 'منتهي',
    label_en: 'Expired',
  },
  cancelled: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    label_ar: 'ملغي',
    label_en: 'Cancelled',
  },
};

const INPUT_TYPE_ICONS = {
  text: FileText,
  voice: Mic,
  image: ImageIcon,
  mixed: FileText,
};

// Order execution status config (for approved orders that become actual orders)
const ORDER_STATUS_CONFIG: Record<
  string,
  { icon: typeof Clock; color: string; bgColor: string; label_ar: string; label_en: string }
> = {
  pending: {
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    label_ar: 'جديد',
    label_en: 'New',
  },
  accepted: {
    icon: CheckCircle2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    label_ar: 'تم القبول',
    label_en: 'Accepted',
  },
  preparing: {
    icon: ChefHat,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    label_ar: 'جاري التحضير',
    label_en: 'Preparing',
  },
  ready: {
    icon: Package,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    label_ar: 'جاهز',
    label_en: 'Ready',
  },
  out_for_delivery: {
    icon: Truck,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    label_ar: 'في الطريق',
    label_en: 'On the way',
  },
  delivered: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label_ar: 'تم التوصيل',
    label_en: 'Delivered',
  },
  cancelled: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    label_ar: 'ملغي',
    label_en: 'Cancelled',
  },
  rejected: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    label_ar: 'مرفوض',
    label_en: 'Rejected',
  },
};

export default function CustomOrdersListPage() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRTL = locale === 'ar';

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<CustomOrderRequest[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'priced' | 'completed'>('all');

  // Check for success message
  const successMessage = searchParams.get('success');

  // Load custom order requests
  const loadRequests = useCallback(async (provId: string) => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('custom_order_requests')
      .select(
        `
        *,
        broadcast:custom_order_broadcasts(
          original_text,
          transcribed_text,
          customer_notes,
          customer:profiles!custom_order_broadcasts_customer_id_fkey(
            id,
            full_name,
            phone
          )
        ),
        order:orders(
          id,
          order_number,
          status
        )
      `
      )
      .eq('provider_id', provId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Transform the data
      const transformed = data.map((req) => ({
        ...req,
        broadcast: Array.isArray(req.broadcast)
          ? {
              ...req.broadcast[0],
              customer: Array.isArray(req.broadcast[0]?.customer)
                ? req.broadcast[0].customer[0]
                : req.broadcast[0]?.customer,
            }
          : req.broadcast
            ? {
                ...req.broadcast,
                customer: Array.isArray(req.broadcast?.customer)
                  ? req.broadcast.customer[0]
                  : req.broadcast?.customer,
              }
            : null,
        order: Array.isArray(req.order) ? req.order[0] : req.order,
      }));
      setRequests(transformed as CustomOrderRequest[]);
    }
  }, []);

  // Initialize
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const supabase = createClient();

      // Check authentication
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/${locale}/provider/login`);
        return;
      }

      // Get provider
      const { data: providerData } = await supabase
        .from('providers')
        .select('id, status')
        .eq('owner_id', user.id)
        .limit(1);

      const provider = providerData?.[0];
      if (!provider || !ACTIVE_PROVIDER_STATUSES.includes(provider.status)) {
        router.push(`/${locale}/provider`);
        return;
      }

      setProviderId(provider.id);
      await loadRequests(provider.id);
      setLoading(false);
    };

    init();
  }, [locale, router, loadRequests]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!providerId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`custom-orders-provider-${providerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'custom_order_requests',
          filter: `provider_id=eq.${providerId}`,
        },
        () => {
          // Reload requests on any change
          loadRequests(providerId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [providerId, loadRequests]);

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return req.status === 'pending';
    if (filter === 'priced') return req.status === 'priced';
    if (filter === 'completed')
      return ['approved', 'rejected', 'expired', 'cancelled'].includes(req.status);
    return true;
  });

  // Counts
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const pricedCount = requests.filter((r) => r.status === 'priced').length;

  // Format time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-EG', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Calculate time remaining
  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return { text: isRTL ? 'منتهي' : 'Expired', urgent: true };

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return {
        text: isRTL ? `${hours} ساعة ${minutes} دقيقة` : `${hours}h ${minutes}m`,
        urgent: hours < 1,
      };
    }
    return {
      text: isRTL ? `${minutes} دقيقة` : `${minutes}m`,
      urgent: true,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-500">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <ProviderLayout
      pageTitle={{ ar: 'الطلبات الخاصة', en: 'Custom Orders' }}
      pageSubtitle={{ ar: 'إدارة طلبات العملاء الخاصة', en: 'Manage customer custom orders' }}
    >
      {/* Success Message */}
      {successMessage === 'priced' && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-green-700 text-sm">
            {isRTL
              ? 'تم إرسال التسعيرة بنجاح! سيتم إعلامك عند موافقة العميل.'
              : 'Quote sent successfully! You will be notified when the customer approves.'}
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
                <p className="text-xs text-amber-600">
                  {isRTL ? 'بانتظار التسعير' : 'Awaiting Pricing'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{pricedCount}</p>
                <p className="text-xs text-blue-600">
                  {isRTL ? 'بانتظار الموافقة' : 'Awaiting Approval'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">
                  {requests.filter((r) => r.status === 'approved').length}
                </p>
                <p className="text-xs text-green-600">{isRTL ? 'موافق عليها' : 'Approved'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-700">{requests.length}</p>
                <p className="text-xs text-slate-600">
                  {isRTL ? 'إجمالي الطلبات' : 'Total Requests'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          {isRTL ? 'الكل' : 'All'}
          <span className="mx-1 text-xs opacity-70">({requests.length})</span>
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('pending')}
        >
          {isRTL ? 'بانتظار التسعير' : 'Awaiting Pricing'}
          {pendingCount > 0 && (
            <span className="mx-1 bg-amber-400 text-amber-900 text-xs px-1.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </Button>
        <Button
          variant={filter === 'priced' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('priced')}
        >
          {isRTL ? 'بانتظار الموافقة' : 'Awaiting Approval'}
          <span className="mx-1 text-xs opacity-70">({pricedCount})</span>
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('completed')}
        >
          {isRTL ? 'مكتمل' : 'Completed'}
        </Button>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => providerId && loadRequests(providerId)}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          {isRTL ? 'تحديث' : 'Refresh'}
        </Button>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
            <FileText className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2 text-slate-800">
            {filter === 'pending'
              ? isRTL
                ? 'لا توجد طلبات بانتظار التسعير'
                : 'No orders awaiting pricing'
              : filter === 'priced'
                ? isRTL
                  ? 'لا توجد طلبات بانتظار الموافقة'
                  : 'No orders awaiting approval'
                : isRTL
                  ? 'لا توجد طلبات خاصة'
                  : 'No custom orders yet'}
          </h2>
          <p className="text-slate-500 text-sm">
            {isRTL
              ? 'عندما يرسل العملاء طلبات خاصة، ستظهر هنا للتسعير'
              : 'When customers send custom orders, they will appear here for pricing'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusConfig.icon;
            const InputIcon = INPUT_TYPE_ICONS[request.input_type] || FileText;
            const timeRemaining =
              request.status === 'pending' ? getTimeRemaining(request.pricing_expires_at) : null;

            return (
              <Card key={request.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  {/* Header */}
                  <div
                    className={`p-4 border-b ${request.status === 'pending' ? 'bg-gradient-to-r from-amber-50 to-yellow-50' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${statusConfig.bgColor}`}
                        >
                          <InputIcon className={`w-4 h-4 ${statusConfig.color}`} />
                        </div>
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color} ${statusConfig.bgColor}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          {isRTL ? statusConfig.label_ar : statusConfig.label_en}
                        </div>
                        {timeRemaining && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${timeRemaining.urgent ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}
                          >
                            {timeRemaining.text}
                          </span>
                        )}
                      </div>
                      <div className="text-end">
                        <p className="text-sm text-slate-500">{formatTime(request.created_at)}</p>
                        <p className="text-xs text-slate-400">{formatDate(request.created_at)}</p>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4 text-slate-400" />
                        {request.broadcast?.customer?.full_name || (isRTL ? 'عميل' : 'Customer')}
                      </div>
                      {request.broadcast?.customer?.phone && (
                        <a
                          href={`tel:${request.broadcast.customer.phone}`}
                          className="flex items-center gap-1.5 hover:text-primary"
                        >
                          <Phone className="w-4 h-4 text-slate-400" />
                          {request.broadcast.customer.phone}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    {/* Order Text */}
                    <div className="mb-4">
                      <p className="text-sm text-slate-700 line-clamp-2">
                        {request.broadcast?.transcribed_text ||
                          request.broadcast?.original_text ||
                          request.original_text ||
                          (isRTL ? '(تسجيل صوتي / صور)' : '(Voice/Image order)')}
                      </p>
                      {request.customer_notes && (
                        <p className="text-xs text-slate-500 mt-1">
                          {isRTL ? 'ملاحظات:' : 'Notes:'} {request.customer_notes}
                        </p>
                      )}
                    </div>

                    {/* Pricing Info (if priced) */}
                    {request.status !== 'pending' && request.total > 0 && (
                      <div className="bg-slate-50 rounded-lg p-3 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">{isRTL ? 'عدد الأصناف' : 'Items'}</span>
                          <span className="text-slate-700">{request.items_count}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-slate-500">
                            {isRTL ? 'المجموع الفرعي' : 'Subtotal'}
                          </span>
                          <span className="text-slate-700">
                            {request.subtotal.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-slate-500">{isRTL ? 'التوصيل' : 'Delivery'}</span>
                          <span className="text-slate-700">
                            {request.delivery_fee.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
                          </span>
                        </div>
                        <div className="flex justify-between font-semibold mt-2 pt-2 border-t border-slate-200">
                          <span>{isRTL ? 'الإجمالي' : 'Total'}</span>
                          <span className="text-primary">
                            {request.total.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    {request.status === 'pending' && (
                      <Link href={`/${locale}/provider/orders/custom/${request.id}`}>
                        <Button className="w-full gap-2">
                          <DollarSign className="w-4 h-4" />
                          {isRTL ? 'تسعير الطلب' : 'Price Order'}
                          {isRTL ? (
                            <ArrowLeft className="w-4 h-4" />
                          ) : (
                            <ArrowRight className="w-4 h-4" />
                          )}
                        </Button>
                      </Link>
                    )}
                    {request.status === 'priced' && (
                      <div className="text-center py-2 text-blue-600 text-sm">
                        {isRTL ? 'بانتظار موافقة العميل...' : 'Waiting for customer approval...'}
                      </div>
                    )}
                    {request.status === 'approved' && request.order && (
                      <div className="space-y-3">
                        {/* Order Execution Status */}
                        {(() => {
                          const orderStatusConfig =
                            ORDER_STATUS_CONFIG[request.order.status] ||
                            ORDER_STATUS_CONFIG.pending;
                          const OrderStatusIcon = orderStatusConfig.icon;
                          return (
                            <div
                              className={`flex items-center justify-between p-3 rounded-lg ${orderStatusConfig.bgColor}`}
                            >
                              <div className="flex items-center gap-2">
                                <OrderStatusIcon className={`w-4 h-4 ${orderStatusConfig.color}`} />
                                <span className={`text-sm font-medium ${orderStatusConfig.color}`}>
                                  {isRTL ? orderStatusConfig.label_ar : orderStatusConfig.label_en}
                                </span>
                              </div>
                              <span className="text-xs text-slate-500">
                                #
                                {request.order.order_number ||
                                  request.order.id.slice(0, 8).toUpperCase()}
                              </span>
                            </div>
                          );
                        })()}
                        {/* Manage Order Button */}
                        {!['delivered', 'cancelled', 'rejected'].includes(request.order.status) && (
                          <Link href={`/${locale}/provider/orders/${request.order.id}?from=custom`}>
                            <Button variant="outline" className="w-full gap-2">
                              {isRTL ? 'إدارة الطلب' : 'Manage Order'}
                              {isRTL ? (
                                <ArrowLeft className="w-4 h-4" />
                              ) : (
                                <ArrowRight className="w-4 h-4" />
                              )}
                            </Button>
                          </Link>
                        )}
                        {/* View Details for completed */}
                        {['delivered', 'cancelled', 'rejected'].includes(request.order.status) && (
                          <Link href={`/${locale}/provider/orders/${request.order.id}?from=custom`}>
                            <Button variant="ghost" size="sm" className="w-full text-slate-500">
                              {isRTL ? 'عرض التفاصيل' : 'View Details'}
                            </Button>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </ProviderLayout>
  );
}

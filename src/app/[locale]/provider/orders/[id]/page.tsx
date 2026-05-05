'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Clock,
  MapPin,
  Store,
  Phone,
  ShoppingCart,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Package,
  Truck,
  ChefHat,
  User,
  XCircle,
  RefreshCw,
  Check,
  X,
  Receipt,
  CreditCard,
  MessageSquare,
  Calendar,
  FileText,
} from 'lucide-react';
import { OrderChat } from '@/components/shared/OrderChat';
import {
  applyProviderAction,
  getCustomerTrackerSteps,
  getCustomerStepIndex,
  getNextProviderAction,
  getProviderActionLabel,
  OrderStaleStateError,
  type OrderType,
} from '@/lib/orders/transitions';

// Force dynamic rendering

// Cancellation reasons mapping for translation
const CANCELLATION_REASONS: Record<string, { ar: string; en: string }> = {
  changed_mind: { ar: 'غيرت رأيي', en: 'Changed my mind' },
  wrong_order: { ar: 'طلب خاطئ', en: 'Wrong order' },
  duplicate_order: { ar: 'طلب مكرر', en: 'Duplicate order' },
  long_wait: { ar: 'وقت انتظار طويل', en: 'Long wait time' },
  found_alternative: { ar: 'وجدت بديل آخر', en: 'Found an alternative' },
  other: { ar: 'سبب آخر', en: 'Other reason' },
};

type OrderItem = {
  id: string;
  item_name_ar: string;
  item_name_en: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_instructions?: string;
};

type Order = {
  id: string;
  order_number: string;
  customer_id: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  promo_code: string | null;
  total: number;
  platform_commission: number;
  original_commission: number | null;
  settlement_notes: string | null;
  payment_method: string;
  payment_status: string;
  order_type: OrderType;
  delivery_address: {
    // Geographic hierarchy
    governorate_id?: string;
    governorate_ar?: string;
    governorate_en?: string;
    city_id?: string;
    city_ar?: string;
    city_en?: string;
    district_id?: string;
    district_ar?: string;
    district_en?: string;
    // Address details
    address?: string;
    address_line1?: string;
    street?: string;
    building?: string;
    floor?: string;
    apartment?: string;
    landmark?: string;
    // Contact
    phone?: string;
    full_name?: string;
    notes?: string;
    delivery_instructions?: string;
  } | null;
  customer_notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
  accepted_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
};

type Customer = {
  full_name: string;
  phone: string | null;
  email: string | null;
};

type ProviderInfo = {
  id: string;
  name_ar: string;
  name_en: string;
};

const STEP_ICONS: Record<string, typeof Clock> = {
  pending: Clock,
  preparing: ChefHat,
  ready: Package,
  out_for_delivery: Truck,
  delivered: CheckCircle2,
};

export default function ProviderOrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRTL = locale === 'ar';
  const openChat = searchParams.get('openChat') === 'true';
  const fromCustom = searchParams.get('from') === 'custom';

  // Determine back URL based on where user came from
  const backUrl = fromCustom ? `/${locale}/provider/orders/custom` : `/${locale}/provider/orders`;
  const backLabel = fromCustom
    ? locale === 'ar'
      ? 'الطلبات الخاصة'
      : 'Custom Orders'
    : locale === 'ar'
      ? 'الطلبات'
      : 'Orders';

  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [providerInfo, setProviderInfo] = useState<ProviderInfo | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const checkAuthAndLoadOrder = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/provider/orders/${orderId}`);
      return;
    }
    setUserId(user.id);

    // Get provider info including name
    const { data: providerData } = await supabase
      .from('providers')
      .select('id, name_ar, name_en')
      .eq('owner_id', user.id)
      .limit(1);

    const provider = providerData?.[0];
    if (!provider) {
      router.push(`/${locale}/provider`);
      return;
    }

    setProviderInfo(provider);

    // Fetch order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('provider_id', provider.id)
      .single();

    if (orderError || !orderData) {
      router.push(backUrl);
      return;
    }

    setOrder(orderData);

    // Fetch order items (standard orders from order_items, custom orders from custom_order_items)
    if (orderData.order_flow === 'custom') {
      const { data: customItemsData } = await supabase
        .from('custom_order_items')
        .select('*')
        .eq('order_id', orderId);

      setOrderItems(
        (customItemsData || []).map((item: Record<string, unknown>) => ({
          id: item.id as string,
          item_name_ar: item.item_name_ar as string,
          item_name_en: (item.item_name_en as string) || (item.item_name_ar as string),
          quantity: item.quantity as number,
          unit_price: item.unit_price as number,
          total_price: item.total_price as number,
        }))
      );
    } else {
      const { data: itemsData } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      setOrderItems(itemsData || []);
    }

    // Fetch customer
    if (orderData.customer_id) {
      const { data: customerData } = await supabase
        .from('profiles')
        .select('full_name, phone, email')
        .eq('id', orderData.customer_id)
        .single();

      setCustomer(customerData);
    }

    setLoading(false);
  }, [locale, orderId, router, backUrl]);

  useEffect(() => {
    checkAuthAndLoadOrder();
  }, [checkAuthAndLoadOrder]);

  const handleRejectOrder = async () => {
    if (!order) return;
    setActionLoading(true);
    const supabase = createClient();

    // Stale-state guard: only succeed if the order is still in the status
    // the UI is showing. If another tab moved it on, treat it as a reload
    // signal — same pattern applyProviderAction uses.
    const expectedStatus = order.status;
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'rejected',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('status', expectedStatus)
      .select('id');

    const stale = !error && (!data || data.length === 0);
    if (!error || stale) {
      await checkAuthAndLoadOrder();
    } else {
      alert(
        locale === 'ar'
          ? `تعذّر رفض الطلب: ${error.message}`
          : `Failed to reject order: ${error.message}`
      );
    }
    setActionLoading(false);
  };

  // Legacy escape hatch: orders that delivered before the merged flow shipped
  // can still be sitting in delivered + payment_status='pending'. New cash
  // orders never reach that state because applyProviderAction flips both
  // atomically, but we keep this button so old orders aren't stranded.
  const handleConfirmLegacyPayment = async () => {
    if (!order) return;
    setActionLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (!error) {
      await checkAuthAndLoadOrder();
    } else {
      alert(
        locale === 'ar'
          ? `تعذّر تأكيد الدفع: ${error.message}`
          : `Failed to confirm payment: ${error.message}`
      );
    }
    setActionLoading(false);
  };

  const handleAdvanceOrder = async () => {
    if (!order) return;
    const action = getNextProviderAction(
      order.status,
      order.order_type,
      order.payment_method,
      order.payment_status
    );
    if (!action) return;

    setActionLoading(true);
    const supabase = createClient();
    const { error } = await applyProviderAction(supabase, order.id, order.status, action);

    // On both success and stale-state we re-load so the UI reflects the
    // latest server state — stale means another tab/process moved the
    // order on, so showing the user the new state is the right recovery.
    if (!error || error instanceof OrderStaleStateError) {
      await checkAuthAndLoadOrder();
    } else {
      // Real failure (network, RLS, constraint) — surface it so the
      // provider doesn't think their action took effect.
      alert(
        locale === 'ar'
          ? `تعذّر تحديث الطلب: ${error.message}`
          : `Failed to update order: ${error.message}`
      );
    }
    setActionLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-slate-500">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-xl text-slate-600 mb-4">
            {locale === 'ar' ? 'الطلب غير موجود' : 'Order not found'}
          </p>
          <Link href={backUrl}>
            <Button>{backLabel}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const trackerSteps = getCustomerTrackerSteps(order.order_type);
  const currentStatusIndex = getCustomerStepIndex(order.status, trackerSteps);
  const isCancelled = order.status === 'cancelled' || order.status === 'rejected';
  const isDelivered = order.status === 'delivered';
  const canTakeAction = !isCancelled && !isDelivered;
  const nextAction = canTakeAction
    ? getNextProviderAction(
        order.status,
        order.order_type,
        order.payment_method,
        order.payment_status
      )
    : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={backUrl}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-900"
            >
              {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              <span>{backLabel}</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-primary">
                #{order.order_number || order.id.slice(0, 8).toUpperCase()}
              </span>
              {fromCustom && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  <FileText className="w-3 h-3" />
                  {locale === 'ar' ? 'طلب خاص' : 'Custom'}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => checkAuthAndLoadOrder()}
              className="text-slate-500 hover:text-slate-900"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Order Date */}
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Calendar className="w-4 h-4" />
            {formatFullDate(order.created_at)}
          </div>

          {/* Status Timeline */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-slate-900">
                <span>{locale === 'ar' ? 'حالة الطلب' : 'Order Status'}</span>
                {isDelivered && (
                  <span className="text-sm font-normal text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {locale === 'ar' ? 'تم التوصيل' : 'Delivered'}
                  </span>
                )}
                {isCancelled && (
                  <span className="text-sm font-normal text-red-600 flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    {order.status === 'rejected'
                      ? locale === 'ar'
                        ? 'مرفوض'
                        : 'Rejected'
                      : locale === 'ar'
                        ? 'ملغي'
                        : 'Cancelled'}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isCancelled ? (
                <div className="text-center py-8">
                  <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-red-600">
                    {order.status === 'rejected'
                      ? locale === 'ar'
                        ? 'تم رفض الطلب'
                        : 'Order Rejected'
                      : locale === 'ar'
                        ? 'تم إلغاء الطلب'
                        : 'Order Cancelled'}
                  </p>
                  {order.cancellation_reason && (
                    <p className="text-sm text-slate-500 mt-2">
                      {locale === 'ar' ? 'السبب:' : 'Reason:'}{' '}
                      {CANCELLATION_REASONS[order.cancellation_reason]
                        ? locale === 'ar'
                          ? CANCELLATION_REASONS[order.cancellation_reason].ar
                          : CANCELLATION_REASONS[order.cancellation_reason].en
                        : order.cancellation_reason}
                    </p>
                  )}
                  {order.cancelled_at && (
                    <p className="text-sm text-slate-400 mt-2">{formatDate(order.cancelled_at)}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {trackerSteps.map((step, index) => {
                    const Icon = STEP_ICONS[step.key] ?? Clock;
                    const isCompleted = index <= currentStatusIndex;
                    const isCurrent = index === currentStatusIndex;

                    const timestampField = step.timestamp_fields.find(
                      (field) => (order as unknown as Record<string, string | null>)[field]
                    );
                    const timestamp = timestampField
                      ? (order as unknown as Record<string, string | null>)[timestampField]
                      : null;

                    return (
                      <div key={step.key} className="flex items-center gap-4">
                        <div
                          className={`
                            w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                            ${
                              isCompleted
                                ? isCurrent
                                  ? 'bg-primary text-white'
                                  : 'bg-green-500 text-white'
                                : 'bg-slate-100 text-slate-400'
                            }
                          `}
                        >
                          {isCompleted && !isCurrent ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <Icon className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p
                            className={`font-medium ${isCompleted ? 'text-slate-900' : 'text-slate-400'}`}
                          >
                            {locale === 'ar' ? step.label_ar : step.label_en}
                          </p>
                          {timestamp && (
                            <p className="text-xs text-slate-500">{formatDate(timestamp)}</p>
                          )}
                          {isCurrent && !isDelivered && (
                            <p className="text-sm text-primary animate-pulse">
                              {locale === 'ar' ? 'الحالة الحالية' : 'Current Status'}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action Buttons */}
              {canTakeAction && (
                <div className="mt-6 pt-6 border-t border-slate-200 flex gap-3">
                  {order.status === 'pending' && nextAction && (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1 border-red-500/50 text-red-600 hover:bg-red-50"
                        onClick={handleRejectOrder}
                        disabled={actionLoading}
                      >
                        <X className="w-4 h-4 mr-2" />
                        {locale === 'ar' ? 'رفض الطلب' : 'Reject Order'}
                      </Button>
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={handleAdvanceOrder}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        {getProviderActionLabel(nextAction, locale)}
                      </Button>
                    </>
                  )}

                  {order.status !== 'pending' && nextAction && (
                    <Button
                      className="w-full"
                      onClick={handleAdvanceOrder}
                      disabled={actionLoading}
                      size="lg"
                    >
                      {actionLoading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <>{getProviderActionLabel(nextAction, locale)}</>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <User className="w-5 h-5" />
                {locale === 'ar' ? 'معلومات العميل' : 'Customer Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">
                    {order.delivery_address?.full_name || customer?.full_name || 'N/A'}
                  </p>
                  {customer?.email && <p className="text-sm text-slate-500">{customer.email}</p>}
                </div>
                <a
                  href={`tel:${order.delivery_address?.phone}`}
                  className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20"
                >
                  <Phone className="w-4 h-4" />
                  {locale === 'ar' ? 'اتصال' : 'Call'}
                </a>
              </div>
              {/* Fulfillment section: pickup orders show a clear "Pickup
                  from store" indicator instead of the (empty) address block. */}
              {order.order_type === 'pickup' ? (
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <Store className="w-5 h-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-medium text-primary">
                        {locale === 'ar' ? 'استلام من الفرع' : 'Pickup from store'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {locale === 'ar'
                          ? 'العميل سيستلم الطلب من المتجر'
                          : 'Customer will pick up the order from the store'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Delivery Address Section */
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      {/* Geographic Tags */}
                      {order.delivery_address &&
                        (order.delivery_address.governorate_ar ||
                          order.delivery_address.city_ar ||
                          order.delivery_address.district_ar) && (
                          <div className="flex flex-wrap gap-1.5">
                            {order.delivery_address.governorate_ar && (
                              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">
                                {locale === 'ar'
                                  ? order.delivery_address.governorate_ar
                                  : order.delivery_address.governorate_en}
                              </span>
                            )}
                            {order.delivery_address.city_ar && (
                              <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs">
                                {locale === 'ar'
                                  ? order.delivery_address.city_ar
                                  : order.delivery_address.city_en}
                              </span>
                            )}
                            {order.delivery_address.district_ar && (
                              <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs">
                                {locale === 'ar'
                                  ? order.delivery_address.district_ar
                                  : order.delivery_address.district_en}
                              </span>
                            )}
                          </div>
                        )}

                      {/* Street Address */}
                      <p className="text-slate-900 font-medium">
                        {order.delivery_address?.address || order.delivery_address?.address_line1}
                      </p>

                      {/* Building Details */}
                      {order.delivery_address &&
                        (order.delivery_address.building ||
                          order.delivery_address.floor ||
                          order.delivery_address.apartment) && (
                          <p className="text-slate-600 text-sm">
                            {order.delivery_address.building && (
                              <span>
                                {locale === 'ar' ? 'مبنى' : 'Bldg'}{' '}
                                {order.delivery_address.building}
                              </span>
                            )}
                            {order.delivery_address.floor && (
                              <span>
                                {order.delivery_address.building ? ' - ' : ''}
                                {locale === 'ar' ? 'طابق' : 'Floor'} {order.delivery_address.floor}
                              </span>
                            )}
                            {order.delivery_address.apartment && (
                              <span>
                                {order.delivery_address.building || order.delivery_address.floor
                                  ? ' - '
                                  : ''}
                                {locale === 'ar' ? 'شقة' : 'Apt'} {order.delivery_address.apartment}
                              </span>
                            )}
                          </p>
                        )}

                      {/* Landmark */}
                      {order.delivery_address?.landmark && (
                        <p className="text-slate-500 text-sm">
                          <span className="font-medium">
                            {locale === 'ar' ? 'علامة مميزة:' : 'Landmark:'}
                          </span>{' '}
                          {order.delivery_address.landmark}
                        </p>
                      )}

                      {/* Delivery Instructions */}
                      {order.delivery_address?.delivery_instructions && (
                        <div className="bg-amber-50 rounded-lg p-2 text-sm text-amber-800">
                          <span className="font-medium">
                            {locale === 'ar' ? 'تعليمات التوصيل:' : 'Delivery Instructions:'}
                          </span>{' '}
                          {order.delivery_address.delivery_instructions}
                        </div>
                      )}

                      {/* Address Notes */}
                      {order.delivery_address?.notes && (
                        <p className="text-slate-500 text-sm italic">
                          {order.delivery_address.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {order.customer_notes && (
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-slate-500 mb-1">
                        {locale === 'ar' ? 'ملاحظات الطلب:' : 'Order notes:'}
                      </p>
                      <p className="text-slate-900">{order.customer_notes}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <ShoppingCart className="w-5 h-5" />
                {locale === 'ar' ? 'تفاصيل الطلب' : 'Order Details'}
                <span className="text-sm font-normal text-slate-500">
                  ({orderItems.length} {locale === 'ar' ? 'منتج' : 'items'})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6">
                {orderItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-start pb-4 border-b border-slate-200 last:border-0 last:pb-0"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-primary/10 text-primary text-xs rounded flex items-center justify-center font-bold">
                          {item.quantity}x
                        </span>
                        <p className="font-medium text-slate-900">
                          {locale === 'ar' ? item.item_name_ar : item.item_name_en}
                        </p>
                      </div>
                      <p className="text-sm text-slate-500 mt-1 mr-8">
                        {item.unit_price.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}{' '}
                        {locale === 'ar' ? 'للوحدة' : 'each'}
                      </p>
                      {item.special_instructions && (
                        <p className="text-xs text-slate-400 mt-1 mr-8 italic">
                          {item.special_instructions}
                        </p>
                      )}
                    </div>
                    <p className="font-semibold text-slate-900">
                      {item.total_price.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                    </p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="pt-4 border-t border-slate-200 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    {locale === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}
                  </span>
                  <span className="text-slate-900">
                    {order.subtotal.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    {locale === 'ar' ? 'رسوم التوصيل' : 'Delivery Fee'}
                  </span>
                  <span className="text-slate-900">
                    {order.delivery_fee.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                  </span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1">
                      {locale === 'ar' ? 'الخصم' : 'Discount'}
                      {order.promo_code && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          {order.promo_code}
                        </span>
                      )}
                    </span>
                    <span>
                      -{order.discount.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-200">
                  <span className="text-slate-900">{locale === 'ar' ? 'الإجمالي' : 'Total'}</span>
                  <span className="text-primary">
                    {order.total.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <CreditCard className="w-5 h-5" />
                {locale === 'ar' ? 'معلومات الدفع' : 'Payment Information'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">
                    {order.payment_method === 'cash'
                      ? locale === 'ar'
                        ? 'الدفع عند الاستلام'
                        : 'Cash on Delivery'
                      : locale === 'ar'
                        ? 'دفع إلكتروني'
                        : 'Online Payment'}
                  </p>
                  <p className="text-sm text-slate-500">
                    {order.payment_status === 'pending'
                      ? locale === 'ar'
                        ? 'في انتظار الدفع'
                        : 'Pending'
                      : order.payment_status === 'completed'
                        ? locale === 'ar'
                          ? 'تم الدفع'
                          : 'Paid'
                        : locale === 'ar'
                          ? 'فشل الدفع'
                          : 'Failed'}
                  </p>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-sm ${
                    order.payment_status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : order.payment_status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {order.payment_status === 'completed'
                    ? locale === 'ar'
                      ? 'مدفوع'
                      : 'Paid'
                    : order.payment_status === 'pending'
                      ? locale === 'ar'
                        ? 'معلق'
                        : 'Pending'
                      : locale === 'ar'
                        ? 'فشل'
                        : 'Failed'}
                </div>
              </div>

              {/* Confirm Payment Button - Only for cash orders that are delivered and pending payment */}
              {order.payment_method === 'cash' &&
                order.status === 'delivered' &&
                order.payment_status === 'pending' && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <Button
                      onClick={handleConfirmLegacyPayment}
                      disabled={actionLoading}
                      className="w-full bg-green-600 hover:bg-green-700"
                      size="lg"
                    >
                      {actionLoading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      {locale === 'ar' ? 'تأكيد استلام المبلغ' : 'Confirm Payment Received'}
                    </Button>
                    <p className="text-xs text-slate-500 text-center mt-2">
                      {locale === 'ar'
                        ? 'اضغط هنا بعد استلام المبلغ من العميل'
                        : 'Click after receiving payment from customer'}
                    </p>
                  </div>
                )}

              {/* Provider earnings info - Source of Truth from Database */}
              <div className="mt-4 pt-4 border-t border-slate-200 bg-green-50 rounded-lg p-4">
                <p className="text-sm text-slate-600 mb-2">
                  {locale === 'ar'
                    ? 'صافي الأرباح (بعد العمولة)'
                    : 'Net Earnings (after commission)'}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {(order.total - (order.platform_commission || 0)).toFixed(2)}{' '}
                  {locale === 'ar' ? 'ج.م' : 'EGP'}
                </p>

                {/* Smart Commission Display */}
                <div className="text-xs mt-2">
                  {order.platform_commission === 0 && (order.original_commission || 0) > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">
                        {locale === 'ar' ? 'عمولة المنصة:' : 'Platform commission:'}
                      </span>
                      <span className="line-through text-slate-400">
                        {(order.original_commission || 0).toFixed(2)}{' '}
                        {locale === 'ar' ? 'ج.م' : 'EGP'}
                      </span>
                      <span className="text-green-600 font-medium">
                        0 {locale === 'ar' ? 'ج.م' : 'EGP'}
                      </span>
                      <span className="text-green-500 text-[10px]">
                        ({locale === 'ar' ? 'فترة السماح' : 'Grace period'})
                      </span>
                    </div>
                  ) : (
                    <p className="text-slate-500">
                      {locale === 'ar' ? 'عمولة المنصة:' : 'Platform commission:'}{' '}
                      {(order.platform_commission || 0).toFixed(2)}{' '}
                      {locale === 'ar' ? 'ج.م' : 'EGP'}
                    </p>
                  )}
                </div>

                {/* Settlement Notes - Financial History for Provider */}
                {order.settlement_notes && (
                  <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="text-[10px] font-medium text-blue-800 mb-1">
                      {locale === 'ar' ? 'تفاصيل التسوية:' : 'Settlement Details:'}
                    </p>
                    <pre className="text-[9px] text-blue-700 whitespace-pre-wrap font-mono">
                      {order.settlement_notes}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Order Chat */}
      {order && userId && order.status !== 'cancelled' && order.status !== 'rejected' && (
        <OrderChat
          orderId={order.id}
          userType="provider"
          userId={userId}
          locale={locale}
          customerName={customer?.full_name}
          providerName={locale === 'ar' ? providerInfo?.name_ar : providerInfo?.name_en}
          defaultOpen={openChat}
        />
      )}
    </div>
  );
}

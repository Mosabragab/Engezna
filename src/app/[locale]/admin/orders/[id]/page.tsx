'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, useAdminSidebar } from '@/components/admin'
import { formatNumber, formatCurrency, formatDateTime, formatDate } from '@/lib/utils/formatters'
import {
  Shield,
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  Store,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Package,
  CreditCard,
  DollarSign,
  Calendar,
  MessageSquare,
  RefreshCw,
  Printer,
  Ban,
  FileText,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

// Cancellation reasons mapping for translation
const CANCELLATION_REASONS: Record<string, { ar: string; en: string }> = {
  changed_mind: { ar: 'غيرت رأيي', en: 'Changed my mind' },
  wrong_order: { ar: 'طلب خاطئ', en: 'Wrong order' },
  duplicate_order: { ar: 'طلب مكرر', en: 'Duplicate order' },
  long_wait: { ar: 'وقت انتظار طويل', en: 'Long wait time' },
  found_alternative: { ar: 'وجدت بديل آخر', en: 'Found an alternative' },
  other: { ar: 'سبب آخر', en: 'Other reason' },
}

interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string
  item_name_ar: string
  item_name_en: string
  item_price: string
  quantity: number
  unit_price: string
  total_price: string
  customizations?: unknown
  special_instructions?: string | null
}

interface OrderRefund {
  id: string
  amount: number
  processed_amount: number | null
  reason: string
  reason_ar: string | null
  status: 'pending' | 'approved' | 'rejected' | 'processed' | 'failed'
  refund_type: string | null
  provider_action: string | null
  review_notes: string | null
  processing_notes: string | null
  created_at: string
  reviewed_at: string | null
  processed_at: string | null
}

interface OrderDetails {
  id: string
  order_number: string
  status: string
  total: number
  subtotal: number
  delivery_fee: number
  discount: number
  promo_code: string | null
  platform_commission: number
  original_commission: number | null
  settlement_adjusted: boolean | null
  settlement_notes: string | null
  payment_method: string
  payment_status: string
  created_at: string
  updated_at: string
  accepted_at: string | null
  preparing_at: string | null
  ready_at: string | null
  picked_up_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  delivery_address: {
    // Geographic hierarchy
    governorate_id?: string
    governorate_ar?: string
    governorate_en?: string
    city_id?: string
    city_ar?: string
    city_en?: string
    district_id?: string
    district_ar?: string
    district_en?: string
    // Address details
    address?: string
    address_line1?: string
    address_line2?: string
    street?: string
    building?: string
    floor?: string
    apartment?: string
    landmark?: string
    // Contact & notes
    phone?: string
    full_name?: string
    notes?: string
    delivery_instructions?: string
    // Location
    lat?: number
    lng?: number
    // Reference
    address_id?: string
  } | string | null
  delivery_notes: string | null
  customer_notes: string | null
  customer: {
    id: string
    full_name: string | null
    phone: string | null
    email: string | null
    avatar_url: string | null
  } | null
  provider: {
    id: string
    name_ar: string
    name_en: string
    phone: string | null
    address: string | null
  } | null
  items: OrderItem[]
  refunds?: OrderRefund[]
}

export default function AdminOrderDetailsPage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const { toggle: toggleSidebar } = useAdminSidebar()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const loadOrder = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', orderId }),
      })
      const result = await response.json()

      if (result.success && result.data) {
        const orderData = result.data as OrderDetails

        // Fetch refunds for this order
        const supabase = createClient()
        const { data: refundsData } = await supabase
          .from('refunds')
          .select(`
            id, amount, processed_amount, reason, reason_ar, status,
            refund_type, provider_action, review_notes, processing_notes,
            created_at, reviewed_at, processed_at
          `)
          .eq('order_id', orderId)
          .order('created_at', { ascending: false })

        orderData.refunds = refundsData || []
        setOrder(orderData)
      }
    } catch {
      // Error handled silently
    }
  }, [orderId])

  const checkAuth = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'admin') {
        setIsAdmin(true)
        await loadOrder()
      }
    }

    setLoading(false)
  }, [loadOrder])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  async function handleStatusChange(newStatus: string) {
    if (!order) return

    setActionLoading(true)

    try {
      // For cancel status, show reason prompt
      let reason: string | null = null
      if (newStatus === 'cancelled') {
        reason = window.prompt(locale === 'ar' ? 'أدخل سبب الإلغاء:' : 'Enter cancellation reason:')
        if (!reason) {
          setActionLoading(false)
          return
        }
      }

      const response = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: newStatus === 'cancelled' ? 'cancel' : 'updateStatus',
          orderId: order.id,
          status: newStatus,
          reason: reason,
          note: reason,
        }),
      })
      const result = await response.json()

      if (result.success) {
        await loadOrder()
      } else {
        alert(result.error || (locale === 'ar' ? 'فشل تحديث الحالة' : 'Failed to update status'))
      }
    } catch {
      // Error handled silently
    }

    setActionLoading(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-700 border-green-200'
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'accepted': case 'preparing': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'ready': return 'bg-cyan-100 text-cyan-700 border-cyan-200'
      case 'out_for_delivery': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'cancelled': case 'rejected': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle2 className="w-5 h-5" />
      case 'pending': return <Clock className="w-5 h-5" />
      case 'accepted': case 'preparing': return <Package className="w-5 h-5" />
      case 'ready': return <Package className="w-5 h-5" />
      case 'out_for_delivery': return <Truck className="w-5 h-5" />
      case 'cancelled': case 'rejected': return <XCircle className="w-5 h-5" />
      default: return <Clock className="w-5 h-5" />
    }
  }

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
    }
    return labels[status]?.[locale === 'ar' ? 'ar' : 'en'] || status
  }

  if (loading) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <h1 className="text-lg font-semibold text-slate-900">
              {locale === 'ar' ? 'تفاصيل الطلب' : 'Order Details'}
            </h1>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/4"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </main>
      </>
    )
  }

  if (!user || !isAdmin) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <h1 className="text-lg font-semibold text-slate-900">
              {locale === 'ar' ? 'تفاصيل الطلب' : 'Order Details'}
            </h1>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 flex items-center justify-center">
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
        </main>
      </>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
          <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2 text-slate-900">
            {locale === 'ar' ? 'الطلب غير موجود' : 'Order Not Found'}
          </h1>
          <Link href={`/${locale}/admin/orders`}>
            <Button className="bg-red-600 hover:bg-red-700 mt-4">
              {locale === 'ar' ? 'العودة للطلبات' : 'Back to Orders'}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <AdminHeader
        user={user}
        title={locale === 'ar' ? 'تفاصيل الطلب' : 'Order Details'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Back Button & Order Number */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href={`/${locale}/admin/orders`}>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                  {locale === 'ar' ? 'العودة' : 'Back'}
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  #{order.order_number}
                </h1>
                <p className="text-sm text-slate-500">
                  {formatDateTime(order.created_at, locale)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadOrder()}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {locale === 'ar' ? 'تحديث' : 'Refresh'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                {locale === 'ar' ? 'طباعة' : 'Print'}
              </Button>
            </div>
          </div>

          {/* Status Banner */}
          <div className={`rounded-xl p-4 border ${getStatusColor(order.status)} mb-6`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                {getStatusIcon(order.status)}
                <div>
                  <p className="font-semibold text-lg">{getStatusLabel(order.status)}</p>
                  {order.cancelled_at && order.cancellation_reason && (
                    <p className="text-sm opacity-80">
                      {locale === 'ar' ? 'السبب:' : 'Reason:'}{' '}
                      {CANCELLATION_REASONS[order.cancellation_reason]
                        ? (locale === 'ar' ? CANCELLATION_REASONS[order.cancellation_reason].ar : CANCELLATION_REASONS[order.cancellation_reason].en)
                        : order.cancellation_reason}
                    </p>
                  )}
                </div>
              </div>

              {/* Status Actions */}
              {order.status !== 'delivered' && order.status !== 'cancelled' && (
                <div className="flex items-center gap-2">
                  {order.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleStatusChange('accepted')}
                        disabled={actionLoading}
                      >
                        {locale === 'ar' ? 'قبول' : 'Accept'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleStatusChange('cancelled')}
                        disabled={actionLoading}
                      >
                        {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                      </Button>
                    </>
                  )}
                  {order.status === 'accepted' && (
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleStatusChange('preparing')}
                      disabled={actionLoading}
                    >
                      {locale === 'ar' ? 'بدء التحضير' : 'Start Preparing'}
                    </Button>
                  )}
                  {order.status === 'preparing' && (
                    <Button
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-700"
                      onClick={() => handleStatusChange('ready')}
                      disabled={actionLoading}
                    >
                      {locale === 'ar' ? 'جاهز للتسليم' : 'Ready for Pickup'}
                    </Button>
                  )}
                  {order.status === 'ready' && (
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => handleStatusChange('out_for_delivery')}
                      disabled={actionLoading}
                    >
                      {locale === 'ar' ? 'في الطريق' : 'Out for Delivery'}
                    </Button>
                  )}
                  {order.status === 'out_for_delivery' && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleStatusChange('delivered')}
                      disabled={actionLoading}
                    >
                      {locale === 'ar' ? 'تم التسليم' : 'Mark Delivered'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Items */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-slate-600" />
                    {locale === 'ar' ? 'عناصر الطلب' : 'Order Items'}
                  </h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {order.items.length > 0 ? (
                    order.items.map((item) => (
                      <div key={item.id} className="p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">
                            {locale === 'ar' ? item.item_name_ar : item.item_name_en}
                          </p>
                          <p className="text-sm text-slate-500">
                            {formatCurrency(parseFloat(item.unit_price), locale)} x {formatNumber(item.quantity, locale)}
                          </p>
                          {item.special_instructions && (
                            <p className="text-xs text-slate-400 mt-1">{item.special_instructions}</p>
                          )}
                        </div>
                        <p className="font-semibold text-slate-900">
                          {formatCurrency(parseFloat(item.total_price), locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-500">
                      {locale === 'ar' ? 'لا توجد عناصر' : 'No items'}
                    </div>
                  )}
                </div>

                {/* Order Summary */}
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{locale === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span>
                      <span className="text-slate-900">{formatCurrency(order.subtotal, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{locale === 'ar' ? 'رسوم التوصيل' : 'Delivery Fee'}</span>
                      <span className="text-slate-900">{formatCurrency(order.delivery_fee, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
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
                        <span>-{formatCurrency(order.discount, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                      </div>
                    )}
                    {/* Commission Display - Source of Truth from Database */}
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{locale === 'ar' ? 'عمولة المنصة' : 'Platform Commission'}</span>
                      <div className="text-end">
                        {order.platform_commission === 0 && (order.original_commission || 0) > 0 ? (
                          <>
                            <span className="line-through text-slate-400 text-xs mr-2">
                              {formatCurrency(order.original_commission || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                            </span>
                            <span className="text-green-600 font-medium">
                              0 {locale === 'ar' ? 'ج.م' : 'EGP'}
                            </span>
                            <p className="text-[10px] text-green-500">
                              {locale === 'ar' ? '(خصم فترة السماح)' : '(Grace period discount)'}
                            </p>
                          </>
                        ) : (
                          <span className="text-red-600">
                            {formatCurrency(order.platform_commission, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Settlement Notes - Financial History */}
                    {order.settlement_notes && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs font-medium text-blue-800 mb-1 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {locale === 'ar' ? 'سجل التسوية المالية' : 'Settlement History'}
                        </p>
                        <pre className="text-[10px] text-blue-700 whitespace-pre-wrap font-mono leading-relaxed">
                          {order.settlement_notes}
                        </pre>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-200">
                      <span>{locale === 'ar' ? 'الإجمالي' : 'Total'}</span>
                      <span className="text-red-600">{formatCurrency(order.total, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-slate-600" />
                    {locale === 'ar' ? 'سجل الطلب' : 'Order Timeline'}
                  </h2>
                </div>
                <div className="p-4">
                  <div className="space-y-4">
                    <TimelineItem
                      icon={<Clock className="w-4 h-4" />}
                      label={locale === 'ar' ? 'تم إنشاء الطلب' : 'Order Created'}
                      time={order.created_at}
                      locale={locale}
                      active
                    />
                    {order.accepted_at && (
                      <TimelineItem
                        icon={<CheckCircle2 className="w-4 h-4" />}
                        label={locale === 'ar' ? 'تم القبول' : 'Accepted'}
                        time={order.accepted_at}
                        locale={locale}
                        active
                      />
                    )}
                    {order.preparing_at && (
                      <TimelineItem
                        icon={<Package className="w-4 h-4" />}
                        label={locale === 'ar' ? 'قيد التحضير' : 'Preparing'}
                        time={order.preparing_at}
                        locale={locale}
                        active
                      />
                    )}
                    {order.ready_at && (
                      <TimelineItem
                        icon={<Package className="w-4 h-4" />}
                        label={locale === 'ar' ? 'جاهز للتسليم' : 'Ready'}
                        time={order.ready_at}
                        locale={locale}
                        active
                      />
                    )}
                    {order.picked_up_at && (
                      <TimelineItem
                        icon={<Truck className="w-4 h-4" />}
                        label={locale === 'ar' ? 'في الطريق' : 'Out for Delivery'}
                        time={order.picked_up_at}
                        locale={locale}
                        active
                      />
                    )}
                    {order.delivered_at && (
                      <TimelineItem
                        icon={<CheckCircle2 className="w-4 h-4" />}
                        label={locale === 'ar' ? 'تم التسليم' : 'Delivered'}
                        time={order.delivered_at}
                        locale={locale}
                        active
                        success
                      />
                    )}
                    {order.cancelled_at && (
                      <TimelineItem
                        icon={<XCircle className="w-4 h-4" />}
                        label={locale === 'ar' ? 'تم الإلغاء' : 'Cancelled'}
                        time={order.cancelled_at}
                        locale={locale}
                        active
                        error
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Refunds Section */}
              {order.refunds && order.refunds.length > 0 && (
                <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-amber-100 bg-amber-50">
                    <h2 className="font-semibold text-amber-800 flex items-center gap-2">
                      <RotateCcw className="w-5 h-5" />
                      {locale === 'ar' ? 'طلبات الاسترداد' : 'Refund Requests'}
                      <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full text-xs">
                        {order.refunds.length}
                      </span>
                    </h2>
                  </div>
                  <div className="divide-y divide-amber-100">
                    {order.refunds.map((refund) => {
                      const statusConfig: Record<string, { label_ar: string; label_en: string; color: string }> = {
                        pending: { label_ar: 'قيد المراجعة', label_en: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
                        approved: { label_ar: 'تم الموافقة', label_en: 'Approved', color: 'bg-blue-100 text-blue-700' },
                        rejected: { label_ar: 'مرفوض', label_en: 'Rejected', color: 'bg-red-100 text-red-700' },
                        processed: { label_ar: 'تم التنفيذ', label_en: 'Processed', color: 'bg-green-100 text-green-700' },
                        failed: { label_ar: 'فشل', label_en: 'Failed', color: 'bg-red-100 text-red-700' },
                      }
                      const status = statusConfig[refund.status] || statusConfig.pending

                      return (
                        <div key={refund.id} className="p-4 space-y-3">
                          {/* Refund Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-amber-600" />
                              <span className="font-semibold text-amber-800">
                                {formatCurrency(refund.processed_amount || refund.amount, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                              </span>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                              {locale === 'ar' ? status.label_ar : status.label_en}
                            </span>
                          </div>

                          {/* Refund Reason */}
                          <div className="text-sm">
                            <span className="text-slate-500">{locale === 'ar' ? 'السبب:' : 'Reason:'}</span>
                            <p className="text-slate-700 mt-1">
                              {locale === 'ar' ? (refund.reason_ar || refund.reason) : refund.reason}
                            </p>
                          </div>

                          {/* Refund Type & Action */}
                          <div className="flex flex-wrap gap-2 text-xs">
                            {refund.refund_type && (
                              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                {refund.refund_type === 'full' ? (locale === 'ar' ? 'استرداد كامل' : 'Full Refund') :
                                 refund.refund_type === 'partial' ? (locale === 'ar' ? 'استرداد جزئي' : 'Partial Refund') :
                                 refund.refund_type}
                              </span>
                            )}
                            {refund.provider_action && (
                              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                {refund.provider_action === 'accept_full' ? (locale === 'ar' ? 'قبول كامل' : 'Full Accept') :
                                 refund.provider_action === 'accept_partial' ? (locale === 'ar' ? 'قبول جزئي' : 'Partial Accept') :
                                 refund.provider_action === 'reject' ? (locale === 'ar' ? 'رفض' : 'Rejected') :
                                 refund.provider_action}
                              </span>
                            )}
                          </div>

                          {/* Review/Processing Notes */}
                          {(refund.review_notes || refund.processing_notes) && (
                            <div className="text-sm bg-slate-50 p-2 rounded">
                              <span className="text-slate-500">{locale === 'ar' ? 'ملاحظات:' : 'Notes:'}</span>
                              <p className="text-slate-700 mt-1">{refund.processing_notes || refund.review_notes}</p>
                            </div>
                          )}

                          {/* Timeline */}
                          <div className="text-xs text-slate-500 space-y-1">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {locale === 'ar' ? 'تاريخ الطلب:' : 'Requested:'} {formatDateTime(refund.created_at, locale)}
                            </div>
                            {refund.reviewed_at && (
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {locale === 'ar' ? 'تاريخ المراجعة:' : 'Reviewed:'} {formatDateTime(refund.reviewed_at, locale)}
                              </div>
                            )}
                            {refund.processed_at && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                {locale === 'ar' ? 'تاريخ التنفيذ:' : 'Processed:'} {formatDateTime(refund.processed_at, locale)}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Info */}
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-slate-600" />
                    {locale === 'ar' ? 'معلومات العميل' : 'Customer Info'}
                  </h2>
                </div>
                <div className="p-4">
                  {order.customer ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden">
                          {order.customer.avatar_url ? (
                            <img src={order.customer.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-semibold text-slate-600 text-lg">
                              {order.customer.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{order.customer.full_name || '-'}</p>
                          <Link href={`/${locale}/admin/customers/${order.customer.id}`}>
                            <span className="text-xs text-red-600 hover:underline">
                              {locale === 'ar' ? 'عرض الملف' : 'View Profile'}
                            </span>
                          </Link>
                        </div>
                      </div>

                      {order.customer.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <a href={`tel:${order.customer.phone}`} className="text-slate-600 hover:text-red-600">
                            {order.customer.phone}
                          </a>
                        </div>
                      )}

                      {order.customer.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <a href={`mailto:${order.customer.email}`} className="text-slate-600 hover:text-red-600 truncate">
                            {order.customer.email}
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500">{locale === 'ar' ? 'لا توجد معلومات' : 'No info'}</p>
                  )}
                </div>
              </div>

              {/* Provider Info */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Store className="w-5 h-5 text-slate-600" />
                    {locale === 'ar' ? 'معلومات المتجر' : 'Provider Info'}
                  </h2>
                </div>
                <div className="p-4">
                  {order.provider ? (
                    <div className="space-y-3">
                      <p className="font-medium text-slate-900">
                        {locale === 'ar' ? order.provider.name_ar : order.provider.name_en}
                      </p>

                      {order.provider.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <a href={`tel:${order.provider.phone}`} className="text-slate-600 hover:text-red-600">
                            {order.provider.phone}
                          </a>
                        </div>
                      )}

                      {order.provider.address && (
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                          <span className="text-slate-600">{order.provider.address}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500">{locale === 'ar' ? 'لا توجد معلومات' : 'No info'}</p>
                  )}
                </div>
              </div>

              {/* Delivery Info */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-slate-600" />
                    {locale === 'ar' ? 'عنوان التوصيل' : 'Delivery Address'}
                  </h2>
                </div>
                <div className="p-4">
                  {order.delivery_address ? (
                    <div className="text-slate-600 text-sm space-y-2">
                      {typeof order.delivery_address === 'string' ? (
                        <p>{order.delivery_address}</p>
                      ) : (
                        <>
                          {/* Geographic Hierarchy */}
                          {(order.delivery_address.governorate_ar || order.delivery_address.city_ar || order.delivery_address.district_ar) && (
                            <div className="flex flex-wrap gap-2 text-xs mb-2">
                              {order.delivery_address.governorate_ar && (
                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                  {locale === 'ar' ? order.delivery_address.governorate_ar : order.delivery_address.governorate_en}
                                </span>
                              )}
                              {order.delivery_address.city_ar && (
                                <span className="bg-green-50 text-green-700 px-2 py-1 rounded">
                                  {locale === 'ar' ? order.delivery_address.city_ar : order.delivery_address.city_en}
                                </span>
                              )}
                              {order.delivery_address.district_ar && (
                                <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded">
                                  {locale === 'ar' ? order.delivery_address.district_ar : order.delivery_address.district_en}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Address Details */}
                          {(order.delivery_address.address || order.delivery_address.address_line1) && (
                            <p className="font-medium text-slate-800">
                              {order.delivery_address.address || order.delivery_address.address_line1}
                            </p>
                          )}
                          {order.delivery_address.street && (
                            <p>{locale === 'ar' ? 'الشارع:' : 'Street:'} {order.delivery_address.street}</p>
                          )}

                          {/* Building Info */}
                          {(order.delivery_address.building || order.delivery_address.floor || order.delivery_address.apartment) && (
                            <p>
                              {order.delivery_address.building && (
                                <span>{locale === 'ar' ? 'مبنى' : 'Bldg'} {order.delivery_address.building}</span>
                              )}
                              {order.delivery_address.floor && (
                                <span>{order.delivery_address.building ? ' - ' : ''}{locale === 'ar' ? 'طابق' : 'Floor'} {order.delivery_address.floor}</span>
                              )}
                              {order.delivery_address.apartment && (
                                <span>{(order.delivery_address.building || order.delivery_address.floor) ? ' - ' : ''}{locale === 'ar' ? 'شقة' : 'Apt'} {order.delivery_address.apartment}</span>
                              )}
                            </p>
                          )}

                          {/* Landmark */}
                          {order.delivery_address.landmark && (
                            <p className="text-slate-500">
                              {locale === 'ar' ? 'علامة مميزة:' : 'Landmark:'} {order.delivery_address.landmark}
                            </p>
                          )}

                          {/* Contact */}
                          {order.delivery_address.phone && (
                            <p className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-100">
                              <Phone className="w-3 h-3" />
                              <a href={`tel:${order.delivery_address.phone}`} className="hover:text-red-600">
                                {order.delivery_address.phone}
                              </a>
                            </p>
                          )}
                          {order.delivery_address.full_name && (
                            <p className="text-slate-500">{order.delivery_address.full_name}</p>
                          )}

                          {/* Delivery Instructions */}
                          {order.delivery_address.delivery_instructions && (
                            <div className="mt-2 p-2 bg-amber-50 rounded text-amber-800 text-xs">
                              <strong>{locale === 'ar' ? 'تعليمات التوصيل:' : 'Delivery Instructions:'}</strong>
                              <p>{order.delivery_address.delivery_instructions}</p>
                            </div>
                          )}

                          {/* Notes */}
                          {order.delivery_address.notes && (
                            <p className="text-slate-500 italic text-xs">{order.delivery_address.notes}</p>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">{locale === 'ar' ? 'لم يتم تحديد عنوان' : 'No address specified'}</p>
                  )}

                  {order.delivery_notes && (
                    <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">
                        {locale === 'ar' ? 'ملاحظات التوصيل:' : 'Delivery Notes:'}
                      </p>
                      <p className="text-sm text-slate-700">{order.delivery_notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-slate-600" />
                    {locale === 'ar' ? 'معلومات الدفع' : 'Payment Info'}
                  </h2>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{locale === 'ar' ? 'طريقة الدفع' : 'Method'}</span>
                    <span className="font-medium text-slate-900 capitalize">{order.payment_method}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{locale === 'ar' ? 'حالة الدفع' : 'Status'}</span>
                    <span className={`font-medium ${order.payment_status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                      {order.payment_status === 'completed'
                        ? (locale === 'ar' ? 'مدفوع' : 'Paid')
                        : (locale === 'ar' ? 'معلق' : 'Pending')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {order.customer_notes && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100">
                    <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-slate-600" />
                      {locale === 'ar' ? 'ملاحظات العميل' : 'Customer Notes'}
                    </h2>
                  </div>
                  <div className="p-4">
                    <p className="text-slate-600 text-sm">{order.customer_notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
      </main>
    </>
  )
}

// Timeline Item Component
function TimelineItem({
  icon,
  label,
  time,
  locale,
  active = false,
  success = false,
  error = false
}: {
  icon: React.ReactNode
  label: string
  time: string
  locale: string
  active?: boolean
  success?: boolean
  error?: boolean
}) {
  const bgColor = error ? 'bg-red-100 text-red-600' : success ? 'bg-green-100 text-green-600' : active ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'

  return (
    <div className="flex items-start gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bgColor}`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className={`font-medium ${active ? 'text-slate-900' : 'text-slate-400'}`}>{label}</p>
        <p className="text-xs text-slate-500">{formatDateTime(time, locale)}</p>
      </div>
    </div>
  )
}

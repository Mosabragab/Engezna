'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth'
import { CustomerLayout } from '@/components/customer/layout'
import {
  Clock,
  MapPin,
  Phone,
  ShoppingCart,
  Home,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Package,
  Truck,
  ChefHat,
  Store,
  XCircle,
  RefreshCw,
} from 'lucide-react'

type Order = {
  id: string
  order_number: string
  customer_id: string
  provider_id: string
  status: string
  subtotal: number
  delivery_fee: number
  discount: number
  total: number
  payment_method: string
  payment_status: string
  delivery_address: {
    address: string
    phone: string
    full_name: string
    notes?: string
  }
  customer_notes: string | null
  estimated_delivery_time: string
  created_at: string
  accepted_at: string | null
  preparing_at: string | null
  ready_at: string | null
  out_for_delivery_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
}

type OrderItem = {
  id: string
  order_id: string
  menu_item_id: string
  item_name_ar: string
  item_name_en: string
  item_price: number
  quantity: number
  unit_price: number
  total_price: number
}

type Provider = {
  name_ar: string
  name_en: string
  phone: string
  logo_url: string | null
}

const ORDER_STATUSES = [
  { key: 'pending', icon: Clock, label_ar: 'في الانتظار', label_en: 'Pending' },
  { key: 'accepted', icon: CheckCircle2, label_ar: 'تم القبول', label_en: 'Accepted' },
  { key: 'preparing', icon: ChefHat, label_ar: 'جاري التحضير', label_en: 'Preparing' },
  { key: 'ready', icon: Package, label_ar: 'جاهز للتوصيل', label_en: 'Ready' },
  { key: 'out_for_delivery', icon: Truck, label_ar: 'في الطريق', label_en: 'Out for Delivery' },
  { key: 'delivered', icon: CheckCircle2, label_ar: 'تم التوصيل', label_en: 'Delivered' },
]

export default function OrderTrackingPage() {
  const params = useParams()
  const orderId = params.id as string
  const locale = useLocale()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const isRTL = locale === 'ar'

  const [order, setOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [provider, setProvider] = useState<Provider | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/${locale}/auth/login?redirect=/orders/${orderId}`)
      return
    }
    if (user) {
      loadOrderDetails()
    }
  }, [orderId, user, authLoading])

  const loadOrderDetails = async () => {
    setLoading(true)
    const supabase = createClient()

    // Fetch order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError) {
      console.error('Error fetching order:', orderError)
      router.push(`/${locale}/orders`)
      return
    }

    // Check if user owns this order
    if (orderData.customer_id !== user?.id) {
      router.push(`/${locale}/orders`)
      return
    }

    setOrder(orderData)

    // Fetch order items
    const { data: itemsData, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)

    if (!itemsError) {
      setOrderItems(itemsData || [])
    }

    // Fetch provider
    const { data: providerData, error: providerError } = await supabase
      .from('providers')
      .select('name_ar, name_en, phone, logo_url')
      .eq('id', orderData.provider_id)
      .single()

    if (!providerError) {
      setProvider(providerData)
    }

    setLoading(false)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadOrderDetails()
    setRefreshing(false)
  }

  const getStatusIndex = (status: string) => {
    if (status === 'cancelled' || status === 'rejected') return -1
    return ORDER_STATUSES.findIndex(s => s.key === status)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getEstimatedDelivery = () => {
    if (!order?.estimated_delivery_time) return null
    const date = new Date(order.estimated_delivery_time)
    return date.toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading || authLoading) {
    return (
      <CustomerLayout showBottomNav={false}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-slate-500">
              {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </p>
          </div>
        </div>
      </CustomerLayout>
    )
  }

  if (!order) {
    return (
      <CustomerLayout showBottomNav={false}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-12 h-12 text-red-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {locale === 'ar' ? 'الطلب غير موجود' : 'Order not found'}
          </h2>
          <button
            onClick={() => router.push(`/${locale}/orders`)}
            className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors mt-4"
          >
            {locale === 'ar' ? 'العودة للطلبات' : 'Back to Orders'}
          </button>
        </div>
      </CustomerLayout>
    )
  }

  const currentStatusIndex = getStatusIndex(order.status)
  const isCancelled = order.status === 'cancelled' || order.status === 'rejected'
  const isDelivered = order.status === 'delivered'

  return (
    <CustomerLayout showBottomNav={false}>
      <div className="px-4 py-4">
        {/* Order Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {locale === 'ar' ? 'تتبع الطلب' : 'Track Order'}
            </h1>
            <p className="text-sm text-slate-500">
              {locale === 'ar' ? 'رقم الطلب:' : 'Order #'}
              <span className="font-mono font-bold text-primary mx-1">
                {order.order_number || order.id.slice(0, 8).toUpperCase()}
              </span>
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Status Timeline Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">
              {locale === 'ar' ? 'حالة الطلب' : 'Order Status'}
            </h2>
            {isDelivered && (
              <span className="text-sm text-green-600 flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full">
                <CheckCircle2 className="w-4 h-4" />
                {locale === 'ar' ? 'تم التوصيل' : 'Delivered'}
              </span>
            )}
            {isCancelled && (
              <span className="text-sm text-red-600 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-full">
                <XCircle className="w-4 h-4" />
                {locale === 'ar' ? 'ملغي' : 'Cancelled'}
              </span>
            )}
          </div>
          {isCancelled ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="font-semibold text-red-600">
                {locale === 'ar' ? 'تم إلغاء الطلب' : 'Order Cancelled'}
              </p>
              {order.cancelled_at && (
                <p className="text-sm text-slate-500 mt-1">
                  {formatDate(order.cancelled_at)}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {ORDER_STATUSES.map((status, index) => {
                const Icon = status.icon
                const isCompleted = index <= currentStatusIndex
                const isCurrent = index === currentStatusIndex

                return (
                  <div key={status.key} className="flex items-center gap-3">
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                        ${isCompleted
                          ? isCurrent
                            ? 'bg-primary text-white shadow-md shadow-primary/30'
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
                      <p className={`font-medium ${isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                        {locale === 'ar' ? status.label_ar : status.label_en}
                      </p>
                      {isCurrent && !isDelivered && (
                        <p className="text-xs text-primary">
                          {locale === 'ar' ? 'الحالة الحالية' : 'Current Status'}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Estimated Delivery */}
          {!isCancelled && !isDelivered && getEstimatedDelivery() && (
            <div className="mt-4 p-3 bg-primary/5 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-slate-500">
                  {locale === 'ar' ? 'الوقت المتوقع للتوصيل' : 'Estimated Delivery'}
                </p>
                <p className="font-bold text-primary">{getEstimatedDelivery()}</p>
              </div>
            </div>
          )}
        </div>

        {/* Provider Info */}
        {provider && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4">
            <div className="flex items-center gap-3">
              {provider.logo_url ? (
                <img
                  src={provider.logo_url}
                  alt={locale === 'ar' ? provider.name_ar : provider.name_en}
                  className="w-14 h-14 rounded-xl object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Store className="w-7 h-7 text-primary" />
                </div>
              )}
              <div className="flex-1">
                <p className="font-bold text-slate-900">
                  {locale === 'ar' ? provider.name_ar : provider.name_en}
                </p>
                <a
                  href={`tel:${provider.phone}`}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" />
                  {provider.phone}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Address */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-primary" />
            {locale === 'ar' ? 'عنوان التوصيل' : 'Delivery Address'}
          </h3>
          <p className="font-medium text-slate-900">{order.delivery_address?.full_name}</p>
          <p className="text-slate-500">{order.delivery_address?.address}</p>
          <p className="text-sm text-slate-500 mt-2" dir="ltr">
            <Phone className="w-3 h-3 inline mr-1" />
            {order.delivery_address?.phone}
          </p>
          {order.delivery_address?.notes && (
            <p className="text-sm text-slate-400 mt-2 italic">
              {locale === 'ar' ? 'ملاحظات:' : 'Notes:'} {order.delivery_address.notes}
            </p>
          )}
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
            <ShoppingCart className="w-5 h-5 text-primary" />
            {locale === 'ar' ? 'تفاصيل الطلب' : 'Order Details'}
          </h3>
          <div className="space-y-3 mb-4">
            {orderItems.map((item) => (
              <div key={item.id} className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">
                    {item.quantity}x {locale === 'ar' ? item.item_name_ar : item.item_name_en}
                  </p>
                  <p className="text-sm text-slate-500">
                    {item.unit_price.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                  </p>
                </div>
                <p className="font-semibold text-slate-900">
                  {item.total_price.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>{locale === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span>
              <span>{order.subtotal.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>{locale === 'ar' ? 'رسوم التوصيل' : 'Delivery Fee'}</span>
              <span>{order.delivery_fee.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>{locale === 'ar' ? 'الخصم' : 'Discount'}</span>
                <span>-{order.discount.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-100">
              <span>{locale === 'ar' ? 'الإجمالي' : 'Total'}</span>
              <span className="text-primary">{order.total.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-xl">
            <p className="text-sm font-medium text-slate-900 mb-1">
              {locale === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
            </p>
            <p className="text-sm text-slate-500">
              {order.payment_method === 'cash'
                ? locale === 'ar' ? 'الدفع عند الاستلام' : 'Cash on Delivery'
                : locale === 'ar' ? 'الدفع الإلكتروني' : 'Online Payment'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-4">
          <button
            onClick={() => router.push(`/${locale}`)}
            className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            {locale === 'ar' ? 'الرئيسية' : 'Home'}
          </button>
          <button
            onClick={() => router.push(`/${locale}/orders`)}
            className="flex-1 bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            {locale === 'ar' ? 'طلباتي' : 'My Orders'}
          </button>
        </div>
      </div>
    </CustomerLayout>
  )
}

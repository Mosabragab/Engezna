'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Clock,
  MapPin,
  Phone,
  ShoppingCart,
  Home,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-xl text-muted-foreground mb-4">
            {locale === 'ar' ? 'الطلب غير موجود' : 'Order not found'}
          </p>
          <Link href={`/${locale}/orders`}>
            <Button>
              {locale === 'ar' ? 'العودة للطلبات' : 'Back to Orders'}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const currentStatusIndex = getStatusIndex(order.status)
  const isCancelled = order.status === 'cancelled' || order.status === 'rejected'
  const isDelivered = order.status === 'delivered'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/${locale}/orders`}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary"
            >
              {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              <span>{locale === 'ar' ? 'طلباتي' : 'My Orders'}</span>
            </Link>
            <Link href={`/${locale}`} className="text-xl font-bold text-primary">
              {locale === 'ar' ? 'إنجزنا' : 'Engezna'}
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {/* Order Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold">
                {locale === 'ar' ? 'تتبع الطلب' : 'Track Order'}
              </h1>
              <span className="text-sm text-muted-foreground">
                {formatDate(order.created_at)}
              </span>
            </div>
            <p className="text-muted-foreground">
              {locale === 'ar' ? 'رقم الطلب:' : 'Order #'} 
              <span className="font-mono font-bold text-primary mx-1">
                {order.order_number || order.id.slice(0, 8).toUpperCase()}
              </span>
            </p>
          </div>

          {/* Status Timeline */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
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
                    {locale === 'ar' ? 'ملغي' : 'Cancelled'}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isCancelled ? (
                <div className="text-center py-8">
                  <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-red-600">
                    {locale === 'ar' ? 'تم إلغاء الطلب' : 'Order Cancelled'}
                  </p>
                  {order.cancelled_at && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {formatDate(order.cancelled_at)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline */}
                  <div className="space-y-6">
                    {ORDER_STATUSES.map((status, index) => {
                      const Icon = status.icon
                      const isCompleted = index <= currentStatusIndex
                      const isCurrent = index === currentStatusIndex
                      
                      return (
                        <div key={status.key} className="flex items-center gap-4">
                          {/* Icon */}
                          <div
                            className={`
                              w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                              ${isCompleted
                                ? isCurrent
                                  ? 'bg-primary text-white'
                                  : 'bg-[#22C55E] text-white'
                                : 'bg-muted text-muted-foreground'
                              }
                            `}
                          >
                            {isCompleted && !isCurrent ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : (
                              <Icon className="w-5 h-5" />
                            )}
                          </div>

                          {/* Label */}
                          <div className="flex-1">
                            <p className={`font-medium ${isCompleted ? '' : 'text-muted-foreground'}`}>
                              {locale === 'ar' ? status.label_ar : status.label_en}
                            </p>
                            {isCurrent && !isDelivered && (
                              <p className="text-sm text-primary animate-pulse">
                                {locale === 'ar' ? 'الحالة الحالية' : 'Current Status'}
                              </p>
                            )}
                          </div>

                          {/* Connector Line */}
                          {index < ORDER_STATUSES.length - 1 && (
                            <div
                              className={`
                                absolute w-0.5 h-6 ${isRTL ? 'right-5' : 'left-5'}
                                ${isCompleted ? 'bg-[#22C55E]' : 'bg-muted'}
                              `}
                              style={{ top: `${(index + 1) * 72 - 12}px` }}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Estimated Delivery */}
              {!isCancelled && !isDelivered && getEstimatedDelivery() && (
                <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {locale === 'ar' ? 'الوقت المتوقع للتوصيل' : 'Estimated Delivery'}
                      </p>
                      <p className="font-bold text-primary">{getEstimatedDelivery()}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Provider Info */}
          {provider && (
            <Card className="mb-6">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
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
                    <p className="font-bold text-lg">
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
              </CardContent>
            </Card>
          )}

          {/* Delivery Address */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                {locale === 'ar' ? 'عنوان التوصيل' : 'Delivery Address'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{order.delivery_address?.full_name}</p>
              <p className="text-muted-foreground">{order.delivery_address?.address}</p>
              <p className="text-sm text-muted-foreground mt-2" dir="ltr">
                <Phone className="w-3 h-3 inline mr-1" />
                {order.delivery_address?.phone}
              </p>
              {order.delivery_address?.notes && (
                <p className="text-sm text-muted-foreground mt-2 italic">
                  {locale === 'ar' ? 'ملاحظات:' : 'Notes:'} {order.delivery_address.notes}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                {locale === 'ar' ? 'تفاصيل الطلب' : 'Order Details'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">
                        {item.quantity}x {locale === 'ar' ? item.item_name_ar : item.item_name_en}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.unit_price.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                      </p>
                    </div>
                    <p className="font-semibold">
                      {item.total_price.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{locale === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span>
                  <span>{order.subtotal.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{locale === 'ar' ? 'رسوم التوصيل' : 'Delivery Fee'}</span>
                  <span>{order.delivery_fee.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>{locale === 'ar' ? 'الخصم' : 'Discount'}</span>
                    <span>-{order.discount.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>{locale === 'ar' ? 'الإجمالي' : 'Total'}</span>
                  <span className="text-primary">{order.total.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                </div>
              </div>

              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">
                  {locale === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {order.payment_method === 'cash'
                    ? locale === 'ar' ? 'الدفع عند الاستلام' : 'Cash on Delivery'
                    : locale === 'ar' ? 'الدفع الإلكتروني' : 'Online Payment'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href={`/${locale}`} className="flex-1">
              <Button variant="outline" className="w-full" size="lg">
                <Home className="w-5 h-5 mr-2" />
                {locale === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
              </Button>
            </Link>
            <Link href={`/${locale}/orders`} className="flex-1">
              <Button className="w-full" size="lg">
                {locale === 'ar' ? 'كل الطلبات' : 'All Orders'}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

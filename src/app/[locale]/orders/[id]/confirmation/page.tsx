'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CustomerLayout } from '@/components/customer/layout'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  ShoppingCart,
  Home,
  Store,
  Loader2,
  Bell,
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
    address?: string
    address_line1?: string
    city_ar?: string
    city_en?: string
    district_ar?: string
    district_en?: string
    governorate_ar?: string
    governorate_en?: string
    phone?: string
    full_name?: string
    notes?: string
  }
  customer_notes: string | null
  estimated_delivery_time: string
  created_at: string
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

export default function OrderConfirmationPage() {
  const params = useParams()
  const orderId = params.id as string
  const locale = useLocale()
  const router = useRouter()

  const [order, setOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [provider, setProvider] = useState<Provider | null>(null)
  const [loading, setLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    loadOrderDetails()
  }, [orderId, retryCount])

  const loadOrderDetails = async () => {
    setLoading(true)
    const supabase = createClient()

    // Wait for auth to be ready
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // If not authenticated, redirect to login
      router.push(`/${locale}/auth/login?redirect=/orders/${orderId}/confirmation`)
      return
    }

    // Small delay to ensure database transaction is committed
    if (retryCount === 0) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Fetch order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError) {
      console.error('Error fetching order:', orderError)
      // Retry once if order not found (might be a timing issue)
      if (retryCount < 2) {
        setTimeout(() => setRetryCount(prev => prev + 1), 1000)
        return
      }
      router.push(`/${locale}`)
      return
    }

    // Verify order belongs to current user
    if (orderData.customer_id !== user.id) {
      console.error('Order does not belong to current user')
      router.push(`/${locale}`)
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

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          color: 'bg-card-bg-warning text-warning border-warning',
          icon: Clock,
          label: locale === 'ar' ? 'في انتظار موافقة التاجر' : 'Waiting for Provider Approval',
          description: locale === 'ar'
            ? 'تم إرسال طلبك للتاجر وفي انتظار الموافقة عليه'
            : 'Your order has been sent to the provider and is awaiting approval',
        }
      case 'accepted':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: CheckCircle2,
          label: locale === 'ar' ? 'تم قبول الطلب' : 'Order Accepted',
          description: locale === 'ar' ? 'تم قبول طلبك وجاري تحضيره' : 'Your order has been accepted and is being prepared',
        }
      case 'preparing':
        return {
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: Clock,
          label: locale === 'ar' ? 'جاري التحضير' : 'Preparing',
          description: locale === 'ar' ? 'جاري تحضير طلبك الآن' : 'Your order is being prepared now',
        }
      default:
        return {
          color: 'bg-slate-100 text-slate-800 border-slate-200',
          icon: Clock,
          label: status,
          description: '',
        }
    }
  }

  const getDeliveryAddress = () => {
    if (!order?.delivery_address) return ''
    const addr = order.delivery_address
    const parts = []
    const isArabic = locale === 'ar'

    // Address line
    if (addr.address_line1) parts.push(addr.address_line1)
    else if (addr.address) parts.push(addr.address)

    // District - use correct language
    if (isArabic && addr.district_ar) parts.push(addr.district_ar)
    else if (!isArabic && addr.district_en) parts.push(addr.district_en)
    else if (addr.district_ar) parts.push(addr.district_ar) // Fallback to Arabic

    // City - use correct language
    if (isArabic && addr.city_ar) parts.push(addr.city_ar)
    else if (!isArabic && addr.city_en) parts.push(addr.city_en)
    else if (addr.city_ar) parts.push(addr.city_ar) // Fallback to Arabic

    // Governorate - use correct language
    if (isArabic && addr.governorate_ar) parts.push(addr.governorate_ar)
    else if (!isArabic && addr.governorate_en) parts.push(addr.governorate_en)
    else if (addr.governorate_ar) parts.push(addr.governorate_ar) // Fallback to Arabic

    return parts.join(isArabic ? '، ' : ', ')
  }

  if (loading) {
    return (
      <CustomerLayout
        headerTitle={locale === 'ar' ? 'تأكيد الطلب' : 'Order Confirmation'}
        showBackButton={false}
        showBottomNav={true}
      >
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              {locale === 'ar' ? 'جاري تحميل تفاصيل الطلب...' : 'Loading order details...'}
            </p>
          </div>
        </div>
      </CustomerLayout>
    )
  }

  if (!order) {
    return (
      <CustomerLayout
        headerTitle={locale === 'ar' ? 'تأكيد الطلب' : 'Order Confirmation'}
        showBackButton={false}
        showBottomNav={true}
      >
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center px-4">
            <p className="text-xl text-muted-foreground mb-4">
              {locale === 'ar' ? 'الطلب غير موجود' : 'Order not found'}
            </p>
            <Link href={`/${locale}`}>
              <Button>
                {locale === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
              </Button>
            </Link>
          </div>
        </div>
      </CustomerLayout>
    )
  }

  const statusInfo = getStatusInfo(order.status)
  const StatusIcon = statusInfo.icon

  return (
    <CustomerLayout
      headerTitle={locale === 'ar' ? 'تأكيد الطلب' : 'Order Confirmation'}
      showBackButton={false}
      showBottomNav={true}
    >
      <div className="px-4 py-6 pb-32">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4 animate-bounce-slow">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {locale === 'ar' ? 'تم تقديم طلبك بنجاح!' : 'Order Placed Successfully!'}
            </h1>
            <p className="text-muted-foreground">
              {locale === 'ar'
                ? 'شكراً لك على طلبك'
                : 'Thank you for your order'}
            </p>
          </div>

          {/* Order Number Card */}
          <Card className="mb-4 border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  {locale === 'ar' ? 'رقم الطلب' : 'Order Number'}
                </p>
                <p className="text-xl font-bold text-primary font-mono">
                  {order.order_number || '#' + order.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Order Status - Prominent Display */}
          <Card className={`mb-4 border-2 ${statusInfo.color}`}>
            <CardContent className="py-5">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${order.status === 'pending' ? 'bg-card-bg-warning' : 'bg-blue-200'}`}>
                  {order.status === 'pending' ? (
                    <Loader2 className="w-8 h-8 text-warning animate-spin" />
                  ) : (
                    <StatusIcon className="w-8 h-8" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg">{statusInfo.label}</p>
                  <p className="text-sm opacity-80">{statusInfo.description}</p>
                </div>
              </div>
              {order.status === 'pending' && (
                <div className="mt-4 flex items-center gap-2 text-sm bg-white/50 rounded-lg px-3 py-2">
                  <Bell className="w-4 h-4" />
                  <span>
                    {locale === 'ar'
                      ? 'سيتم إشعارك فور قبول التاجر للطلب'
                      : 'You will be notified when the provider accepts'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Provider Info */}
          {provider && (
            <Card className="mb-4">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden">
                    {provider.logo_url ? (
                      <img src={provider.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">
                      {locale === 'ar' ? provider.name_ar : provider.name_en}
                    </p>
                    <p className="text-sm text-muted-foreground" dir="ltr">{provider.phone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delivery Info */}
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {locale === 'ar' ? 'معلومات التوصيل' : 'Delivery Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    {locale === 'ar' ? 'الوقت المتوقع' : 'Estimated Time'}
                  </p>
                  <p className="font-medium">
                    {new Date(order.estimated_delivery_time).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    {locale === 'ar' ? 'العنوان' : 'Address'}
                  </p>
                  <p className="font-medium">{getDeliveryAddress()}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    {locale === 'ar' ? 'الهاتف' : 'Phone'}
                  </p>
                  <p className="font-medium" dir="ltr">{order.delivery_address?.phone}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                {locale === 'ar' ? 'تفاصيل الطلب' : 'Order Details'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {item.quantity}x{' '}
                        {locale === 'ar' ? item.item_name_ar : item.item_name_en}
                      </p>
                    </div>
                    <p className="font-semibold text-sm">
                      {item.total_price.toFixed(0)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{locale === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span>
                  <span>{order.subtotal.toFixed(0)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{locale === 'ar' ? 'رسوم التوصيل' : 'Delivery Fee'}</span>
                  <span>{order.delivery_fee.toFixed(0)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>{locale === 'ar' ? 'الخصم' : 'Discount'}</span>
                    <span>-{order.discount.toFixed(0)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t">
                  <span>{locale === 'ar' ? 'الإجمالي' : 'Total'}</span>
                  <span className="text-primary">{order.total.toFixed(0)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                </div>
              </div>

              <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground">
                  {locale === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                </p>
                <p className="text-sm font-medium">
                  {order.payment_method === 'cash'
                    ? locale === 'ar'
                      ? 'الدفع عند الاستلام'
                      : 'Cash on Delivery'
                    : locale === 'ar'
                    ? 'الدفع الإلكتروني'
                    : 'Online Payment'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Link href={`/${locale}/orders/${order.id}`} className="flex-1">
              <Button className="w-full" size="lg">
                {locale === 'ar' ? 'تتبع الطلب' : 'Track Order'}
              </Button>
            </Link>
            <Link href={`/${locale}`} className="flex-1">
              <Button variant="outline" className="w-full" size="lg">
                <Home className="w-5 h-5 me-2" />
                {locale === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </CustomerLayout>
  )
}

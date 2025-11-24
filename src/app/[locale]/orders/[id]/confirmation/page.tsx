'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  ShoppingCart,
  Home,
} from 'lucide-react'

type Order = {
  id: string
  user_id: string
  provider_id: string
  status: string
  subtotal: number
  delivery_fee: number
  total: number
  payment_method: string
  payment_status: string
  delivery_address: string
  phone: string
  notes: string | null
  estimated_delivery_time: number
  created_at: string
}

type OrderItem = {
  id: string
  order_id: string
  menu_item_id: string
  quantity: number
  unit_price: number
  subtotal: number
  menu_item: {
    name_ar: string
    name_en: string
  }
}

type Provider = {
  name_ar: string
  name_en: string
  phone: string
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

  useEffect(() => {
    loadOrderDetails()
  }, [orderId])

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
      router.push(`/${locale}`)
      return
    }

    setOrder(orderData)

    // Fetch order items with menu item details
    const { data: itemsData, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        *,
        menu_item:menu_items(name_ar, name_en)
      `)
      .eq('order_id', orderId)

    if (!itemsError) {
      setOrderItems(itemsData || [])
    }

    // Fetch provider
    const { data: providerData, error: providerError } = await supabase
      .from('providers')
      .select('name_ar, name_en, phone')
      .eq('id', orderData.provider_id)
      .single()

    if (!providerError) {
      setProvider(providerData)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
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
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold mb-2">
              {locale === 'ar' ? '✨ تم تقديم طلبك بنجاح!' : '✨ Order Placed Successfully!'}
            </h1>
            <p className="text-muted-foreground">
              {locale === 'ar'
                ? 'شكراً لك! سيتم تحضير طلبك قريباً'
                : 'Thank you! Your order is being prepared'}
            </p>
          </div>

          {/* Order Number */}
          <Card className="mb-6">
            <CardContent className="py-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  {locale === 'ar' ? 'رقم الطلب' : 'Order Number'}
                </p>
                <p className="text-2xl font-bold text-primary">#{order.id.slice(0, 8)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Info */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {locale === 'ar' ? 'معلومات التوصيل' : 'Delivery Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold">
                    {locale === 'ar' ? 'الوقت المتوقع' : 'Estimated Time'}
                  </p>
                  <p className="text-muted-foreground">
                    {order.estimated_delivery_time} {locale === 'ar' ? 'دقيقة' : 'minutes'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold">
                    {locale === 'ar' ? 'عنوان التوصيل' : 'Delivery Address'}
                  </p>
                  <p className="text-muted-foreground">{order.delivery_address}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold">
                    {locale === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                  </p>
                  <p className="text-muted-foreground" dir="ltr">{order.phone}</p>
                </div>
              </div>

              {provider && (
                <div className="pt-4 border-t">
                  <p className="font-semibold mb-1">
                    {locale === 'ar' ? 'المتجر' : 'Provider'}
                  </p>
                  <p className="text-muted-foreground">
                    {locale === 'ar' ? provider.name_ar : provider.name_en}
                  </p>
                  <p className="text-sm text-muted-foreground" dir="ltr">{provider.phone}</p>
                </div>
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
                        {item.quantity}x{' '}
                        {locale === 'ar'
                          ? item.menu_item.name_ar
                          : item.menu_item.name_en}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.unit_price} {locale === 'ar' ? 'ج.م' : 'EGP'} {locale === 'ar' ? 'للقطعة' : 'each'}
                      </p>
                    </div>
                    <p className="font-semibold">
                      {item.subtotal.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}
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
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href={`/${locale}`} className="flex-1">
              <Button variant="outline" className="w-full" size="lg">
                <Home className="w-5 h-5 mr-2" />
                {locale === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
              </Button>
            </Link>
            <Link href={`/${locale}/orders/${order.id}`} className="flex-1">
              <Button className="w-full" size="lg">
                {locale === 'ar' ? 'تتبع الطلب' : 'Track Order'}
              </Button>
            </Link>
          </div>

          {/* Additional Info */}
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm text-center text-muted-foreground">
              {locale === 'ar'
                ? 'سيتم إعلامك بتحديثات الطلب عبر الهاتف'
                : 'You will be notified of order updates via phone'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

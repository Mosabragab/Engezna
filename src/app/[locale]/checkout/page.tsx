'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { useCart } from '@/lib/store/cart'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Phone,
  User,
  ShoppingCart,
  CreditCard,
  Wallet,
} from 'lucide-react'

export default function CheckoutPage() {
  const locale = useLocale()
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { cart, provider, getSubtotal, getTotal, clearCart } = useCart()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // User information (pre-filled if logged in)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash')

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !isAuthenticated) {
      router.push(`/${locale}/auth/login?redirect=/checkout`)
      return
    }

    // Redirect if cart is empty
    if (!cart || cart.length === 0) {
      router.push(`/${locale}/providers`)
      return
    }

    // Load user data if authenticated
    if (user) {
      loadUserData()
    }
  }, [authLoading, isAuthenticated, cart, user])

  const loadUserData = async () => {
    if (!user) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('users')
      .select('full_name, phone')
      .eq('id', user.id)
      .single()

    if (data) {
      setFullName(data.full_name || '')
      setPhone(data.phone || '')
    }

    // Load default address
    const { data: addressData } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .single()

    if (addressData) {
      setAddress(
        `${addressData.street_address}, ${addressData.area}${addressData.building_number ? ', Building ' + addressData.building_number : ''}${addressData.floor_number ? ', Floor ' + addressData.floor_number : ''}`
      )
    }
  }

  const handlePlaceOrder = async () => {
    if (!user || !provider) return

    // Validation
    if (!fullName || !phone || !address) {
      setError(locale === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields')
      return
    }

    // Check minimum order amount
    const subtotal = getSubtotal()
    if (subtotal < provider.min_order_amount) {
      setError(
        locale === 'ar'
          ? `الحد الأدنى للطلب هو ${provider.min_order_amount} ج.م`
          : `Minimum order amount is ${provider.min_order_amount} EGP`
      )
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Calculate platform commission (6% default)
      const commissionRate = provider.commission_rate || 6.0
      const platformCommission = (subtotal * commissionRate) / 100

      // Create delivery address as JSONB
      const deliveryAddressJson = {
        address: address,
        phone: phone,
        full_name: fullName,
        notes: additionalNotes || null
      }

      // Calculate estimated delivery time as timestamp
      const estimatedDeliveryTime = new Date(
        Date.now() + (provider.estimated_delivery_time_min || 30) * 60 * 1000
      ).toISOString()

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          provider_id: provider.id,
          status: 'pending',
          subtotal: subtotal,
          delivery_fee: provider.delivery_fee,
          discount: 0,
          total: getTotal(),
          platform_commission: platformCommission,
          payment_method: paymentMethod,
          payment_status: 'pending',
          delivery_address: deliveryAddressJson,
          customer_notes: additionalNotes || null,
          estimated_delivery_time: estimatedDeliveryTime,
        })
        .select()
        .single()

      if (orderError) {
        console.error('Order creation error details:', orderError)
        throw orderError
      }

      // Create order items with all required fields
      const orderItems = cart.map((item) => ({
        order_id: order.id,
        menu_item_id: item.menuItem.id,
        item_name_ar: item.menuItem.name_ar,
        item_name_en: item.menuItem.name_en,
        item_price: item.menuItem.price,
        quantity: item.quantity,
        unit_price: item.menuItem.price,
        total_price: item.menuItem.price * item.quantity,
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('Order items error details:', itemsError)
        throw itemsError
      }

      // Clear cart
      clearCart()

      // Redirect to confirmation
      router.push(`/${locale}/orders/${order.id}/confirmation`)
    } catch (err) {
      console.error('Order placement error:', err)
      setError(
        locale === 'ar'
          ? 'حدث خطأ أثناء تقديم الطلب. يرجى المحاولة مرة أخرى.'
          : 'An error occurred while placing your order. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading || !cart || cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const subtotal = getSubtotal()
  const total = getTotal()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/${locale}/providers/${provider?.id}`}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary"
            >
              {locale === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              <span>{locale === 'ar' ? 'رجوع' : 'Back'}</span>
            </Link>
            <Link href={`/${locale}`} className="text-xl font-bold text-primary">
              {locale === 'ar' ? 'إنجزنا' : 'Engezna'}
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">
            {locale === 'ar' ? 'إتمام الطلب' : 'Checkout'}
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Form */}
            <div className="lg:col-span-2 space-y-6">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {locale === 'ar' ? 'معلومات العميل' : 'Customer Information'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">
                      {locale === 'ar' ? 'الاسم الكامل' : 'Full Name'} *
                    </Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={locale === 'ar' ? 'أدخل اسمك' : 'Enter your name'}
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">
                      {locale === 'ar' ? 'رقم الهاتف' : 'Phone Number'} *
                    </Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={locale === 'ar' ? 'أدخل رقم هاتفك' : 'Enter your phone'}
                      disabled={isLoading}
                      dir="ltr"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    {locale === 'ar' ? 'عنوان التوصيل' : 'Delivery Address'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="address">
                      {locale === 'ar' ? 'العنوان' : 'Address'} *
                    </Label>
                    <Textarea
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={
                        locale === 'ar'
                          ? 'الشارع، المنطقة، رقم المبنى، الطابق'
                          : 'Street, Area, Building Number, Floor'
                      }
                      disabled={isLoading}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">
                      {locale === 'ar' ? 'ملاحظات إضافية' : 'Additional Notes'} ({locale === 'ar' ? 'اختياري' : 'optional'})
                    </Label>
                    <Textarea
                      id="notes"
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      placeholder={
                        locale === 'ar'
                          ? 'أي ملاحظات خاصة للتوصيل'
                          : 'Any special delivery instructions'
                      }
                      disabled={isLoading}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    {locale === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    disabled={isLoading}
                    className={`w-full p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Wallet className="w-5 h-5" />
                      <div className="text-left">
                        <div className="font-semibold">
                          {locale === 'ar' ? 'الدفع عند الاستلام' : 'Cash on Delivery'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {locale === 'ar' ? 'ادفع نقداً عند استلام طلبك' : 'Pay cash when you receive your order'}
                        </div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('online')}
                    disabled={true}
                    className="w-full p-4 rounded-lg border-2 border-border opacity-50 cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5" />
                      <div className="text-left">
                        <div className="font-semibold">
                          {locale === 'ar' ? 'الدفع الإلكتروني' : 'Online Payment'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {locale === 'ar' ? 'قريباً' : 'Coming Soon'}
                        </div>
                      </div>
                    </div>
                  </button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    {locale === 'ar' ? 'ملخص الطلب' : 'Order Summary'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Provider Info */}
                  {provider && (
                    <div className="pb-4 border-b">
                      <p className="font-semibold">
                        {locale === 'ar' ? provider.name_ar : provider.name_en}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {provider.estimated_delivery_time_min} {locale === 'ar' ? 'دقيقة' : 'min'}
                      </p>
                    </div>
                  )}

                  {/* Cart Items */}
                  <div className="space-y-3 pb-4 border-b">
                    {cart.map((item) => (
                      <div key={item.menuItem.id} className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">
                            {item.quantity}x {locale === 'ar' ? item.menuItem.name_ar : item.menuItem.name_en}
                          </p>
                        </div>
                        <p className="font-semibold">
                          {(item.menuItem.price * item.quantity).toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Pricing */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{locale === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span>
                      <span>{subtotal.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{locale === 'ar' ? 'رسوم التوصيل' : 'Delivery Fee'}</span>
                      <span>{provider?.delivery_fee.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>{locale === 'ar' ? 'الإجمالي' : 'Total'}</span>
                      <span className="text-primary">{total.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                    </div>
                  </div>

                  {/* Place Order Button */}
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={isLoading}
                    className="w-full"
                    size="lg"
                  >
                    {isLoading
                      ? locale === 'ar'
                        ? 'جاري تقديم الطلب...'
                        : 'Placing Order...'
                      : locale === 'ar'
                      ? 'تأكيد الطلب'
                      : 'Confirm Order'}
                  </Button>

                  {provider && subtotal < provider.min_order_amount && (
                    <p className="text-sm text-destructive text-center">
                      {locale === 'ar'
                        ? `الحد الأدنى للطلب: ${provider.min_order_amount} ج.م`
                        : `Minimum order: ${provider.min_order_amount} EGP`}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

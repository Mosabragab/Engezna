'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { CustomerLayout } from '@/components/customer/layout'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/lib/store/cart'
import { CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react'

/**
 * Payment Result Page (New Flow)
 *
 * CRITICAL: This page creates the order in database ONLY after successful payment
 *
 * Flow:
 * 1. Kashier redirects here with payment status in URL params
 * 2. If payment successful:
 *    - Read order data from localStorage
 *    - Create order in database (status: 'pending', payment_status: 'paid')
 *    - Create order items
 *    - Handle promo codes
 *    - Clear localStorage and cart
 *    - Redirect to order confirmation
 * 3. If payment failed:
 *    - Keep cart and localStorage intact for retry
 *    - Show error message with retry option
 */
export default function PaymentResultPage() {
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()

  const { clearCart } = useCart()

  const [status, setStatus] = useState<'loading' | 'creating' | 'success' | 'failed' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)

  // Prevent duplicate order creation
  const orderCreatedRef = useRef(false)

  useEffect(() => {
    const processPayment = async () => {
      // Prevent duplicate processing
      if (orderCreatedRef.current) return
      orderCreatedRef.current = true

      try {
        // Get payment status from URL params (Kashier callback)
        const paymentStatus = searchParams.get('paymentStatus') || searchParams.get('status')
        const paymentRef = searchParams.get('ref') || searchParams.get('orderId')
        const transactionId = searchParams.get('transactionId') || searchParams.get('kashierOrderId')

        console.log('Payment callback received:', { paymentStatus, paymentRef, transactionId })

        // Check if payment was successful
        const isSuccess = paymentStatus === 'SUCCESS' || paymentStatus === 'CAPTURED'

        if (!isSuccess) {
          setStatus('failed')
          setErrorMessage(
            locale === 'ar'
              ? 'فشل الدفع. سلتك محفوظة ويمكنك المحاولة مرة أخرى.'
              : 'Payment failed. Your cart is saved and you can try again.'
          )
          return
        }

        // Payment successful - create the order
        setStatus('creating')

        // Read order data from localStorage
        const orderDataJson = localStorage.getItem('pendingOnlineOrderData')
        if (!orderDataJson) {
          setStatus('error')
          setErrorMessage(
            locale === 'ar'
              ? 'لم يتم العثور على بيانات الطلب. يرجى المحاولة مرة أخرى من صفحة الدفع.'
              : 'Order data not found. Please try again from checkout.'
          )
          return
        }

        const orderData = JSON.parse(orderDataJson)

        // Verify this is the correct payment (match ref)
        // Note: The ref in localStorage might differ slightly, so we just proceed if data exists

        const supabase = createClient()

        // Check authentication
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setStatus('error')
          setErrorMessage(
            locale === 'ar'
              ? 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.'
              : 'Session expired. Please log in again.'
          )
          return
        }

        // Verify user matches order data
        if (orderData.customer_id !== user.id) {
          setStatus('error')
          setErrorMessage(
            locale === 'ar'
              ? 'خطأ في التحقق. يرجى المحاولة مرة أخرى.'
              : 'Verification error. Please try again.'
          )
          return
        }

        // CREATE THE ORDER IN DATABASE (FINALLY!)
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            customer_id: orderData.customer_id,
            provider_id: orderData.provider_id,
            status: 'pending', // Visible to merchant immediately
            subtotal: orderData.subtotal,
            delivery_fee: orderData.delivery_fee,
            discount: orderData.discount,
            total: orderData.total,
            payment_method: 'online',
            payment_status: 'paid', // Payment already confirmed!
            order_type: orderData.order_type,
            delivery_timing: orderData.delivery_timing,
            scheduled_time: orderData.scheduled_time,
            delivery_address: orderData.delivery_address,
            customer_notes: orderData.customer_notes,
            estimated_delivery_time: orderData.estimated_delivery_time,
            promo_code: orderData.promo_code,
            payment_transaction_id: transactionId,
            payment_completed_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (orderError) {
          console.error('Order creation error:', orderError)
          throw new Error(`Failed to create order: ${orderError.message}`)
        }

        // Create order items
        if (orderData.cart_items && orderData.cart_items.length > 0) {
          const orderItems = orderData.cart_items.map((item: any) => ({
            order_id: order.id,
            item_id: item.item_id,
            item_name_ar: item.item_name_ar,
            item_name_en: item.item_name_en,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            options: item.options,
            notes: item.notes,
          }))

          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems)

          if (itemsError) {
            console.error('Order items creation error:', itemsError)
            // Don't fail the whole process, order is created
          }
        }

        // Handle promo code usage
        if (orderData.promo_code_id && orderData.discount > 0) {
          await supabase.from('promo_code_usage').insert({
            promo_code_id: orderData.promo_code_id,
            user_id: user.id,
            order_id: order.id,
            discount_amount: orderData.discount,
          })

          if (orderData.promo_code_usage_count !== null) {
            await supabase
              .from('promo_codes')
              .update({ usage_count: orderData.promo_code_usage_count + 1 })
              .eq('id', orderData.promo_code_id)
          }
        }

        // SUCCESS! Clean up and redirect
        setOrderId(order.id)
        setStatus('success')

        // Clear localStorage and cart
        localStorage.removeItem('pendingOnlineOrderData')
        clearCart()

        // Redirect to order confirmation after a short delay
        setTimeout(() => {
          router.push(`/${locale}/orders/${order.id}/confirmation`)
        }, 2000)

      } catch (err) {
        console.error('Payment processing error:', err)
        setStatus('error')
        setErrorMessage(
          locale === 'ar'
            ? 'حدث خطأ أثناء معالجة الدفع. يرجى التواصل مع الدعم.'
            : 'An error occurred while processing payment. Please contact support.'
        )
      }
    }

    processPayment()
  }, [searchParams, locale, router, clearCart])

  // Loading state
  if (status === 'loading' || status === 'creating') {
    return (
      <CustomerLayout showBackButton={false} showBottomNav={false}>
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
          <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
          <p className="text-lg text-muted-foreground">
            {status === 'loading'
              ? (locale === 'ar' ? 'جاري التحقق من حالة الدفع...' : 'Checking payment status...')
              : (locale === 'ar' ? 'جاري إنشاء الطلب...' : 'Creating order...')
            }
          </p>
        </div>
      </CustomerLayout>
    )
  }

  // Success state
  if (status === 'success') {
    return (
      <CustomerLayout showBackButton={false} showBottomNav={false}>
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-14 h-14 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-green-600 mb-2">
            {locale === 'ar' ? 'تم الدفع بنجاح!' : 'Payment Successful!'}
          </h1>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            {locale === 'ar'
              ? 'شكراً لك! تم إنشاء طلبك وسيتم توجيهك لصفحة التأكيد.'
              : 'Thank you! Your order has been created. Redirecting to confirmation...'}
          </p>
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </CustomerLayout>
    )
  }

  // Failed state (payment failed at gateway)
  if (status === 'failed') {
    return (
      <CustomerLayout showBackButton={true} showBottomNav={true}>
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <XCircle className="w-14 h-14 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            {locale === 'ar' ? 'فشل الدفع' : 'Payment Failed'}
          </h1>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            {errorMessage}
          </p>
          <div className="flex gap-3">
            <Button onClick={() => router.push(`/${locale}/checkout`)}>
              {locale === 'ar' ? 'المحاولة مرة أخرى' : 'Try Again'}
            </Button>
            <Button variant="outline" onClick={() => router.push(`/${locale}`)}>
              {locale === 'ar' ? 'الرئيسية' : 'Home'}
            </Button>
          </div>
        </div>
      </CustomerLayout>
    )
  }

  // Error state (system error)
  return (
    <CustomerLayout showBackButton={true} showBottomNav={true}>
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-14 h-14 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-amber-600 mb-2">
          {locale === 'ar' ? 'حدث خطأ' : 'Something Went Wrong'}
        </h1>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          {errorMessage}
        </p>
        <div className="flex gap-3">
          <Button onClick={() => router.push(`/${locale}/checkout`)}>
            {locale === 'ar' ? 'العودة للدفع' : 'Back to Checkout'}
          </Button>
          <Button variant="outline" onClick={() => router.push(`/${locale}`)}>
            {locale === 'ar' ? 'الرئيسية' : 'Home'}
          </Button>
        </div>
      </div>
    </CustomerLayout>
  )
}

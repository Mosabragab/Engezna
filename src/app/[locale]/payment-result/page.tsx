'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { CustomerLayout } from '@/components/customer/layout';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useCart } from '@/lib/store/cart';
import { CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';

/**
 * Payment Result Page (Server-Side Order Flow)
 *
 * The order already exists in database with 'pending_payment' status
 * (created by /api/payment/kashier/initiate before Kashier redirect).
 *
 * Flow:
 * 1. Kashier redirects here with payment status in URL params
 * 2. If payment successful:
 *    - Look up existing order by orderId from URL
 *    - Verify order belongs to current user
 *    - If webhook already updated it → show confirmation
 *    - If still pending_payment → update status (fallback for webhook delay)
 *    - Clear cart and redirect to confirmation
 * 3. If payment failed:
 *    - Mark order as cancelled (cleanup)
 *    - Keep cart intact for retry
 *    - Show error with retry option
 */
export default function PaymentResultPage() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { clearCart } = useCart();

  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Prevent duplicate processing
  const processedRef = useRef(false);

  useEffect(() => {
    const processPayment = async () => {
      if (processedRef.current) return;
      processedRef.current = true;

      try {
        // Get params from URL (Kashier callback)
        const paymentStatus = searchParams.get('paymentStatus') || searchParams.get('status');
        const orderIdParam = searchParams.get('orderId') || searchParams.get('merchantOrderId');
        const transactionId =
          searchParams.get('transactionId') || searchParams.get('kashierOrderId');

        if (!orderIdParam) {
          setStatus('error');
          setErrorMessage(
            locale === 'ar'
              ? 'لم يتم العثور على معرف الطلب. يرجى التواصل مع الدعم.'
              : 'Order ID not found. Please contact support.'
          );
          return;
        }

        const supabase = createClient();

        // Verify authentication
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setStatus('error');
          setErrorMessage(
            locale === 'ar'
              ? 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.'
              : 'Session expired. Please log in again.'
          );
          return;
        }

        // Look up the existing order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('id, customer_id, status, payment_status')
          .eq('id', orderIdParam)
          .single();

        if (orderError || !order) {
          setStatus('error');
          setErrorMessage(
            locale === 'ar'
              ? 'لم يتم العثور على الطلب. يرجى التواصل مع الدعم.'
              : 'Order not found. Please contact support.'
          );
          return;
        }

        // Verify order belongs to current user
        if (order.customer_id !== user.id) {
          setStatus('error');
          setErrorMessage(
            locale === 'ar'
              ? 'خطأ في التحقق. يرجى التواصل مع الدعم.'
              : 'Verification error. Please contact support.'
          );
          return;
        }

        // Check payment result
        const isSuccess = paymentStatus === 'SUCCESS' || paymentStatus === 'CAPTURED';

        if (!isSuccess) {
          // Payment failed - mark order as cancelled
          await supabase
            .from('orders')
            .update({
              status: 'cancelled',
              payment_status: 'failed',
              cancelled_at: new Date().toISOString(),
            })
            .eq('id', order.id)
            .eq('status', 'pending_payment'); // Only cancel if still pending

          setStatus('failed');
          setErrorMessage(
            locale === 'ar'
              ? 'فشل الدفع. سلتك محفوظة ويمكنك المحاولة مرة أخرى.'
              : 'Payment failed. Your cart is saved and you can try again.'
          );
          return;
        }

        // Payment succeeded!
        // Check if webhook already processed the order
        if (order.payment_status === 'paid' && order.status !== 'pending_payment') {
          // Webhook already handled it - just show success
          setOrderId(order.id);
          setStatus('success');
          clearCart();
          setTimeout(() => {
            router.push(`/${locale}/orders/${order.id}/confirmation`);
          }, 2000);
          return;
        }

        // Webhook hasn't processed yet - update order as fallback
        if (order.status === 'pending_payment') {
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              status: 'pending', // Now visible to merchant
              payment_status: 'paid',
              payment_transaction_id: transactionId,
              payment_completed_at: new Date().toISOString(),
            })
            .eq('id', order.id)
            .eq('status', 'pending_payment'); // Idempotent: only update if still pending

          if (updateError) {
            // Order might have been updated by webhook in the meantime - that's OK
          }
        }

        // Success - clean up and redirect
        setOrderId(order.id);
        setStatus('success');
        clearCart();

        setTimeout(() => {
          router.push(`/${locale}/orders/${order.id}/confirmation`);
        }, 2000);
      } catch {
        setStatus('error');
        setErrorMessage(
          locale === 'ar'
            ? 'حدث خطأ أثناء معالجة الدفع. يرجى التواصل مع الدعم.'
            : 'An error occurred while processing payment. Please contact support.'
        );
      }
    };

    processPayment();
  }, [searchParams, locale, router, clearCart]);

  // Loading state
  if (status === 'loading') {
    return (
      <CustomerLayout showBackButton={false} showBottomNav={false}>
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
          <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
          <p className="text-lg text-muted-foreground">
            {locale === 'ar' ? 'جاري التحقق من حالة الدفع...' : 'Checking payment status...'}
          </p>
        </div>
      </CustomerLayout>
    );
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
              ? 'شكراً لك! طلبك قيد التجهيز. جاري التوجيه لصفحة التأكيد...'
              : 'Thank you! Your order is being prepared. Redirecting to confirmation...'}
          </p>
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </CustomerLayout>
    );
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
          <p className="text-muted-foreground text-center mb-6 max-w-md">{errorMessage}</p>
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
    );
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
        <p className="text-muted-foreground text-center mb-6 max-w-md">{errorMessage}</p>
        {orderId && (
          <p className="text-sm text-muted-foreground mb-4">
            {locale === 'ar' ? `رقم الطلب: ${orderId}` : `Order #: ${orderId}`}
          </p>
        )}
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
  );
}

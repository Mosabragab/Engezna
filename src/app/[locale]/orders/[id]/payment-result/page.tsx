'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { CustomerLayout } from '@/components/customer/layout';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useCart } from '@/lib/store/cart';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

interface PaymentResultPageProps {
  params: Promise<{ id: string }>;
}

export default function PaymentResultPage({ params }: PaymentResultPageProps) {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Cart store for clearing cart on successful payment
  const { clearCart, clearPendingOnlineOrder, pendingOnlineOrder } = useCart();

  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending' | 'failed' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track if cart was already cleared to prevent duplicate clears
  const cartClearedRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      const resolvedParams = await params;
      setOrderId(resolvedParams.id);
    };
    init();
  }, [params]);

  useEffect(() => {
    if (!orderId) return;

    const checkPaymentStatus = async () => {
      try {
        // Get payment status from URL params (from Kashier redirect)
        const urlStatus = searchParams.get('paymentStatus') || searchParams.get('status');

        // Also check the database for the actual status
        const supabase = createClient();
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('id, payment_status, status, total')
          .eq('id', orderId)
          .single();

        if (orderError || !order) {
          setError(locale === 'ar' ? 'لم يتم العثور على الطلب' : 'Order not found');
          setLoading(false);
          return;
        }

        // Determine final status
        if (order.payment_status === 'paid') {
          setPaymentStatus('paid');
        } else if (urlStatus === 'SUCCESS' || urlStatus === 'CAPTURED') {
          // Payment might be successful but webhook hasn't updated yet
          // Wait a bit and check again
          setTimeout(async () => {
            const { data: updatedOrder } = await supabase
              .from('orders')
              .select('payment_status')
              .eq('id', orderId)
              .single();

            if (updatedOrder?.payment_status === 'paid') {
              setPaymentStatus('paid');
            } else {
              setPaymentStatus('pending');
            }
          }, 2000);
          setPaymentStatus('pending');
        } else if (urlStatus === 'PENDING') {
          setPaymentStatus('pending');
        } else if (urlStatus === 'FAILED' || urlStatus === 'CANCELLED') {
          setPaymentStatus('failed');
        } else if (order.payment_status === 'failed') {
          setPaymentStatus('failed');
        } else {
          setPaymentStatus('pending');
        }

        setLoading(false);
      } catch (err) {
        console.error('Error checking payment status:', err);
        setError(
          locale === 'ar' ? 'حدث خطأ أثناء التحقق من حالة الدفع' : 'Error checking payment status'
        );
        setLoading(false);
      }
    };

    checkPaymentStatus();
  }, [orderId, searchParams, locale]);

  // Poll for status update if pending
  useEffect(() => {
    if (paymentStatus !== 'pending' || !orderId) return;

    const pollInterval = setInterval(async () => {
      const supabase = createClient();
      const { data: order } = await supabase
        .from('orders')
        .select('payment_status')
        .eq('id', orderId)
        .single();

      if (order?.payment_status === 'paid') {
        setPaymentStatus('paid');
        clearInterval(pollInterval);
      } else if (order?.payment_status === 'failed') {
        setPaymentStatus('failed');
        clearInterval(pollInterval);
      }
    }, 3000);

    // Stop polling after 30 seconds
    setTimeout(() => clearInterval(pollInterval), 30000);

    return () => clearInterval(pollInterval);
  }, [paymentStatus, orderId]);

  // Handle cart clearing based on payment status
  useEffect(() => {
    if (paymentStatus === 'paid' && !cartClearedRef.current) {
      // Payment successful - clear cart and pending order
      cartClearedRef.current = true;
      clearCart();
      clearPendingOnlineOrder();
    } else if (paymentStatus === 'failed') {
      // Payment failed - clear pending order but keep cart for retry
      clearPendingOnlineOrder();
    }
  }, [paymentStatus, clearCart, clearPendingOnlineOrder]);

  // Verify this is the correct order (matches pending order)
  useEffect(() => {
    if (orderId && pendingOnlineOrder && pendingOnlineOrder.orderId !== orderId) {
      // This shouldn't happen, but log it for debugging
      console.warn('Order ID mismatch: URL order differs from pending order');
    }
  }, [orderId, pendingOnlineOrder]);

  if (loading) {
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

  if (error) {
    return (
      <CustomerLayout showBackButton={true} showBottomNav={true}>
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
          <XCircle className="w-20 h-20 text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">{locale === 'ar' ? 'خطأ' : 'Error'}</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => router.push(`/${locale}`)}>
            {locale === 'ar' ? 'العودة للرئيسية' : 'Go Home'}
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout showBackButton={false} showBottomNav={false}>
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        {paymentStatus === 'paid' && (
          <>
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-14 h-14 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-green-600 mb-2">
              {locale === 'ar' ? 'تم الدفع بنجاح!' : 'Payment Successful!'}
            </h1>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {locale === 'ar'
                ? 'شكراً لك! تم استلام الدفع وطلبك قيد التجهيز الآن.'
                : 'Thank you! Your payment has been received and your order is being prepared.'}
            </p>
            <div className="flex gap-3">
              <Button onClick={() => router.push(`/${locale}/orders/${orderId}`)}>
                {locale === 'ar' ? 'تتبع الطلب' : 'Track Order'}
              </Button>
              <Button variant="outline" onClick={() => router.push(`/${locale}`)}>
                {locale === 'ar' ? 'الرئيسية' : 'Home'}
              </Button>
            </div>
          </>
        )}

        {paymentStatus === 'pending' && (
          <>
            <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-6">
              <Clock className="w-14 h-14 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-amber-600 mb-2">
              {locale === 'ar' ? 'جاري معالجة الدفع' : 'Processing Payment'}
            </h1>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {locale === 'ar'
                ? 'يتم معالجة الدفع الآن. سيتم تحديث حالة الطلب تلقائياً.'
                : 'Your payment is being processed. The order status will update automatically.'}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              {locale === 'ar' ? 'جاري التحقق...' : 'Checking...'}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push(`/${locale}/orders/${orderId}`)}>
                {locale === 'ar' ? 'عرض الطلب' : 'View Order'}
              </Button>
            </div>
          </>
        )}

        {paymentStatus === 'failed' && (
          <>
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-14 h-14 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">
              {locale === 'ar' ? 'فشل الدفع' : 'Payment Failed'}
            </h1>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {locale === 'ar'
                ? 'لم نتمكن من إتمام الدفع. يرجى المحاولة مرة أخرى أو استخدام طريقة دفع أخرى.'
                : 'We could not complete your payment. Please try again or use a different payment method.'}
            </p>
            <div className="flex gap-3">
              <Button onClick={() => router.push(`/${locale}/orders/${orderId}`)}>
                {locale === 'ar' ? 'المحاولة مرة أخرى' : 'Try Again'}
              </Button>
              <Button variant="outline" onClick={() => router.push(`/${locale}`)}>
                {locale === 'ar' ? 'الرئيسية' : 'Home'}
              </Button>
            </div>
          </>
        )}
      </div>
    </CustomerLayout>
  );
}

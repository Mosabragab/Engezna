'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth';
import { CustomerLayout } from '@/components/customer/layout';
import { BroadcastComparison } from '@/components/custom-order';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Bell,
  RefreshCw,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { BroadcastWithRequests, BroadcastStatus } from '@/types/custom-order';

export const dynamic = 'force-dynamic';

export default function CustomOrderReviewPage() {
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const broadcastId = params.id as string;
  const isRTL = locale === 'ar';
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [broadcast, setBroadcast] = useState<BroadcastWithRequests | null>(null);
  const [selectingProvider, setSelectingProvider] = useState(false);

  // Load broadcast data
  const loadBroadcast = useCallback(async () => {
    if (!user?.id) return;

    const supabase = createClient();

    const { data, error: fetchError } = await supabase
      .from('custom_order_broadcasts')
      .select(
        `
        *,
        requests:custom_order_requests(
          *,
          provider:providers(
            id,
            name_ar,
            name_en,
            logo_url,
            rating,
            delivery_fee
          )
        )
      `
      )
      .eq('id', broadcastId)
      .eq('customer_id', user.id)
      .single();

    if (fetchError || !data) {
      console.error('Error loading broadcast:', fetchError);
      setError(isRTL ? 'لم يتم العثور على الطلب' : 'Order not found');
      return;
    }

    // Transform data
    const transformedBroadcast: BroadcastWithRequests = {
      ...data,
      requests: (data.requests || []).map((req: any) => ({
        ...req,
        provider: Array.isArray(req.provider) ? req.provider[0] : req.provider,
      })),
    };

    setBroadcast(transformedBroadcast);
  }, [user?.id, broadcastId, isRTL]);

  // Initial load
  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) return;

    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/orders/custom-review/${broadcastId}`);
      return;
    }

    const init = async () => {
      setLoading(true);
      await loadBroadcast();
      setLoading(false);
    };

    init();
  }, [user, authLoading, router, locale, broadcastId, loadBroadcast]);

  // Realtime subscription
  useEffect(() => {
    if (!broadcastId || !user?.id) return;

    const supabase = createClient();

    // Subscribe to broadcast updates
    const broadcastChannel = supabase
      .channel(`broadcast-${broadcastId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'custom_order_broadcasts',
          filter: `id=eq.${broadcastId}`,
        },
        () => {
          loadBroadcast();
        }
      )
      .subscribe();

    // Subscribe to request updates (new pricing)
    const requestsChannel = supabase
      .channel(`broadcast-requests-${broadcastId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'custom_order_requests',
          filter: `broadcast_id=eq.${broadcastId}`,
        },
        () => {
          loadBroadcast();
          // Play notification sound for new pricing
          try {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch {
            // Sound not available
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(requestsChannel);
    };
  }, [broadcastId, user?.id, loadBroadcast]);

  // Handle provider selection (approve pricing) - uses RPC function to bypass RLS
  const handleSelectProvider = async (orderId: string) => {
    if (!broadcast) return;

    setSelectingProvider(true);
    setError(null);

    try {
      const supabase = createClient();

      // Find the selected request
      const selectedRequest = broadcast.requests.find((r) => r.order_id === orderId);
      if (!selectedRequest) {
        throw new Error('Request not found');
      }

      // Use RPC function for approval (bypasses RLS)
      const { data, error: rpcError } = await supabase.rpc('customer_approve_custom_order', {
        p_request_id: selectedRequest.id,
        p_broadcast_id: broadcastId,
      });

      if (rpcError) {
        console.error('RPC Error:', rpcError);
        throw new Error(isRTL ? 'حدث خطأ في الموافقة' : 'Error approving order');
      }

      // Check the result
      if (!data?.success) {
        const errorMsg = data?.error || (isRTL ? 'حدث خطأ' : 'An error occurred');
        throw new Error(errorMsg);
      }

      // Success - redirect to order tracking
      const approvedOrderId = data.order_id || orderId;
      router.push(`/${locale}/orders/${approvedOrderId}?success=approved`);
    } catch (err) {
      console.error('Error selecting provider:', err);
      setError(
        isRTL ? 'حدث خطأ أثناء اختيار التاجر' : 'An error occurred while selecting the provider'
      );
    } finally {
      setSelectingProvider(false);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setLoading(true);
    await loadBroadcast();
    setLoading(false);
  };

  // Loading state (include auth loading)
  if (loading || authLoading) {
    return (
      <CustomerLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">
              {isRTL ? 'جاري تحميل العروض...' : 'Loading offers...'}
            </p>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  // Error state
  if (error || !broadcast) {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2 text-center">
            {error || (isRTL ? 'حدث خطأ' : 'An error occurred')}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 text-center max-w-md">
            {isRTL ? 'لم نتمكن من تحميل تفاصيل طلبك.' : 'We could not load your order details.'}
          </p>
          <Button onClick={() => router.push(`/${locale}/orders`)}>
            {isRTL ? (
              <ArrowRight className="w-4 h-4 me-2" />
            ) : (
              <ArrowLeft className="w-4 h-4 me-2" />
            )}
            {isRTL ? 'العودة للطلبات' : 'Back to Orders'}
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  // Broadcast completed
  if (broadcast.status === 'completed' && broadcast.winning_order_id) {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4"
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </motion.div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            {isRTL ? 'تم اختيار العرض!' : 'Offer Selected!'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 text-center max-w-md">
            {isRTL
              ? 'تم تأكيد طلبك. يمكنك متابعة حالة الطلب من صفحة الطلبات.'
              : 'Your order has been confirmed. You can track it from the orders page.'}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push(`/${locale}/orders`)}>
              {isRTL ? 'عرض جميع الطلبات' : 'View All Orders'}
            </Button>
            <Button onClick={() => router.push(`/${locale}/orders/${broadcast.winning_order_id}`)}>
              {isRTL ? 'متابعة الطلب' : 'Track Order'}
            </Button>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  // Broadcast expired
  if (broadcast.status === 'expired') {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            {isRTL ? 'انتهت صلاحية الطلب' : 'Order Expired'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 text-center max-w-md">
            {isRTL
              ? 'انتهت مهلة التسعير لهذا الطلب. يمكنك إنشاء طلب جديد.'
              : 'The pricing window for this order has ended. You can create a new order.'}
          </p>
          <Button onClick={() => router.push(`/${locale}`)}>
            {isRTL ? 'إنشاء طلب جديد' : 'Create New Order'}
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  // Count priced requests
  const pricedRequests = broadcast.requests.filter((r) => r.status === 'priced');
  const pendingRequests = broadcast.requests.filter((r) => r.status === 'pending');

  return (
    <CustomerLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/${locale}/orders`)}
              className="mb-2"
            >
              {isRTL ? (
                <ArrowRight className="w-4 h-4 me-2" />
              ) : (
                <ArrowLeft className="w-4 h-4 me-2" />
              )}
              {isRTL ? 'العودة' : 'Back'}
            </Button>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              {isRTL ? 'مقارنة العروض' : 'Compare Offers'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {isRTL
                ? `${pricedRequests.length} من ${broadcast.requests.length} تجار قاموا بالتسعير`
                : `${pricedRequests.length} of ${broadcast.requests.length} merchants have priced`}
            </p>
          </div>

          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Waiting Banner */}
        {pendingRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-pulse" />
              </div>
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">
                  {isRTL
                    ? `في انتظار ${pendingRequests.length} تاجر`
                    : `Waiting for ${pendingRequests.length} merchant(s)`}
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {isRTL
                    ? 'سيتم إشعارك فور وصول تسعيرات جديدة'
                    : "You'll be notified when new quotes arrive"}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Broadcast Comparison */}
        <BroadcastComparison
          broadcast={broadcast}
          onSelectProvider={handleSelectProvider}
          loading={selectingProvider}
        />

        {/* No Prices Yet */}
        {pricedRequests.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
              {isRTL ? 'في انتظار التسعيرات' : 'Waiting for Quotes'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {isRTL
                ? 'أرسلنا طلبك إلى التجار. سيتم إشعارك فور وصول أول تسعيرة.'
                : "We've sent your order to merchants. You'll be notified when the first quote arrives."}
            </p>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}

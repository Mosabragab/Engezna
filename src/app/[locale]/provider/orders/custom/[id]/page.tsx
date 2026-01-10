'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { ProviderLayout } from '@/components/provider'
import { PricingNotepad } from '@/components/merchant/pricing'
import { Button } from '@/components/ui/button'
import { ACTIVE_PROVIDER_STATUSES } from '@/types/database'
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import type {
  CustomOrderRequestWithItems,
  CustomOrderItem,
  PriceHistoryItem,
} from '@/types/custom-order'

export const dynamic = 'force-dynamic'

export default function CustomOrderPricingPage() {
  const locale = useLocale()
  const router = useRouter()
  const params = useParams()
  const requestId = params.id as string
  const isRTL = locale === 'ar'

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [request, setRequest] = useState<CustomOrderRequestWithItems | null>(null)
  const [priceHistory, setPriceHistory] = useState<PriceHistoryItem[]>([])
  const [providerId, setProviderId] = useState<string | null>(null)
  const [providerDeliveryFee, setProviderDeliveryFee] = useState<number>(0)

  // Load custom order request
  const loadRequest = useCallback(async (provId: string, reqId: string) => {
    const supabase = createClient()

    // Fetch the custom order request with items and broadcast info
    const { data, error: fetchError } = await supabase
      .from('custom_order_requests')
      .select(`
        *,
        items:custom_order_items(*),
        broadcast:custom_order_broadcasts(
          original_text,
          voice_url,
          image_urls,
          transcribed_text,
          customer_notes,
          customer:profiles!custom_order_broadcasts_customer_id_fkey(
            id,
            full_name,
            phone
          )
        ),
        provider:providers(
          id,
          name_ar,
          name_en,
          logo_url
        )
      `)
      .eq('id', reqId)
      .eq('provider_id', provId)
      .single()

    if (fetchError || !data) {
      console.error('Error loading request:', fetchError)
      setError(isRTL ? 'لم يتم العثور على الطلب' : 'Order not found')
      return
    }

    // Transform the data to match the expected type
    const transformedData: CustomOrderRequestWithItems = {
      ...data,
      items: data.items || [],
      provider: Array.isArray(data.provider) ? data.provider[0] : data.provider,
      broadcast: Array.isArray(data.broadcast) ? {
        ...data.broadcast[0],
        customer: Array.isArray(data.broadcast[0]?.customer)
          ? data.broadcast[0].customer[0]
          : data.broadcast[0]?.customer
      } : {
        ...data.broadcast,
        customer: Array.isArray(data.broadcast?.customer)
          ? data.broadcast.customer[0]
          : data.broadcast?.customer
      },
    }

    setRequest(transformedData)

    // Load price history for this customer
    if (transformedData.broadcast?.customer?.id) {
      const { data: historyData } = await supabase
        .from('custom_order_price_history')
        .select('*')
        .eq('provider_id', provId)
        .eq('customer_id', transformedData.broadcast.customer.id)
        .order('updated_at', { ascending: false })
        .limit(50)

      if (historyData) {
        setPriceHistory(
          historyData.map((h) => ({
            id: h.id,
            item_name_ar: h.item_name_ar,
            item_name_en: h.item_name_en,
            unit_type: h.unit_type,
            unit_price: h.unit_price,
            last_ordered_at: h.updated_at,
          }))
        )
      }
    }
  }, [isRTL])

  // Check auth and load data
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const supabase = createClient()

      // Check authentication
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push(`/${locale}/auth/login?redirect=/provider/orders/custom/${requestId}`)
        return
      }

      // Get provider ID
      const { data: providerData } = await supabase
        .from('providers')
        .select('id, status, delivery_fee')
        .eq('owner_id', user.id)
        .limit(1)

      const provider = providerData?.[0]
      if (!provider || !ACTIVE_PROVIDER_STATUSES.includes(provider.status)) {
        router.push(`/${locale}/provider`)
        return
      }

      setProviderId(provider.id)
      setProviderDeliveryFee(provider.delivery_fee || 0)
      await loadRequest(provider.id, requestId)
      setLoading(false)
    }

    init()
  }, [locale, router, requestId, loadRequest])

  // Subscribe to realtime updates
  useEffect(() => {
    if (!requestId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`custom-order-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'custom_order_requests',
          filter: `id=eq.${requestId}`,
        },
        async (payload) => {
          // Check if status changed to something that requires attention
          if (payload.new.status === 'expired' || payload.new.status === 'cancelled') {
            setError(
              isRTL
                ? 'انتهت مهلة هذا الطلب أو تم إلغاؤه'
                : 'This order has expired or been cancelled'
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [requestId, isRTL])

  // Handle pricing submission
  const handleSubmitPricing = async (
    items: Omit<CustomOrderItem, 'id' | 'request_id' | 'order_id' | 'created_at' | 'updated_at'>[],
    deliveryFee: number
  ) => {
    if (!providerId || !request) return

    setSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()

      // Calculate totals
      const subtotal = items.reduce((sum, item) => {
        if (item.availability_status === 'unavailable') return sum
        if (item.availability_status === 'substituted' && item.substitute_total_price) {
          return sum + item.substitute_total_price
        }
        return sum + item.total_price
      }, 0)

      const total = subtotal + deliveryFee

      // Start transaction - create order first
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          provider_id: providerId,
          customer_id: request.broadcast?.customer?.id,
          order_flow: 'custom',
          custom_request_id: request.id,
          status: 'awaiting_pricing_approval',
          payment_status: 'pending',
          subtotal,
          delivery_fee: deliveryFee,
          total,
          payment_method: 'cash', // Default, can be changed later
        })
        .select('id, order_number')
        .single()

      if (orderError || !orderData) {
        throw new Error(orderError?.message || 'Failed to create order')
      }

      // Insert items
      const itemsToInsert = items.map((item, index) => ({
        request_id: request.id,
        order_id: orderData.id,
        ...item,
        display_order: index,
      }))

      const { error: itemsError } = await supabase
        .from('custom_order_items')
        .insert(itemsToInsert)

      if (itemsError) {
        // Rollback - delete the order
        await supabase.from('orders').delete().eq('id', orderData.id)
        throw new Error(itemsError.message)
      }

      // Update request status
      const { error: updateError } = await supabase
        .from('custom_order_requests')
        .update({
          status: 'priced',
          order_id: orderData.id,
          items_count: items.filter((i) => i.availability_status !== 'unavailable').length,
          subtotal,
          delivery_fee: deliveryFee,
          total,
          priced_at: new Date().toISOString(),
        })
        .eq('id', request.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      // Save price history for future reference
      const historyItems = items
        .filter((item) => item.availability_status === 'available' && item.item_name_ar)
        .map((item) => ({
          provider_id: providerId,
          customer_id: request.broadcast?.customer?.id,
          item_name_normalized: item.item_name_ar.toLowerCase().trim(),
          item_name_ar: item.item_name_ar,
          item_name_en: item.item_name_en,
          unit_type: item.unit_type,
          unit_price: item.unit_price,
          quantity: item.quantity,
          total_price: item.total_price,
          order_id: orderData.id,
          request_id: request.id,
        }))

      if (historyItems.length > 0) {
        await supabase.from('custom_order_price_history').upsert(historyItems, {
          onConflict: 'provider_id,customer_id,item_name_normalized',
        })
      }

      // Success - redirect back to orders list
      router.push(`/${locale}/provider/orders?tab=custom&success=priced`)
    } catch (err) {
      console.error('Error submitting pricing:', err)
      setError(
        isRTL
          ? 'حدث خطأ أثناء إرسال التسعيرة'
          : 'An error occurred while submitting the quote'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Handle cancel
  const handleCancel = () => {
    router.push(`/${locale}/provider/orders?tab=custom`)
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            {isRTL ? 'جاري تحميل الطلب...' : 'Loading order...'}
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !request) {
    return (
      <ProviderLayout
        pageTitle={{ ar: 'تسعير طلب مفتوح', en: 'Custom Order Pricing' }}
      >
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            {error || (isRTL ? 'حدث خطأ' : 'An error occurred')}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 text-center max-w-md">
            {isRTL
              ? 'لم نتمكن من تحميل تفاصيل الطلب. قد يكون الطلب قد انتهت صلاحيته أو تم إلغاؤه.'
              : 'We could not load the order details. The order may have expired or been cancelled.'}
          </p>
          <Button onClick={() => router.push(`/${locale}/provider/orders?tab=custom`)}>
            {isRTL ? <ArrowRight className="w-4 h-4 me-2" /> : <ArrowLeft className="w-4 h-4 me-2" />}
            {isRTL ? 'العودة للطلبات' : 'Back to Orders'}
          </Button>
        </div>
      </ProviderLayout>
    )
  }

  // Check if already priced
  if (request.status !== 'pending') {
    return (
      <ProviderLayout
        pageTitle={{ ar: 'تسعير طلب مفتوح', en: 'Custom Order Pricing' }}
      >
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            {isRTL ? 'تم تسعير هذا الطلب مسبقاً' : 'This order has already been priced'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            {isRTL
              ? 'حالة الطلب الحالية: ' + request.status
              : 'Current status: ' + request.status}
          </p>
          <Button onClick={() => router.push(`/${locale}/provider/orders?tab=custom`)}>
            {isRTL ? <ArrowRight className="w-4 h-4 me-2" /> : <ArrowLeft className="w-4 h-4 me-2" />}
            {isRTL ? 'العودة للطلبات' : 'Back to Orders'}
          </Button>
        </div>
      </ProviderLayout>
    )
  }

  return (
    <ProviderLayout
      pageTitle={{ ar: 'تسعير طلب مفتوح', en: 'Custom Order Pricing' }}
      pageSubtitle={{
        ar: `طلب من ${request.broadcast?.customer?.full_name || 'عميل'}`,
        en: `Order from ${request.broadcast?.customer?.full_name || 'Customer'}`,
      }}
    >
      {/* Back Button */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/${locale}/provider/orders?tab=custom`)}
        >
          {isRTL ? <ArrowRight className="w-4 h-4 me-2" /> : <ArrowLeft className="w-4 h-4 me-2" />}
          {isRTL ? 'العودة للطلبات' : 'Back to Orders'}
        </Button>
      </div>

      {/* Pricing Notepad */}
      <div className="h-[calc(100vh-200px)] min-h-[600px]">
        <PricingNotepad
          request={request}
          priceHistory={priceHistory}
          onSubmitPricing={handleSubmitPricing}
          onCancel={handleCancel}
          loading={submitting}
          fixedDeliveryFee={providerDeliveryFee}
        />
      </div>
    </ProviderLayout>
  )
}

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
  const [defaultProviderFee, setDefaultProviderFee] = useState<number>(0)

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
      setDefaultProviderFee(provider.delivery_fee || 0)
      await loadRequest(provider.id, requestId)
      setLoading(false)
    }

    init()
  }, [locale, router, requestId, loadRequest])

  // Set delivery fee when request loads
  // Priority: request.delivery_fee (stored at broadcast time) > provider's default fee
  useEffect(() => {
    if (request) {
      // Use the delivery fee stored in the request (from broadcast creation time)
      // This ensures the customer is charged the fee they were quoted
      const storedFee = request.delivery_fee
      if (storedFee !== null && storedFee !== undefined && storedFee >= 0) {
        setProviderDeliveryFee(storedFee)
      } else {
        // Fall back to provider's current fee only if not stored in request
        setProviderDeliveryFee(defaultProviderFee)
      }
    }
  }, [request, defaultProviderFee])

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

      // ═══════════════════════════════════════════════════════════════════════
      // SERVER-SIDE VALIDATION - Prevent Race Conditions
      // ═══════════════════════════════════════════════════════════════════════

      // 1. Re-fetch current request status to prevent race conditions
      const { data: currentRequest, error: checkError } = await supabase
        .from('custom_order_requests')
        .select('status, pricing_expires_at')
        .eq('id', request.id)
        .single()

      if (checkError || !currentRequest) {
        throw new Error(isRTL ? 'لم يتم العثور على الطلب' : 'Request not found')
      }

      // 2. Validate request is still pending (another merchant might have priced it)
      if (currentRequest.status !== 'pending') {
        throw new Error(
          isRTL
            ? 'تم تسعير هذا الطلب بالفعل من قبل تاجر آخر'
            : 'This request has already been priced by another merchant'
        )
      }

      // 3. Validate deadline has not expired (server-side check)
      if (currentRequest.pricing_expires_at) {
        const deadline = new Date(currentRequest.pricing_expires_at)
        if (deadline < new Date()) {
          throw new Error(
            isRTL
              ? 'انتهت مهلة التسعير لهذا الطلب'
              : 'The pricing deadline for this request has expired'
          )
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // ATOMIC UPDATE - Lock the request before creating order
      // Use 'pricing_in_progress' status to prevent race conditions
      // The 'priced' status will be set AFTER totals are calculated
      // ═══════════════════════════════════════════════════════════════════════

      // First, atomically update request to prevent race conditions
      // Only update if status is still 'pending' (optimistic locking)
      // Using temporary status to avoid triggering notification prematurely
      const { data: lockResult, error: lockError } = await supabase
        .from('custom_order_requests')
        .update({
          status: 'pricing_in_progress',  // Temporary status, won't trigger notification
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id)
        .eq('status', 'pending') // Only update if still pending!
        .select('id')
        .single()

      if (lockError || !lockResult) {
        throw new Error(
          isRTL
            ? 'تم تسعير هذا الطلب بالفعل. يرجى تحديث الصفحة.'
            : 'This request has already been priced. Please refresh the page.'
        )
      }

      // ═══════════════════════════════════════════════════════════════════════
      // PROCEED WITH ORDER CREATION
      // ═══════════════════════════════════════════════════════════════════════

      // Calculate totals
      const subtotal = items.reduce((sum, item) => {
        if (item.availability_status === 'unavailable') return sum
        if (item.availability_status === 'substituted' && item.substitute_total_price) {
          return sum + item.substitute_total_price
        }
        return sum + item.total_price
      }, 0)

      const total = subtotal + deliveryFee

      // Create order
      // Note: order_type defaults to 'pickup' for custom orders
      // Customer will select delivery method when approving the order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          provider_id: providerId,
          customer_id: request.broadcast?.customer?.id,
          order_flow: 'custom',
          broadcast_id: request.broadcast_id,
          order_type: 'pickup', // Default for custom orders - customer chooses later
          status: 'pending',
          payment_status: 'pending',
          subtotal,
          delivery_fee: deliveryFee,
          total,
          payment_method: 'cash', // Default, can be changed later
        })
        .select('id, order_number')
        .single()

      if (orderError || !orderData) {
        // Rollback - reset request status
        await supabase
          .from('custom_order_requests')
          .update({ status: 'pending' })
          .eq('id', request.id)
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
        // Rollback - delete the order and reset request status
        await supabase.from('orders').delete().eq('id', orderData.id)
        await supabase
          .from('custom_order_requests')
          .update({ status: 'pending' })
          .eq('id', request.id)
        throw new Error(itemsError.message)
      }

      // Update request with full details AND set status to 'priced'
      // This is when the notification trigger should fire (with correct total!)
      const { error: updateError } = await supabase
        .from('custom_order_requests')
        .update({
          status: 'priced',  // NOW set to priced - trigger fires with correct total!
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-500">
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
        pageTitle={{ ar: 'تسعير طلب خاص', en: 'Custom Order Pricing' }}
      >
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            {error || (isRTL ? 'حدث خطأ' : 'An error occurred')}
          </h2>
          <p className="text-slate-500 mb-6 text-center max-w-md">
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
        pageTitle={{ ar: 'تسعير طلب خاص', en: 'Custom Order Pricing' }}
      >
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            {isRTL ? 'تم تسعير هذا الطلب مسبقاً' : 'This order has already been priced'}
          </h2>
          <p className="text-slate-500 mb-6">
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
      pageTitle={{ ar: 'تسعير طلب خاص', en: 'Custom Order Pricing' }}
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

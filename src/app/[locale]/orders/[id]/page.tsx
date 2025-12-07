'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth'
import { CustomerLayout } from '@/components/customer/layout'
import {
  Clock,
  MapPin,
  Phone,
  ShoppingCart,
  Home,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Package,
  Truck,
  ChefHat,
  Store,
  XCircle,
  RefreshCw,
  AlertTriangle,
  X,
  Star,
  MessageSquare,
} from 'lucide-react'
import { OrderChat } from '@/components/shared/OrderChat'

// Cancellation reasons
const CANCELLATION_REASONS = [
  { id: 'changed_mind', label_ar: 'غيرت رأيي', label_en: 'Changed my mind' },
  { id: 'wrong_order', label_ar: 'طلب خاطئ', label_en: 'Wrong order' },
  { id: 'duplicate_order', label_ar: 'طلب مكرر', label_en: 'Duplicate order' },
  { id: 'long_wait', label_ar: 'وقت انتظار طويل', label_en: 'Long wait time' },
  { id: 'found_alternative', label_ar: 'وجدت بديل آخر', label_en: 'Found an alternative' },
  { id: 'other', label_ar: 'سبب آخر', label_en: 'Other reason' },
]

// Star component for rating
function StarRating({ rating, onRatingChange, size = 'md', readonly = false }: {
  rating: number
  onRatingChange?: (rating: number) => void
  size?: 'sm' | 'md' | 'lg'
  readonly?: boolean
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  }

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onRatingChange?.(star)}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
        >
          <svg
            className={`${sizeClasses[size]} ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

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
    // Geographic hierarchy
    governorate_id?: string
    governorate_ar?: string
    governorate_en?: string
    city_id?: string
    city_ar?: string
    city_en?: string
    district_id?: string
    district_ar?: string
    district_en?: string
    // Address details
    address?: string
    address_line1?: string
    building?: string
    floor?: string
    apartment?: string
    landmark?: string
    // Contact
    phone?: string
    full_name?: string
    notes?: string
    delivery_instructions?: string
  } | null
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

type Review = {
  id: string
  order_id: string
  customer_id: string
  provider_id: string
  rating: number
  comment: string | null
  provider_response: string | null
  provider_response_at: string | null
  created_at: string
  updated_at: string
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

  // Cancellation state
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelNote, setCancelNote] = useState('')
  const [cancelling, setCancelling] = useState(false)

  // Review state
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [existingReview, setExistingReview] = useState<Review | null>(null)
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/${locale}/auth/login?redirect=/orders/${orderId}`)
      return
    }
    if (user) {
      loadOrderDetails()
    }
  }, [orderId, user, authLoading])

  // Realtime subscription for order status updates
  useEffect(() => {
    if (!orderId || !user) return

    const supabase = createClient()
    let isSubscribed = true

    // Subscribe to order changes with status callback
    const channel = supabase
      .channel(`order-tracking-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          if (isSubscribed) {
            console.log('Order updated via realtime:', payload.new)
            // Update order state with new data
            setOrder(payload.new as Order)
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to order updates')
        }
      })

    // Also poll every 10 seconds as fallback for mobile
    const pollInterval = setInterval(async () => {
      if (!isSubscribed) return
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (data && isSubscribed) {
        setOrder(prev => {
          // Only update if status actually changed
          if (prev?.status !== data.status) {
            console.log('Order status changed via polling:', prev?.status, '->', data.status)
            return data
          }
          return prev
        })
      }
    }, 10000)

    // Cleanup subscription on unmount
    return () => {
      isSubscribed = false
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [orderId, user])

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

    // Fetch existing review for this order
    const { data: reviewData } = await supabase
      .from('reviews')
      .select('*')
      .eq('order_id', orderId)
      .single()

    if (reviewData) {
      setExistingReview(reviewData)
      setReviewRating(reviewData.rating)
      setReviewComment(reviewData.comment || '')
    }

    setLoading(false)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadOrderDetails()
    setRefreshing(false)
  }

  const handleCancelOrder = async () => {
    if (!cancelReason || !order) return

    setCancelling(true)
    const supabase = createClient()

    try {
      // First check current order status
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('status')
        .eq('id', order.id)
        .single()

      if (fetchError) {
        console.error('Error fetching order:', fetchError)
        alert(locale === 'ar' ? 'حدث خطأ أثناء إلغاء الطلب' : 'Error cancelling order')
        return
      }

      // Check if order can still be cancelled
      if (currentOrder.status !== 'pending') {
        alert(
          locale === 'ar'
            ? 'لا يمكن إلغاء هذا الطلب لأنه تم قبوله بالفعل من المتجر'
            : 'This order cannot be cancelled because it has already been accepted by the store'
        )
        // Update local state to reflect actual status
        setOrder({ ...order, status: currentOrder.status })
        setShowCancelModal(false)
        return
      }

      const { data: updatedOrder, error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: cancelReason,
          cancellation_note: cancelNote || null,
          cancelled_by: 'customer',
        })
        .eq('id', order.id)
        .eq('status', 'pending')
        .select()
        .single()

      if (error) {
        console.error('Error cancelling order:', error)
        alert(
          locale === 'ar'
            ? `حدث خطأ أثناء إلغاء الطلب: ${error.message}`
            : `Error cancelling order: ${error.message}`
        )
      } else if (updatedOrder) {
        // Update local state
        setOrder({ ...order, status: 'cancelled', cancelled_at: new Date().toISOString() })
        setShowCancelModal(false)
        setCancelReason('')
        setCancelNote('')
      }
    } catch (err) {
      console.error('Error:', err)
      alert(locale === 'ar' ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred')
    } finally {
      setCancelling(false)
    }
  }

  const canCancelOrder = order?.status === 'pending'

  // Submit review
  const handleSubmitReview = async () => {
    if (!reviewRating || !order || !user) return

    setSubmittingReview(true)
    const supabase = createClient()

    try {
      if (existingReview) {
        // Update existing review
        const { error } = await supabase
          .from('reviews')
          .update({
            rating: reviewRating,
            comment: reviewComment || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingReview.id)

        if (error) {
          console.error('Error updating review:', error)
          alert(locale === 'ar' ? 'حدث خطأ أثناء تحديث التقييم' : 'Error updating review')
        } else {
          setExistingReview({
            ...existingReview,
            rating: reviewRating,
            comment: reviewComment || null,
            updated_at: new Date().toISOString(),
          })
          setShowReviewModal(false)
        }
      } else {
        // Create new review
        console.log('Submitting review:', {
          order_id: order.id,
          customer_id: user.id,
          provider_id: order.provider_id,
          rating: reviewRating,
          order_status: order.status
        })

        const { data, error } = await supabase
          .from('reviews')
          .insert({
            order_id: order.id,
            customer_id: user.id,
            provider_id: order.provider_id,
            rating: reviewRating,
            comment: reviewComment || null,
          })
          .select()
          .single()

        if (error) {
          console.error('Error submitting review:', error)
          // Show more detailed error for debugging
          const errorMsg = locale === 'ar'
            ? `حدث خطأ أثناء إرسال التقييم: ${error.message || error.code || 'خطأ غير معروف'}`
            : `Error submitting review: ${error.message || error.code || 'Unknown error'}`
          alert(errorMsg)
        } else {
          setExistingReview(data)
          setShowReviewModal(false)
        }
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setSubmittingReview(false)
    }
  }

  const canReviewOrder = order?.status === 'delivered'

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
      <CustomerLayout showBottomNav={true}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-slate-500">
              {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </p>
          </div>
        </div>
      </CustomerLayout>
    )
  }

  if (!order) {
    return (
      <CustomerLayout showBottomNav={true}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-12 h-12 text-red-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {locale === 'ar' ? 'الطلب غير موجود' : 'Order not found'}
          </h2>
          <button
            onClick={() => router.push(`/${locale}/orders`)}
            className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors mt-4"
          >
            {locale === 'ar' ? 'العودة للطلبات' : 'Back to Orders'}
          </button>
        </div>
      </CustomerLayout>
    )
  }

  const currentStatusIndex = getStatusIndex(order.status)
  const isCancelled = order.status === 'cancelled' || order.status === 'rejected'
  const isDelivered = order.status === 'delivered'

  return (
    <CustomerLayout showBottomNav={true}>
      <div className="px-4 py-4">
        {/* Order Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {locale === 'ar' ? 'تتبع الطلب' : 'Track Order'}
            </h1>
            <p className="text-sm text-slate-500">
              {locale === 'ar' ? 'رقم الطلب:' : 'Order #'}
              <span className="font-mono font-bold text-primary mx-1">
                {order.order_number || order.id.slice(0, 8).toUpperCase()}
              </span>
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Status Timeline Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">
              {locale === 'ar' ? 'حالة الطلب' : 'Order Status'}
            </h2>
            {isDelivered && (
              <span className="text-sm text-green-600 flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full">
                <CheckCircle2 className="w-4 h-4" />
                {locale === 'ar' ? 'تم التوصيل' : 'Delivered'}
              </span>
            )}
            {isCancelled && (
              <span className="text-sm text-red-600 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-full">
                <XCircle className="w-4 h-4" />
                {locale === 'ar' ? 'ملغي' : 'Cancelled'}
              </span>
            )}
          </div>
          {isCancelled ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="font-semibold text-red-600">
                {locale === 'ar' ? 'تم إلغاء الطلب' : 'Order Cancelled'}
              </p>
              {order.cancelled_at && (
                <p className="text-sm text-slate-500 mt-1">
                  {formatDate(order.cancelled_at)}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {ORDER_STATUSES.map((status, index) => {
                const Icon = status.icon
                const isCompleted = index <= currentStatusIndex
                const isCurrent = index === currentStatusIndex

                return (
                  <div key={status.key} className="flex items-center gap-3">
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                        ${isCompleted
                          ? isCurrent
                            ? 'bg-primary text-white shadow-md shadow-primary/30'
                            : 'bg-green-500 text-white'
                          : 'bg-slate-100 text-slate-400'
                        }
                      `}
                    >
                      {isCompleted && !isCurrent ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                        {locale === 'ar' ? status.label_ar : status.label_en}
                      </p>
                      {isCurrent && !isDelivered && (
                        <p className="text-xs text-primary">
                          {locale === 'ar' ? 'الحالة الحالية' : 'Current Status'}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Estimated Delivery */}
          {!isCancelled && !isDelivered && getEstimatedDelivery() && (
            <div className="mt-4 p-3 bg-primary/5 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-slate-500">
                  {locale === 'ar' ? 'الوقت المتوقع للتوصيل' : 'Estimated Delivery'}
                </p>
                <p className="font-bold text-primary">{getEstimatedDelivery()}</p>
              </div>
            </div>
          )}
        </div>

        {/* Provider Info */}
        {provider && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4">
            <div className="flex items-center gap-3">
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
                <p className="font-bold text-slate-900">
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
          </div>
        )}

        {/* Delivery Address */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-primary" />
            {locale === 'ar' ? 'عنوان التوصيل' : 'Delivery Address'}
          </h3>

          {/* Geographic Tags */}
          {order.delivery_address && (order.delivery_address.governorate_ar || order.delivery_address.city_ar || order.delivery_address.district_ar) && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {order.delivery_address.governorate_ar && (
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">
                  {locale === 'ar' ? order.delivery_address.governorate_ar : order.delivery_address.governorate_en}
                </span>
              )}
              {order.delivery_address.city_ar && (
                <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs">
                  {locale === 'ar' ? order.delivery_address.city_ar : order.delivery_address.city_en}
                </span>
              )}
              {order.delivery_address.district_ar && (
                <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs">
                  {locale === 'ar' ? order.delivery_address.district_ar : order.delivery_address.district_en}
                </span>
              )}
            </div>
          )}

          <p className="font-medium text-slate-900">{order.delivery_address?.full_name}</p>
          <p className="text-slate-600">{order.delivery_address?.address || order.delivery_address?.address_line1}</p>

          {/* Building Details */}
          {order.delivery_address && (order.delivery_address.building || order.delivery_address.floor || order.delivery_address.apartment) && (
            <p className="text-sm text-slate-500 mt-1">
              {order.delivery_address.building && (
                <span>{locale === 'ar' ? 'مبنى' : 'Bldg'} {order.delivery_address.building}</span>
              )}
              {order.delivery_address.floor && (
                <span>{order.delivery_address.building ? ' - ' : ''}{locale === 'ar' ? 'طابق' : 'Floor'} {order.delivery_address.floor}</span>
              )}
              {order.delivery_address.apartment && (
                <span>{(order.delivery_address.building || order.delivery_address.floor) ? ' - ' : ''}{locale === 'ar' ? 'شقة' : 'Apt'} {order.delivery_address.apartment}</span>
              )}
            </p>
          )}

          {/* Landmark */}
          {order.delivery_address?.landmark && (
            <p className="text-sm text-slate-400 mt-1">
              {locale === 'ar' ? 'علامة مميزة:' : 'Landmark:'} {order.delivery_address.landmark}
            </p>
          )}

          <p className="text-sm text-slate-500 mt-2" dir="ltr">
            <Phone className="w-3 h-3 inline mr-1" />
            {order.delivery_address?.phone}
          </p>

          {order.delivery_address?.delivery_instructions && (
            <div className="mt-2 p-2 bg-amber-50 rounded text-xs text-amber-800">
              <strong>{locale === 'ar' ? 'تعليمات التوصيل:' : 'Delivery Instructions:'}</strong> {order.delivery_address.delivery_instructions}
            </div>
          )}

          {order.delivery_address?.notes && (
            <p className="text-sm text-slate-400 mt-2 italic">
              {locale === 'ar' ? 'ملاحظات:' : 'Notes:'} {order.delivery_address.notes}
            </p>
          )}
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
            <ShoppingCart className="w-5 h-5 text-primary" />
            {locale === 'ar' ? 'تفاصيل الطلب' : 'Order Details'}
          </h3>
          <div className="space-y-3 mb-4">
            {orderItems.map((item) => (
              <div key={item.id} className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">
                    {item.quantity}x {locale === 'ar' ? item.item_name_ar : item.item_name_en}
                  </p>
                  <p className="text-sm text-slate-500">
                    {item.unit_price.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                  </p>
                </div>
                <p className="font-semibold text-slate-900">
                  {item.total_price.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>{locale === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span>
              <span>{order.subtotal.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>{locale === 'ar' ? 'رسوم التوصيل' : 'Delivery Fee'}</span>
              <span>{order.delivery_fee.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>{locale === 'ar' ? 'الخصم' : 'Discount'}</span>
                <span>-{order.discount.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-100">
              <span>{locale === 'ar' ? 'الإجمالي' : 'Total'}</span>
              <span className="text-primary">{order.total.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-xl">
            <p className="text-sm font-medium text-slate-900 mb-1">
              {locale === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
            </p>
            <p className="text-sm text-slate-500">
              {order.payment_method === 'cash'
                ? locale === 'ar' ? 'الدفع عند الاستلام' : 'Cash on Delivery'
                : locale === 'ar' ? 'الدفع الإلكتروني' : 'Online Payment'}
            </p>
          </div>
        </div>

        {/* Cancel Order Button - Only show for pending orders */}
        {canCancelOrder && (
          <div className="mb-4">
            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full bg-red-50 border border-red-200 text-red-600 py-3 rounded-xl font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
            >
              <XCircle className="w-5 h-5" />
              {locale === 'ar' ? 'إلغاء الطلب' : 'Cancel Order'}
            </button>
            <p className="text-xs text-slate-500 text-center mt-2">
              {locale === 'ar'
                ? 'يمكنك إلغاء الطلب فقط قبل قبوله من المتجر'
                : 'You can only cancel before the store accepts the order'}
            </p>
          </div>
        )}

        {/* Review Section - For delivered orders */}
        {canReviewOrder && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
              <Star className="w-5 h-5 text-yellow-500" />
              {locale === 'ar' ? 'تقييم الطلب' : 'Rate Your Order'}
            </h3>

            {existingReview ? (
              // Display existing review
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <StarRating rating={existingReview.rating} readonly size="sm" />
                  <span className="text-sm text-slate-500">
                    ({existingReview.rating}/5)
                  </span>
                </div>
                {existingReview.comment && (
                  <p className="text-slate-600 text-sm mb-3 p-3 bg-slate-50 rounded-lg">
                    &quot;{existingReview.comment}&quot;
                  </p>
                )}
                {existingReview.provider_response && (
                  <div className="mt-3 p-3 bg-primary/5 rounded-lg border-s-4 border-primary">
                    <p className="text-xs text-slate-500 mb-1">
                      {locale === 'ar' ? 'رد المتجر:' : 'Store Response:'}
                    </p>
                    <p className="text-sm text-slate-700">{existingReview.provider_response}</p>
                  </div>
                )}
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="mt-3 text-primary text-sm font-medium hover:underline flex items-center gap-1"
                >
                  <MessageSquare className="w-4 h-4" />
                  {locale === 'ar' ? 'تعديل التقييم' : 'Edit Review'}
                </button>
              </div>
            ) : (
              // Prompt to add review
              <div className="text-center py-4">
                <p className="text-slate-600 mb-3">
                  {locale === 'ar'
                    ? 'كيف كانت تجربتك مع هذا الطلب؟'
                    : 'How was your experience with this order?'}
                </p>
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="bg-primary text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <Star className="w-5 h-5" />
                  {locale === 'ar' ? 'أضف تقييمك' : 'Add Your Review'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Chat with Store Button - Inline for delivered orders */}
        {order && user && !isCancelled && (
          <div className="mb-4">
            <OrderChat
              orderId={order.id}
              userType="customer"
              userId={user.id}
              locale={locale}
              providerName={locale === 'ar' ? provider?.name_ar : provider?.name_en}
              isInline={true}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pb-4">
          <button
            onClick={() => router.push(`/${locale}`)}
            className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            {locale === 'ar' ? 'الرئيسية' : 'Home'}
          </button>
          <button
            onClick={() => router.push(`/${locale}/orders`)}
            className="flex-1 bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            {locale === 'ar' ? 'طلباتي' : 'My Orders'}
          </button>
        </div>
      </div>

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                {locale === 'ar' ? 'إلغاء الطلب' : 'Cancel Order'}
              </h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4">
              <p className="text-slate-600 mb-4">
                {locale === 'ar'
                  ? 'هل أنت متأكد من إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.'
                  : 'Are you sure you want to cancel this order? This action cannot be undone.'}
              </p>

              {/* Cancellation Reasons */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'سبب الإلغاء *' : 'Cancellation Reason *'}
                </label>
                <div className="space-y-2">
                  {CANCELLATION_REASONS.map((reason) => (
                    <label
                      key={reason.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        cancelReason === reason.id
                          ? 'border-primary bg-primary/5'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="cancelReason"
                        value={reason.id}
                        checked={cancelReason === reason.id}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-slate-700">
                        {locale === 'ar' ? reason.label_ar : reason.label_en}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Additional Note */}
              {cancelReason === 'other' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'ملاحظات إضافية' : 'Additional Notes'}
                  </label>
                  <textarea
                    value={cancelNote}
                    onChange={(e) => setCancelNote(e.target.value)}
                    placeholder={locale === 'ar' ? 'اكتب سبب الإلغاء...' : 'Write your reason...'}
                    className="w-full p-3 border border-slate-200 rounded-xl resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-4 border-t">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
              >
                {locale === 'ar' ? 'تراجع' : 'Go Back'}
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={!cancelReason || cancelling}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {cancelling ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {locale === 'ar' ? 'جاري الإلغاء...' : 'Cancelling...'}
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    {locale === 'ar' ? 'تأكيد الإلغاء' : 'Confirm Cancel'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                {existingReview
                  ? (locale === 'ar' ? 'تعديل التقييم' : 'Edit Review')
                  : (locale === 'ar' ? 'إضافة تقييم' : 'Add Review')}
              </h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4">
              {/* Provider Info */}
              {provider && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-4">
                  {provider.logo_url ? (
                    <img
                      src={provider.logo_url}
                      alt={locale === 'ar' ? provider.name_ar : provider.name_en}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Store className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-slate-900">
                      {locale === 'ar' ? provider.name_ar : provider.name_en}
                    </p>
                    <p className="text-xs text-slate-500">
                      {locale === 'ar' ? 'طلب رقم:' : 'Order:'} #{order?.order_number || order?.id.slice(0, 8)}
                    </p>
                  </div>
                </div>
              )}

              {/* Star Rating */}
              <div className="text-center mb-6">
                <p className="text-slate-600 mb-3">
                  {locale === 'ar'
                    ? 'كيف تقيم تجربتك؟'
                    : 'How would you rate your experience?'}
                </p>
                <div className="flex justify-center">
                  <StarRating
                    rating={reviewRating}
                    onRatingChange={setReviewRating}
                    size="lg"
                  />
                </div>
                {reviewRating > 0 && (
                  <p className="text-sm text-slate-500 mt-2">
                    {reviewRating === 1 && (locale === 'ar' ? 'سيء جداً' : 'Very Poor')}
                    {reviewRating === 2 && (locale === 'ar' ? 'سيء' : 'Poor')}
                    {reviewRating === 3 && (locale === 'ar' ? 'جيد' : 'Good')}
                    {reviewRating === 4 && (locale === 'ar' ? 'جيد جداً' : 'Very Good')}
                    {reviewRating === 5 && (locale === 'ar' ? 'ممتاز' : 'Excellent')}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'أضف تعليقاً (اختياري)' : 'Add a comment (optional)'}
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={
                    locale === 'ar'
                      ? 'شاركنا رأيك عن الطلب والخدمة...'
                      : 'Share your thoughts about the order and service...'
                  }
                  className="w-full p-3 border border-slate-200 rounded-xl resize-none h-28 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  maxLength={500}
                />
                <p className="text-xs text-slate-400 text-end mt-1">
                  {reviewComment.length}/500
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-4 border-t">
              <button
                onClick={() => {
                  setShowReviewModal(false)
                  // Reset to existing values if editing
                  if (existingReview) {
                    setReviewRating(existingReview.rating)
                    setReviewComment(existingReview.comment || '')
                  } else {
                    setReviewRating(0)
                    setReviewComment('')
                  }
                }}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={reviewRating === 0 || submittingReview}
                className="flex-1 bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submittingReview ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {locale === 'ar' ? 'جاري الإرسال...' : 'Submitting...'}
                  </>
                ) : (
                  <>
                    <Star className="w-4 h-4" />
                    {existingReview
                      ? (locale === 'ar' ? 'تحديث التقييم' : 'Update Review')
                      : (locale === 'ar' ? 'إرسال التقييم' : 'Submit Review')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </CustomerLayout>
  )
}

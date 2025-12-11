'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ProviderLayout } from '@/components/provider'
import { ACTIVE_PROVIDER_STATUSES } from '@/types/database'
import {
  Clock,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Package,
  Truck,
  ChefHat,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Phone,
  MapPin,
  User,
  Check,
  X,
} from 'lucide-react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

type OrderItem = {
  id: string
  item_name_ar: string
  item_name_en: string
  quantity: number
  unit_price: number
  total_price: number
}

type Order = {
  id: string
  order_number: string
  customer_id: string
  status: string
  payment_status: string
  subtotal: number
  delivery_fee: number
  total: number
  payment_method: string
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
    street?: string
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
  created_at: string
  customer: {
    full_name: string
    phone: string | null
  } | null
  items: OrderItem[]
}

/**
 * STATUS_CONFIG - Order Status Color System
 * Using new semantic colors per brand guidelines v2.0:
 * - Pending (Warning): #FACC15 → hsl(48 97% 53%)
 * - In Progress (Blue): #3B82F6 → hsl(217 91% 60%)
 * - Delivered (Success): #22C55E → hsl(142 71% 45%)
 * - Cancelled/Error: #EF4444 → hsl(0 84% 60%)
 */
const STATUS_CONFIG: Record<string, { icon: any; color: string; bgColor: string; label_ar: string; label_en: string }> = {
  pending: { icon: Clock, color: 'text-[hsl(48_97%_40%)]', bgColor: 'bg-[hsl(48_100%_95%)]', label_ar: 'طلب جديد', label_en: 'New Order' },
  accepted: { icon: CheckCircle2, color: 'text-[hsl(217_91%_60%)]', bgColor: 'bg-[hsl(217_91%_60%/0.1)]', label_ar: 'تم القبول', label_en: 'Accepted' },
  preparing: { icon: ChefHat, color: 'text-[hsl(217_91%_60%)]', bgColor: 'bg-[hsl(217_91%_60%/0.1)]', label_ar: 'جاري التحضير', label_en: 'Preparing' },
  ready: { icon: Package, color: 'text-primary', bgColor: 'bg-[hsl(198_100%_44%/0.1)]', label_ar: 'جاهز', label_en: 'Ready' },
  out_for_delivery: { icon: Truck, color: 'text-[hsl(217_91%_60%)]', bgColor: 'bg-[hsl(217_91%_60%/0.1)]', label_ar: 'في الطريق', label_en: 'On the way' },
  delivered: { icon: CheckCircle2, color: 'text-[hsl(142_71%_45%)]', bgColor: 'bg-[hsl(142_76%_95%)]', label_ar: 'تم التوصيل', label_en: 'Delivered' },
  cancelled: { icon: XCircle, color: 'text-[hsl(0_84%_60%)]', bgColor: 'bg-[hsl(0_86%_97%)]', label_ar: 'ملغي', label_en: 'Cancelled' },
  rejected: { icon: XCircle, color: 'text-[hsl(0_84%_60%)]', bgColor: 'bg-[hsl(0_86%_97%)]', label_ar: 'مرفوض', label_en: 'Rejected' },
}

// Status flow for providers
const NEXT_STATUS: Record<string, string> = {
  accepted: 'preparing',
  preparing: 'ready',
  ready: 'out_for_delivery',
  out_for_delivery: 'delivered',
}

type FilterType = 'all' | 'pending' | 'active' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled'

export default function ProviderOrdersPage() {
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'

  const [orders, setOrders] = useState<Order[]>([])
  const [providerId, setProviderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Payment confirmation dialog state
  const [paymentConfirmDialog, setPaymentConfirmDialog] = useState<{
    show: boolean
    orderId: string | null
    orderNumber: string | null
    orderTotal: number
  }>({ show: false, orderId: null, orderNumber: null, orderTotal: 0 })

  useEffect(() => {
    checkAuthAndLoadOrders()
  }, [])

  // Auto-refresh every 60 seconds as fallback
  useEffect(() => {
    if (!providerId) return

    const interval = setInterval(() => {
      loadOrders(providerId)
      setLastRefresh(new Date())
    }, 60000) // 60 seconds

    return () => clearInterval(interval)
  }, [providerId])

  // Realtime subscription for new orders and updates
  useEffect(() => {
    if (!providerId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`provider-orders-${providerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `provider_id=eq.${providerId}`,
        },
        async () => {
          // Reload orders when new order comes in
          console.log('New order received - reloading orders')
          await loadOrders(providerId)
          setLastRefresh(new Date())
          // Play notification sound
          try {
            const audio = new Audio('/sounds/new-order.mp3')
            audio.volume = 0.7
            audio.play().catch(() => {})
          } catch {
            // Sound not available
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `provider_id=eq.${providerId}`,
        },
        async () => {
          // Reload orders when any order is updated
          console.log('Order updated - reloading orders')
          await loadOrders(providerId)
          setLastRefresh(new Date())
        }
      )
      .subscribe((status) => {
        console.log('Provider orders subscription status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [providerId])

  const checkAuthAndLoadOrders = async () => {
    setLoading(true)
    const supabase = createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/provider/orders`)
      return
    }

    // Get provider ID
    const { data: providerData } = await supabase
      .from('providers')
      .select('id, status')
      .eq('owner_id', user.id)
      .limit(1)

    const provider = providerData?.[0]
    if (!provider || !ACTIVE_PROVIDER_STATUSES.includes(provider.status)) {
      router.push(`/${locale}/provider`)
      return
    }

    setProviderId(provider.id)
    await loadOrders(provider.id)
    setLoading(false)
  }

  const loadOrders = async (provId: string) => {
    const supabase = createClient()

    // Fetch orders with items in a single query using join
    const { data: ordersData, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_id,
        status,
        payment_status,
        subtotal,
        delivery_fee,
        total,
        payment_method,
        delivery_address,
        customer_notes,
        created_at,
        customer:profiles!customer_id(full_name, phone),
        order_items(id, item_name_ar, item_name_en, quantity, unit_price, total_price)
      `)
      .eq('provider_id', provId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching orders:', error)
      return
    }

    // Transform data to expected format
    const ordersWithItems = (ordersData || []).map((order) => ({
      ...order,
      customer: Array.isArray(order.customer) ? order.customer[0] : order.customer,
      items: order.order_items || []
    }))

    setOrders(ordersWithItems)
  }

  const handleRefresh = async () => {
    if (!providerId) return
    setRefreshing(true)
    await loadOrders(providerId)
    setRefreshing(false)
  }

  const handleAcceptOrder = async (orderId: string) => {
    setActionLoading(orderId)
    const supabase = createClient()

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (!error && providerId) {
      await loadOrders(providerId)
    }
    setActionLoading(null)
  }

  const handleRejectOrder = async (orderId: string) => {
    setActionLoading(orderId)
    const supabase = createClient()

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'rejected',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (!error && providerId) {
      await loadOrders(providerId)
    }
    setActionLoading(null)
  }

  const handleUpdateStatus = async (orderId: string, currentStatus: string) => {
    const nextStatus = NEXT_STATUS[currentStatus]
    if (!nextStatus) return

    setActionLoading(orderId)
    const supabase = createClient()

    const updateData: Record<string, any> = {
      status: nextStatus,
      updated_at: new Date().toISOString()
    }

    // Add timestamp for the new status
    if (nextStatus === 'preparing') updateData.preparing_at = new Date().toISOString()
    if (nextStatus === 'ready') updateData.ready_at = new Date().toISOString()
    if (nextStatus === 'out_for_delivery') updateData.out_for_delivery_at = new Date().toISOString()
    if (nextStatus === 'delivered') updateData.delivered_at = new Date().toISOString()

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)

    if (!error && providerId) {
      await loadOrders(providerId)
    }
    setActionLoading(null)
  }

  // Show payment confirmation dialog
  const showPaymentConfirmation = (order: Order) => {
    setPaymentConfirmDialog({
      show: true,
      orderId: order.id,
      orderNumber: order.order_number || order.id.slice(0, 8).toUpperCase(),
      orderTotal: order.total
    })
  }

  // Cancel payment confirmation
  const cancelPaymentConfirmation = () => {
    setPaymentConfirmDialog({ show: false, orderId: null, orderNumber: null, orderTotal: 0 })
  }

  // Actually confirm payment after user confirms
  const handleConfirmPayment = async () => {
    const orderId = paymentConfirmDialog.orderId
    if (!orderId) return

    setActionLoading(orderId)
    cancelPaymentConfirmation()

    const supabase = createClient()

    try {
      // First verify the order exists and belongs to this provider
      const { data: existingOrder, error: fetchError } = await supabase
        .from('orders')
        .select('id, payment_status, provider_id')
        .eq('id', orderId)
        .single()

      if (fetchError || !existingOrder) {
        console.error('Error fetching order:', fetchError)
        alert(locale === 'ar' ? 'خطأ: لم يتم العثور على الطلب' : 'Error: Order not found')
        setActionLoading(null)
        return
      }

      // Verify provider ownership
      if (existingOrder.provider_id !== providerId) {
        console.error('Provider mismatch')
        alert(locale === 'ar' ? 'خطأ: ليس لديك صلاحية تحديث هذا الطلب' : 'Error: You do not have permission to update this order')
        setActionLoading(null)
        return
      }

      // Perform the update
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('provider_id', providerId) // Extra safety check

      if (updateError) {
        console.error('Error updating payment status:', updateError)
        alert(locale === 'ar' ? 'خطأ في تحديث حالة الدفع: ' + updateError.message : 'Error updating payment status: ' + updateError.message)
        setActionLoading(null)
        return
      }

      // Success - reload orders to reflect changes
      if (providerId) {
        await loadOrders(providerId)
      }
    } catch (err) {
      console.error('Unexpected error in handleConfirmPayment:', err)
      alert(locale === 'ar' ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred')
    }

    setActionLoading(null)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTimeSince = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60) // in minutes

    if (diff < 1) return locale === 'ar' ? 'الآن' : 'Just now'
    if (diff < 60) return locale === 'ar' ? `منذ ${diff} دقيقة` : `${diff}m ago`
    if (diff < 1440) return locale === 'ar' ? `منذ ${Math.floor(diff / 60)} ساعة` : `${Math.floor(diff / 60)}h ago`
    return formatDate(dateString)
  }

  const filterOrders = (orders: Order[]) => {
    switch (filter) {
      case 'pending':
        return orders.filter(o => o.status === 'pending')
      case 'active':
        return orders.filter(o =>
          ['accepted', 'preparing'].includes(o.status)
        )
      case 'ready':
        return orders.filter(o => o.status === 'ready')
      case 'out_for_delivery':
        return orders.filter(o => o.status === 'out_for_delivery')
      case 'completed':
        return orders.filter(o => o.status === 'delivered')
      case 'cancelled':
        return orders.filter(o => ['cancelled', 'rejected'].includes(o.status))
      default:
        return orders
    }
  }

  const filteredOrders = filterOrders(orders)
  const pendingCount = orders.filter(o => o.status === 'pending').length
  const activeCount = orders.filter(o => ['accepted', 'preparing'].includes(o.status)).length
  const readyCount = orders.filter(o => o.status === 'ready').length
  const outForDeliveryCount = orders.filter(o => o.status === 'out_for_delivery').length
  const completedCount = orders.filter(o => o.status === 'delivered').length
  const cancelledCount = orders.filter(o => ['cancelled', 'rejected'].includes(o.status)).length

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.pending
  }

  const getNextStatusLabel = (status: string) => {
    const next = NEXT_STATUS[status]
    if (!next) return null
    const config = STATUS_CONFIG[next]
    return locale === 'ar' ? config.label_ar : config.label_en
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-slate-500">
            {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <ProviderLayout
      pageTitle={{ ar: 'إدارة الطلبات', en: 'Order Management' }}
      pageSubtitle={{ ar: 'إدارة طلبات متجرك', en: 'Manage your store orders' }}
    >
      {/* Refresh Button */}
      <div className="flex justify-end mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-slate-500 hover:text-slate-900"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''} me-2`} />
          {locale === 'ar' ? 'تحديث' : 'Refresh'}
        </Button>
      </div>

      <div className="">
        {/* Stats Row - Using new semantic card backgrounds */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* New Orders - Warning Yellow */}
          <div className="bg-[hsl(var(--card-bg-warning))] rounded-xl p-4 border border-warning/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-warning/15 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-[hsl(48_97%_40%)]" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[hsl(var(--text-primary))]">{pendingCount}</p>
                <p className="text-xs text-[hsl(var(--text-secondary))]">{locale === 'ar' ? 'طلبات جديدة' : 'New Orders'}</p>
              </div>
            </div>
          </div>
          {/* In Progress - Blue */}
          <div className="bg-[hsl(217_91%_60%/0.08)] rounded-xl p-4 border border-[hsl(217_91%_60%/0.2)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[hsl(217_91%_60%/0.15)] rounded-lg flex items-center justify-center">
                <ChefHat className="w-5 h-5 text-[hsl(217_91%_60%)]" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[hsl(var(--text-primary))]">{activeCount}</p>
                <p className="text-xs text-[hsl(var(--text-secondary))]">{locale === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</p>
              </div>
            </div>
          </div>
          {/* Completed - Success Green */}
          <div className="bg-[hsl(var(--card-bg-success))] rounded-xl p-4 border border-success/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success/15 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[hsl(var(--text-primary))]">{orders.filter(o => o.status === 'delivered').length}</p>
                <p className="text-xs text-[hsl(var(--text-secondary))]">{locale === 'ar' ? 'مكتمل' : 'Completed'}</p>
              </div>
            </div>
          </div>
          {/* Total Orders - Primary Blue */}
          <div className="bg-[hsl(var(--card-bg-primary))] rounded-xl p-4 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/15 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-primary" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[hsl(var(--text-primary))]">{orders.length}</p>
                <p className="text-xs text-[hsl(var(--text-secondary))]">{locale === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className={filter !== 'all' ? 'border-slate-300 text-slate-600' : ''}
          >
            {locale === 'ar' ? 'الكل' : 'All'}
            <span className="mx-1 text-xs opacity-70">({orders.length})</span>
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
            className={filter !== 'pending' ? 'border-slate-300 text-slate-600' : ''}
          >
            {locale === 'ar' ? 'جديد' : 'New'}
            {pendingCount > 0 && (
              <span className="mx-1 bg-premium text-slate-900 text-xs px-1.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </Button>
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('active')}
            className={filter !== 'active' ? 'border-slate-300 text-slate-600' : ''}
          >
            {locale === 'ar' ? 'قيد التنفيذ' : 'In Progress'}
            <span className="mx-1 text-xs opacity-70">({activeCount})</span>
          </Button>
          <Button
            variant={filter === 'ready' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('ready')}
            className={filter !== 'ready' ? 'border-slate-300 text-slate-600' : ''}
          >
            {locale === 'ar' ? 'جاهز' : 'Ready'}
            <span className="mx-1 text-xs opacity-70">({readyCount})</span>
          </Button>
          <Button
            variant={filter === 'out_for_delivery' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('out_for_delivery')}
            className={filter !== 'out_for_delivery' ? 'border-slate-300 text-slate-600' : ''}
          >
            {locale === 'ar' ? 'في الطريق' : 'On the Way'}
            <span className="mx-1 text-xs opacity-70">({outForDeliveryCount})</span>
          </Button>
          <Button
            variant={filter === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('completed')}
            className={filter !== 'completed' ? 'border-slate-300 text-slate-600' : ''}
          >
            {locale === 'ar' ? 'مكتمل' : 'Completed'}
            <span className="mx-1 text-xs opacity-70">({completedCount})</span>
          </Button>
          <Button
            variant={filter === 'cancelled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('cancelled')}
            className={filter !== 'cancelled' ? 'border-slate-300 text-slate-600' : ''}
          >
            {locale === 'ar' ? 'ملغي' : 'Cancelled'}
            <span className="mx-1 text-xs opacity-70">({cancelledCount})</span>
          </Button>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-10 h-10 text-slate-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {filter === 'all'
                ? locale === 'ar' ? 'لا توجد طلبات بعد' : 'No orders yet'
                : filter === 'pending'
                ? locale === 'ar' ? 'لا توجد طلبات جديدة' : 'No new orders'
                : filter === 'active'
                ? locale === 'ar' ? 'لا توجد طلبات قيد التنفيذ' : 'No orders in progress'
                : filter === 'ready'
                ? locale === 'ar' ? 'لا توجد طلبات جاهزة' : 'No ready orders'
                : filter === 'out_for_delivery'
                ? locale === 'ar' ? 'لا توجد طلبات في الطريق' : 'No orders on the way'
                : filter === 'completed'
                ? locale === 'ar' ? 'لا توجد طلبات مكتملة' : 'No completed orders'
                : locale === 'ar' ? 'لا توجد طلبات ملغية' : 'No cancelled orders'}
            </h2>
            <p className="text-slate-500 text-sm">
              {locale === 'ar'
                ? 'عندما يطلب العملاء من متجرك، ستظهر الطلبات هنا'
                : 'When customers order from your store, orders will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const statusConfig = getStatusConfig(order.status)
              const StatusIcon = statusConfig.icon
              const isLoading = actionLoading === order.id

              return (
                <Card key={order.id} className="bg-white border-slate-200 overflow-hidden">
                  <CardContent className="p-0">
                    {/* Order Header */}
                    <div className={`p-4 border-b border-slate-200 ${order.status === 'pending' ? 'bg-[hsl(42_100%_70%/0.1)]' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-primary text-lg">
                            #{order.order_number || order.id.slice(0, 8).toUpperCase()}
                          </span>
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color} ${statusConfig.bgColor}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {locale === 'ar' ? statusConfig.label_ar : statusConfig.label_en}
                          </div>
                        </div>
                        <div className="text-sm text-slate-500">
                          {formatTime(order.created_at)}
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <User className="w-4 h-4 text-slate-500" />
                          {order.delivery_address?.full_name || order.customer?.full_name || 'N/A'}
                        </div>
                        <a
                          href={`tel:${order.delivery_address?.phone}`}
                          className="flex items-center gap-1.5 hover:text-primary"
                        >
                          <Phone className="w-4 h-4 text-slate-500" />
                          {order.delivery_address?.phone || 'N/A'}
                        </a>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="p-4 border-b border-slate-200">
                      <div className="space-y-2">
                        {order.items.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-slate-600">
                              {item.quantity}x {locale === 'ar' ? item.item_name_ar : item.item_name_en}
                            </span>
                            <span className="text-slate-500">
                              {item.total_price.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                            </span>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <p className="text-xs text-slate-500">
                            +{order.items.length - 3} {locale === 'ar' ? 'منتجات أخرى' : 'more items'}
                          </p>
                        )}
                      </div>
                      {order.customer_notes && (
                        <div className="mt-3 p-2 bg-slate-50 rounded text-sm">
                          <span className="text-slate-500">{locale === 'ar' ? 'ملاحظات:' : 'Notes:'}</span>{' '}
                          <span className="text-slate-600">{order.customer_notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Delivery Address */}
                    <div className="p-4 border-b border-slate-200 bg-white/80">
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 space-y-1">
                          {/* Geographic Tags */}
                          {order.delivery_address && (order.delivery_address.governorate_ar || order.delivery_address.city_ar || order.delivery_address.district_ar) && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
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

                          {/* Street Address */}
                          <p className="text-slate-700 font-medium">
                            {order.delivery_address?.address || order.delivery_address?.address_line1}
                          </p>

                          {/* Building Details */}
                          {order.delivery_address && (order.delivery_address.building || order.delivery_address.floor || order.delivery_address.apartment) && (
                            <p className="text-slate-600 text-xs">
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
                            <p className="text-slate-500 text-xs">
                              {locale === 'ar' ? 'علامة مميزة:' : 'Landmark:'} {order.delivery_address.landmark}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Delivery Instructions */}
                      {order.delivery_address?.delivery_instructions && (
                        <div className="mt-2 mx-6 p-2 bg-amber-50 rounded text-xs text-amber-800">
                          <strong>{locale === 'ar' ? 'تعليمات التوصيل:' : 'Delivery Instructions:'}</strong> {order.delivery_address.delivery_instructions}
                        </div>
                      )}

                      {/* Notes */}
                      {order.delivery_address?.notes && (
                        <p className="text-xs text-slate-500 mt-1 mx-6 italic">
                          {order.delivery_address.notes}
                        </p>
                      )}
                    </div>

                    {/* Order Footer */}
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-primary">
                          {order.total.toFixed(2)} <span className="text-sm">{locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-slate-500">
                            {order.payment_method === 'cash'
                              ? locale === 'ar' ? 'الدفع عند الاستلام' : 'Cash on Delivery'
                              : locale === 'ar' ? 'دفع إلكتروني' : 'Online Payment'}
                          </p>
                          {order.status === 'delivered' && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              order.payment_status === 'completed'
                                ? 'bg-[hsl(var(--deal)/0.15)] text-deal'
                                : 'bg-[hsl(var(--premium)/0.2)] text-amber-600'
                            }`}>
                              {order.payment_status === 'completed'
                                ? (locale === 'ar' ? 'تم الدفع' : 'Paid')
                                : (locale === 'ar' ? 'معلق' : 'Pending')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {order.status === 'pending' && (
                          <>
                            <Link href={`/${locale}/provider/orders/${order.id}`}>
                              <Button variant="outline" size="sm" className="border-slate-300">
                                {locale === 'ar' ? 'تفاصيل' : 'Details'}
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRejectOrder(order.id)}
                              disabled={isLoading}
                              className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                            >
                              <X className="w-4 h-4" />
                              {locale === 'ar' ? 'رفض' : 'Reject'}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleAcceptOrder(order.id)}
                              disabled={isLoading}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {isLoading ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                              {locale === 'ar' ? 'قبول' : 'Accept'}
                            </Button>
                          </>
                        )}

                        {['accepted', 'preparing', 'ready', 'out_for_delivery'].includes(order.status) && (
                          <>
                            <Link href={`/${locale}/provider/orders/${order.id}`}>
                              <Button variant="outline" size="sm" className="border-slate-300">
                                {locale === 'ar' ? 'تفاصيل' : 'Details'}
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(order.id, order.status)}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  {getNextStatusLabel(order.status)}
                                  {isRTL ? (
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                  )}
                                </>
                              )}
                            </Button>
                          </>
                        )}

                        {order.status === 'delivered' && order.payment_status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => showPaymentConfirmation(order)}
                            disabled={isLoading}
                            className="bg-deal hover:bg-deal/90"
                          >
                            {isLoading ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 me-1" />
                            )}
                            {locale === 'ar' ? 'تم استلام المبلغ' : 'Payment Received'}
                          </Button>
                        )}

                        {['delivered', 'cancelled', 'rejected'].includes(order.status) && (
                          <Link href={`/${locale}/provider/orders/${order.id}`}>
                            <Button variant="outline" size="sm" className="border-slate-300">
                              {locale === 'ar' ? 'التفاصيل' : 'Details'}
                              {isRTL ? <ChevronLeft className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 ml-1" />}
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Payment Confirmation Dialog */}
      {paymentConfirmDialog.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {locale === 'ar' ? 'تأكيد استلام الدفع' : 'Confirm Payment Receipt'}
              </h3>
              <p className="text-slate-600 text-sm">
                {locale === 'ar'
                  ? 'هل أنت متأكد من استلام المبلغ لهذا الطلب؟'
                  : 'Are you sure you received payment for this order?'}
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-500 text-sm">
                  {locale === 'ar' ? 'رقم الطلب' : 'Order Number'}
                </span>
                <span className="font-mono font-bold text-primary">
                  #{paymentConfirmDialog.orderNumber}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">
                  {locale === 'ar' ? 'المبلغ' : 'Amount'}
                </span>
                <span className="font-bold text-lg text-slate-900">
                  {paymentConfirmDialog.orderTotal.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                </span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
              <p className="text-xs text-amber-800">
                {locale === 'ar'
                  ? 'تحذير: بتأكيد استلام الدفع، أنت تقر بأنك استلمت المبلغ المذكور من العميل. هذا الإجراء لا يمكن التراجع عنه.'
                  : 'Warning: By confirming payment, you acknowledge that you have received the amount from the customer. This action cannot be undone.'}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={cancelPaymentConfirmation}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                className="flex-1 bg-deal hover:bg-deal/90"
                onClick={handleConfirmPayment}
              >
                <CheckCircle2 className="w-4 h-4 me-2" />
                {locale === 'ar' ? 'تأكيد الاستلام' : 'Confirm Receipt'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ProviderLayout>
  )
}

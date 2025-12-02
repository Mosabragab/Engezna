'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth'
import { CustomerLayout } from '@/components/customer/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Clock,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Package,
  Truck,
  ChefHat,
  Store,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'

type Order = {
  id: string
  order_number: string
  provider_id: string
  status: string
  subtotal: number
  delivery_fee: number
  total: number
  payment_method: string
  created_at: string
  provider: {
    name_ar: string
    name_en: string
    logo_url: string | null
  }
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; label_ar: string; label_en: string }> = {
  pending: { icon: Clock, color: 'text-yellow-600 bg-yellow-100', label_ar: 'في الانتظار', label_en: 'Pending' },
  accepted: { icon: CheckCircle2, color: 'text-blue-600 bg-blue-100', label_ar: 'تم القبول', label_en: 'Accepted' },
  preparing: { icon: ChefHat, color: 'text-amber-600 bg-amber-100', label_ar: 'جاري التحضير', label_en: 'Preparing' },
  ready: { icon: Package, color: 'text-purple-600 bg-purple-100', label_ar: 'جاهز', label_en: 'Ready' },
  out_for_delivery: { icon: Truck, color: 'text-indigo-600 bg-indigo-100', label_ar: 'في الطريق', label_en: 'On the way' },
  delivered: { icon: CheckCircle2, color: 'text-green-600 bg-green-100', label_ar: 'تم التوصيل', label_en: 'Delivered' },
  cancelled: { icon: XCircle, color: 'text-red-600 bg-red-100', label_ar: 'ملغي', label_en: 'Cancelled' },
  rejected: { icon: XCircle, color: 'text-red-600 bg-red-100', label_ar: 'مرفوض', label_en: 'Rejected' },
}

type FilterType = 'all' | 'active' | 'completed'

export default function OrderHistoryPage() {
  const locale = useLocale()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const isRTL = locale === 'ar'

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/${locale}/auth/login?redirect=/orders`)
      return
    }
    if (user) {
      loadOrders()
    }
  }, [user, authLoading])

  const loadOrders = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        provider_id,
        status,
        subtotal,
        delivery_fee,
        total,
        payment_method,
        created_at,
        provider:providers(name_ar, name_en, logo_url)
      `)
      .eq('customer_id', user?.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching orders:', error)
    } else {
      // Transform provider from array to object
      const transformedOrders = data?.map(order => ({
        ...order,
        provider: Array.isArray(order.provider) ? order.provider[0] : order.provider
      })) || []
      setOrders(transformedOrders)
    }

    setLoading(false)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadOrders()
    setRefreshing(false)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.pending
  }

  const filterOrders = (orders: Order[]) => {
    switch (filter) {
      case 'active':
        return orders.filter(o => 
          !['delivered', 'cancelled', 'rejected'].includes(o.status)
        )
      case 'completed':
        return orders.filter(o => 
          ['delivered', 'cancelled', 'rejected'].includes(o.status)
        )
      default:
        return orders
    }
  }

  const filteredOrders = filterOrders(orders)
  const activeCount = orders.filter(o => !['delivered', 'cancelled', 'rejected'].includes(o.status)).length

  // Refresh button for header
  const refreshButton = (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={handleRefresh}
      disabled={refreshing}
    >
      <RefreshCw className={`h-5 w-5 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
    </Button>
  )

  if (loading || authLoading) {
    return (
      <CustomerLayout
        headerTitle={locale === 'ar' ? 'طلباتي' : 'My Orders'}
        showBottomNav={true}
        headerRightAction={refreshButton}
      >
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </p>
          </div>
        </div>
      </CustomerLayout>
    )
  }

  return (
    <CustomerLayout
      headerTitle={locale === 'ar' ? 'طلباتي' : 'My Orders'}
      showBottomNav={true}
      headerRightAction={refreshButton}
    >
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">
              {locale === 'ar' ? 'طلباتي' : 'My Orders'}
            </h1>
            <p className="text-muted-foreground">
              {locale === 'ar' 
                ? `${orders.length} طلب${orders.length !== 1 ? 'ات' : ''}`
                : `${orders.length} order${orders.length !== 1 ? 's' : ''}`}
              {activeCount > 0 && (
                <span className="text-primary font-medium mx-1">
                  ({activeCount} {locale === 'ar' ? 'نشط' : 'active'})
                </span>
              )}
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              {locale === 'ar' ? 'الكل' : 'All'}
              <span className="mx-1 text-xs opacity-70">({orders.length})</span>
            </Button>
            <Button
              variant={filter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('active')}
            >
              {locale === 'ar' ? 'نشط' : 'Active'}
              <span className="mx-1 text-xs opacity-70">({activeCount})</span>
            </Button>
            <Button
              variant={filter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('completed')}
            >
              {locale === 'ar' ? 'مكتمل' : 'Completed'}
              <span className="mx-1 text-xs opacity-70">({orders.length - activeCount})</span>
            </Button>
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {filter === 'all'
                  ? locale === 'ar' ? 'لا توجد طلبات بعد' : 'No orders yet'
                  : filter === 'active'
                  ? locale === 'ar' ? 'لا توجد طلبات نشطة' : 'No active orders'
                  : locale === 'ar' ? 'لا توجد طلبات مكتملة' : 'No completed orders'}
              </h2>
              <p className="text-muted-foreground mb-6">
                {locale === 'ar'
                  ? 'ابدأ بتصفح المتاجر وقم بطلبك الأول'
                  : 'Start browsing stores and place your first order'}
              </p>
              <Link href={`/${locale}/providers`}>
                <Button size="lg">
                  <Store className="w-5 h-5 mr-2" />
                  {locale === 'ar' ? 'تصفح المتاجر' : 'Browse Stores'}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const statusConfig = getStatusConfig(order.status)
                const StatusIcon = statusConfig.icon

                return (
                  <Link key={order.id} href={`/${locale}/orders/${order.id}`}>
                    <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary/30">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Provider Logo */}
                          {order.provider?.logo_url ? (
                            <img
                              src={order.provider.logo_url}
                              alt={locale === 'ar' ? order.provider.name_ar : order.provider.name_en}
                              className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Store className="w-7 h-7 text-primary" />
                            </div>
                          )}

                          {/* Order Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-bold text-lg truncate">
                                {order.provider 
                                  ? (locale === 'ar' ? order.provider.name_ar : order.provider.name_en)
                                  : locale === 'ar' ? 'متجر غير معروف' : 'Unknown Store'}
                              </h3>
                              <span className="text-lg font-bold text-primary whitespace-nowrap">
                                {order.total.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                              </span>
                            </div>

                            <p className="text-sm text-muted-foreground mb-2">
                              #{order.order_number || order.id.slice(0, 8).toUpperCase()}
                              <span className="mx-2">•</span>
                              {formatDate(order.created_at)}
                              <span className="mx-1">-</span>
                              {formatTime(order.created_at)}
                            </p>

                            <div className="flex items-center justify-between">
                              {/* Status Badge */}
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                                <StatusIcon className="w-3.5 h-3.5" />
                                {locale === 'ar' ? statusConfig.label_ar : statusConfig.label_en}
                              </div>

                              {/* Arrow */}
                              <div className="text-muted-foreground">
                                {isRTL ? (
                                  <ChevronLeft className="w-5 h-5" />
                                ) : (
                                  <ChevronRight className="w-5 h-5" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Bottom Actions */}
          {orders.length > 0 && (
            <div className="mt-8 text-center pb-4">
              <Link href={`/${locale}/providers`}>
                <Button variant="outline" size="lg">
                  <Store className="w-5 h-5 mr-2" />
                  {locale === 'ar' ? 'طلب جديد' : 'New Order'}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  )
}

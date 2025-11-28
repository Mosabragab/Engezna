'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  Calendar,
  RefreshCw,
  Star,
  Award,
} from 'lucide-react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

type OrderStats = {
  total: number
  completed: number
  cancelled: number
  pending: number
}

type RevenueStats = {
  today: number
  thisWeek: number
  thisMonth: number
  lastMonth: number
}

type TopProduct = {
  id: string
  name_ar: string
  name_en: string
  total_quantity: number
  total_revenue: number
}

type DailyRevenue = {
  date: string
  revenue: number
  orders: number
}

export default function ReportsPage() {
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'

  const [providerId, setProviderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')

  // Stats
  const [orderStats, setOrderStats] = useState<OrderStats>({ total: 0, completed: 0, cancelled: 0, pending: 0 })
  const [revenueStats, setRevenueStats] = useState<RevenueStats>({ today: 0, thisWeek: 0, thisMonth: 0, lastMonth: 0 })
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([])
  const [avgOrderValue, setAvgOrderValue] = useState(0)
  const [totalCustomers, setTotalCustomers] = useState(0)

  useEffect(() => {
    checkAuthAndLoadReports()
  }, [])

  const checkAuthAndLoadReports = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/provider/reports`)
      return
    }

    const { data: providerData } = await supabase
      .from('providers')
      .select('id, status')
      .eq('owner_id', user.id)
      .limit(1)

    const provider = providerData?.[0]
    // Allow providers with active statuses to view reports (exclude only pending_approval)
    if (!provider || provider.status === 'pending_approval') {
      router.push(`/${locale}/provider`)
      return
    }

    setProviderId(provider.id)
    await loadAllReports(provider.id)
    setLoading(false)
  }

  const loadAllReports = async (provId: string) => {
    const supabase = createClient()
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 7)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // Get all orders for this provider
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, total, created_at, customer_id')
      .eq('provider_id', provId)

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
    }

    console.log('Provider ID:', provId)
    console.log('Orders fetched:', orders?.length || 0)

    if (orders) {
      // Order stats
      const completed = orders.filter(o => o.status === 'delivered').length
      const cancelled = orders.filter(o => ['cancelled', 'rejected'].includes(o.status)).length
      const pending = orders.filter(o => !['delivered', 'cancelled', 'rejected'].includes(o.status)).length
      setOrderStats({ total: orders.length, completed, cancelled, pending })

      // Revenue stats
      const deliveredOrders = orders.filter(o => o.status === 'delivered')
      const todayRevenue = deliveredOrders
        .filter(o => new Date(o.created_at) >= todayStart)
        .reduce((sum, o) => sum + (o.total || 0), 0)
      const weekRevenue = deliveredOrders
        .filter(o => new Date(o.created_at) >= weekStart)
        .reduce((sum, o) => sum + (o.total || 0), 0)
      const monthRevenue = deliveredOrders
        .filter(o => new Date(o.created_at) >= monthStart)
        .reduce((sum, o) => sum + (o.total || 0), 0)
      const lastMonthRevenue = deliveredOrders
        .filter(o => {
          const d = new Date(o.created_at)
          return d >= lastMonthStart && d <= lastMonthEnd
        })
        .reduce((sum, o) => sum + (o.total || 0), 0)

      setRevenueStats({ today: todayRevenue, thisWeek: weekRevenue, thisMonth: monthRevenue, lastMonth: lastMonthRevenue })

      // Average order value
      if (deliveredOrders.length > 0) {
        const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0)
        setAvgOrderValue(totalRevenue / deliveredOrders.length)
      }

      // Unique customers
      const uniqueCustomers = new Set(orders.map(o => o.customer_id))
      setTotalCustomers(uniqueCustomers.size)

      // Daily revenue for chart (last 30 days)
      const daily: { [key: string]: { revenue: number; orders: number } } = {}
      for (let i = 29; i >= 0; i--) {
        const d = new Date(todayStart)
        d.setDate(d.getDate() - i)
        const key = d.toISOString().split('T')[0]
        daily[key] = { revenue: 0, orders: 0 }
      }
      deliveredOrders.forEach(o => {
        const key = new Date(o.created_at).toISOString().split('T')[0]
        if (daily[key]) {
          daily[key].revenue += o.total || 0
          daily[key].orders += 1
        }
      })
      setDailyRevenue(Object.entries(daily).map(([date, data]) => ({ date, ...data })))
    }

    // Top products - fetch order items linked to this provider's menu items
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select(`
        quantity,
        unit_price,
        menu_item_id,
        menu_items!inner(id, name_ar, name_en, provider_id)
      `)
      .eq('menu_items.provider_id', provId)

    if (orderItemsError) {
      console.error('Error fetching order items:', orderItemsError)
    }

    console.log('Order items fetched:', orderItems?.length || 0)

    if (orderItems && orderItems.length > 0) {
      const productStats: { [key: string]: TopProduct } = {}
      orderItems.forEach((item: any) => {
        const menuItem = item.menu_items
        if (!menuItem) return
        const id = menuItem.id
        if (!productStats[id]) {
          productStats[id] = {
            id,
            name_ar: menuItem.name_ar,
            name_en: menuItem.name_en,
            total_quantity: 0,
            total_revenue: 0,
          }
        }
        productStats[id].total_quantity += item.quantity || 0
        productStats[id].total_revenue += (item.quantity || 0) * (item.unit_price || 0)
      })
      const sorted = Object.values(productStats).sort((a, b) => b.total_quantity - a.total_quantity).slice(0, 5)
      setTopProducts(sorted)
    }
  }

  const handleRefresh = async () => {
    if (!providerId) return
    setRefreshing(true)
    await loadAllReports(providerId)
    setRefreshing(false)
  }

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(0)} ${locale === 'ar' ? 'ج.م' : 'EGP'}`
  }

  const getGrowthPercentage = () => {
    if (revenueStats.lastMonth === 0) return revenueStats.thisMonth > 0 ? 100 : 0
    return ((revenueStats.thisMonth - revenueStats.lastMonth) / revenueStats.lastMonth * 100).toFixed(1)
  }

  const maxRevenue = Math.max(...dailyRevenue.map(d => d.revenue), 1)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-slate-500">
            {locale === 'ar' ? 'جاري تحميل التقارير...' : 'Loading reports...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/${locale}/provider`}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-900"
            >
              {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              <span>{locale === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</span>
            </Link>
            <h1 className="text-xl font-bold text-primary flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {locale === 'ar' ? 'التقارير والإحصائيات' : 'Reports & Analytics'}
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-slate-300"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Page Description */}
          <p className="text-sm text-slate-500">
            {locale === 'ar'
              ? 'عرض ملخص الأداء وإحصائيات الطلبات خلال الفترة الأخيرة'
              : 'View performance summary and order statistics for the recent period'}
          </p>

          {/* Revenue Overview - Unified Blue Theme */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-white border-slate-200 hover:border-primary/30 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-8 h-8 text-primary" />
                  <span className="text-xs text-primary bg-sky-50 px-2 py-1 rounded-full font-medium">
                    {locale === 'ar' ? 'اليوم' : 'Today'}
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(revenueStats.today)}</p>
                <p className="text-xs text-slate-500">{locale === 'ar' ? 'إيرادات اليوم' : "Today's Revenue"}</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 hover:border-primary/30 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 text-primary" />
                  <span className="text-xs text-primary bg-sky-50 px-2 py-1 rounded-full font-medium">
                    {locale === 'ar' ? 'الأسبوع' : 'Week'}
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(revenueStats.thisWeek)}</p>
                <p className="text-xs text-slate-500">{locale === 'ar' ? 'هذا الأسبوع' : 'This Week'}</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 hover:border-primary/30 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-8 h-8 text-primary" />
                  <span className="text-xs text-primary bg-sky-50 px-2 py-1 rounded-full font-medium">
                    {locale === 'ar' ? 'الشهر' : 'Month'}
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(revenueStats.thisMonth)}</p>
                <p className="text-xs text-slate-500">{locale === 'ar' ? 'هذا الشهر' : 'This Month'}</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 hover:border-primary/30 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  {Number(getGrowthPercentage()) >= 0 ? (
                    <TrendingUp className="w-8 h-8 text-primary" />
                  ) : (
                    <TrendingDown className="w-8 h-8 text-red-500" />
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    Number(getGrowthPercentage()) >= 0
                      ? 'text-emerald-700 bg-emerald-50'
                      : 'text-red-700 bg-red-50'
                  }`}>
                    {Number(getGrowthPercentage()) >= 0 ? '+' : ''}{getGrowthPercentage()}%
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(revenueStats.lastMonth)}</p>
                <p className="text-xs text-slate-500">{locale === 'ar' ? 'الشهر الماضي' : 'Last Month'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Order Stats - Clean White Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-white border-slate-200">
              <CardContent className="pt-6 text-center">
                <ShoppingBag className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-3xl font-bold text-slate-900">{orderStats.total}</p>
                <p className="text-xs text-slate-500">{locale === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="pt-6 text-center">
                <Package className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-3xl font-bold text-emerald-600">{orderStats.completed}</p>
                <p className="text-xs text-slate-500">{locale === 'ar' ? 'مكتمل' : 'Completed'}</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="pt-6 text-center">
                <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-3xl font-bold text-slate-900">{totalCustomers}</p>
                <p className="text-xs text-slate-500">{locale === 'ar' ? 'عملاء' : 'Customers'}</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="pt-6 text-center">
                <Star className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-3xl font-bold text-amber-600">{formatCurrency(avgOrderValue)}</p>
                <p className="text-xs text-slate-500">{locale === 'ar' ? 'متوسط الطلب' : 'Avg Order'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart - Improved Design */}
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-900 flex items-center gap-2 text-lg font-semibold">
                <TrendingUp className="w-5 h-5 text-primary" />
                {locale === 'ar' ? 'الإيرادات (آخر 30 يوم)' : 'Revenue (Last 30 Days)'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Grid lines background */}
              <div className="relative">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="border-b border-slate-100 w-full" />
                  ))}
                </div>
                <div className="h-48 flex items-end gap-1 relative">
                  {dailyRevenue.map((day) => (
                    <div
                      key={day.date}
                      className="flex-1 bg-primary/30 hover:bg-primary/50 transition-colors rounded-t relative group cursor-pointer"
                      style={{ height: `${Math.max((day.revenue / maxRevenue) * 100, 2)}%` }}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg">
                        <p className="font-bold text-sm">{formatCurrency(day.revenue)}</p>
                        <p className="text-slate-300">{day.orders} {locale === 'ar' ? 'طلبات' : 'orders'}</p>
                        <p className="text-slate-400 text-[10px]">{day.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between mt-3 text-xs text-slate-400 font-medium">
                <span>{dailyRevenue[0]?.date?.split('-').slice(1).join('/')}</span>
                <span>{dailyRevenue[Math.floor(dailyRevenue.length / 2)]?.date?.split('-').slice(1).join('/')}</span>
                <span>{dailyRevenue[dailyRevenue.length - 1]?.date?.split('-').slice(1).join('/')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-400" />
                {locale === 'ar' ? 'المنتجات الأكثر مبيعاً' : 'Top Selling Products'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>{locale === 'ar' ? 'لا توجد بيانات بعد' : 'No data yet'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((product, index) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-premium text-slate-900' :
                        index === 1 ? 'bg-slate-400 text-white' :
                        index === 2 ? 'bg-[#CD7F32] text-white' :
                        'bg-slate-200 text-slate-900'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {locale === 'ar' ? product.name_ar : product.name_en}
                        </p>
                        <p className="text-xs text-slate-500">
                          {product.total_quantity} {locale === 'ar' ? 'وحدة مباعة' : 'units sold'}
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="font-bold text-primary">{formatCurrency(product.total_revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats Summary - Clean Design */}
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-900 text-lg font-semibold">
                {locale === 'ar' ? 'ملخص الأداء' : 'Performance Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-emerald-50 rounded-lg">
                  <p className="text-3xl font-bold text-emerald-600">
                    {orderStats.total > 0 ? ((orderStats.completed / orderStats.total) * 100).toFixed(0) : 0}%
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{locale === 'ar' ? 'معدل الإكمال' : 'Completion Rate'}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-3xl font-bold text-red-600">
                    {orderStats.total > 0 ? ((orderStats.cancelled / orderStats.total) * 100).toFixed(0) : 0}%
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{locale === 'ar' ? 'معدل الإلغاء' : 'Cancellation Rate'}</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg">
                  <p className="text-3xl font-bold text-amber-600">{orderStats.pending}</p>
                  <p className="text-xs text-slate-500 mt-1">{locale === 'ar' ? 'طلبات معلقة' : 'Pending Orders'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

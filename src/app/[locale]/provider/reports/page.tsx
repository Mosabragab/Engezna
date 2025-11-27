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
    if (!provider || !['approved', 'open', 'closed', 'temporarily_paused'].includes(provider.status)) {
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
    const { data: orders } = await supabase
      .from('orders')
      .select('id, status, total, created_at, user_id')
      .eq('provider_id', provId)

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
      const uniqueCustomers = new Set(orders.map(o => o.user_id))
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

    // Top products
    const { data: orderItems } = await supabase
      .from('order_items')
      .select(`
        quantity,
        price,
        menu_items!inner(id, name_ar, name_en, provider_id)
      `)
      .eq('menu_items.provider_id', provId)

    if (orderItems) {
      const productStats: { [key: string]: TopProduct } = {}
      orderItems.forEach((item: any) => {
        const id = item.menu_items.id
        if (!productStats[id]) {
          productStats[id] = {
            id,
            name_ar: item.menu_items.name_ar,
            name_en: item.menu_items.name_en,
            total_quantity: 0,
            total_revenue: 0,
          }
        }
        productStats[id].total_quantity += item.quantity
        productStats[id].total_revenue += item.quantity * item.price
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
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-slate-400">
            {locale === 'ar' ? 'جاري تحميل التقارير...' : 'Loading reports...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/${locale}/provider`}
              className="flex items-center gap-2 text-slate-400 hover:text-white"
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
              className="border-slate-600"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Revenue Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-8 h-8 text-green-400" />
                  <span className="text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded-full">
                    {locale === 'ar' ? 'اليوم' : 'Today'}
                  </span>
                </div>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(revenueStats.today)}</p>
                <p className="text-xs text-slate-400">{locale === 'ar' ? 'إيرادات اليوم' : "Today's Revenue"}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 text-blue-400" />
                  <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded-full">
                    {locale === 'ar' ? 'الأسبوع' : 'Week'}
                  </span>
                </div>
                <p className="text-2xl font-bold text-blue-400">{formatCurrency(revenueStats.thisWeek)}</p>
                <p className="text-xs text-slate-400">{locale === 'ar' ? 'هذا الأسبوع' : 'This Week'}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 border-purple-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-8 h-8 text-purple-400" />
                  <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded-full">
                    {locale === 'ar' ? 'الشهر' : 'Month'}
                  </span>
                </div>
                <p className="text-2xl font-bold text-purple-400">{formatCurrency(revenueStats.thisMonth)}</p>
                <p className="text-xs text-slate-400">{locale === 'ar' ? 'هذا الشهر' : 'This Month'}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 border-orange-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  {Number(getGrowthPercentage()) >= 0 ? (
                    <TrendingUp className="w-8 h-8 text-orange-400" />
                  ) : (
                    <TrendingDown className="w-8 h-8 text-red-400" />
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    Number(getGrowthPercentage()) >= 0
                      ? 'text-green-400 bg-green-500/20'
                      : 'text-red-400 bg-red-500/20'
                  }`}>
                    {Number(getGrowthPercentage()) >= 0 ? '+' : ''}{getGrowthPercentage()}%
                  </span>
                </div>
                <p className="text-2xl font-bold text-orange-400">{formatCurrency(revenueStats.lastMonth)}</p>
                <p className="text-xs text-slate-400">{locale === 'ar' ? 'الشهر الماضي' : 'Last Month'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Order Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="pt-6 text-center">
                <ShoppingBag className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-3xl font-bold">{orderStats.total}</p>
                <p className="text-xs text-slate-400">{locale === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="pt-6 text-center">
                <Package className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-green-400">{orderStats.completed}</p>
                <p className="text-xs text-slate-400">{locale === 'ar' ? 'مكتمل' : 'Completed'}</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="pt-6 text-center">
                <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-blue-400">{totalCustomers}</p>
                <p className="text-xs text-slate-400">{locale === 'ar' ? 'عملاء' : 'Customers'}</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="pt-6 text-center">
                <Star className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-yellow-400">{formatCurrency(avgOrderValue)}</p>
                <p className="text-xs text-slate-400">{locale === 'ar' ? 'متوسط الطلب' : 'Avg Order'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {locale === 'ar' ? 'الإيرادات (آخر 30 يوم)' : 'Revenue (Last 30 Days)'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-end gap-1">
                {dailyRevenue.map((day, i) => (
                  <div
                    key={day.date}
                    className="flex-1 bg-primary/20 hover:bg-primary/40 transition-colors rounded-t relative group"
                    style={{ height: `${(day.revenue / maxRevenue) * 100}%`, minHeight: '4px' }}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-700 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <p className="font-bold">{formatCurrency(day.revenue)}</p>
                      <p className="text-slate-400">{day.orders} {locale === 'ar' ? 'طلبات' : 'orders'}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>{dailyRevenue[0]?.date?.split('-').slice(1).join('/')}</span>
                <span>{dailyRevenue[dailyRevenue.length - 1]?.date?.split('-').slice(1).join('/')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
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
                      className="flex items-center gap-4 p-3 bg-slate-700/50 rounded-lg"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500 text-black' :
                        index === 1 ? 'bg-slate-400 text-black' :
                        index === 2 ? 'bg-amber-700 text-white' :
                        'bg-slate-600 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {locale === 'ar' ? product.name_ar : product.name_en}
                        </p>
                        <p className="text-xs text-slate-400">
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

          {/* Quick Stats Summary */}
          <Card className="bg-gradient-to-r from-primary/20 to-orange-500/20 border-primary/30">
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold text-primary">
                    {orderStats.total > 0 ? ((orderStats.completed / orderStats.total) * 100).toFixed(0) : 0}%
                  </p>
                  <p className="text-xs text-slate-400">{locale === 'ar' ? 'معدل الإكمال' : 'Completion Rate'}</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">
                    {orderStats.total > 0 ? ((orderStats.cancelled / orderStats.total) * 100).toFixed(0) : 0}%
                  </p>
                  <p className="text-xs text-slate-400">{locale === 'ar' ? 'معدل الإلغاء' : 'Cancellation Rate'}</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">{orderStats.pending}</p>
                  <p className="text-xs text-slate-400">{locale === 'ar' ? 'طلبات معلقة' : 'Pending Orders'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

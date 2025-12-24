'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ProviderLayout } from '@/components/provider'
import {
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
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  CheckCircle2,
  Clock,
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

type PaymentMethodStats = {
  codOrders: number
  codRevenue: number
  codConfirmed: number
  codPending: number
  onlineOrders: number
  onlineRevenue: number
  onlineConfirmed: number
  onlinePending: number
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
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'completed' | 'pending'>('all')
  const [allOrders, setAllOrders] = useState<any[]>([])

  // Stats
  const [orderStats, setOrderStats] = useState<OrderStats>({ total: 0, completed: 0, cancelled: 0, pending: 0 })
  const [revenueStats, setRevenueStats] = useState<RevenueStats>({ today: 0, thisWeek: 0, thisMonth: 0, lastMonth: 0 })
  const [paymentMethodStats, setPaymentMethodStats] = useState<PaymentMethodStats>({
    codOrders: 0, codRevenue: 0, codConfirmed: 0, codPending: 0,
    onlineOrders: 0, onlineRevenue: 0, onlineConfirmed: 0, onlinePending: 0
  })
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([])
  const [avgOrderValue, setAvgOrderValue] = useState(0)
  const [totalCustomers, setTotalCustomers] = useState(0)

  const loadAllReports = useCallback(async (provId: string) => {
    const supabase = createClient()
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 7)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // Run all queries in parallel for faster loading
    const [ordersResult, orderItemsResult, refundsResult] = await Promise.all([
      supabase
        .from('orders')
        .select('id, status, total, created_at, customer_id, payment_status, payment_method')
        .eq('provider_id', provId),
      supabase
        .from('order_items')
        .select(`
          quantity,
          unit_price,
          menu_item_id,
          menu_items!inner(id, name_ar, name_en, provider_id)
        `)
        .eq('menu_items.provider_id', provId),
      // Get all processed refunds to subtract from revenue
      supabase
        .from('refunds')
        .select('amount, created_at, order_id')
        .eq('provider_id', provId)
        .in('status', ['approved', 'processed'])
    ])

    const { data: orders, error: ordersError } = ordersResult
    const { data: orderItems, error: orderItemsError } = orderItemsResult
    const { data: refunds, error: refundsError } = refundsResult

    // Handle errors
    if (ordersError || orderItemsError) {
      console.error('Error loading reports:', ordersError || orderItemsError)
      setError(locale === 'ar' ? 'حدث خطأ في تحميل البيانات' : 'Error loading data')
      return
    }

    // Clear any previous error
    setError(null)

    if (orders) {
      // Store all orders for filtering
      setAllOrders(orders)

      // Order stats
      const completed = orders.filter(o => o.status === 'delivered').length
      const cancelled = orders.filter(o => ['cancelled', 'rejected'].includes(o.status)).length
      const pending = orders.filter(o => !['delivered', 'cancelled', 'rejected'].includes(o.status)).length
      setOrderStats({ total: orders.length, completed, cancelled, pending })

      // Revenue stats - Only count confirmed payments (payment_status = 'completed')
      const confirmedOrders = orders.filter(o => o.status === 'delivered' && o.payment_status === 'completed')

      // Calculate refunds for each period
      const refundsToday = (refunds || [])
        .filter(r => new Date(r.created_at) >= todayStart)
        .reduce((sum, r) => sum + (r.amount || 0), 0)
      const refundsWeek = (refunds || [])
        .filter(r => new Date(r.created_at) >= weekStart)
        .reduce((sum, r) => sum + (r.amount || 0), 0)
      const refundsMonth = (refunds || [])
        .filter(r => new Date(r.created_at) >= monthStart)
        .reduce((sum, r) => sum + (r.amount || 0), 0)
      const refundsLastMonth = (refunds || [])
        .filter(r => {
          const d = new Date(r.created_at)
          return d >= lastMonthStart && d <= lastMonthEnd
        })
        .reduce((sum, r) => sum + (r.amount || 0), 0)

      // Gross revenue for each period
      const grossTodayRevenue = confirmedOrders
        .filter(o => new Date(o.created_at) >= todayStart)
        .reduce((sum, o) => sum + (o.total || 0), 0)
      const grossWeekRevenue = confirmedOrders
        .filter(o => new Date(o.created_at) >= weekStart)
        .reduce((sum, o) => sum + (o.total || 0), 0)
      const grossMonthRevenue = confirmedOrders
        .filter(o => new Date(o.created_at) >= monthStart)
        .reduce((sum, o) => sum + (o.total || 0), 0)
      const grossLastMonthRevenue = confirmedOrders
        .filter(o => {
          const d = new Date(o.created_at)
          return d >= lastMonthStart && d <= lastMonthEnd
        })
        .reduce((sum, o) => sum + (o.total || 0), 0)

      // Net revenue = gross - refunds
      setRevenueStats({
        today: Math.max(0, grossTodayRevenue - refundsToday),
        thisWeek: Math.max(0, grossWeekRevenue - refundsWeek),
        thisMonth: Math.max(0, grossMonthRevenue - refundsMonth),
        lastMonth: Math.max(0, grossLastMonthRevenue - refundsLastMonth)
      })

      // COD vs Online breakdown (this month) - only delivered orders with completed payment for revenue
      const monthOrders = orders.filter(o => {
        const d = new Date(o.created_at)
        return d >= monthStart && o.status === 'delivered'
      })
      const codOrders = monthOrders.filter(o => o.payment_method === 'cash')
      const onlineOrders = monthOrders.filter(o => o.payment_method !== 'cash')

      // Calculate refunds for this month's COD and Online orders
      const monthRefundsByOrder = new Map<string, number>()
      ;(refunds || [])
        .filter(r => new Date(r.created_at) >= monthStart)
        .forEach(r => {
          monthRefundsByOrder.set(r.order_id, (monthRefundsByOrder.get(r.order_id) || 0) + (r.amount || 0))
        })

      // Calculate net revenue (gross - refunds per order)
      const codConfirmedGross = codOrders.filter(o => o.payment_status === 'completed').reduce((sum, o) => sum + (o.total || 0), 0)
      const codRefunds = codOrders.reduce((sum, o) => sum + (monthRefundsByOrder.get(o.id) || 0), 0)
      const onlineConfirmedGross = onlineOrders.filter(o => o.payment_status === 'completed').reduce((sum, o) => sum + (o.total || 0), 0)
      const onlineRefunds = onlineOrders.reduce((sum, o) => sum + (monthRefundsByOrder.get(o.id) || 0), 0)

      setPaymentMethodStats({
        codOrders: codOrders.length,
        codRevenue: Math.max(0, codOrders.reduce((sum, o) => sum + (o.total || 0), 0) - codRefunds),
        codConfirmed: Math.max(0, codConfirmedGross - codRefunds),
        codPending: codOrders.filter(o => o.payment_status === 'pending').reduce((sum, o) => sum + (o.total || 0), 0),
        onlineOrders: onlineOrders.length,
        onlineRevenue: Math.max(0, onlineOrders.reduce((sum, o) => sum + (o.total || 0), 0) - onlineRefunds),
        onlineConfirmed: Math.max(0, onlineConfirmedGross - onlineRefunds),
        onlinePending: onlineOrders.filter(o => o.payment_status === 'pending').reduce((sum, o) => sum + (o.total || 0), 0),
      })

      // Average order value - based on confirmed orders only
      if (confirmedOrders.length > 0) {
        const totalRevenue = confirmedOrders.reduce((sum, o) => sum + (o.total || 0), 0)
        setAvgOrderValue(totalRevenue / confirmedOrders.length)
      }

      // Unique customers
      const uniqueCustomers = new Set(orders.map(o => o.customer_id))
      setTotalCustomers(uniqueCustomers.size)

      // Daily revenue for chart (last 30 days) - confirmed payments minus refunds
      const daily: { [key: string]: { revenue: number; orders: number; refunds: number } } = {}
      for (let i = 29; i >= 0; i--) {
        const d = new Date(todayStart)
        d.setDate(d.getDate() - i)
        const key = d.toISOString().split('T')[0]
        daily[key] = { revenue: 0, orders: 0, refunds: 0 }
      }
      confirmedOrders.forEach(o => {
        const key = new Date(o.created_at).toISOString().split('T')[0]
        if (daily[key]) {
          daily[key].revenue += o.total || 0
          daily[key].orders += 1
        }
      })
      // Subtract refunds from daily revenue
      ;(refunds || []).forEach(r => {
        const key = new Date(r.created_at).toISOString().split('T')[0]
        if (daily[key]) {
          daily[key].refunds += r.amount || 0
        }
      })
      setDailyRevenue(Object.entries(daily).map(([date, data]) => ({
        date,
        revenue: Math.max(0, data.revenue - data.refunds),
        orders: data.orders
      })))
    }

    // Process top products from the parallel query result
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
  }, [])

  const checkAuthAndLoadReports = useCallback(async () => {
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
  }, [loadAllReports, locale, router])

  useEffect(() => {
    checkAuthAndLoadReports()
  }, [checkAuthAndLoadReports])

  const handleRefresh = async () => {
    if (!providerId) return
    setRefreshing(true)
    await loadAllReports(providerId)
    setRefreshing(false)
  }

  // Get filtered orders based on payment status
  const getFilteredOrders = () => {
    if (paymentFilter === 'all') return allOrders
    if (paymentFilter === 'completed') return allOrders.filter(o => o.payment_status === 'completed')
    return allOrders.filter(o => o.payment_status === 'pending')
  }

  // Helper to escape CSV fields
  const escapeCSVField = (field: string | number): string => {
    const str = String(field)
    // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  // Export to CSV/Excel
  const handleExportExcel = () => {
    const filteredOrders = getFilteredOrders()
    if (filteredOrders.length === 0) {
      alert(locale === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export')
      return
    }

    // Create CSV content
    const headers = locale === 'ar'
      ? ['رقم الطلب', 'التاريخ', 'الإجمالي', 'الحالة', 'حالة الدفع']
      : ['Order ID', 'Date', 'Total', 'Status', 'Payment Status']

    const rows = filteredOrders.map(order => [
      escapeCSVField(order.id.slice(0, 8)),
      escapeCSVField(new Date(order.created_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')),
      escapeCSVField(order.total?.toFixed(2) || '0.00'),
      escapeCSVField(order.status || ''),
      escapeCSVField(order.payment_status || '')
    ])

    const csvContent = [headers.map(escapeCSVField), ...rows].map(row => row.join(',')).join('\n')
    const BOM = '\uFEFF' // UTF-8 BOM for Arabic support
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `reports_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Export summary to text/print
  const handleExportPDF = () => {
    const filteredOrders = getFilteredOrders()
    const confirmedOrders = filteredOrders.filter(o => o.status === 'delivered' && o.payment_status === 'completed')
    const totalRevenue = confirmedOrders.reduce((sum, o) => sum + (o.total || 0), 0)

    const content = locale === 'ar' ? `
تقرير الأداء - ${new Date().toLocaleDateString('ar-EG')}
========================================

إجمالي الطلبات: ${filteredOrders.length}
الطلبات المكتملة: ${filteredOrders.filter(o => o.status === 'delivered').length}
الطلبات الملغية: ${filteredOrders.filter(o => ['cancelled', 'rejected'].includes(o.status)).length}

الإيرادات المؤكدة: ${totalRevenue.toFixed(2)} ج.م
عدد العملاء: ${new Set(filteredOrders.map(o => o.customer_id)).size}

فلتر حالة الدفع: ${paymentFilter === 'all' ? 'الكل' : paymentFilter === 'completed' ? 'مؤكد' : 'معلق'}
    ` : `
Performance Report - ${new Date().toLocaleDateString('en-US')}
========================================

Total Orders: ${filteredOrders.length}
Completed Orders: ${filteredOrders.filter(o => o.status === 'delivered').length}
Cancelled Orders: ${filteredOrders.filter(o => ['cancelled', 'rejected'].includes(o.status)).length}

Confirmed Revenue: ${totalRevenue.toFixed(2)} EGP
Customers: ${new Set(filteredOrders.map(o => o.customer_id)).size}

Payment Filter: ${paymentFilter === 'all' ? 'All' : paymentFilter === 'completed' ? 'Confirmed' : 'Pending'}
    `

    // Open print dialog
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html dir="${locale === 'ar' ? 'rtl' : 'ltr'}">
          <head>
            <title>${locale === 'ar' ? 'تقرير الأداء' : 'Performance Report'}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; white-space: pre-wrap; }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
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
    <ProviderLayout
      pageTitle={{ ar: 'التقارير والإحصائيات', en: 'Reports & Analytics' }}
      pageSubtitle={{ ar: 'عرض ملخص الأداء والإحصائيات', en: 'View performance summary and statistics' }}
    >
      <div className="max-w-6xl mx-auto space-y-6">
          {/* Page Description */}
          <p className="text-sm text-slate-500">
            {locale === 'ar'
              ? 'عرض ملخص الأداء وإحصائيات الطلبات خلال الفترة الأخيرة'
              : 'View performance summary and order statistics for the recent period'}
          </p>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-lg">!</span>
              </div>
              <div>
                <p className="font-medium text-red-800">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="text-sm text-red-600 hover:underline mt-1"
                >
                  {locale === 'ar' ? 'إعادة المحاولة' : 'Try again'}
                </button>
              </div>
            </div>
          )}

          {/* Filters and Export Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200">
            {/* Payment Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-600 font-medium">
                {locale === 'ar' ? 'حالة الدفع:' : 'Payment Status:'}
              </span>
              <div className="flex gap-1">
                <Button
                  variant={paymentFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentFilter('all')}
                  className={paymentFilter === 'all' ? 'bg-primary' : ''}
                >
                  {locale === 'ar' ? 'الكل' : 'All'}
                </Button>
                <Button
                  variant={paymentFilter === 'completed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentFilter('completed')}
                  className={paymentFilter === 'completed' ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  <CheckCircle2 className="w-3 h-3 ml-1" />
                  {locale === 'ar' ? 'مؤكد' : 'Confirmed'}
                </Button>
                <Button
                  variant={paymentFilter === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentFilter('pending')}
                  className={paymentFilter === 'pending' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                >
                  <Clock className="w-3 h-3 ml-1" />
                  {locale === 'ar' ? 'معلق' : 'Pending'}
                </Button>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                <span>{locale === 'ar' ? 'تصدير Excel' : 'Export Excel'}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-red-600" />
                <span>{locale === 'ar' ? 'طباعة التقرير' : 'Print Report'}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{locale === 'ar' ? 'تحديث' : 'Refresh'}</span>
              </Button>
            </div>
          </div>

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

          {/* COD vs Online Breakdown */}
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-900 flex items-center gap-2 text-lg font-semibold">
                <DollarSign className="w-5 h-5 text-primary" />
                {locale === 'ar' ? 'تفصيل طرق الدفع (هذا الشهر)' : 'Payment Methods (This Month)'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* COD */}
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {locale === 'ar' ? 'الدفع عند الاستلام' : 'Cash on Delivery'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {paymentMethodStats.codOrders} {locale === 'ar' ? 'طلب' : 'orders'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{locale === 'ar' ? 'الإجمالي' : 'Total'}</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(paymentMethodStats.codRevenue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{locale === 'ar' ? 'تم التحصيل' : 'Collected'}</span>
                      <span className="font-semibold text-green-600">{formatCurrency(paymentMethodStats.codConfirmed)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{locale === 'ar' ? 'بانتظار التحصيل' : 'Pending'}</span>
                      <span className="font-semibold text-amber-600">{formatCurrency(paymentMethodStats.codPending)}</span>
                    </div>
                  </div>
                  {paymentMethodStats.codRevenue > 0 && (
                    <div className="mt-3 pt-3 border-t border-amber-200">
                      <div className="w-full bg-amber-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${(paymentMethodStats.codConfirmed / paymentMethodStats.codRevenue) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {((paymentMethodStats.codConfirmed / paymentMethodStats.codRevenue) * 100).toFixed(0)}% {locale === 'ar' ? 'تم تحصيله' : 'collected'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Online */}
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {locale === 'ar' ? 'الدفع الإلكتروني' : 'Online Payment'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {paymentMethodStats.onlineOrders} {locale === 'ar' ? 'طلب' : 'orders'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{locale === 'ar' ? 'الإجمالي' : 'Total'}</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(paymentMethodStats.onlineRevenue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{locale === 'ar' ? 'مؤكد' : 'Confirmed'}</span>
                      <span className="font-semibold text-green-600">{formatCurrency(paymentMethodStats.onlineConfirmed)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{locale === 'ar' ? 'قيد المعالجة' : 'Processing'}</span>
                      <span className="font-semibold text-blue-600">{formatCurrency(paymentMethodStats.onlinePending)}</span>
                    </div>
                  </div>
                  {paymentMethodStats.onlineRevenue > 0 && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${(paymentMethodStats.onlineConfirmed / paymentMethodStats.onlineRevenue) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {((paymentMethodStats.onlineConfirmed / paymentMethodStats.onlineRevenue) * 100).toFixed(0)}% {locale === 'ar' ? 'مؤكد' : 'confirmed'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              {(paymentMethodStats.codOrders + paymentMethodStats.onlineOrders) > 0 && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-center text-slate-600">
                    {locale === 'ar' ? (
                      <>
                        <span className="font-semibold text-amber-600">
                          {((paymentMethodStats.codOrders / (paymentMethodStats.codOrders + paymentMethodStats.onlineOrders)) * 100).toFixed(0)}%
                        </span>
                        {' '}كاش |{' '}
                        <span className="font-semibold text-blue-600">
                          {((paymentMethodStats.onlineOrders / (paymentMethodStats.codOrders + paymentMethodStats.onlineOrders)) * 100).toFixed(0)}%
                        </span>
                        {' '}إلكتروني
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-amber-600">
                          {((paymentMethodStats.codOrders / (paymentMethodStats.codOrders + paymentMethodStats.onlineOrders)) * 100).toFixed(0)}%
                        </span>
                        {' '}COD |{' '}
                        <span className="font-semibold text-blue-600">
                          {((paymentMethodStats.onlineOrders / (paymentMethodStats.codOrders + paymentMethodStats.onlineOrders)) * 100).toFixed(0)}%
                        </span>
                        {' '}Online
                      </>
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

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
    </ProviderLayout>
  )
}

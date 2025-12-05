'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ProviderLayout } from '@/components/provider'
import {
  Wallet,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  RefreshCw,
  Download,
  CreditCard,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Filter,
  AlertCircle,
} from 'lucide-react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

type Transaction = {
  id: string
  type: 'order' | 'payout' | 'commission' | 'refund'
  amount: number
  status: 'completed' | 'pending' | 'failed'
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded'
  paymentMethod: string
  description: string
  created_at: string
  order_id?: string
}

type FinanceStats = {
  confirmedEarnings: number
  pendingCollection: number
  totalCommission: number
  periodEarnings: number
  lastPeriodEarnings: number
  pendingPayout: number
}

type DateFilter = 'today' | 'week' | 'month' | 'custom'

export default function FinancePage() {
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'

  const [providerId, setProviderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<FinanceStats>({
    confirmedEarnings: 0,
    pendingCollection: 0,
    totalCommission: 0,
    periodEarnings: 0,
    lastPeriodEarnings: 0,
    pendingPayout: 0,
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filterType, setFilterType] = useState<'all' | 'order' | 'payout' | 'commission'>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Platform commission rate
  const COMMISSION_RATE = 0.06 // 6%

  useEffect(() => {
    checkAuthAndLoadFinance()
  }, [])

  useEffect(() => {
    if (providerId) {
      loadFinanceData(providerId)
    }
  }, [dateFilter, customStartDate, customEndDate])

  const getDateRange = () => {
    const now = new Date()
    let startDate: Date
    let endDate: Date = now
    let lastPeriodStart: Date
    let lastPeriodEnd: Date

    switch (dateFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        lastPeriodStart = new Date(startDate)
        lastPeriodStart.setDate(lastPeriodStart.getDate() - 1)
        lastPeriodEnd = new Date(startDate)
        lastPeriodEnd.setMilliseconds(-1)
        break
      case 'week':
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 7)
        lastPeriodStart = new Date(startDate)
        lastPeriodStart.setDate(lastPeriodStart.getDate() - 7)
        lastPeriodEnd = new Date(startDate)
        lastPeriodEnd.setMilliseconds(-1)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        lastPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        lastPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'custom':
        startDate = customStartDate ? new Date(customStartDate) : new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = customEndDate ? new Date(customEndDate) : now
        // For custom, calculate the same duration for last period
        const duration = endDate.getTime() - startDate.getTime()
        lastPeriodEnd = new Date(startDate.getTime() - 1)
        lastPeriodStart = new Date(lastPeriodEnd.getTime() - duration)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        lastPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        lastPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    }

    return { startDate, endDate, lastPeriodStart, lastPeriodEnd }
  }

  const checkAuthAndLoadFinance = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/provider/finance`)
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
    await loadFinanceData(provider.id)
    setLoading(false)
  }

  const loadFinanceData = async (provId: string) => {
    const supabase = createClient()
    const { startDate, endDate, lastPeriodStart, lastPeriodEnd } = getDateRange()

    // Get all delivered orders with payment status
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, total, status, payment_status, payment_method, created_at')
      .eq('provider_id', provId)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false })

    if (orders) {
      // Separate by payment status
      const confirmedOrders = orders.filter(o => o.payment_status === 'completed')
      const pendingPaymentOrders = orders.filter(o => o.payment_status === 'pending')

      // Calculate confirmed totals (only completed payments)
      const confirmedRevenue = confirmedOrders.reduce((sum, o) => sum + (o.total || 0), 0)
      const confirmedCommission = confirmedRevenue * COMMISSION_RATE
      const confirmedEarnings = confirmedRevenue - confirmedCommission

      // Calculate pending collection (delivered but payment pending - mostly cash)
      const pendingRevenue = pendingPaymentOrders.reduce((sum, o) => sum + (o.total || 0), 0)
      const pendingCollection = pendingRevenue - (pendingRevenue * COMMISSION_RATE)

      // Total commission from all delivered orders
      const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
      const totalCommission = totalRevenue * COMMISSION_RATE

      // Period earnings (confirmed only within date range)
      const periodConfirmedOrders = confirmedOrders.filter(o => {
        const d = new Date(o.created_at)
        return d >= startDate && d <= endDate
      })
      const periodRevenue = periodConfirmedOrders.reduce((sum, o) => sum + (o.total || 0), 0)
      const periodEarnings = periodRevenue - (periodRevenue * COMMISSION_RATE)

      // Last period earnings for comparison
      const lastPeriodConfirmedOrders = confirmedOrders.filter(o => {
        const d = new Date(o.created_at)
        return d >= lastPeriodStart && d <= lastPeriodEnd
      })
      const lastPeriodRevenue = lastPeriodConfirmedOrders.reduce((sum, o) => sum + (o.total || 0), 0)
      const lastPeriodEarnings = lastPeriodRevenue - (lastPeriodRevenue * COMMISSION_RATE)

      // Pending payout (confirmed earnings from this week)
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - 7)
      const weekConfirmedOrders = confirmedOrders.filter(o => new Date(o.created_at) >= weekStart)
      const weekRevenue = weekConfirmedOrders.reduce((sum, o) => sum + (o.total || 0), 0)
      const pendingPayout = weekRevenue - (weekRevenue * COMMISSION_RATE)

      setStats({
        confirmedEarnings,
        pendingCollection,
        totalCommission,
        periodEarnings,
        lastPeriodEarnings,
        pendingPayout,
      })

      // Build transaction list from orders within date range
      const periodOrders = orders.filter(o => {
        const d = new Date(o.created_at)
        return d >= startDate && d <= endDate
      })

      const txns: Transaction[] = periodOrders.slice(0, 30).map(order => ({
        id: order.id,
        type: 'order' as const,
        amount: (order.total || 0) - ((order.total || 0) * COMMISSION_RATE),
        status: order.payment_status === 'completed' ? 'completed' as const : 'pending' as const,
        paymentStatus: order.payment_status || 'pending',
        paymentMethod: order.payment_method || 'cash',
        description: locale === 'ar' ? `طلب #${order.order_number || order.id.slice(0, 8).toUpperCase()}` : `Order #${order.order_number || order.id.slice(0, 8).toUpperCase()}`,
        created_at: order.created_at,
        order_id: order.id,
      }))

      setTransactions(txns)
    }
  }

  const handleRefresh = async () => {
    if (!providerId) return
    setRefreshing(true)
    await loadFinanceData(providerId)
    setRefreshing(false)
  }

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} ${locale === 'ar' ? 'ج.م' : 'EGP'}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getGrowthPercentage = () => {
    if (stats.lastPeriodEarnings === 0) return stats.periodEarnings > 0 ? 100 : 0
    return ((stats.periodEarnings - stats.lastPeriodEarnings) / stats.lastPeriodEarnings * 100).toFixed(1)
  }

  const filteredTransactions = transactions.filter(t => {
    if (filterType === 'all') return true
    return t.type === filterType
  })

  const filters = [
    { key: 'all', label_ar: 'الكل', label_en: 'All' },
    { key: 'order', label_ar: 'الطلبات', label_en: 'Orders' },
    { key: 'payout', label_ar: 'التحويلات', label_en: 'Payouts' },
    { key: 'commission', label_ar: 'العمولات', label_en: 'Commissions' },
  ]

  const dateFilters = [
    { key: 'today', label_ar: 'اليوم', label_en: 'Today' },
    { key: 'week', label_ar: 'الأسبوع', label_en: 'Week' },
    { key: 'month', label_ar: 'الشهر', label_en: 'Month' },
    { key: 'custom', label_ar: 'مخصص', label_en: 'Custom' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-slate-500">
            {locale === 'ar' ? 'جاري تحميل البيانات المالية...' : 'Loading financial data...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <ProviderLayout
      pageTitle={{ ar: 'المالية والمدفوعات', en: 'Finance & Payments' }}
      pageSubtitle={{ ar: 'إدارة الأرباح والمدفوعات', en: 'Manage earnings and payments' }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Date Filter */}
        <Card className="bg-white border-slate-200">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">
                  {locale === 'ar' ? 'فلترة حسب الفترة:' : 'Filter by period:'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {dateFilters.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setDateFilter(filter.key as DateFilter)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      dateFilter === filter.key
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {locale === 'ar' ? filter.label_ar : filter.label_en}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <div className="flex flex-col sm:flex-row gap-4 mt-4 pt-4 border-t border-slate-100">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">
                    {locale === 'ar' ? 'من تاريخ' : 'From Date'}
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">
                    {locale === 'ar' ? 'إلى تاريخ' : 'To Date'}
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Confirmed Earnings */}
          <Card className="bg-[hsl(158_100%_38%/0.15)] border-[hsl(158_100%_38%/0.3)]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-8 h-8 text-deal" />
              </div>
              <p className="text-2xl font-bold text-deal">{formatCurrency(stats.confirmedEarnings)}</p>
              <p className="text-xs text-slate-500">{locale === 'ar' ? 'أرباح مؤكدة' : 'Confirmed Earnings'}</p>
            </CardContent>
          </Card>

          {/* Pending Collection */}
          <Card className="bg-[hsl(42_100%_70%/0.15)] border-[hsl(42_100%_70%/0.3)]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 text-premium" />
              </div>
              <p className="text-2xl font-bold text-premium">{formatCurrency(stats.pendingCollection)}</p>
              <p className="text-xs text-slate-500">{locale === 'ar' ? 'في انتظار التحصيل' : 'Pending Collection'}</p>
            </CardContent>
          </Card>

          {/* Period Earnings */}
          <Card className="bg-[hsl(198_100%_44%/0.15)] border-[hsl(198_100%_44%/0.3)]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-primary" />
                <span className={`text-xs px-2 py-1 rounded-full ${
                  Number(getGrowthPercentage()) >= 0
                    ? 'text-deal bg-[hsl(158_100%_38%/0.2)]'
                    : 'text-error bg-[hsl(358_100%_68%/0.2)]'
                }`}>
                  {Number(getGrowthPercentage()) >= 0 ? '+' : ''}{getGrowthPercentage()}%
                </span>
              </div>
              <p className="text-2xl font-bold text-primary">{formatCurrency(stats.periodEarnings)}</p>
              <p className="text-xs text-slate-500">
                {dateFilter === 'today' ? (locale === 'ar' ? 'اليوم' : 'Today') :
                 dateFilter === 'week' ? (locale === 'ar' ? 'هذا الأسبوع' : 'This Week') :
                 dateFilter === 'month' ? (locale === 'ar' ? 'هذا الشهر' : 'This Month') :
                 (locale === 'ar' ? 'الفترة المحددة' : 'Selected Period')}
              </p>
            </CardContent>
          </Card>

          {/* Total Commission */}
          <Card className="bg-[hsl(194_86%_58%/0.15)] border-[hsl(194_86%_58%/0.3)]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Banknote className="w-8 h-8 text-info" />
              </div>
              <p className="text-2xl font-bold text-info">{formatCurrency(stats.totalCommission)}</p>
              <p className="text-xs text-slate-500">{locale === 'ar' ? 'العمولات (6%)' : 'Commission (6%)'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Commission Info */}
        <Card className="bg-white border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-info shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900 mb-1">
                  {locale === 'ar' ? 'معلومات العمولة' : 'Commission Information'}
                </p>
                <p className="text-sm text-slate-500">
                  {locale === 'ar'
                    ? 'عمولة المنصة 6% فقط من قيمة كل طلب. يتم تحويل أرباحك المؤكدة أسبوعياً إلى حسابك البنكي.'
                    : 'Platform commission is only 6% of each order. Your confirmed earnings are transferred weekly to your bank account.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Collection Alert */}
        {stats.pendingCollection > 0 && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 mb-1">
                    {locale === 'ar' ? 'لديك مبالغ في انتظار التحصيل' : 'You have pending collections'}
                  </p>
                  <p className="text-sm text-amber-700">
                    {locale === 'ar'
                      ? `هناك ${formatCurrency(stats.pendingCollection)} من طلبات الدفع عند الاستلام بانتظار تأكيد استلام المبلغ. اذهب لصفحة الطلبات لتأكيد استلام المدفوعات.`
                      : `You have ${formatCurrency(stats.pendingCollection)} from cash on delivery orders pending payment confirmation. Go to orders page to confirm received payments.`}
                  </p>
                  <Link href={`/${locale}/provider/orders`}>
                    <Button variant="outline" size="sm" className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-100">
                      {locale === 'ar' ? 'عرض الطلبات' : 'View Orders'}
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payout Schedule */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {locale === 'ar' ? 'جدول التحويلات' : 'Payout Schedule'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg text-center">
                <p className="text-lg font-bold text-slate-900">
                  {locale === 'ar' ? 'الأحد' : 'Sunday'}
                </p>
                <p className="text-xs text-slate-500">
                  {locale === 'ar' ? 'يوم التحويل' : 'Payout Day'}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg text-center">
                <p className="text-lg font-bold text-slate-900">
                  {locale === 'ar' ? '1-3 أيام' : '1-3 Days'}
                </p>
                <p className="text-xs text-slate-500">
                  {locale === 'ar' ? 'وقت الوصول' : 'Processing Time'}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg text-center">
                <p className="text-lg font-bold text-slate-900">
                  {locale === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}
                </p>
                <p className="text-xs text-slate-500">
                  {locale === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                </p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-primary/5 rounded-lg">
              <p className="text-sm text-slate-700">
                <span className="font-medium">{locale === 'ar' ? 'قيد التحويل القادم:' : 'Next Payout:'}</span>{' '}
                <span className="text-primary font-bold">{formatCurrency(stats.pendingPayout)}</span>
                <span className="text-slate-500 text-xs mx-2">
                  ({locale === 'ar' ? 'أرباح الأسبوع المؤكدة' : 'Confirmed weekly earnings'})
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                {locale === 'ar' ? 'سجل المعاملات' : 'Transaction History'}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-slate-500"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {filters.map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setFilterType(filter.key as typeof filterType)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors text-sm ${
                    filterType === filter.key
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {locale === 'ar' ? filter.label_ar : filter.label_en}
                </button>
              ))}
            </div>

            {/* Transactions List */}
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{locale === 'ar' ? 'لا توجد معاملات في هذه الفترة' : 'No transactions in this period'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map((txn) => (
                  <Link
                    key={txn.id}
                    href={`/${locale}/provider/orders/${txn.order_id}`}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        txn.status === 'completed' ? 'bg-[hsl(158_100%_38%/0.2)]' :
                        txn.status === 'pending' ? 'bg-[hsl(42_100%_70%/0.2)]' :
                        'bg-[hsl(358_100%_68%/0.2)]'
                      }`}>
                        {txn.status === 'completed' ? (
                          <ArrowUpRight className="w-5 h-5 text-deal" />
                        ) : txn.status === 'pending' ? (
                          <Clock className="w-5 h-5 text-premium" />
                        ) : (
                          <XCircle className="w-5 h-5 text-error" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {txn.type === 'order'
                            ? (locale === 'ar' ? 'طلب' : 'Order')
                            : txn.type === 'payout'
                            ? (locale === 'ar' ? 'تحويل' : 'Payout')
                            : txn.type === 'commission'
                            ? (locale === 'ar' ? 'عمولة' : 'Commission')
                            : (locale === 'ar' ? 'استرداد' : 'Refund')} {txn.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-slate-500">{formatDate(txn.created_at)}</p>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                            {txn.paymentMethod === 'cash'
                              ? (locale === 'ar' ? 'كاش' : 'Cash')
                              : (locale === 'ar' ? 'بطاقة' : 'Card')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className={`font-bold ${
                        txn.status === 'completed' ? 'text-deal' :
                        txn.status === 'pending' ? 'text-premium' :
                        'text-error'
                      }`}>
                        +{formatCurrency(txn.amount)}
                      </p>
                      <p className={`text-xs ${
                        txn.status === 'completed' ? 'text-deal' :
                        txn.status === 'pending' ? 'text-premium' :
                        'text-error'
                      }`}>
                        {txn.status === 'completed'
                          ? (locale === 'ar' ? 'مؤكد' : 'Confirmed')
                          : txn.status === 'pending'
                          ? (locale === 'ar' ? 'في انتظار التحصيل' : 'Pending Collection')
                          : (locale === 'ar' ? 'فشل' : 'Failed')}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProviderLayout>
  )
}

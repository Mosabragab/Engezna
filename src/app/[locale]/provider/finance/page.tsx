'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ProviderLayout } from '@/components/provider'
import { ACTIVE_PROVIDER_STATUSES } from '@/types/database'
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
  pendingPayout: number // Online only - what platform owes provider
  codCommissionOwed: number // What provider owes platform from COD orders
  // COD vs Online breakdown
  codOrdersCount: number
  codRevenue: number
  codPending: number
  codConfirmed: number
  onlineOrdersCount: number
  onlineRevenue: number
  onlinePending: number
  onlineConfirmed: number
}

type DateFilter = 'today' | 'week' | 'month' | 'custom'

export default function FinancePage() {
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'

  const [providerId, setProviderId] = useState<string | null>(null)
  const [commissionRate, setCommissionRate] = useState<number>(0.07) // Default 7% max, will be fetched from DB
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<FinanceStats>({
    confirmedEarnings: 0,
    pendingCollection: 0,
    totalCommission: 0,
    periodEarnings: 0,
    lastPeriodEarnings: 0,
    pendingPayout: 0,
    codCommissionOwed: 0,
    // COD vs Online
    codOrdersCount: 0,
    codRevenue: 0,
    codPending: 0,
    codConfirmed: 0,
    onlineOrdersCount: 0,
    onlineRevenue: 0,
    onlinePending: 0,
    onlineConfirmed: 0,
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filterType, setFilterType] = useState<'all' | 'order' | 'payout' | 'commission' | 'refund'>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  const getDateRange = useCallback(() => {
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
  }, [dateFilter, customStartDate, customEndDate])

  const loadFinanceData = useCallback(async (provId: string, currentCommissionRate: number = commissionRate) => {
    const supabase = createClient()
    const { startDate, endDate, lastPeriodStart, lastPeriodEnd } = getDateRange()

    // Get all delivered orders with payment status and platform_commission
    // IMPORTANT: platform_commission is calculated by DB trigger using (subtotal - discount) * rate
    // This excludes delivery fees as requested
    const { data: allOrders } = await supabase
      .from('orders')
      .select('id, order_number, total, subtotal, discount, delivery_fee, platform_commission, original_commission, status, payment_status, payment_method, created_at')
      .eq('provider_id', provId)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false })

    // Get refunds to subtract from earnings
    const { data: refunds } = await supabase
      .from('refunds')
      .select('id, amount, created_at, order_id, status, orders!inner(order_number)')
      .eq('provider_id', provId)
      .in('status', ['approved', 'processed'])
      .order('created_at', { ascending: false })

    // Get settlements (payouts) for the provider
    const { data: settlements } = await supabase
      .from('settlements')
      .select('id, period_start, period_end, net_payout, net_amount_due, platform_commission, status, payment_date, created_at')
      .eq('provider_id', provId)
      .order('created_at', { ascending: false })

    if (allOrders) {
      // ═══════════════════════════════════════════════════════════════════════
      // IMPORTANT: Use DB-calculated commission values, NOT frontend calculation
      // Commission is calculated by DB trigger using: (subtotal - discount) * rate
      // This EXCLUDES delivery fees (per business rule: نسبة المنصه علي صافي الطلب بدون التوصيل)
      // ═══════════════════════════════════════════════════════════════════════

      // Theoretical commission - what would be charged (use original_commission from DB)
      // Shows merchant what commission would be so they get used to seeing it
      const getTheoreticalCommission = (order: typeof allOrders[0]) => {
        // Prefer DB-calculated original_commission (includes grace period visibility)
        if (order.original_commission != null && order.original_commission > 0) {
          return order.original_commission
        }
        // Fallback: use platform_commission if original not available
        if (order.platform_commission != null && order.platform_commission > 0) {
          return order.platform_commission
        }
        // Last resort: calculate manually (using subtotal - excludes delivery)
        const baseAmount = (order.subtotal || (order.total || 0) - (order.delivery_fee || 0)) - (order.discount || 0)
        return Math.max(0, baseAmount * currentCommissionRate)
      }

      // Actual commission - what is actually charged (0 during grace period)
      // ALWAYS use DB value - it's calculated by trigger with correct formula
      const getActualCommission = (order: typeof allOrders[0]) => {
        // Use platform_commission from DB (calculated by trigger)
        return order.platform_commission || 0
      }

      // FILTER ALL ORDERS BY DATE RANGE FIRST
      const orders = allOrders.filter(o => {
        const d = new Date(o.created_at)
        return d >= startDate && d <= endDate
      })

      // Calculate refunds for this period
      const periodRefunds = (refunds || []).filter(r => {
        const d = new Date(r.created_at)
        return d >= startDate && d <= endDate
      })
      const totalRefundsAmount = periodRefunds.reduce((sum, r) => sum + (r.amount || 0), 0)

      // Separate by payment status (filtered by date)
      const confirmedOrders = orders.filter(o => o.payment_status === 'completed')
      const pendingPaymentOrders = orders.filter(o => o.payment_status === 'pending')

      // Calculate confirmed totals (only completed payments in the period)
      // Use ACTUAL commission for earnings (respects grace period)
      const confirmedRevenue = confirmedOrders.reduce((sum, o) => sum + (o.total || 0), 0)
      const confirmedActualCommission = confirmedOrders.reduce((sum, o) => sum + getActualCommission(o), 0)
      const confirmedEarnings = Math.max(0, confirmedRevenue - confirmedActualCommission - totalRefundsAmount)

      // Calculate pending collection (delivered but payment pending in the period)
      const pendingRevenue = pendingPaymentOrders.reduce((sum, o) => sum + (o.total || 0), 0)
      const pendingActualCommission = pendingPaymentOrders.reduce((sum, o) => sum + getActualCommission(o), 0)
      const pendingCollection = pendingRevenue - pendingActualCommission

      // Total THEORETICAL commission for display (shows what commission would be, even during grace period)
      // Subtract commission proportional to refunds (refunded amounts shouldn't have commission)
      const grossCommission = orders.reduce((sum, o) => sum + getTheoreticalCommission(o), 0)
      const refundsCommission = totalRefundsAmount * currentCommissionRate
      const totalCommission = Math.max(0, grossCommission - refundsCommission)

      // Period earnings = confirmed earnings in this period
      const periodEarnings = confirmedEarnings

      // Last period earnings for comparison
      const lastPeriodOrders = allOrders.filter(o => {
        const d = new Date(o.created_at)
        return d >= lastPeriodStart && d <= lastPeriodEnd
      })
      const lastPeriodRefunds = (refunds || []).filter(r => {
        const d = new Date(r.created_at)
        return d >= lastPeriodStart && d <= lastPeriodEnd
      })
      const lastPeriodRefundsAmount = lastPeriodRefunds.reduce((sum, r) => sum + (r.amount || 0), 0)
      const lastPeriodConfirmedOrders = lastPeriodOrders.filter(o => o.payment_status === 'completed')
      const lastPeriodRevenue = lastPeriodConfirmedOrders.reduce((sum, o) => sum + (o.total || 0), 0)
      const lastPeriodCommission = lastPeriodConfirmedOrders.reduce((sum, o) => sum + getActualCommission(o), 0)
      const lastPeriodEarnings = Math.max(0, lastPeriodRevenue - lastPeriodCommission - lastPeriodRefundsAmount)

      // Pending payout calculation (for filtered period)
      // For Online orders: Platform owes provider (revenue - commission)
      const periodOnlineConfirmed = confirmedOrders.filter(o => o.payment_method !== 'cash')
      const periodOnlineRevenue = periodOnlineConfirmed.reduce((sum, o) => sum + (o.total || 0), 0)
      const periodOnlineCommission = periodOnlineConfirmed.reduce((sum, o) => sum + getActualCommission(o), 0)
      const pendingPayout = periodOnlineRevenue - periodOnlineCommission

      // COD commission owed - what provider owes platform from COD orders in period
      // Use ACTUAL commission (0 during grace period)
      const periodCodConfirmed = confirmedOrders.filter(o => o.payment_method === 'cash')
      const codCommissionOwed = periodCodConfirmed.reduce((sum, o) => sum + getActualCommission(o), 0)

      // COD vs Online breakdown (within date range - already filtered)
      const codOrders = orders.filter(o => o.payment_method === 'cash')
      const onlineOrders = orders.filter(o => o.payment_method !== 'cash')

      const codOrdersCount = codOrders.length
      const codRevenue = codOrders.reduce((sum, o) => sum + (o.total || 0), 0)
      const codPending = codOrders.filter(o => o.payment_status === 'pending').reduce((sum, o) => sum + (o.total || 0), 0)
      const codConfirmed = codOrders.filter(o => o.payment_status === 'completed').reduce((sum, o) => sum + (o.total || 0), 0)

      const onlineOrdersCount = onlineOrders.length
      const onlineRevenue = onlineOrders.reduce((sum, o) => sum + (o.total || 0), 0)
      const onlinePending = onlineOrders.filter(o => o.payment_status === 'pending').reduce((sum, o) => sum + (o.total || 0), 0)
      const onlineConfirmed = onlineOrders.filter(o => o.payment_status === 'completed').reduce((sum, o) => sum + (o.total || 0), 0)

      setStats({
        confirmedEarnings,
        pendingCollection,
        totalCommission,
        periodEarnings,
        lastPeriodEarnings,
        pendingPayout,
        codCommissionOwed,
        // COD vs Online
        codOrdersCount,
        codRevenue,
        codPending,
        codConfirmed,
        onlineOrdersCount,
        onlineRevenue,
        onlinePending,
        onlineConfirmed,
      })

      // Build transaction list from filtered orders
      const orderTxns: Transaction[] = orders.slice(0, 30).map(order => ({
        id: order.id,
        type: 'order' as const,
        amount: (order.total || 0) - getActualCommission(order),
        status: order.payment_status === 'completed' ? 'completed' as const : 'pending' as const,
        paymentStatus: order.payment_status || 'pending',
        paymentMethod: order.payment_method || 'cash',
        description: locale === 'ar' ? `طلب #${order.order_number || order.id.slice(0, 8).toUpperCase()}` : `Order #${order.order_number || order.id.slice(0, 8).toUpperCase()}`,
        created_at: order.created_at,
        order_id: order.id,
      }))

      // Build refund transactions
      const refundTxns: Transaction[] = (refunds || [])
        .filter(r => {
          const d = new Date(r.created_at)
          return d >= startDate && d <= endDate
        })
        .slice(0, 20)
        .map(refund => ({
          id: refund.id,
          type: 'refund' as const,
          amount: refund.amount || 0,
          status: 'completed' as const,
          paymentStatus: 'refunded',
          paymentMethod: 'refund',
          description: locale === 'ar'
            ? `استرداد #${(refund.orders as any)?.order_number || refund.order_id?.slice(0, 8).toUpperCase() || ''}`
            : `Refund #${(refund.orders as any)?.order_number || refund.order_id?.slice(0, 8).toUpperCase() || ''}`,
          created_at: refund.created_at,
          order_id: refund.order_id || undefined,
        }))

      // Build settlement (payout) transactions
      const settlementTxns: Transaction[] = (settlements || [])
        .filter(s => {
          const d = new Date(s.created_at)
          return d >= startDate && d <= endDate
        })
        .slice(0, 20)
        .map(settlement => ({
          id: settlement.id,
          type: 'payout' as const,
          amount: settlement.net_payout || settlement.net_amount_due || 0,
          status: settlement.status === 'paid' ? 'completed' as const :
                  settlement.status === 'pending' ? 'pending' as const :
                  'failed' as const,
          paymentStatus: settlement.status === 'paid' ? 'completed' : 'pending',
          paymentMethod: 'bank_transfer',
          description: locale === 'ar'
            ? `تسوية ${new Date(settlement.period_start).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })} - ${new Date(settlement.period_end).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}`
            : `Settlement ${new Date(settlement.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(settlement.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          created_at: settlement.payment_date || settlement.created_at,
        }))

      // Build commission transactions (from confirmed orders)
      const commissionTxns: Transaction[] = confirmedOrders
        .filter(o => getActualCommission(o) > 0)
        .slice(0, 20)
        .map(order => ({
          id: `comm-${order.id}`,
          type: 'commission' as const,
          amount: getActualCommission(order),
          status: 'completed' as const,
          paymentStatus: 'completed',
          paymentMethod: order.payment_method || 'cash',
          description: locale === 'ar'
            ? `عمولة طلب #${order.order_number || order.id.slice(0, 8).toUpperCase()}`
            : `Commission #${order.order_number || order.id.slice(0, 8).toUpperCase()}`,
          created_at: order.created_at,
          order_id: order.id,
        }))

      // Combine all transactions and sort by date
      const allTxns = [...orderTxns, ...refundTxns, ...settlementTxns, ...commissionTxns]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 50)

      setTransactions(allTxns)
    }
  }, [commissionRate, getDateRange, locale])

  const checkAuthAndLoadFinance = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/provider/finance`)
      return
    }

    const { data: providerData } = await supabase
      .from('providers')
      .select('id, status, commission_rate')
      .eq('owner_id', user.id)
      .limit(1)

    const provider = providerData?.[0]
    if (!provider || !ACTIVE_PROVIDER_STATUSES.includes(provider.status)) {
      router.push(`/${locale}/provider`)
      return
    }

    // Set commission rate from database (default to 7% max if not set)
    const providerCommissionRate = provider.commission_rate != null
      ? provider.commission_rate / 100  // Convert from percentage (e.g., 7) to decimal (0.07)
      : 0.07

    setCommissionRate(providerCommissionRate)
    setProviderId(provider.id)
    await loadFinanceData(provider.id, providerCommissionRate)
    setLoading(false)
  }, [loadFinanceData, locale, router])

  useEffect(() => {
    checkAuthAndLoadFinance()
  }, [checkAuthAndLoadFinance])

  useEffect(() => {
    if (providerId && commissionRate) {
      loadFinanceData(providerId, commissionRate)
    }
  }, [providerId, commissionRate, dateFilter, customStartDate, customEndDate, loadFinanceData])

  const handleRefresh = async () => {
    if (!providerId) return
    setRefreshing(true)
    await loadFinanceData(providerId, commissionRate)
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
    { key: 'refund', label_ar: 'المرتجعات', label_en: 'Refunds' },
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

        {/* Main Stats - All filtered by selected period */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Confirmed Earnings */}
          <Card className="bg-[hsl(var(--deal)/0.1)] border-[hsl(var(--deal)/0.3)]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-8 h-8 text-deal" />
              </div>
              <p className="text-2xl font-bold text-deal">{formatCurrency(stats.confirmedEarnings)}</p>
              <p className="text-xs text-slate-500">
                {locale === 'ar' ? 'أرباح مؤكدة' : 'Confirmed Earnings'}
                {' '}
                <span className="text-primary font-medium">
                  ({dateFilter === 'today' ? (locale === 'ar' ? 'اليوم' : 'Today') :
                    dateFilter === 'week' ? (locale === 'ar' ? 'الأسبوع' : 'Week') :
                    dateFilter === 'month' ? (locale === 'ar' ? 'الشهر' : 'Month') :
                    (locale === 'ar' ? 'مخصص' : 'Custom')})
                </span>
              </p>
            </CardContent>
          </Card>

          {/* Pending Collection */}
          <Card className="bg-[hsl(var(--premium)/0.15)] border-[hsl(var(--premium)/0.3)]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 text-premium" />
              </div>
              <p className="text-2xl font-bold text-premium">{formatCurrency(stats.pendingCollection)}</p>
              <p className="text-xs text-slate-500">
                {locale === 'ar' ? 'في انتظار التحصيل' : 'Pending Collection'}
              </p>
            </CardContent>
          </Card>

          {/* Period Earnings with growth */}
          <Card className="bg-[hsl(var(--primary)/0.1)] border-[hsl(var(--primary)/0.3)]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-primary" />
                <span className={`text-xs px-2 py-1 rounded-full ${
                  Number(getGrowthPercentage()) >= 0
                    ? 'text-deal bg-[hsl(var(--deal)/0.15)]'
                    : 'text-error bg-[hsl(var(--error)/0.15)]'
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

          {/* Total Commission - Shows theoretical value so merchant gets used to it */}
          <Card className="bg-[hsl(var(--info)/0.1)] border-[hsl(var(--info)/0.3)]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Banknote className="w-8 h-8 text-info" />
              </div>
              <p className="text-2xl font-bold text-info">{formatCurrency(stats.totalCommission)}</p>
              <p className="text-xs text-slate-500">{locale === 'ar' ? 'العمولات (حتى 7%)' : 'Commission (up to 7%)'}</p>
              {/* Note: This shows theoretical commission so merchant gets used to seeing it */}
            </CardContent>
          </Card>
        </div>

        {/* COD vs Online Payment Breakdown */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {locale === 'ar' ? 'تفصيل طرق الدفع' : 'Payment Methods Breakdown'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cash on Delivery */}
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <Banknote className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {locale === 'ar' ? 'الدفع عند الاستلام' : 'Cash on Delivery'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {stats.codOrdersCount} {locale === 'ar' ? 'طلب' : 'orders'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{locale === 'ar' ? 'الإجمالي' : 'Total'}</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(stats.codRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{locale === 'ar' ? 'تم التحصيل' : 'Collected'}</span>
                    <span className="font-semibold text-green-600">{formatCurrency(stats.codConfirmed)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{locale === 'ar' ? 'بانتظار التحصيل' : 'Pending'}</span>
                    <span className="font-semibold text-amber-600">{formatCurrency(stats.codPending)}</span>
                  </div>
                </div>
                {stats.codRevenue > 0 && (
                  <div className="mt-3 pt-3 border-t border-amber-200">
                    <div className="w-full bg-amber-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(stats.codConfirmed / stats.codRevenue) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {((stats.codConfirmed / stats.codRevenue) * 100).toFixed(0)}% {locale === 'ar' ? 'تم تحصيله' : 'collected'}
                    </p>
                  </div>
                )}
              </div>

              {/* Online Payment */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {locale === 'ar' ? 'الدفع الإلكتروني' : 'Online Payment'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {stats.onlineOrdersCount} {locale === 'ar' ? 'طلب' : 'orders'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{locale === 'ar' ? 'الإجمالي' : 'Total'}</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(stats.onlineRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{locale === 'ar' ? 'مؤكد' : 'Confirmed'}</span>
                    <span className="font-semibold text-green-600">{formatCurrency(stats.onlineConfirmed)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{locale === 'ar' ? 'قيد المعالجة' : 'Processing'}</span>
                    <span className="font-semibold text-blue-600">{formatCurrency(stats.onlinePending)}</span>
                  </div>
                </div>
                {stats.onlineRevenue > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(stats.onlineConfirmed / stats.onlineRevenue) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {((stats.onlineConfirmed / stats.onlineRevenue) * 100).toFixed(0)}% {locale === 'ar' ? 'مؤكد' : 'confirmed'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            {(stats.codOrdersCount + stats.onlineOrdersCount) > 0 && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-center text-slate-600">
                  {locale === 'ar' ? (
                    <>
                      <span className="font-semibold text-amber-600">{((stats.codOrdersCount / (stats.codOrdersCount + stats.onlineOrdersCount)) * 100).toFixed(0)}%</span>
                      {' '}كاش |{' '}
                      <span className="font-semibold text-blue-600">{((stats.onlineOrdersCount / (stats.codOrdersCount + stats.onlineOrdersCount)) * 100).toFixed(0)}%</span>
                      {' '}إلكتروني
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-amber-600">{((stats.codOrdersCount / (stats.codOrdersCount + stats.onlineOrdersCount)) * 100).toFixed(0)}%</span>
                      {' '}COD |{' '}
                      <span className="font-semibold text-blue-600">{((stats.onlineOrdersCount / (stats.codOrdersCount + stats.onlineOrdersCount)) * 100).toFixed(0)}%</span>
                      {' '}Online
                    </>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

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
                    ? 'عمولة المنصة حتى 7% فقط من قيمة كل طلب. يتم تحويل أرباحك المؤكدة أسبوعياً إلى حسابك البنكي.'
                    : 'Platform commission is up to 7% of each order. Your confirmed earnings are transferred weekly to your bank account.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Collection Alert */}
        {stats.pendingCollection > 0 && (
          <Card className="bg-card-warning border-[hsl(var(--warning)/0.3)]">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-800 mb-1">
                    {locale === 'ar' ? 'لديك مبالغ في انتظار التحصيل' : 'You have pending collections'}
                  </p>
                  <p className="text-sm text-slate-600">
                    {locale === 'ar'
                      ? `هناك ${formatCurrency(stats.pendingCollection)} من طلبات الدفع عند الاستلام بانتظار تأكيد استلام المبلغ. اذهب لصفحة الطلبات لتأكيد استلام المدفوعات.`
                      : `You have ${formatCurrency(stats.pendingCollection)} from cash on delivery orders pending payment confirmation. Go to orders page to confirm received payments.`}
                  </p>
                  <Link href={`/${locale}/provider/orders`}>
                    <Button variant="outline" size="sm" className="mt-3 border-[hsl(var(--warning)/0.5)] text-slate-700 hover:bg-[hsl(var(--warning)/0.15)] hover:text-slate-900">
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
            {/* Show Online payout (platform pays provider) */}
            {stats.pendingPayout > 0 && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-slate-700">
                  <span className="font-medium text-green-700">
                    {locale === 'ar' ? 'مستحق لك من المدفوعات الإلكترونية:' : 'Due to you (Online Payments):'}
                  </span>{' '}
                  <span className="text-green-600 font-bold">{formatCurrency(stats.pendingPayout)}</span>
                  <span className="text-slate-500 text-xs mx-2">
                    ({locale === 'ar' ? 'سيتم تحويله لحسابك' : 'Will be transferred to your account'})
                  </span>
                </p>
              </div>
            )}

            {/* Show COD commission owed (provider pays platform) */}
            {stats.codCommissionOwed > 0 && (
              <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-slate-700">
                  <span className="font-medium text-amber-700">
                    {locale === 'ar' ? 'عمولة مستحقة للمنصة (الدفع عند الاستلام):' : 'Commission due to platform (COD):'}
                  </span>{' '}
                  <span className="text-amber-600 font-bold">{formatCurrency(stats.codCommissionOwed)}</span>
                  <span className="text-slate-500 text-xs mx-2">
                    ({locale === 'ar' ? 'من طلبات الكاش هذا الأسبوع' : 'From COD orders this week'})
                  </span>
                </p>
              </div>
            )}

            {/* Show message when no pending payouts */}
            {stats.pendingPayout === 0 && stats.codCommissionOwed === 0 && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500 text-center">
                  {locale === 'ar' ? 'لا توجد مستحقات هذا الأسبوع' : 'No pending settlements this week'}
                </p>
              </div>
            )}
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
                {filteredTransactions.map((txn) => {
                  // Determine if this is a deduction (commission or refund)
                  const isDeduction = txn.type === 'commission' || txn.type === 'refund'
                  const isIncome = txn.type === 'order' || txn.type === 'payout'

                  // Get icon and colors based on transaction type
                  const getIconAndColor = () => {
                    if (txn.type === 'refund') {
                      return {
                        bg: 'bg-red-100',
                        icon: <ArrowDownRight className="w-5 h-5 text-red-600" />,
                        amountColor: 'text-red-600'
                      }
                    }
                    if (txn.type === 'commission') {
                      return {
                        bg: 'bg-blue-100',
                        icon: <Banknote className="w-5 h-5 text-blue-600" />,
                        amountColor: 'text-blue-600'
                      }
                    }
                    if (txn.type === 'payout') {
                      return {
                        bg: txn.status === 'completed' ? 'bg-[hsl(var(--deal)/0.15)]' : 'bg-[hsl(var(--premium)/0.2)]',
                        icon: txn.status === 'completed'
                          ? <CheckCircle2 className="w-5 h-5 text-deal" />
                          : <Clock className="w-5 h-5 text-premium" />,
                        amountColor: txn.status === 'completed' ? 'text-deal' : 'text-amber-600'
                      }
                    }
                    // Order
                    return {
                      bg: txn.status === 'completed' ? 'bg-[hsl(var(--deal)/0.15)]' :
                          txn.status === 'pending' ? 'bg-[hsl(var(--premium)/0.2)]' :
                          'bg-[hsl(var(--error)/0.15)]',
                      icon: txn.status === 'completed'
                        ? <ArrowUpRight className="w-5 h-5 text-deal" />
                        : txn.status === 'pending'
                        ? <Clock className="w-5 h-5 text-premium" />
                        : <XCircle className="w-5 h-5 text-error" />,
                      amountColor: txn.status === 'completed' ? 'text-deal' :
                                   txn.status === 'pending' ? 'text-amber-600' : 'text-error'
                    }
                  }

                  const { bg, icon, amountColor } = getIconAndColor()

                  // Get payment method label
                  const getPaymentMethodLabel = () => {
                    if (txn.paymentMethod === 'cash') return locale === 'ar' ? 'كاش' : 'Cash'
                    if (txn.paymentMethod === 'bank_transfer') return locale === 'ar' ? 'تحويل بنكي' : 'Bank'
                    if (txn.paymentMethod === 'refund') return locale === 'ar' ? 'استرداد' : 'Refund'
                    return locale === 'ar' ? 'بطاقة' : 'Card'
                  }

                  const content = (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bg}`}>
                          {icon}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {txn.description}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-slate-500">{formatDate(txn.created_at)}</p>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                              {getPaymentMethodLabel()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-end">
                        <p className={`font-bold ${amountColor}`}>
                          {isDeduction ? '-' : '+'}{formatCurrency(txn.amount)}
                        </p>
                        <p className={`text-xs ${amountColor}`}>
                          {txn.type === 'refund'
                            ? (locale === 'ar' ? 'مسترد' : 'Refunded')
                            : txn.type === 'commission'
                            ? (locale === 'ar' ? 'عمولة' : 'Commission')
                            : txn.status === 'completed'
                            ? (locale === 'ar' ? 'مؤكد' : 'Confirmed')
                            : txn.status === 'pending'
                            ? (locale === 'ar' ? 'معلق' : 'Pending')
                            : (locale === 'ar' ? 'فشل' : 'Failed')}
                        </p>
                      </div>
                    </div>
                  )

                  // Link to order if order_id exists, otherwise just show the content
                  if (txn.order_id) {
                    return (
                      <Link
                        key={txn.id}
                        href={`/${locale}/provider/orders/${txn.order_id}`}
                      >
                        {content}
                      </Link>
                    )
                  }

                  return <div key={txn.id}>{content}</div>
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProviderLayout>
  )
}

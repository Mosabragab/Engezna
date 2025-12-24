'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ProviderLayout } from '@/components/provider'
import { ACTIVE_PROVIDER_STATUSES, SettlementStatus } from '@/types/database'
import { formatNumber, formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from '@/lib/utils/formatters'
import {
  Wallet,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  RefreshCw,
  CreditCard,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Filter,
  AlertCircle,
  AlertTriangle,
  Receipt,
  ChevronRight,
  ChevronLeft,
  LayoutDashboard,
  FileText,
  History,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type TabType = 'overview' | 'settlements' | 'transactions'

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
  codCommissionOwed: number
  codOrdersCount: number
  codRevenue: number
  codPending: number
  codConfirmed: number
  onlineOrdersCount: number
  onlineRevenue: number
  onlinePending: number
  onlineConfirmed: number
}

interface Settlement {
  id: string
  period_start: string
  period_end: string
  total_orders: number
  gross_revenue: number
  platform_commission: number
  delivery_fees_collected: number
  net_amount_due: number
  net_payout?: number
  amount_paid: number
  status: SettlementStatus
  payment_date: string | null
  paid_at?: string | null
  payment_method: string | null
  payment_reference: string | null
  due_date: string
  is_overdue: boolean
  overdue_days: number
  notes: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

type DateFilter = 'today' | 'week' | 'month' | 'custom'

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function UnifiedFinancePage() {
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  // Common state
  const [providerId, setProviderId] = useState<string | null>(null)
  const [commissionRate, setCommissionRate] = useState<number>(0.07)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Finance stats
  const [stats, setStats] = useState<FinanceStats>({
    confirmedEarnings: 0,
    pendingCollection: 0,
    totalCommission: 0,
    periodEarnings: 0,
    lastPeriodEarnings: 0,
    pendingPayout: 0,
    codCommissionOwed: 0,
    codOrdersCount: 0,
    codRevenue: 0,
    codPending: 0,
    codConfirmed: 0,
    onlineOrdersCount: 0,
    onlineRevenue: 0,
    onlinePending: 0,
    onlineConfirmed: 0,
  })

  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filterType, setFilterType] = useState<'all' | 'order' | 'payout' | 'commission' | 'refund'>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Settlements
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null)
  const [settlementStats, setSettlementStats] = useState({
    totalDue: 0,
    totalPaid: 0,
    pendingCount: 0,
    overdueCount: 0,
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Date Range Helper
  // ═══════════════════════════════════════════════════════════════════════════

  const getDateRange = useCallback(() => {
    const now = new Date()
    let startDate: Date
    let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999) // End of today
    let lastPeriodStart: Date
    let lastPeriodEnd: Date

    switch (dateFilter) {
      case 'today':
        // Start of today (midnight)
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
        lastPeriodStart = new Date(startDate)
        lastPeriodStart.setDate(lastPeriodStart.getDate() - 1)
        lastPeriodEnd = new Date(startDate.getTime() - 1) // End of yesterday
        break
      case 'week':
        // Start of day 7 days ago (midnight)
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0)
        lastPeriodStart = new Date(startDate)
        lastPeriodStart.setDate(lastPeriodStart.getDate() - 7)
        lastPeriodEnd = new Date(startDate.getTime() - 1) // End of 8 days ago
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
        lastPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
        lastPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
        break
      case 'custom':
        startDate = customStartDate ? new Date(customStartDate + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
        endDate = customEndDate ? new Date(customEndDate + 'T23:59:59.999') : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        const duration = endDate.getTime() - startDate.getTime()
        lastPeriodEnd = new Date(startDate.getTime() - 1)
        lastPeriodStart = new Date(lastPeriodEnd.getTime() - duration)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
        lastPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
        lastPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    }

    return { startDate, endDate, lastPeriodStart, lastPeriodEnd }
  }, [dateFilter, customStartDate, customEndDate])

  // ═══════════════════════════════════════════════════════════════════════════
  // Load Finance Data
  // ═══════════════════════════════════════════════════════════════════════════

  const loadFinanceData = useCallback(async (provId: string, currentCommissionRate: number = commissionRate) => {
    const supabase = createClient()
    const { startDate, endDate, lastPeriodStart, lastPeriodEnd } = getDateRange()

    // Get all delivered orders with platform_commission from DB
    // IMPORTANT: platform_commission is calculated by DB trigger using (subtotal - discount) * rate
    // This EXCLUDES delivery fees (per business rule: نسبة المنصة تحسب على صافي الطلب بدون التوصيل)
    const { data: allOrders } = await supabase
      .from('orders')
      .select('id, order_number, total, subtotal, discount, delivery_fee, platform_commission, original_commission, status, payment_status, payment_method, created_at')
      .eq('provider_id', provId)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false })

    const { data: refunds } = await supabase
      .from('refunds')
      .select('id, amount, created_at, order_id, status, orders!inner(order_number)')
      .eq('provider_id', provId)
      .in('status', ['approved', 'processed'])
      .order('created_at', { ascending: false })

    const { data: settlementsData } = await supabase
      .from('settlements')
      .select('*')
      .eq('provider_id', provId)
      .order('created_at', { ascending: false })

    // Process settlements
    const settlementsTyped = (settlementsData || []) as Settlement[]
    setSettlements(settlementsTyped)

    // Calculate settlement stats
    const pending = settlementsTyped.filter(s => s.status === 'pending' || s.status === 'partially_paid')
    const overdue = settlementsTyped.filter(s => s.status === 'overdue' || s.status === 'disputed')
    const completed = settlementsTyped.filter(s => s.status === 'paid' || s.status === 'waived')

    const totalDue = [...pending, ...overdue].reduce((sum, s) => {
      const due = s.net_amount_due || s.platform_commission || 0
      const paid = s.amount_paid || 0
      return sum + Math.max(0, due - paid)
    }, 0)

    const totalPaid = completed.reduce((sum, s) => sum + (s.amount_paid || s.net_amount_due || 0), 0)

    setSettlementStats({
      totalDue,
      totalPaid,
      pendingCount: pending.length,
      overdueCount: overdue.length,
    })

    if (allOrders) {
      // Use DB-calculated commission values
      const getTheoreticalCommission = (order: typeof allOrders[0]) => {
        if (order.original_commission != null && order.original_commission > 0) {
          return order.original_commission
        }
        if (order.platform_commission != null && order.platform_commission > 0) {
          return order.platform_commission
        }
        const baseAmount = (order.subtotal || (order.total || 0) - (order.delivery_fee || 0)) - (order.discount || 0)
        return Math.max(0, baseAmount * currentCommissionRate)
      }

      const getActualCommission = (order: typeof allOrders[0]) => {
        return order.platform_commission || 0
      }

      // Filter orders by date range
      const orders = allOrders.filter(o => {
        const d = new Date(o.created_at)
        return d >= startDate && d <= endDate
      })

      const periodRefunds = (refunds || []).filter(r => {
        const d = new Date(r.created_at)
        return d >= startDate && d <= endDate
      })
      const totalRefundsAmount = periodRefunds.reduce((sum, r) => sum + (r.amount || 0), 0)

      const confirmedOrders = orders.filter(o => o.payment_status === 'completed')
      const pendingPaymentOrders = orders.filter(o => o.payment_status === 'pending')

      const confirmedRevenue = confirmedOrders.reduce((sum, o) => sum + (o.total || 0), 0)
      const confirmedActualCommission = confirmedOrders.reduce((sum, o) => sum + getActualCommission(o), 0)
      const confirmedEarnings = Math.max(0, confirmedRevenue - confirmedActualCommission - totalRefundsAmount)

      const pendingRevenue = pendingPaymentOrders.reduce((sum, o) => sum + (o.total || 0), 0)
      const pendingActualCommission = pendingPaymentOrders.reduce((sum, o) => sum + getActualCommission(o), 0)
      const pendingCollection = pendingRevenue - pendingActualCommission

      const grossCommission = orders.reduce((sum, o) => sum + getTheoreticalCommission(o), 0)
      const refundsCommission = totalRefundsAmount * currentCommissionRate
      const totalCommission = Math.max(0, grossCommission - refundsCommission)

      const periodEarnings = confirmedEarnings

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

      const periodOnlineConfirmed = confirmedOrders.filter(o => o.payment_method !== 'cash')
      const periodOnlineRevenue = periodOnlineConfirmed.reduce((sum, o) => sum + (o.total || 0), 0)
      const periodOnlineCommission = periodOnlineConfirmed.reduce((sum, o) => sum + getActualCommission(o), 0)
      const pendingPayout = periodOnlineRevenue - periodOnlineCommission

      const periodCodConfirmed = confirmedOrders.filter(o => o.payment_method === 'cash')
      const codCommissionOwed = periodCodConfirmed.reduce((sum, o) => sum + getActualCommission(o), 0)

      const codOrders = orders.filter(o => o.payment_method === 'cash')
      const onlineOrders = orders.filter(o => o.payment_method !== 'cash')

      setStats({
        confirmedEarnings,
        pendingCollection,
        totalCommission,
        periodEarnings,
        lastPeriodEarnings,
        pendingPayout,
        codCommissionOwed,
        codOrdersCount: codOrders.length,
        codRevenue: codOrders.reduce((sum, o) => sum + (o.total || 0), 0),
        codPending: codOrders.filter(o => o.payment_status === 'pending').reduce((sum, o) => sum + (o.total || 0), 0),
        codConfirmed: codOrders.filter(o => o.payment_status === 'completed').reduce((sum, o) => sum + (o.total || 0), 0),
        onlineOrdersCount: onlineOrders.length,
        onlineRevenue: onlineOrders.reduce((sum, o) => sum + (o.total || 0), 0),
        onlinePending: onlineOrders.filter(o => o.payment_status === 'pending').reduce((sum, o) => sum + (o.total || 0), 0),
        onlineConfirmed: onlineOrders.filter(o => o.payment_status === 'completed').reduce((sum, o) => sum + (o.total || 0), 0),
      })

      // Build transactions
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

      const refundTxns: Transaction[] = periodRefunds.slice(0, 20).map(refund => ({
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

      const settlementTxns: Transaction[] = (settlementsData || [])
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

      const allTxns = [...orderTxns, ...refundTxns, ...settlementTxns, ...commissionTxns]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 50)

      setTransactions(allTxns)
    }
  }, [commissionRate, getDateRange, locale])

  // ═══════════════════════════════════════════════════════════════════════════
  // Auth & Initial Load
  // ═══════════════════════════════════════════════════════════════════════════

  const checkAuthAndLoad = useCallback(async () => {
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

    const providerCommissionRate = provider.commission_rate != null
      ? provider.commission_rate / 100
      : 0.07

    setCommissionRate(providerCommissionRate)
    setProviderId(provider.id)
    await loadFinanceData(provider.id, providerCommissionRate)
    setLoading(false)
  }, [loadFinanceData, locale, router])

  useEffect(() => {
    checkAuthAndLoad()
  }, [checkAuthAndLoad])

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

  // ═══════════════════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════════════════

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

  // Get the actual commission rate as percentage for display
  const commissionRatePercent = Math.round(commissionRate * 100)

  const filteredTransactions = transactions.filter(t => {
    if (filterType === 'all') return true
    return t.type === filterType
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700'
      case 'waived': return 'bg-green-100 text-green-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'partially_paid': return 'bg-blue-100 text-blue-700'
      case 'overdue': return 'bg-red-100 text-red-700'
      case 'disputed': return 'bg-red-100 text-red-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      pending: { ar: 'معلق', en: 'Pending' },
      partially_paid: { ar: 'مدفوع جزئياً', en: 'Partially Paid' },
      paid: { ar: 'مدفوع', en: 'Paid' },
      overdue: { ar: 'متأخر', en: 'Overdue' },
      disputed: { ar: 'نزاع', en: 'Disputed' },
      waived: { ar: 'معفى', en: 'Waived' },
    }
    return labels[status]?.[locale === 'ar' ? 'ar' : 'en'] || status
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle2 className="w-4 h-4" />
      case 'waived': return <CheckCircle2 className="w-4 h-4" />
      case 'pending': return <Clock className="w-4 h-4" />
      case 'partially_paid': return <TrendingUp className="w-4 h-4" />
      case 'overdue': return <AlertTriangle className="w-4 h-4" />
      case 'disputed': return <AlertTriangle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Tab Configuration
  // ═══════════════════════════════════════════════════════════════════════════

  const tabs = [
    { key: 'overview' as TabType, label_ar: 'نظرة عامة', label_en: 'Overview', icon: LayoutDashboard },
    { key: 'settlements' as TabType, label_ar: 'التسويات', label_en: 'Settlements', icon: FileText },
    { key: 'transactions' as TabType, label_ar: 'المعاملات', label_en: 'Transactions', icon: History },
  ]

  const dateFilters = [
    { key: 'today', label_ar: 'اليوم', label_en: 'Today' },
    { key: 'week', label_ar: 'الأسبوع', label_en: 'Week' },
    { key: 'month', label_ar: 'الشهر', label_en: 'Month' },
    { key: 'custom', label_ar: 'مخصص', label_en: 'Custom' },
  ]

  const txnFilters = [
    { key: 'all', label_ar: 'الكل', label_en: 'All' },
    { key: 'order', label_ar: 'الطلبات', label_en: 'Orders' },
    { key: 'payout', label_ar: 'التحويلات', label_en: 'Payouts' },
    { key: 'commission', label_ar: 'العمولات', label_en: 'Commissions' },
    { key: 'refund', label_ar: 'المرتجعات', label_en: 'Refunds' },
  ]

  // ═══════════════════════════════════════════════════════════════════════════
  // Loading State
  // ═══════════════════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <ProviderLayout
      pageTitle={{ ar: 'المالية والتسويات', en: 'Finance & Settlements' }}
      pageSubtitle={{ ar: 'إدارة الأرباح والمدفوعات والتسويات', en: 'Manage earnings, payments and settlements' }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Tab Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {locale === 'ar' ? tab.label_ar : tab.label_en}
                  </span>
                </button>
              )
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-slate-600"
          >
            <RefreshCw className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'} ${refreshing ? 'animate-spin' : ''}`} />
            {locale === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* TAB: Overview */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <>
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
              <Card className="bg-[hsl(var(--deal)/0.1)] border-[hsl(var(--deal)/0.3)]">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle2 className="w-8 h-8 text-deal" />
                  </div>
                  <p className="text-2xl font-bold text-deal">{formatCurrency(stats.confirmedEarnings)}</p>
                  <p className="text-xs text-slate-500">{locale === 'ar' ? 'أرباح مؤكدة' : 'Confirmed Earnings'}</p>
                </CardContent>
              </Card>

              <Card className="bg-[hsl(var(--premium)/0.15)] border-[hsl(var(--premium)/0.3)]">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <AlertCircle className="w-8 h-8 text-premium" />
                  </div>
                  <p className="text-2xl font-bold text-premium">{formatCurrency(stats.pendingCollection)}</p>
                  <p className="text-xs text-slate-500">{locale === 'ar' ? 'في انتظار التحصيل' : 'Pending Collection'}</p>
                </CardContent>
              </Card>

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

              <Card className="bg-[hsl(var(--info)/0.1)] border-[hsl(var(--info)/0.3)]">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <Banknote className="w-8 h-8 text-info" />
                  </div>
                  <p className="text-2xl font-bold text-info">{formatCurrency(stats.totalCommission)}</p>
                  <p className="text-xs text-slate-500">{locale === 'ar' ? `العمولات (${commissionRatePercent}%)` : `Commission (${commissionRatePercent}%)`}</p>
                </CardContent>
              </Card>
            </div>

            {/* COD vs Online Breakdown */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  {locale === 'ar' ? 'تفصيل طرق الدفع' : 'Payment Methods Breakdown'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* COD */}
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
                  </div>

                  {/* Online */}
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
                  </div>
                </div>
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
                        ? `عمولة المنصة ${commissionRatePercent}% من صافي قيمة الطلب (بدون رسوم التوصيل). يتم إنشاء تسوية أسبوعية لمستحقات المنصة.`
                        : `Platform commission is ${commissionRatePercent}% of net order value (excluding delivery fees). Weekly settlements are generated for platform dues.`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                    <p className="text-lg font-bold text-slate-900">{locale === 'ar' ? 'الأحد' : 'Sunday'}</p>
                    <p className="text-xs text-slate-500">{locale === 'ar' ? 'يوم التحويل' : 'Payout Day'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg text-center">
                    <p className="text-lg font-bold text-slate-900">{locale === 'ar' ? '1-3 أيام' : '1-3 Days'}</p>
                    <p className="text-xs text-slate-500">{locale === 'ar' ? 'وقت الوصول' : 'Processing Time'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg text-center">
                    <p className="text-lg font-bold text-slate-900">{locale === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</p>
                    <p className="text-xs text-slate-500">{locale === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</p>
                  </div>
                </div>

                {stats.pendingPayout > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-slate-700">
                      <span className="font-medium text-green-700">
                        {locale === 'ar' ? 'مستحق لك من المدفوعات الإلكترونية:' : 'Due to you (Online Payments):'}
                      </span>{' '}
                      <span className="text-green-600 font-bold">{formatCurrency(stats.pendingPayout)}</span>
                    </p>
                  </div>
                )}

                {stats.codCommissionOwed > 0 && (
                  <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-slate-700">
                      <span className="font-medium text-amber-700">
                        {locale === 'ar' ? 'عمولة مستحقة للمنصة (الدفع عند الاستلام):' : 'Commission due to platform (COD):'}
                      </span>{' '}
                      <span className="text-amber-600 font-bold">{formatCurrency(stats.codCommissionOwed)}</span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* TAB: Settlements */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'settlements' && (
          <>
            {/* Settlement Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className={`${settlementStats.totalDue > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <CardContent className="pt-6">
                  <Receipt className={`w-8 h-8 mb-2 ${settlementStats.totalDue > 0 ? 'text-red-500' : 'text-green-500'}`} />
                  <p className={`text-2xl font-bold ${settlementStats.totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(settlementStats.totalDue)}
                  </p>
                  <p className="text-xs text-slate-500">{locale === 'ar' ? 'إجمالي المستحق' : 'Total Due'}</p>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-6">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mb-2" />
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(settlementStats.totalPaid)}</p>
                  <p className="text-xs text-slate-500">{locale === 'ar' ? 'إجمالي المدفوع' : 'Total Paid'}</p>
                </CardContent>
              </Card>

              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="pt-6">
                  <Clock className="w-8 h-8 text-yellow-500 mb-2" />
                  <p className="text-2xl font-bold text-yellow-600">{settlementStats.pendingCount}</p>
                  <p className="text-xs text-slate-500">{locale === 'ar' ? 'تسويات معلقة' : 'Pending'}</p>
                </CardContent>
              </Card>

              <Card className={`${settlementStats.overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                <CardContent className="pt-6">
                  <AlertTriangle className={`w-8 h-8 mb-2 ${settlementStats.overdueCount > 0 ? 'text-red-500' : 'text-slate-400'}`} />
                  <p className={`text-2xl font-bold ${settlementStats.overdueCount > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                    {settlementStats.overdueCount}
                  </p>
                  <p className="text-xs text-slate-500">{locale === 'ar' ? 'متأخرات' : 'Overdue'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900 mb-1">
                      {locale === 'ar' ? 'كيف تعمل التسويات؟' : 'How do settlements work?'}
                    </p>
                    <p className="text-sm text-slate-600">
                      {locale === 'ar'
                        ? `يتم إنشاء تسوية أسبوعية تحتوي على عمولة المنصة (${commissionRatePercent}%) من صافي طلباتك المكتملة (بدون رسوم التوصيل). يجب دفع المبلغ المستحق خلال 7 أيام.`
                        : `A weekly settlement is generated containing the platform commission (${commissionRatePercent}%) from your net completed orders (excluding delivery fees). Payment is due within 7 days.`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Overdue Alert */}
            {settlementStats.overdueCount > 0 && (
              <Card className="bg-red-50 border-red-300">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800 mb-1">
                        {locale === 'ar' ? 'لديك تسويات متأخرة!' : 'You have overdue settlements!'}
                      </p>
                      <p className="text-sm text-red-600">
                        {locale === 'ar'
                          ? 'يرجى تسوية المبالغ المتأخرة في أقرب وقت ممكن لتجنب تعليق حسابك.'
                          : 'Please settle overdue amounts as soon as possible to avoid account suspension.'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Settlements List */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  {locale === 'ar' ? 'سجل التسويات' : 'Settlement History'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {settlements.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Receipt className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="font-medium">{locale === 'ar' ? 'لا توجد تسويات بعد' : 'No settlements yet'}</p>
                    <p className="text-sm mt-1">
                      {locale === 'ar'
                        ? 'ستظهر التسويات هنا بعد إتمام طلباتك الأولى'
                        : 'Settlements will appear here after your first completed orders'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {settlements.map((settlement) => (
                      <button
                        key={settlement.id}
                        onClick={() => setSelectedSettlement(selectedSettlement?.id === settlement.id ? null : settlement)}
                        className="w-full text-start"
                      >
                        <div className={`p-4 rounded-xl border transition-all ${
                          selectedSettlement?.id === settlement.id
                            ? 'bg-primary/5 border-primary/30'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusColor(settlement.status)}`}>
                                {getStatusIcon(settlement.status)}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">
                                  {formatDateUtil(settlement.period_start, locale)} - {formatDateUtil(settlement.period_end, locale)}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {formatNumber(settlement.total_orders, locale)} {locale === 'ar' ? 'طلب' : 'orders'} |
                                  {' '}{locale === 'ar' ? 'إجمالي' : 'Total'}: {formatCurrencyUtil(settlement.gross_revenue, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-end">
                                <p className={`font-bold ${
                                  settlement.status === 'paid' || settlement.status === 'waived' ? 'text-green-600' :
                                  settlement.status === 'disputed' || settlement.status === 'overdue' ? 'text-red-600' :
                                  'text-amber-600'
                                }`}>
                                  {formatCurrencyUtil(settlement.net_payout || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                                </p>
                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${getStatusColor(settlement.status)}`}>
                                  {getStatusLabel(settlement.status)}
                                </span>
                              </div>
                              {isRTL ? (
                                <ChevronLeft className={`w-5 h-5 text-slate-400 transition-transform ${selectedSettlement?.id === settlement.id ? '-rotate-90' : ''}`} />
                              ) : (
                                <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${selectedSettlement?.id === settlement.id ? 'rotate-90' : ''}`} />
                              )}
                            </div>
                          </div>

                          {selectedSettlement?.id === settlement.id && (
                            <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-slate-500">{locale === 'ar' ? 'إجمالي الإيرادات' : 'Gross Revenue'}</p>
                                  <p className="font-medium text-slate-900">{formatCurrencyUtil(settlement.gross_revenue || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500">{locale === 'ar' ? `عمولة المنصة (${commissionRatePercent}%)` : `Platform Commission (${commissionRatePercent}%)`}</p>
                                  <p className="font-medium text-red-600">-{formatCurrencyUtil(settlement.platform_commission || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500">{locale === 'ar' ? 'صافي المزود' : 'Net Payout'}</p>
                                  <p className="font-bold text-green-600">{formatCurrencyUtil(settlement.net_payout || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500">{locale === 'ar' ? 'تاريخ الإنشاء' : 'Created At'}</p>
                                  <p className="font-medium text-slate-900">{formatDateUtil(settlement.created_at, locale)}</p>
                                </div>
                              </div>

                              {settlement.paid_at && (
                                <div className="bg-green-50 p-3 rounded-lg">
                                  <p className="text-sm text-green-700">
                                    <CheckCircle2 className="w-4 h-4 inline mr-1" />
                                    {locale === 'ar' ? 'تم الدفع بتاريخ' : 'Paid on'} {formatDateUtil(settlement.paid_at, locale)}
                                    {settlement.payment_method && ` (${settlement.payment_method})`}
                                  </p>
                                </div>
                              )}

                              {settlement.notes && (
                                <div className="bg-slate-100 p-3 rounded-lg">
                                  <p className="text-sm text-slate-600">
                                    <Info className="w-4 h-4 inline mr-1" />
                                    {settlement.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* TAB: Transactions */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'transactions' && (
          <>
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
              </CardContent>
            </Card>

            {/* Transaction History */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  {locale === 'ar' ? 'سجل المعاملات' : 'Transaction History'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Type Filters */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  {txnFilters.map((filter) => (
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
                      const isDeduction = txn.type === 'commission' || txn.type === 'refund'

                      const getIconAndColor = () => {
                        if (txn.type === 'refund') {
                          return { bg: 'bg-red-100', icon: <ArrowDownRight className="w-5 h-5 text-red-600" />, amountColor: 'text-red-600' }
                        }
                        if (txn.type === 'commission') {
                          return { bg: 'bg-blue-100', icon: <Banknote className="w-5 h-5 text-blue-600" />, amountColor: 'text-blue-600' }
                        }
                        if (txn.type === 'payout') {
                          return {
                            bg: txn.status === 'completed' ? 'bg-[hsl(var(--deal)/0.15)]' : 'bg-[hsl(var(--premium)/0.2)]',
                            icon: txn.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-deal" /> : <Clock className="w-5 h-5 text-premium" />,
                            amountColor: txn.status === 'completed' ? 'text-deal' : 'text-amber-600'
                          }
                        }
                        return {
                          bg: txn.status === 'completed' ? 'bg-[hsl(var(--deal)/0.15)]' : txn.status === 'pending' ? 'bg-[hsl(var(--premium)/0.2)]' : 'bg-[hsl(var(--error)/0.15)]',
                          icon: txn.status === 'completed' ? <ArrowUpRight className="w-5 h-5 text-deal" /> : txn.status === 'pending' ? <Clock className="w-5 h-5 text-premium" /> : <XCircle className="w-5 h-5 text-error" />,
                          amountColor: txn.status === 'completed' ? 'text-deal' : txn.status === 'pending' ? 'text-amber-600' : 'text-error'
                        }
                      }

                      const { bg, icon, amountColor } = getIconAndColor()

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
                              <p className="font-medium text-slate-900">{txn.description}</p>
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
                              {txn.type === 'refund' ? (locale === 'ar' ? 'مسترد' : 'Refunded') :
                               txn.type === 'commission' ? (locale === 'ar' ? 'عمولة' : 'Commission') :
                               txn.status === 'completed' ? (locale === 'ar' ? 'مؤكد' : 'Confirmed') :
                               txn.status === 'pending' ? (locale === 'ar' ? 'معلق' : 'Pending') :
                               (locale === 'ar' ? 'فشل' : 'Failed')}
                            </p>
                          </div>
                        </div>
                      )

                      if (txn.order_id) {
                        return (
                          <Link key={txn.id} href={`/${locale}/provider/orders/${txn.order_id}`}>
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
          </>
        )}

        {/* Contact Support */}
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-3">
                {locale === 'ar'
                  ? 'لديك استفسار حول المالية أو التسويات؟ تواصل مع فريق الدعم'
                  : 'Have questions about finance or settlements? Contact our support team'}
              </p>
              <Link href={`/${locale}/provider/support`}>
                <Button variant="outline" size="sm">
                  {locale === 'ar' ? 'تواصل مع الدعم' : 'Contact Support'}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProviderLayout>
  )
}

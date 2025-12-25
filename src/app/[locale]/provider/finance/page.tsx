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
import { formatNumber, formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from '@/lib/utils/formatters'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  Calendar,
  RefreshCw,
  CreditCard,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Info,
  AlertCircle,
  AlertTriangle,
  Receipt,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  LayoutDashboard,
  FileText,
  History,
  Truck,
  Sparkles,
  PauseCircle,
  Gift,
  Scale,
  ShoppingBag,
  Filter,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

// ═══════════════════════════════════════════════════════════════════════════
// Types - Based on financial_settlement_engine SQL View
// ═══════════════════════════════════════════════════════════════════════════

interface FinancialEngineData {
  provider_id: string
  provider_name_ar: string
  provider_name_en: string
  governorate_id: string
  city_id: string

  // Commission info - IMPORTANT: commission_rate is stored as 7.00 not 0.07
  commission_rate: number // e.g., 7.00 means 7%
  commission_status: string
  grace_period_end: string | null
  delivery_responsibility: string

  // Order counts
  total_orders: number
  cod_orders_count: number
  online_orders_count: number
  eligible_orders_count: number
  held_orders_count: number
  settled_orders_count: number

  // Gross Revenue
  gross_revenue: number
  cod_gross_revenue: number
  online_gross_revenue: number

  // Subtotals (Without Delivery)
  total_subtotal: number
  cod_subtotal: number
  online_subtotal: number

  // Delivery Fees (Provider's right - NEVER touched by commission)
  total_delivery_fees: number
  cod_delivery_fees: number
  online_delivery_fees: number

  // Discounts
  total_discounts: number

  // Commission (Theoretical - what would be without grace period)
  theoretical_commission: number
  cod_theoretical_commission: number
  online_theoretical_commission: number

  // Commission (Actual - respects grace period)
  actual_commission: number
  cod_actual_commission: number
  online_actual_commission: number

  // Grace Period Discount
  total_grace_period_discount: number

  // Refunds
  total_refunds: number
  total_refund_commission_reduction: number
  refund_percentage: number

  // Net Commission (after refund adjustments)
  net_commission: number

  // COD: Commission owed to platform
  cod_commission_owed: number

  // Online: Payout owed to provider
  online_payout_owed: number

  // Net Balance (THE MAGIC NUMBER)
  net_balance: number
  settlement_direction: 'platform_pays_provider' | 'provider_pays_platform' | 'balanced'

  // Grace Period Status
  is_in_grace_period: boolean
  grace_period_days_remaining: number
}

// Period filter type
type PeriodFilter = 'today' | 'week' | 'month' | 'year' | 'all'

interface SettlementOrder {
  id: string
  order_number: string
  total: number
  payment_method: string
  platform_commission: number
  delivery_fee: number
  created_at: string
  status: string
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
  net_payout: number
  amount_paid: number
  status: string
  payment_date: string | null
  paid_at: string | null
  payment_method: string | null
  payment_reference: string | null
  due_date: string
  is_overdue: boolean
  overdue_days: number
  notes: string | null
  created_at: string
  // Extended fields from view
  cod_orders_count: number
  cod_gross_revenue: number
  cod_commission_owed: number
  online_orders_count: number
  online_gross_revenue: number
  online_platform_commission: number
  online_payout_owed: number
  net_balance: number
  settlement_direction: 'platform_pays_provider' | 'provider_pays_platform' | 'balanced' | null
  total_delivery_fees: number
  // Order IDs included in this settlement
  orders_included: string[] | null
}

type TabType = 'overview' | 'settlements'

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function ProviderFinanceDashboard() {
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'

  // State
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [providerId, setProviderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'cod' | 'online'>('all')

  // Financial Engine Data (Single Source of Truth)
  const [financeData, setFinanceData] = useState<FinancialEngineData | null>(null)
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null)
  const [settlementOrders, setSettlementOrders] = useState<SettlementOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  // ═══════════════════════════════════════════════════════════════════════════
  // Load Financial Data from SQL View
  // ═══════════════════════════════════════════════════════════════════════════

  const loadFinanceData = useCallback(async (provId: string) => {
    const supabase = createClient()

    // Fetch from financial_settlement_engine view (Single Source of Truth)
    const { data: engineData, error: engineError } = await supabase
      .from('financial_settlement_engine')
      .select('*')
      .eq('provider_id', provId)
      .single()

    if (engineError) {
      console.error('Error loading financial engine data:', engineError)
      // Fallback: create empty data structure
      setFinanceData(null)
    } else {
      setFinanceData(engineData as FinancialEngineData)
    }

    // Fetch settlements history
    const { data: settlementsData } = await supabase
      .from('settlements')
      .select('*')
      .eq('provider_id', provId)
      .order('created_at', { ascending: false })
      .limit(20)

    setSettlements((settlementsData || []) as Settlement[])
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // Load Settlement Orders (Drill-down)
  // ═══════════════════════════════════════════════════════════════════════════

  const loadSettlementOrders = useCallback(async (settlement: Settlement) => {
    setLoadingOrders(true)
    const supabase = createClient()

    // Use orders_included array to fetch orders (correct approach)
    if (!settlement.orders_included || settlement.orders_included.length === 0) {
      setSettlementOrders([])
      setLoadingOrders(false)
      return
    }

    const { data: ordersData, error } = await supabase
      .from('orders')
      .select('id, order_number, total, payment_method, platform_commission, delivery_fee, created_at, status')
      .in('id', settlement.orders_included)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error loading settlement orders:', error)
      setSettlementOrders([])
    } else {
      setSettlementOrders((ordersData || []) as SettlementOrder[])
    }

    setLoadingOrders(false)
  }, [])

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

    setProviderId(provider.id)
    await loadFinanceData(provider.id)
    setLoading(false)
  }, [loadFinanceData, locale, router])

  useEffect(() => {
    checkAuthAndLoad()
  }, [checkAuthAndLoad])

  // ═══════════════════════════════════════════════════════════════════════════
  // Realtime Subscription
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!providerId) return

    const supabase = createClient()

    const subscription = supabase
      .channel(`provider-finance-${providerId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `provider_id=eq.${providerId}`
      }, () => {
        loadFinanceData(providerId)
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'settlements',
        filter: `provider_id=eq.${providerId}`
      }, () => {
        loadFinanceData(providerId)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [providerId, loadFinanceData])

  const handleRefresh = async () => {
    if (!providerId) return
    setRefreshing(true)
    await loadFinanceData(providerId)
    setRefreshing(false)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  const formatCurrency = (amount: number) => {
    return `${Math.abs(amount).toFixed(2)} ${locale === 'ar' ? 'ج.م' : 'EGP'}`
  }

  const getSettlementDirectionIcon = (direction: string | null) => {
    switch (direction) {
      case 'platform_pays_provider':
        return <ArrowDownRight className="w-5 h-5 text-green-600" />
      case 'provider_pays_platform':
        return <ArrowUpRight className="w-5 h-5 text-amber-600" />
      case 'balanced':
        return <ArrowRightLeft className="w-5 h-5 text-slate-500" />
      default:
        return <Scale className="w-5 h-5 text-slate-400" />
    }
  }

  const getSettlementDirectionLabel = (direction: string | null) => {
    switch (direction) {
      case 'platform_pays_provider':
        return locale === 'ar' ? 'المنصة تدفع لك' : 'Platform pays you'
      case 'provider_pays_platform':
        return locale === 'ar' ? 'تدفع للمنصة' : 'You pay platform'
      case 'balanced':
        return locale === 'ar' ? 'متوازن' : 'Balanced'
      default:
        return locale === 'ar' ? 'غير محدد' : 'Unknown'
    }
  }

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

  const tabs = [
    { key: 'overview' as TabType, label_ar: 'نظرة عامة', label_en: 'Overview', icon: LayoutDashboard },
    { key: 'settlements' as TabType, label_ar: 'التسويات', label_en: 'Settlements', icon: FileText },
  ]

  // Commission rate as percentage
  // IMPORTANT: commission_rate is stored as 7.00 (not 0.07), so NO multiplication needed
  const commissionRatePercent = financeData ? Math.round(financeData.commission_rate || 7) : 7

  // Helper function for safe number display (prevents NaN)
  const safeNumber = (value: number | undefined | null): number => {
    if (value === undefined || value === null || isNaN(value)) return 0
    return value
  }

  // Calculate net sales from available fields
  const totalNetSales = financeData
    ? safeNumber(financeData.gross_revenue) - safeNumber(financeData.total_refunds)
    : 0

  // Period filter options
  const periodOptions: { key: PeriodFilter; label_ar: string; label_en: string }[] = [
    { key: 'today', label_ar: 'اليوم', label_en: 'Today' },
    { key: 'week', label_ar: 'هذا الأسبوع', label_en: 'This Week' },
    { key: 'month', label_ar: 'هذا الشهر', label_en: 'This Month' },
    { key: 'year', label_ar: 'هذه السنة', label_en: 'This Year' },
    { key: 'all', label_ar: 'الكل', label_en: 'All Time' },
  ]

  // Payment method filter options
  const paymentMethodOptions: { key: 'all' | 'cod' | 'online'; label_ar: string; label_en: string }[] = [
    { key: 'all', label_ar: 'الكل', label_en: 'All' },
    { key: 'cod', label_ar: 'نقدي', label_en: 'COD' },
    { key: 'online', label_ar: 'إلكتروني', label_en: 'Online' },
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
      pageSubtitle={{ ar: 'لوحة التحكم المالية الشاملة', en: 'Comprehensive financial dashboard' }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Tab Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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

          <div className="flex items-center gap-2 flex-wrap">
            {/* Period Filter */}
            <div className="relative">
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
                className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
              >
                {periodOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {locale === 'ar' ? option.label_ar : option.label_en}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Payment Method Filter */}
            <div className="relative">
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value as 'all' | 'cod' | 'online')}
                className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
              >
                {paymentMethodOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {locale === 'ar' ? option.label_ar : option.label_en}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
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
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* TAB: Overview */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && financeData && (
          <>
            {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
            {/* ║ GRACE PERIOD ALERT - Clear Green Card                             ║ */}
            {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
            {financeData.is_in_grace_period && (
              <Card className="bg-green-50 border-green-200 border-2">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center shrink-0">
                      <Gift className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-5 h-5 text-green-600" />
                        <h3 className="font-bold text-lg text-green-800">
                          {locale === 'ar' ? 'فترة الدعم المجانية' : 'Free Support Period'}
                        </h3>
                      </div>
                      <p className="text-green-700 text-sm mb-3">
                        {locale === 'ar'
                          ? 'أنت في فترة الدعم المجانية! لا يتم احتساب عمولة خلال هذه الفترة.'
                          : 'You are in the free support period! No commission is charged during this time.'}
                      </p>
                      <div className="flex flex-wrap gap-4">
                        <div className="bg-green-100 rounded-xl px-4 py-2 border border-green-200">
                          <p className="text-green-600 text-xs">{locale === 'ar' ? 'الأيام المتبقية' : 'Days Remaining'}</p>
                          <p className="text-2xl font-bold text-green-800">{financeData.grace_period_days_remaining}</p>
                        </div>
                        <div className="bg-green-100 rounded-xl px-4 py-2 border border-green-200">
                          <p className="text-green-600 text-xs">{locale === 'ar' ? 'وفرت حتى الآن' : 'Saved So Far'}</p>
                          <p className="text-2xl font-bold text-green-800">{formatCurrency(safeNumber(financeData.theoretical_commission))}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
            {/* ║ FINANCIAL SUMMARY - ملخص مبيعاتك                                  ║ */}
            {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
            <Card className="bg-white border-slate-200 overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-slate-900 flex items-center gap-2 text-lg">
                  <Receipt className="w-5 h-5 text-primary" />
                  {locale === 'ar' ? 'ملخص مبيعاتك' : 'Your Sales Summary'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {/* Row 1: Total Sales (including delivery) */}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-600">
                      {locale === 'ar' ? 'إجمالي المبيعات (شامل التوصيل)' : 'Total Sales (incl. delivery)'}
                    </span>
                    <span className="font-semibold text-slate-900">{formatCurrency(safeNumber(financeData.gross_revenue))}</span>
                  </div>

                  {/* COD/Online Breakdown */}
                  {(safeNumber(financeData.cod_orders_count) > 0 || safeNumber(financeData.online_orders_count) > 0) && (
                    <div className="ml-4 space-y-1 text-sm border-l-2 border-slate-200 pl-3">
                      {safeNumber(financeData.cod_orders_count) > 0 && (
                        <div className="flex items-center justify-between py-1">
                          <span className="flex items-center gap-2 text-amber-700">
                            <Banknote className="w-3.5 h-3.5" />
                            {locale === 'ar'
                              ? `دفع عند الاستلام (${safeNumber(financeData.cod_orders_count)} طلب)`
                              : `Cash on Delivery (${safeNumber(financeData.cod_orders_count)} orders)`}
                          </span>
                          <span className="font-medium text-amber-800">{formatCurrency(safeNumber(financeData.cod_gross_revenue))}</span>
                        </div>
                      )}
                      {safeNumber(financeData.online_orders_count) > 0 && (
                        <div className="flex items-center justify-between py-1">
                          <span className="flex items-center gap-2 text-blue-700">
                            <CreditCard className="w-3.5 h-3.5" />
                            {locale === 'ar'
                              ? `دفع إلكتروني (${safeNumber(financeData.online_orders_count)} طلب)`
                              : `Online Payment (${safeNumber(financeData.online_orders_count)} orders)`}
                          </span>
                          <span className="font-medium text-blue-800">{formatCurrency(safeNumber(financeData.online_gross_revenue))}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Row 2: Refunds (red) */}
                  {safeNumber(financeData.total_refunds) > 0 && (
                    <div className="flex items-center justify-between py-2 text-red-600">
                      <span className="flex items-center gap-1">
                        <span>(−)</span>
                        {locale === 'ar' ? 'المرتجعات' : 'Refunds'}
                      </span>
                      <span className="font-semibold">{formatCurrency(safeNumber(financeData.total_refunds))}</span>
                    </div>
                  )}

                  {/* Row 3: Delivery Fees (red - excluded from commission) */}
                  <div className="flex items-center justify-between py-2 text-red-600">
                    <span className="flex items-center gap-2">
                      <span>(−)</span>
                      {locale === 'ar' ? 'رسوم التوصيل' : 'Delivery Fees'}
                      <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                        {locale === 'ar' ? 'لا تخضع للعمولة' : 'not subject to commission'}
                      </span>
                    </span>
                    <span className="font-semibold">{formatCurrency(safeNumber(financeData.total_delivery_fees))}</span>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-dashed border-slate-300 my-2" />

                  {/* Row 4: Net Revenue (Commission Base) */}
                  <div className="flex items-center justify-between py-2 bg-slate-50 -mx-4 px-4 rounded">
                    <span className="font-medium text-slate-700">
                      {locale === 'ar' ? '= صافي الإيرادات الخاضعة للعمولة' : '= Net Revenue (Commission Base)'}
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(
                        safeNumber(financeData.gross_revenue) -
                        safeNumber(financeData.total_refunds) -
                        safeNumber(financeData.total_delivery_fees)
                      )}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-200 my-2" />

                  {/* Row 5: Platform Commission */}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-600">
                      {locale === 'ar' ? `عمولة المنصة (${commissionRatePercent}%)` : `Platform Commission (${commissionRatePercent}%)`}
                    </span>
                    <span className="font-semibold text-slate-500 line-through">
                      {formatCurrency(safeNumber(financeData.theoretical_commission))}
                    </span>
                  </div>

                  {/* Row 6: Grace Period Exemption */}
                  {financeData.is_in_grace_period && (
                    <div className="flex items-center justify-between py-2 text-green-600">
                      <span className="flex items-center gap-2">
                        <Gift className="w-4 h-4" />
                        {locale === 'ar' ? 'معفى (فترة الدعم المجانية)' : 'Waived (Free Support Period)'}
                      </span>
                      <span className="font-semibold">+{formatCurrency(safeNumber(financeData.theoretical_commission))}</span>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="border-t-2 border-slate-300 my-2" />

                  {/* Row 7: Final - You Pay to Platform */}
                  <div className={`flex items-center justify-between py-3 px-4 -mx-4 rounded-xl ${
                    safeNumber(financeData.actual_commission) === 0
                      ? 'bg-green-100'
                      : 'bg-amber-100'
                  }`}>
                    <span className="font-bold text-slate-800">
                      {locale === 'ar' ? '💳 تدفع للمنصة' : '💳 You Pay to Platform'}
                    </span>
                    <span className={`text-2xl font-bold ${
                      safeNumber(financeData.actual_commission) === 0
                        ? 'text-green-700'
                        : 'text-amber-700'
                    }`}>
                      {formatCurrency(safeNumber(financeData.actual_commission))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
            {/* ║ NET BALANCE - THE MAGIC NUMBER (Most Prominent)                   ║ */}
            {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
            <Card className={`border-2 overflow-hidden relative ${
              financeData.settlement_direction === 'platform_pays_provider'
                ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-300'
                : financeData.settlement_direction === 'provider_pays_platform'
                  ? 'bg-gradient-to-br from-amber-50 to-orange-100 border-amber-300'
                  : 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300'
            }`}>
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/30 rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardContent className="pt-8 pb-8 relative">
                <div className="text-center">
                  <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                    financeData.settlement_direction === 'platform_pays_provider'
                      ? 'bg-green-500'
                      : financeData.settlement_direction === 'provider_pays_platform'
                        ? 'bg-amber-500'
                        : 'bg-slate-400'
                  }`}>
                    {financeData.settlement_direction === 'platform_pays_provider' ? (
                      <TrendingUp className="w-10 h-10 text-white" />
                    ) : financeData.settlement_direction === 'provider_pays_platform' ? (
                      <TrendingDown className="w-10 h-10 text-white" />
                    ) : (
                      <Scale className="w-10 h-10 text-white" />
                    )}
                  </div>

                  <p className="text-slate-600 text-sm mb-2 font-medium">
                    {locale === 'ar' ? 'الرصيد الصافي' : 'Net Balance'}
                  </p>

                  <p className={`text-5xl font-bold mb-2 ${
                    financeData.settlement_direction === 'platform_pays_provider'
                      ? 'text-green-700'
                      : financeData.settlement_direction === 'provider_pays_platform'
                        ? 'text-amber-700'
                        : 'text-slate-700'
                  }`}>
                    {formatCurrency(safeNumber(financeData.net_balance))}
                  </p>

                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                    financeData.settlement_direction === 'platform_pays_provider'
                      ? 'bg-green-200 text-green-800'
                      : financeData.settlement_direction === 'provider_pays_platform'
                        ? 'bg-amber-200 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                  }`}>
                    {getSettlementDirectionIcon(financeData.settlement_direction)}
                    <span className="font-medium">
                      {financeData.settlement_direction === 'platform_pays_provider'
                        ? (locale === 'ar' ? 'مستحقاتك لدى المنصة' : 'Platform owes you')
                        : financeData.settlement_direction === 'provider_pays_platform'
                          ? (locale === 'ar' ? 'مستحقات المنصة لديك' : 'You owe platform')
                          : (locale === 'ar' ? 'الحساب متوازن' : 'Account balanced')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
            {/* ║ DELIVERY FEES - Simple Info Card                                  ║ */}
            {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-slate-500" />
                    <span className="text-slate-700">
                      {locale === 'ar' ? 'رسوم التوصيل' : 'Delivery Fees'}
                    </span>
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                      {locale === 'ar' ? 'غير مشمولة في العمولة' : 'excluded from commission'}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900">{formatCurrency(safeNumber(financeData.total_delivery_fees))}</span>
                </div>
              </CardContent>
            </Card>

            {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
            {/* ║ HELD ORDERS ALERT (If Any)                                        ║ */}
            {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
            {safeNumber(financeData.held_orders_count) > 0 && (
              <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                      <PauseCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-red-800 mb-1">
                        {locale === 'ar' ? 'طلبات معلقة' : 'Held Orders'}
                      </h3>
                      <p className="text-red-600 text-sm mb-3">
                        {locale === 'ar'
                          ? 'هذه الطلبات قيد المراجعة أو متنازع عليها ولن تظهر في التسوية الحالية.'
                          : 'These orders are under review or disputed and won\'t appear in the current settlement.'}
                      </p>
                      <div className="flex gap-4">
                        <div className="bg-white rounded-lg px-4 py-2 border border-red-200">
                          <p className="text-red-500 text-xs">{locale === 'ar' ? 'عدد الطلبات' : 'Orders Count'}</p>
                          <p className="text-xl font-bold text-red-700">{safeNumber(financeData.held_orders_count)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
            {/* ║ COD vs ONLINE COMPARISON - Same Format as Sales Summary           ║ */}
            {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
            <div className={`grid gap-4 ${
              paymentMethodFilter === 'all' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
            }`}>
              {/* COD Card */}
              {(paymentMethodFilter === 'all' || paymentMethodFilter === 'cod') && (
              <Card className="bg-white border-amber-200 border-2">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-amber-100">
                    <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                      <Banknote className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-amber-900">
                        {locale === 'ar' ? 'الدفع عند الاستلام' : 'Cash on Delivery'}
                      </p>
                      <p className="text-amber-600 text-xs">
                        {safeNumber(financeData.cod_orders_count)} {locale === 'ar' ? 'طلب' : 'orders'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {/* Total Sales */}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">{locale === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(safeNumber(financeData.cod_gross_revenue))}</span>
                    </div>
                    {/* Delivery Fees */}
                    <div className="flex justify-between items-center text-red-600">
                      <span>(−) {locale === 'ar' ? 'رسوم التوصيل' : 'Delivery Fees'}</span>
                      <span className="font-semibold">{formatCurrency(safeNumber(financeData.cod_delivery_fees))}</span>
                    </div>
                    {/* Divider */}
                    <div className="border-t border-dashed border-slate-200 my-1" />
                    {/* Net Revenue */}
                    <div className="flex justify-between items-center bg-slate-50 -mx-2 px-2 py-1.5 rounded">
                      <span className="font-medium text-slate-700">= {locale === 'ar' ? 'صافي الإيرادات' : 'Net Revenue'}</span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(safeNumber(financeData.cod_gross_revenue) - safeNumber(financeData.cod_delivery_fees))}
                      </span>
                    </div>
                    {/* Commission */}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">{locale === 'ar' ? `عمولة المنصة (${commissionRatePercent}%)` : `Commission (${commissionRatePercent}%)`}</span>
                      <span className="font-semibold text-slate-500 line-through">{formatCurrency(safeNumber(financeData.cod_theoretical_commission))}</span>
                    </div>
                    {/* Grace Period Waiver */}
                    {financeData.is_in_grace_period && (
                      <div className="flex justify-between items-center text-green-600">
                        <span className="flex items-center gap-1">
                          <Gift className="w-3 h-3" />
                          {locale === 'ar' ? 'معفى' : 'Waived'}
                        </span>
                        <span className="font-semibold">+{formatCurrency(safeNumber(financeData.cod_theoretical_commission))}</span>
                      </div>
                    )}
                    {/* Final Result */}
                    <div className="border-t-2 border-amber-200 pt-2 mt-2">
                      <div className={`flex justify-between items-center py-2 px-2 -mx-2 rounded-lg ${
                        safeNumber(financeData.cod_commission_owed) === 0 ? 'bg-green-100' : 'bg-amber-100'
                      }`}>
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <ArrowUpRight className="w-4 h-4" />
                          {locale === 'ar' ? 'تدفع للمنصة' : 'You Pay'}
                        </span>
                        <span className={`text-lg font-bold ${
                          safeNumber(financeData.cod_commission_owed) === 0 ? 'text-green-700' : 'text-amber-700'
                        }`}>
                          {formatCurrency(safeNumber(financeData.cod_commission_owed))}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              )}

              {/* Online Card */}
              {(paymentMethodFilter === 'all' || paymentMethodFilter === 'online') && (
              <Card className="bg-white border-blue-200 border-2">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-blue-100">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-blue-900">
                        {locale === 'ar' ? 'الدفع الإلكتروني' : 'Online Payment'}
                      </p>
                      <p className="text-blue-600 text-xs">
                        {safeNumber(financeData.online_orders_count)} {locale === 'ar' ? 'طلب' : 'orders'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {/* Total Sales */}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">{locale === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(safeNumber(financeData.online_gross_revenue))}</span>
                    </div>
                    {/* Delivery Fees */}
                    <div className="flex justify-between items-center text-red-600">
                      <span>(−) {locale === 'ar' ? 'رسوم التوصيل' : 'Delivery Fees'}</span>
                      <span className="font-semibold">{formatCurrency(safeNumber(financeData.online_delivery_fees))}</span>
                    </div>
                    {/* Divider */}
                    <div className="border-t border-dashed border-slate-200 my-1" />
                    {/* Net Revenue */}
                    <div className="flex justify-between items-center bg-slate-50 -mx-2 px-2 py-1.5 rounded">
                      <span className="font-medium text-slate-700">= {locale === 'ar' ? 'صافي الإيرادات' : 'Net Revenue'}</span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(safeNumber(financeData.online_gross_revenue) - safeNumber(financeData.online_delivery_fees))}
                      </span>
                    </div>
                    {/* Commission */}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">{locale === 'ar' ? `عمولة المنصة (${commissionRatePercent}%)` : `Commission (${commissionRatePercent}%)`}</span>
                      <span className="font-semibold text-red-500">-{formatCurrency(safeNumber(financeData.online_theoretical_commission))}</span>
                    </div>
                    {/* Grace Period Waiver */}
                    {financeData.is_in_grace_period && (
                      <div className="flex justify-between items-center text-green-600">
                        <span className="flex items-center gap-1">
                          <Gift className="w-3 h-3" />
                          {locale === 'ar' ? 'معفى' : 'Waived'}
                        </span>
                        <span className="font-semibold">+{formatCurrency(safeNumber(financeData.online_theoretical_commission))}</span>
                      </div>
                    )}
                    {/* Final Result - Platform pays provider */}
                    <div className="border-t-2 border-blue-200 pt-2 mt-2">
                      <div className="flex justify-between items-center py-2 px-2 -mx-2 rounded-lg bg-green-100">
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <ArrowDownRight className="w-4 h-4 text-green-600" />
                          {locale === 'ar' ? 'المنصة تدفع لك' : 'Platform Pays You'}
                        </span>
                        <span className="text-lg font-bold text-green-700">
                          {formatCurrency(safeNumber(financeData.online_payout_owed))}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              )}
            </div>

            {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
            {/* ║ QUICK STATS GRID                                                  ║ */}
            {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-white border-slate-200">
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-3xl font-bold text-primary">{safeNumber(financeData.total_orders)}</p>
                  <p className="text-xs text-slate-500 mt-1">{locale === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200">
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{safeNumber(financeData.settled_orders_count)}</p>
                  <p className="text-xs text-slate-500 mt-1">{locale === 'ar' ? 'تمت تسويتها' : 'Settled'}</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200">
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-3xl font-bold text-amber-600">{safeNumber(financeData.held_orders_count)}</p>
                  <p className="text-xs text-slate-500 mt-1">{locale === 'ar' ? 'قيد الانتظار' : 'On Hold'}</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200">
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-3xl font-bold text-slate-600">{commissionRatePercent}%</p>
                  <p className="text-xs text-slate-500 mt-1">{locale === 'ar' ? 'نسبة العمولة' : 'Commission Rate'}</p>
                </CardContent>
              </Card>
            </div>

            {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
            {/* ║ COMMISSION INFO                                                   ║ */}
            {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900 mb-1">
                      {locale === 'ar' ? 'كيف تحسب العمولة؟' : 'How is commission calculated?'}
                    </p>
                    <p className="text-sm text-slate-600">
                      {locale === 'ar'
                        ? `العمولة ${commissionRatePercent}% تحسب على (المبلغ الفرعي - الخصم) فقط. رسوم التوصيل لا تدخل في حساب العمولة وهي حقك الكامل.`
                        : `Commission ${commissionRatePercent}% is calculated on (subtotal - discount) only. Delivery fees are excluded from commission calculation and are fully yours.`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Show message if no data */}
        {activeTab === 'overview' && !financeData && (
          <Card className="bg-white border-slate-200">
            <CardContent className="pt-12 pb-12 text-center">
              <Wallet className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 font-medium">
                {locale === 'ar' ? 'لا توجد بيانات مالية بعد' : 'No financial data yet'}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                {locale === 'ar' ? 'ستظهر البيانات بعد إتمام طلباتك الأولى' : 'Data will appear after your first completed orders'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* TAB: Settlements */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'settlements' && (
          <>
            {/* Settlement Info Card */}
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
                        ? 'يتم إنشاء تسوية أسبوعية توضح المبالغ المستحقة بينك وبين المنصة. السهم يوضح اتجاه الدفع.'
                        : 'A weekly settlement is generated showing amounts due between you and the platform. The arrow indicates payment direction.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Settlements List */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
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
                        onClick={() => {
                          if (selectedSettlement?.id === settlement.id) {
                            setSelectedSettlement(null)
                            setSettlementOrders([])
                          } else {
                            setSelectedSettlement(settlement)
                            loadSettlementOrders(settlement)
                          }
                        }}
                        className="w-full text-start"
                      >
                        <div className={`p-4 rounded-xl border transition-all ${
                          selectedSettlement?.id === settlement.id
                            ? 'bg-primary/5 border-primary/30'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {/* Settlement Direction Icon */}
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                settlement.settlement_direction === 'platform_pays_provider'
                                  ? 'bg-green-100'
                                  : settlement.settlement_direction === 'provider_pays_platform'
                                    ? 'bg-amber-100'
                                    : 'bg-slate-100'
                              }`}>
                                {getSettlementDirectionIcon(settlement.settlement_direction)}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">
                                  {formatDateUtil(settlement.period_start, locale)} - {formatDateUtil(settlement.period_end, locale)}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {formatNumber(settlement.total_orders, locale)} {locale === 'ar' ? 'طلب' : 'orders'} |
                                  {' '}{getSettlementDirectionLabel(settlement.settlement_direction)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-end">
                                <p className={`font-bold text-lg ${
                                  settlement.settlement_direction === 'platform_pays_provider'
                                    ? 'text-green-600'
                                    : settlement.settlement_direction === 'provider_pays_platform'
                                      ? 'text-amber-600'
                                      : 'text-slate-600'
                                }`}>
                                  {formatCurrency(Math.abs(settlement.net_balance || settlement.net_payout || 0))}
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

                          {/* Expanded Details */}
                          {selectedSettlement?.id === settlement.id && (
                            <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                              {/* COD/Online Breakdown */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* COD Section */}
                                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Banknote className="w-4 h-4 text-amber-600" />
                                    <span className="font-medium text-amber-800 text-sm">
                                      {locale === 'ar' ? 'الدفع عند الاستلام' : 'Cash on Delivery'}
                                    </span>
                                  </div>
                                  <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-amber-700">{locale === 'ar' ? 'عدد الطلبات:' : 'Orders:'}</span>
                                      <span className="font-medium text-amber-900">{settlement.cod_orders_count || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-amber-700">{locale === 'ar' ? 'الإيرادات:' : 'Revenue:'}</span>
                                      <span className="font-medium text-amber-900">{formatCurrency(settlement.cod_gross_revenue || 0)}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-amber-200 pt-1 mt-1">
                                      <span className="text-amber-700">{locale === 'ar' ? 'عمولة مستحقة للمنصة:' : 'Commission Due:'}</span>
                                      <span className="font-bold text-amber-900">{formatCurrency(settlement.cod_commission_owed || 0)}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Online Section */}
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <CreditCard className="w-4 h-4 text-blue-600" />
                                    <span className="font-medium text-blue-800 text-sm">
                                      {locale === 'ar' ? 'الدفع الإلكتروني' : 'Online Payment'}
                                    </span>
                                  </div>
                                  <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-blue-700">{locale === 'ar' ? 'عدد الطلبات:' : 'Orders:'}</span>
                                      <span className="font-medium text-blue-900">{settlement.online_orders_count || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-blue-700">{locale === 'ar' ? 'الإيرادات:' : 'Revenue:'}</span>
                                      <span className="font-medium text-blue-900">{formatCurrency(settlement.online_gross_revenue || 0)}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-blue-200 pt-1 mt-1">
                                      <span className="text-blue-700">{locale === 'ar' ? 'مستحق للمزود:' : 'Due to Provider:'}</span>
                                      <span className="font-bold text-blue-900">{formatCurrency(settlement.online_payout_owed || 0)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Delivery Fees in Settlement */}
                              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Truck className="w-4 h-4 text-slate-500" />
                                    <span className="text-slate-700 text-sm">
                                      {locale === 'ar' ? 'رسوم التوصيل' : 'Delivery Fees'}
                                    </span>
                                  </div>
                                  <span className="font-semibold text-slate-800">{formatCurrency(settlement.total_delivery_fees || 0)}</span>
                                </div>
                              </div>

                              {/* ═══════════════════════════════════════════════════════════════════════ */}
                              {/* Orders Drill-down - الطلبات المشمولة في التسوية */}
                              {/* ═══════════════════════════════════════════════════════════════════════ */}
                              <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                                <div className="flex items-center justify-between p-3 bg-slate-100 border-b border-slate-200">
                                  <div className="flex items-center gap-2">
                                    <ShoppingBag className="w-4 h-4 text-slate-600" />
                                    <span className="font-medium text-slate-700 text-sm">
                                      {locale === 'ar' ? 'الطلبات المشمولة' : 'Included Orders'}
                                    </span>
                                    <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full">
                                      {settlement.total_orders} {locale === 'ar' ? 'طلب' : 'orders'}
                                    </span>
                                  </div>
                                </div>

                                <div className="max-h-48 overflow-y-auto">
                                  {loadingOrders ? (
                                    <div className="p-4 text-center">
                                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
                                      <p className="text-xs text-slate-500 mt-2">
                                        {locale === 'ar' ? 'جاري تحميل الطلبات...' : 'Loading orders...'}
                                      </p>
                                    </div>
                                  ) : settlementOrders.length === 0 ? (
                                    <div className="p-4 text-center text-slate-500 text-xs">
                                      {locale === 'ar' ? 'لا توجد بيانات طلبات' : 'No order data available'}
                                    </div>
                                  ) : (
                                    <div className="divide-y divide-slate-100">
                                      {settlementOrders.map((order) => (
                                        <div key={order.id} className="p-2.5 hover:bg-slate-100 transition-colors">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <span className={`w-6 h-6 rounded flex items-center justify-center text-white text-[10px] ${
                                                order.payment_method === 'cod' ? 'bg-amber-500' : 'bg-blue-500'
                                              }`}>
                                                {order.payment_method === 'cod' ? (
                                                  <Banknote className="w-3 h-3" />
                                                ) : (
                                                  <CreditCard className="w-3 h-3" />
                                                )}
                                              </span>
                                              <div>
                                                <p className="font-medium text-xs text-slate-900">
                                                  #{order.order_number || order.id.slice(0, 8)}
                                                </p>
                                                <p className="text-[10px] text-slate-500">
                                                  {formatDateUtil(order.created_at, locale)}
                                                </p>
                                              </div>
                                            </div>
                                            <div className="text-end">
                                              <p className="font-semibold text-xs text-slate-900">
                                                {formatCurrency(order.total || 0)}
                                              </p>
                                              <p className="text-[10px] text-red-500">
                                                -{formatCurrency(order.platform_commission || 0)} {locale === 'ar' ? 'عمولة' : 'comm.'}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Net Balance Result */}
                              <div className={`p-4 rounded-lg ${
                                settlement.settlement_direction === 'platform_pays_provider'
                                  ? 'bg-green-100 border border-green-300'
                                  : settlement.settlement_direction === 'provider_pays_platform'
                                    ? 'bg-amber-100 border border-amber-300'
                                    : 'bg-slate-100 border border-slate-300'
                              }`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {getSettlementDirectionIcon(settlement.settlement_direction)}
                                    <div>
                                      <p className="font-medium text-sm">
                                        {locale === 'ar' ? 'الرصيد الصافي' : 'Net Balance'}
                                      </p>
                                      <p className="text-xs text-slate-600">
                                        {getSettlementDirectionLabel(settlement.settlement_direction)}
                                      </p>
                                    </div>
                                  </div>
                                  <p className={`text-2xl font-bold ${
                                    settlement.settlement_direction === 'platform_pays_provider'
                                      ? 'text-green-700'
                                      : settlement.settlement_direction === 'provider_pays_platform'
                                        ? 'text-amber-700'
                                        : 'text-slate-700'
                                  }`}>
                                    {formatCurrency(Math.abs(settlement.net_balance || 0))}
                                  </p>
                                </div>
                              </div>

                              {/* Payment Status */}
                              {settlement.paid_at && (
                                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    <div>
                                      <p className="text-sm font-medium text-green-800">
                                        {locale === 'ar' ? 'تم الدفع' : 'Payment Completed'}
                                      </p>
                                      <p className="text-xs text-green-600">
                                        {formatDateUtil(settlement.paid_at, locale)}
                                        {settlement.payment_method && ` • ${settlement.payment_method}`}
                                        {settlement.payment_reference && ` • ${settlement.payment_reference}`}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Notes */}
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

        {/* Contact Support */}
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-3">
                {locale === 'ar'
                  ? 'لديك استفسار حول المالية أو التسويات؟ تواصل مع فريق الدعم'
                  : 'Have questions about finance or settlements? Contact our support team'}
              </p>
              <a href="mailto:Support@engezna.com">
                <Button variant="outline" size="sm">
                  {locale === 'ar' ? 'تواصل مع الدعم' : 'Contact Support'}
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProviderLayout>
  )
}

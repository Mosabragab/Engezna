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
  LayoutDashboard,
  FileText,
  History,
  Truck,
  Shield,
  Sparkles,
  PauseCircle,
  Gift,
  Scale,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

// ═══════════════════════════════════════════════════════════════════════════
// Types - Based on financial_settlement_engine SQL View
// ═══════════════════════════════════════════════════════════════════════════

interface FinancialEngineData {
  provider_id: string
  provider_name: string
  commission_rate: number

  // Order counts by status
  eligible_orders_count: number
  on_hold_orders_count: number
  settled_orders_count: number
  excluded_orders_count: number

  // COD breakdown
  cod_orders_count: number
  cod_gross_revenue: number
  cod_net_sales: number
  cod_total_delivery_fees: number
  cod_commission_owed: number

  // Online breakdown
  online_orders_count: number
  online_gross_revenue: number
  online_net_sales: number
  online_total_delivery_fees: number
  online_platform_commission: number
  online_payout_owed: number

  // Totals
  total_orders_count: number
  total_gross_revenue: number
  total_net_sales: number
  total_delivery_fees: number
  total_platform_commission: number

  // Grace period
  is_in_grace_period: boolean
  grace_period_days_remaining: number
  total_grace_period_discount: number

  // Net balance (THE MAGIC NUMBER)
  net_balance: number
  settlement_direction: 'platform_pays_provider' | 'provider_pays_platform' | 'balanced'

  // Held orders
  held_orders_count: number
  held_orders_value: number

  // Timestamps
  period_start: string
  period_end: string
  calculated_at: string
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

  // Financial Engine Data (Single Source of Truth)
  const [financeData, setFinanceData] = useState<FinancialEngineData | null>(null)
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null)

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
  const commissionRatePercent = financeData ? Math.round(financeData.commission_rate * 100) : 7

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
        {activeTab === 'overview' && financeData && (
          <>
            {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
            {/* ║ GRACE PERIOD ALERT - Purple Gradient                              ║ */}
            {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
            {financeData.is_in_grace_period && (
              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 border-0 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                <CardContent className="pt-6 relative">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                      <Gift className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-5 h-5" />
                        <h3 className="font-bold text-lg">
                          {locale === 'ar' ? 'فترة الدعم المجانية' : 'Free Support Period'}
                        </h3>
                      </div>
                      <p className="text-purple-100 text-sm mb-3">
                        {locale === 'ar'
                          ? 'أنت في فترة الدعم المجانية! لا يتم احتساب عمولة خلال هذه الفترة.'
                          : 'You are in the free support period! No commission is charged during this time.'}
                      </p>
                      <div className="flex flex-wrap gap-4">
                        <div className="bg-white/20 rounded-xl px-4 py-2">
                          <p className="text-purple-100 text-xs">{locale === 'ar' ? 'الأيام المتبقية' : 'Days Remaining'}</p>
                          <p className="text-2xl font-bold">{financeData.grace_period_days_remaining}</p>
                        </div>
                        <div className="bg-white/20 rounded-xl px-4 py-2">
                          <p className="text-purple-100 text-xs">{locale === 'ar' ? 'وفرت حتى الآن' : 'Saved So Far'}</p>
                          <p className="text-2xl font-bold">{formatCurrency(financeData.total_grace_period_discount)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
                    {formatCurrency(financeData.net_balance)}
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
            {/* ║ DELIVERY FEES - YOUR RIGHT (Cyan Card)                            ║ */}
            {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
            <Card className="bg-gradient-to-r from-cyan-500 to-cyan-600 border-0 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                      <Truck className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="text-cyan-100 text-sm">{locale === 'ar' ? 'رسوم التوصيل' : 'Delivery Fees'}</p>
                      <p className="text-3xl font-bold">{formatCurrency(financeData.total_delivery_fees)}</p>
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="bg-white/20 rounded-xl px-3 py-1.5 inline-flex items-center gap-1">
                      <Shield className="w-4 h-4" />
                      <span className="text-sm font-medium">{locale === 'ar' ? 'حقك الكامل' : 'Your Right'}</span>
                    </div>
                    <p className="text-cyan-100 text-xs mt-2">
                      {locale === 'ar' ? 'لا تخضع للعمولة أو الاسترداد' : 'Not subject to commission or refunds'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
            {/* ║ HELD ORDERS ALERT (If Any)                                        ║ */}
            {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
            {financeData.held_orders_count > 0 && (
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
                          <p className="text-xl font-bold text-red-700">{financeData.held_orders_count}</p>
                        </div>
                        <div className="bg-white rounded-lg px-4 py-2 border border-red-200">
                          <p className="text-red-500 text-xs">{locale === 'ar' ? 'القيمة المعلقة' : 'Held Value'}</p>
                          <p className="text-xl font-bold text-red-700">{formatCurrency(financeData.held_orders_value)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
            {/* ║ COD vs ONLINE COMPARISON                                          ║ */}
            {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* COD Card */}
              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                      <Banknote className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-amber-900">
                        {locale === 'ar' ? 'الدفع عند الاستلام' : 'Cash on Delivery'}
                      </p>
                      <p className="text-amber-600 text-sm">
                        {financeData.cod_orders_count} {locale === 'ar' ? 'طلب' : 'orders'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-amber-700 text-sm">{locale === 'ar' ? 'إجمالي المبيعات' : 'Gross Revenue'}</span>
                      <span className="font-bold text-amber-900">{formatCurrency(financeData.cod_gross_revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-amber-700 text-sm">{locale === 'ar' ? 'رسوم التوصيل' : 'Delivery Fees'}</span>
                      <span className="font-semibold text-cyan-600">+{formatCurrency(financeData.cod_total_delivery_fees)}</span>
                    </div>
                    <div className="border-t border-amber-200 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-amber-800 font-medium flex items-center gap-1">
                          <ArrowUpRight className="w-4 h-4 text-amber-600" />
                          {locale === 'ar' ? 'عمولة المنصة' : 'Platform Commission'}
                        </span>
                        <span className="font-bold text-amber-700">{formatCurrency(financeData.cod_commission_owed)}</span>
                      </div>
                      <p className="text-xs text-amber-600 mt-1">
                        {locale === 'ar' ? 'تدفعها للمنصة' : 'You pay to platform'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Online Card */}
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-blue-900">
                        {locale === 'ar' ? 'الدفع الإلكتروني' : 'Online Payment'}
                      </p>
                      <p className="text-blue-600 text-sm">
                        {financeData.online_orders_count} {locale === 'ar' ? 'طلب' : 'orders'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700 text-sm">{locale === 'ar' ? 'إجمالي المبيعات' : 'Gross Revenue'}</span>
                      <span className="font-bold text-blue-900">{formatCurrency(financeData.online_gross_revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700 text-sm">{locale === 'ar' ? 'عمولة المنصة' : 'Platform Commission'}</span>
                      <span className="font-semibold text-red-500">-{formatCurrency(financeData.online_platform_commission)}</span>
                    </div>
                    <div className="border-t border-blue-200 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-blue-800 font-medium flex items-center gap-1">
                          <ArrowDownRight className="w-4 h-4 text-green-600" />
                          {locale === 'ar' ? 'مستحق لك' : 'Due to You'}
                        </span>
                        <span className="font-bold text-green-600">{formatCurrency(financeData.online_payout_owed)}</span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        {locale === 'ar' ? 'المنصة تدفعها لك' : 'Platform pays to you'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
            {/* ║ QUICK STATS GRID                                                  ║ */}
            {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-white border-slate-200">
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-3xl font-bold text-primary">{financeData.eligible_orders_count}</p>
                  <p className="text-xs text-slate-500 mt-1">{locale === 'ar' ? 'طلبات مؤهلة' : 'Eligible Orders'}</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200">
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{financeData.settled_orders_count}</p>
                  <p className="text-xs text-slate-500 mt-1">{locale === 'ar' ? 'تمت تسويتها' : 'Settled'}</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200">
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-3xl font-bold text-amber-600">{financeData.on_hold_orders_count}</p>
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
                              <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Truck className="w-4 h-4 text-cyan-600" />
                                    <span className="font-medium text-cyan-800 text-sm">
                                      {locale === 'ar' ? 'رسوم التوصيل (حقك)' : 'Delivery Fees (Your Right)'}
                                    </span>
                                  </div>
                                  <span className="font-bold text-cyan-700">{formatCurrency(settlement.total_delivery_fees || 0)}</span>
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

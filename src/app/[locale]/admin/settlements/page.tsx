'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, AdminSidebar, GeoFilter, useGeoFilter } from '@/components/admin'
import { formatNumber, formatCurrency, formatDate } from '@/lib/utils/formatters'
import {
  Shield,
  Search,
  Eye,
  RefreshCw,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building,
  Wallet,
  Calendar,
  PlayCircle,
  CreditCard,
  AlertCircle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Settlement {
  id: string
  provider_id: string
  provider: { name_ar: string; name_en: string; governorate_id: string | null; city_id: string | null } | null
  period_start: string
  period_end: string
  total_orders: number
  gross_revenue: number
  platform_commission: number
  net_payout: number
  // COD breakdown - Provider collects cash, owes commission to Engezna
  cod_orders_count: number
  cod_gross_revenue: number
  cod_commission_owed: number
  // Online breakdown - Engezna collects, owes payout to provider
  online_orders_count: number
  online_gross_revenue: number
  online_platform_commission: number
  online_payout_owed: number
  // Net calculation
  net_balance: number
  settlement_direction: 'platform_pays_provider' | 'provider_pays_platform' | 'balanced' | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  paid_at: string | null
  payment_method: string | null
  payment_reference: string | null
  orders_included: string[] | null
  notes: string | null
  created_at: string
  updated_at: string
  processed_by: string | null
  approved_at: string | null
  rejected_at: string | null
  rejection_reason: string | null
}

interface Provider {
  id: string
  name_ar: string
  name_en: string
  governorate_id: string | null
  city_id: string | null
}

type FilterStatus = 'all' | 'pending' | 'processing' | 'completed' | 'failed'

export default function AdminSettlementsPage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [filteredSettlements, setFilteredSettlements] = useState<Settlement[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const { geoFilter, setGeoFilter } = useGeoFilter()

  // Modal states
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Settlement generation period: 1 = daily, 3 = every 3 days, 7 = weekly
  const [settlementPeriod, setSettlementPeriod] = useState<1 | 3 | 7>(7)

  // Generate settlement form
  const [generateForm, setGenerateForm] = useState({
    providerId: '',
    periodStart: '',
    periodEnd: '',
  })

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'cash',
    reference: '',
  })

  const [stats, setStats] = useState({
    totalPending: 0,
    totalOverdue: 0,
    totalPaid: 0,
    pendingCount: 0,
    overdueCount: 0,
    paidCount: 0,
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    filterSettlements()
  }, [settlements, searchQuery, statusFilter, geoFilter])

  async function checkAuth() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'admin') {
        setIsAdmin(true)
        await loadData(supabase)
      }
    }

    setLoading(false)
  }

  async function loadData(supabase: ReturnType<typeof createClient>) {
    // Load settlements
    const { data: settlementsData } = await supabase
      .from('settlements')
      .select(`
        *,
        provider:providers(name_ar, name_en, governorate_id, city_id)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    const settlementsTyped = (settlementsData || []) as unknown as Settlement[]
    setSettlements(settlementsTyped)

    // Load providers for the generate form
    // Note: Database uses 'open' for active providers, 'temporarily_paused' for paused
    const { data: providersData, error: providersError } = await supabase
      .from('providers')
      .select('id, name_ar, name_en, governorate_id, city_id')
      .in('status', ['open', 'temporarily_paused'])
      .order('name_ar')

    if (providersError) {
      console.error('Error loading providers:', providersError)
    }

    setProviders((providersData || []) as Provider[])

    // Calculate stats
    const pending = settlementsTyped.filter(s => s.status === 'pending' || s.status === 'processing')
    const completed = settlementsTyped.filter(s => s.status === 'completed')
    const failed = settlementsTyped.filter(s => s.status === 'failed')

    setStats({
      totalPending: pending.reduce((sum, s) => sum + (s.net_payout || 0), 0),
      totalOverdue: failed.reduce((sum, s) => sum + (s.net_payout || 0), 0),
      totalPaid: completed.reduce((sum, s) => sum + (s.net_payout || 0), 0),
      pendingCount: pending.length,
      overdueCount: failed.length,
      paidCount: completed.length,
    })
  }

  function filterSettlements() {
    let filtered = [...settlements]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(s =>
        (locale === 'ar' ? s.provider?.name_ar : s.provider?.name_en)?.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter)
    }

    // Geographic filter
    if (geoFilter.governorate_id || geoFilter.city_id) {
      filtered = filtered.filter(s => {
        if (geoFilter.city_id && s.provider?.city_id) {
          return s.provider.city_id === geoFilter.city_id
        }
        if (geoFilter.governorate_id && s.provider?.governorate_id) {
          return s.provider.governorate_id === geoFilter.governorate_id
        }
        return true
      })
    }

    setFilteredSettlements(filtered)
  }

  async function handleRefresh() {
    setLoading(true)
    const supabase = createClient()
    await loadData(supabase)
    setLoading(false)
  }

  async function handleGenerateWeeklySettlements() {
    setIsGenerating(true)
    try {
      const supabase = createClient()

      // Get date range based on selected period
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - settlementPeriod)

      // Get all active providers
      const { data: activeProviders, error: providersError } = await supabase
        .from('providers')
        .select('id')
        .in('status', ['open', 'temporarily_paused'])

      if (providersError) {
        console.error('Error fetching providers:', providersError)
        alert(locale === 'ar' ? 'خطأ في جلب المزودين: ' + providersError.message : 'Error fetching providers: ' + providersError.message)
        return
      }

      if (!activeProviders || activeProviders.length === 0) {
        alert(locale === 'ar' ? 'لا يوجد مزودين نشطين' : 'No active providers found')
        return
      }

      let createdCount = 0
      const COMMISSION_RATE = 0.06 // 6%

      for (const provider of activeProviders) {
        // Get COD orders (cash) - Provider collected, owes commission to Engezna
        const { data: codOrders } = await supabase
          .from('orders')
          .select('id, total, payment_method')
          .eq('provider_id', provider.id)
          .eq('status', 'delivered')
          .eq('payment_status', 'completed')
          .eq('payment_method', 'cash')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())

        // Get Online orders (card, wallet, etc.) - Engezna collected, owes payout to provider
        const { data: onlineOrders } = await supabase
          .from('orders')
          .select('id, total, payment_method')
          .eq('provider_id', provider.id)
          .eq('status', 'delivered')
          .eq('payment_status', 'completed')
          .neq('payment_method', 'cash')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())

        const codOrdersList = codOrders || []
        const onlineOrdersList = onlineOrders || []
        const allOrders = [...codOrdersList, ...onlineOrdersList]

        if (allOrders.length > 0) {
          // COD calculations
          const codGrossRevenue = codOrdersList.reduce((sum, o) => sum + (o.total || 0), 0)
          const codCommissionOwed = codGrossRevenue * COMMISSION_RATE

          // Online calculations
          const onlineGrossRevenue = onlineOrdersList.reduce((sum, o) => sum + (o.total || 0), 0)
          const onlinePlatformCommission = onlineGrossRevenue * COMMISSION_RATE
          const onlinePayoutOwed = onlineGrossRevenue - onlinePlatformCommission

          // Net balance: positive = Engezna pays provider, negative = provider pays Engezna
          const netBalance = onlinePayoutOwed - codCommissionOwed
          const settlementDirection = netBalance > 0 ? 'platform_pays_provider'
            : netBalance < 0 ? 'provider_pays_platform' : 'balanced'

          // Total calculations
          const grossRevenue = codGrossRevenue + onlineGrossRevenue
          const platformCommission = codCommissionOwed + onlinePlatformCommission

          // Create settlement
          const { error: insertError } = await supabase
            .from('settlements')
            .insert({
              provider_id: provider.id,
              period_start: startDate.toISOString(),
              period_end: endDate.toISOString(),
              total_orders: allOrders.length,
              gross_revenue: grossRevenue,
              platform_commission: platformCommission,
              // COD breakdown
              cod_orders_count: codOrdersList.length,
              cod_gross_revenue: codGrossRevenue,
              cod_commission_owed: codCommissionOwed,
              // Online breakdown
              online_orders_count: onlineOrdersList.length,
              online_gross_revenue: onlineGrossRevenue,
              online_platform_commission: onlinePlatformCommission,
              online_payout_owed: onlinePayoutOwed,
              // Net calculation
              net_balance: netBalance,
              settlement_direction: settlementDirection,
              net_payout: Math.abs(netBalance),
              status: 'pending',
              orders_included: allOrders.map(o => o.id),
            })

          if (!insertError) {
            createdCount++
          }
        }
      }

      alert(locale === 'ar' ? `تم إنشاء ${createdCount} تسوية جديدة` : `Generated ${createdCount} new settlements`)
      await handleRefresh()
    } catch (error) {
      console.error('Error generating settlements:', error)
      alert(locale === 'ar' ? 'حدث خطأ أثناء إنشاء التسويات' : 'Error generating settlements')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleGenerateSettlement() {
    if (!generateForm.providerId || !generateForm.periodStart || !generateForm.periodEnd) {
      alert(locale === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields')
      return
    }

    setIsGenerating(true)
    try {
      const supabase = createClient()
      const COMMISSION_RATE = 0.06 // 6%

      // Get COD orders
      const { data: codOrders } = await supabase
        .from('orders')
        .select('id, total, payment_method')
        .eq('provider_id', generateForm.providerId)
        .eq('status', 'delivered')
        .eq('payment_status', 'completed')
        .eq('payment_method', 'cash')
        .gte('created_at', generateForm.periodStart)
        .lte('created_at', generateForm.periodEnd + 'T23:59:59')

      // Get Online orders
      const { data: onlineOrders } = await supabase
        .from('orders')
        .select('id, total, payment_method')
        .eq('provider_id', generateForm.providerId)
        .eq('status', 'delivered')
        .eq('payment_status', 'completed')
        .neq('payment_method', 'cash')
        .gte('created_at', generateForm.periodStart)
        .lte('created_at', generateForm.periodEnd + 'T23:59:59')

      const codOrdersList = codOrders || []
      const onlineOrdersList = onlineOrders || []
      const allOrders = [...codOrdersList, ...onlineOrdersList]

      if (allOrders.length === 0) {
        alert(locale === 'ar' ? 'لا توجد طلبات في هذه الفترة' : 'No orders found in this period')
        return
      }

      // COD calculations
      const codGrossRevenue = codOrdersList.reduce((sum, o) => sum + (o.total || 0), 0)
      const codCommissionOwed = codGrossRevenue * COMMISSION_RATE

      // Online calculations
      const onlineGrossRevenue = onlineOrdersList.reduce((sum, o) => sum + (o.total || 0), 0)
      const onlinePlatformCommission = onlineGrossRevenue * COMMISSION_RATE
      const onlinePayoutOwed = onlineGrossRevenue - onlinePlatformCommission

      // Net balance
      const netBalance = onlinePayoutOwed - codCommissionOwed
      const settlementDirection = netBalance > 0 ? 'platform_pays_provider'
        : netBalance < 0 ? 'provider_pays_platform' : 'balanced'

      // Total calculations
      const grossRevenue = codGrossRevenue + onlineGrossRevenue
      const platformCommission = codCommissionOwed + onlinePlatformCommission

      // Create settlement
      const { error: insertError } = await supabase
        .from('settlements')
        .insert({
          provider_id: generateForm.providerId,
          period_start: generateForm.periodStart,
          period_end: generateForm.periodEnd,
          total_orders: allOrders.length,
          gross_revenue: grossRevenue,
          platform_commission: platformCommission,
          // COD breakdown
          cod_orders_count: codOrdersList.length,
          cod_gross_revenue: codGrossRevenue,
          cod_commission_owed: codCommissionOwed,
          // Online breakdown
          online_orders_count: onlineOrdersList.length,
          online_gross_revenue: onlineGrossRevenue,
          online_platform_commission: onlinePlatformCommission,
          online_payout_owed: onlinePayoutOwed,
          // Net calculation
          net_balance: netBalance,
          settlement_direction: settlementDirection,
          net_payout: Math.abs(netBalance),
          status: 'pending',
          orders_included: allOrders.map(o => o.id),
        })

      if (insertError) {
        console.error('Error creating settlement:', insertError)
        alert(locale === 'ar' ? 'حدث خطأ أثناء إنشاء التسوية' : 'Error creating settlement')
      } else {
        alert(locale === 'ar' ? 'تم إنشاء التسوية بنجاح' : 'Settlement generated successfully')
        setShowGenerateModal(false)
        setGenerateForm({ providerId: '', periodStart: '', periodEnd: '' })
        await handleRefresh()
      }
    } catch (error) {
      console.error('Error generating settlement:', error)
      alert(locale === 'ar' ? 'حدث خطأ أثناء إنشاء التسوية' : 'Error generating settlement')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleRecordPayment() {
    if (!selectedSettlement || !paymentForm.amount) {
      alert(locale === 'ar' ? 'يرجى إدخال المبلغ' : 'Please enter amount')
      return
    }

    setIsProcessingPayment(true)
    try {
      const supabase = createClient()

      // Update settlement status to completed
      const { error } = await supabase
        .from('settlements')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString(),
          payment_method: paymentForm.method,
          payment_reference: paymentForm.reference || null,
          processed_by: user?.id,
        })
        .eq('id', selectedSettlement.id)

      if (error) {
        console.error('Error recording payment:', error)
        alert(locale === 'ar' ? 'حدث خطأ أثناء تسجيل الدفع' : 'Error recording payment')
      } else {
        alert(locale === 'ar' ? 'تم تسجيل الدفع بنجاح' : 'Payment recorded successfully')
        setShowPaymentModal(false)
        setSelectedSettlement(null)
        setPaymentForm({ amount: '', method: 'cash', reference: '' })
        await handleRefresh()
      }
    } finally {
      setIsProcessingPayment(false)
    }
  }

  async function handleUpdateOverdue() {
    // This function is not needed since we don't have due dates
    // Just refresh to get latest data
    alert(locale === 'ar' ? 'تم تحديث البيانات' : 'Data updated')
    await handleRefresh()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'processing': return 'bg-blue-100 text-blue-700'
      case 'failed': return 'bg-red-100 text-red-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      pending: { ar: 'معلق', en: 'Pending' },
      processing: { ar: 'قيد المعالجة', en: 'Processing' },
      completed: { ar: 'مكتمل', en: 'Completed' },
      failed: { ar: 'فشل', en: 'Failed' },
    }
    return labels[status]?.[locale === 'ar' ? 'ar' : 'en'] || status
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-3 h-3" />
      case 'pending': return <Clock className="w-3 h-3" />
      case 'processing': return <TrendingUp className="w-3 h-3" />
      case 'failed': return <AlertTriangle className="w-3 h-3" />
      default: return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2 text-slate-900">
            {locale === 'ar' ? 'غير مصرح' : 'Unauthorized'}
          </h1>
          <Link href={`/${locale}/auth/login`}>
            <Button size="lg" className="bg-red-600 hover:bg-red-700">
              {locale === 'ar' ? 'تسجيل الدخول' : 'Login'}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <AdminHeader
          user={user}
          title={locale === 'ar' ? 'إدارة التسويات' : 'Settlements Management'}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Action Buttons */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Period selector */}
              <select
                value={settlementPeriod}
                onChange={(e) => setSettlementPeriod(Number(e.target.value) as 1 | 3 | 7)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value={1}>{locale === 'ar' ? 'يومي' : 'Daily'}</option>
                <option value={3}>{locale === 'ar' ? 'كل 3 أيام' : 'Every 3 Days'}</option>
                <option value={7}>{locale === 'ar' ? 'أسبوعي' : 'Weekly'}</option>
              </select>

              <Button
                onClick={handleGenerateWeeklySettlements}
                disabled={isGenerating}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                {isGenerating
                  ? (locale === 'ar' ? 'جاري الإنشاء...' : 'Generating...')
                  : (locale === 'ar' ? 'إنشاء التسويات' : 'Generate Settlements')
                }
              </Button>

              <Button
                onClick={() => setShowGenerateModal(true)}
                variant="outline"
                className="border-green-500 text-green-700 hover:bg-green-600 hover:text-white hover:border-green-600"
              >
                <Calendar className="w-4 h-4 mr-2" />
                {locale === 'ar' ? 'تسوية مخصصة' : 'Custom'}
              </Button>

              <Button
                variant="outline"
                onClick={handleRefresh}
                className="ml-auto"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {locale === 'ar' ? 'تحديث' : 'Refresh'}
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <span className="text-yellow-100 text-sm">{stats.pendingCount} {locale === 'ar' ? 'تسوية' : 'settlements'}</span>
              </div>
              <p className="text-yellow-100 text-sm mb-1">{locale === 'ar' ? 'مستحقات معلقة' : 'Pending Dues'}</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalPending, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <span className="text-red-100 text-sm">{stats.overdueCount} {locale === 'ar' ? 'تسوية' : 'settlements'}</span>
              </div>
              <p className="text-red-100 text-sm mb-1">{locale === 'ar' ? 'مستحقات متأخرة' : 'Overdue Dues'}</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalOverdue, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <span className="text-green-100 text-sm">{stats.paidCount} {locale === 'ar' ? 'تسوية' : 'settlements'}</span>
              </div>
              <p className="text-green-100 text-sm mb-1">{locale === 'ar' ? 'إجمالي المدفوع' : 'Total Paid'}</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalPaid, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
                <input
                  type="text"
                  placeholder={locale === 'ar' ? 'بحث عن مزود...' : 'Search provider...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500`}
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
                <option value="pending">{locale === 'ar' ? 'معلق' : 'Pending'}</option>
                <option value="processing">{locale === 'ar' ? 'قيد المعالجة' : 'Processing'}</option>
                <option value="completed">{locale === 'ar' ? 'مكتمل' : 'Completed'}</option>
                <option value="failed">{locale === 'ar' ? 'فشل' : 'Failed'}</option>
              </select>

              {/* Geographic Filter */}
              <GeoFilter
                value={geoFilter}
                onChange={setGeoFilter}
                showDistrict={false}
              />
            </div>
          </div>

          {/* Settlements Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {locale === 'ar' ? 'قائمة التسويات' : 'Settlements List'}
                <span className="text-sm font-normal text-slate-500 ml-2">
                  ({filteredSettlements.length})
                </span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'مقدم الخدمة' : 'Provider'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الفترة' : 'Period'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الطلبات' : 'Orders'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'التفاصيل المالية' : 'Financial Details'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الصافي' : 'Net Balance'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSettlements.length > 0 ? (
                    filteredSettlements.map((settlement) => {
                      const providerName = locale === 'ar' ? settlement.provider?.name_ar : settlement.provider?.name_en
                      const isPlatformPays = settlement.settlement_direction === 'platform_pays_provider'
                      const isProviderPays = settlement.settlement_direction === 'provider_pays_platform'

                      return (
                      <tr key={settlement.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                              <Building className="w-5 h-5 text-slate-500" />
                            </div>
                            <span className="font-medium text-slate-900">{providerName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <p className="text-slate-900">{formatDate(settlement.period_start, locale)}</p>
                            <p className="text-slate-500">{locale === 'ar' ? 'إلى' : 'to'} {formatDate(settlement.period_end, locale)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <p className="font-medium text-slate-900">{formatNumber(settlement.total_orders, locale)}</p>
                            <p className="text-xs text-slate-500">
                              {locale === 'ar' ? `نقدي: ${settlement.cod_orders_count || 0} | إلكتروني: ${settlement.online_orders_count || 0}`
                                : `COD: ${settlement.cod_orders_count || 0} | Online: ${settlement.online_orders_count || 0}`}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs space-y-1">
                            {(settlement.cod_orders_count || 0) > 0 && (
                              <p className="text-orange-600">
                                {locale === 'ar'
                                  ? `نقدي: ${formatCurrency(settlement.cod_gross_revenue || 0, locale)} ← عمولة إنجزنا: ${formatCurrency(settlement.cod_commission_owed || 0, locale)}`
                                  : `COD: ${formatCurrency(settlement.cod_gross_revenue || 0, locale)} → Engezna: ${formatCurrency(settlement.cod_commission_owed || 0, locale)}`}
                              </p>
                            )}
                            {(settlement.online_orders_count || 0) > 0 && (
                              <p className="text-blue-600">
                                {locale === 'ar'
                                  ? `إلكتروني: ${formatCurrency(settlement.online_gross_revenue || 0, locale)} ← مستحق لـ${providerName}: ${formatCurrency(settlement.online_payout_owed || 0, locale)}`
                                  : `Online: ${formatCurrency(settlement.online_gross_revenue || 0, locale)} → ${providerName}: ${formatCurrency(settlement.online_payout_owed || 0, locale)}`}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <span className={`font-bold ${isPlatformPays ? 'text-green-600' : isProviderPays ? 'text-red-600' : 'text-slate-600'}`}>
                              {formatCurrency(Math.abs(settlement.net_balance || 0), locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                            </span>
                            <p className={`text-xs ${isPlatformPays ? 'text-green-500' : isProviderPays ? 'text-red-500' : 'text-slate-400'}`}>
                              {isPlatformPays
                                ? (locale === 'ar' ? `إنجزنا تدفع لـ${providerName}` : `Engezna pays ${providerName}`)
                                : isProviderPays
                                  ? (locale === 'ar' ? `${providerName} يدفع لإنجزنا` : `${providerName} pays Engezna`)
                                  : (locale === 'ar' ? 'متوازن' : 'Balanced')}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${getStatusColor(settlement.status)}`}>
                            {getStatusIcon(settlement.status)}
                            {getStatusLabel(settlement.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {settlement.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => {
                                  setSelectedSettlement(settlement)
                                  setPaymentForm({
                                    amount: (settlement.net_payout || 0).toString(),
                                    method: 'cash',
                                    reference: '',
                                  })
                                  setShowPaymentModal(true)
                                }}
                              >
                                <CreditCard className="w-4 h-4 mr-1" />
                                {locale === 'ar' ? 'تأكيد' : 'Confirm'}
                              </Button>
                            )}
                            <Link href={`/${locale}/admin/settlements/${settlement.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Eye className="w-4 h-4 text-slate-500" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )})
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <Wallet className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-500">
                          {locale === 'ar' ? 'لا توجد تسويات' : 'No settlements found'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Generate Settlement Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {locale === 'ar' ? 'إنشاء تسوية مخصصة' : 'Generate Custom Settlement'}
              </h3>
              <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'المزود' : 'Provider'}
                </label>
                <select
                  value={generateForm.providerId}
                  onChange={(e) => setGenerateForm({ ...generateForm, providerId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                >
                  <option value="">{locale === 'ar' ? 'اختر المزود' : 'Select Provider'}</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {locale === 'ar' ? provider.name_ar : provider.name_en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'بداية الفترة' : 'Period Start'}
                </label>
                <input
                  type="date"
                  value={generateForm.periodStart}
                  onChange={(e) => setGenerateForm({ ...generateForm, periodStart: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'نهاية الفترة' : 'Period End'}
                </label>
                <input
                  type="date"
                  value={generateForm.periodEnd}
                  onChange={(e) => setGenerateForm({ ...generateForm, periodEnd: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowGenerateModal(false)}>
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleGenerateSettlement}
                disabled={isGenerating}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isGenerating ? (locale === 'ar' ? 'جاري الإنشاء...' : 'Generating...') : (locale === 'ar' ? 'إنشاء' : 'Generate')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedSettlement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {locale === 'ar' ? 'تسجيل دفعة' : 'Record Payment'}
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm text-slate-600">
                  {locale === 'ar' ? 'المزود:' : 'Provider:'} <span className="font-medium text-slate-900">
                    {locale === 'ar' ? selectedSettlement.provider?.name_ar : selectedSettlement.provider?.name_en}
                  </span>
                </p>
                <p className="text-sm text-slate-600">
                  {locale === 'ar' ? 'صافي المزود:' : 'Net Payout:'} <span className="font-bold text-green-600">
                    {formatCurrency(selectedSettlement.net_payout || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                  </span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'المبلغ' : 'Amount'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                </label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                >
                  <option value="cash">{locale === 'ar' ? 'نقدي' : 'Cash'}</option>
                  <option value="bank_transfer">{locale === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                  <option value="instapay">{locale === 'ar' ? 'انستاباي' : 'InstaPay'}</option>
                  <option value="vodafone_cash">{locale === 'ar' ? 'فودافون كاش' : 'Vodafone Cash'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'مرجع الدفع (اختياري)' : 'Payment Reference (Optional)'}
                </label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  placeholder={locale === 'ar' ? 'رقم المعاملة أو الملاحظات' : 'Transaction ID or notes'}
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleRecordPayment}
                disabled={isProcessingPayment}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isProcessingPayment ? (locale === 'ar' ? 'جاري التسجيل...' : 'Recording...') : (locale === 'ar' ? 'تسجيل الدفع' : 'Record Payment')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

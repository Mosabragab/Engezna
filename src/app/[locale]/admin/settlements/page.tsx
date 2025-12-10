'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, GeoFilter, useGeoFilter, useAdminSidebar } from '@/components/admin'
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
  Users,
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
  // New fields from updated schema
  cod_orders_count: number | null
  cod_revenue: number | null
  cod_provider_owes: number | null
  online_orders_count: number | null
  online_revenue: number | null
  online_platform_owes: number | null
  net_amount_due: number | null
  settlement_direction: 'platform_pays_provider' | 'provider_pays_platform' | 'balanced' | null
  amount_paid: number | null
  status: 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'disputed' | 'waived'
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

type FilterStatus = 'all' | 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'disputed' | 'waived'

export default function AdminSettlementsPage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const { toggle: toggleSidebar } = useAdminSidebar()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(true)
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
        setLoading(false)
        loadData(supabase)
        return
      }
    }

    setLoading(false)
  }

  async function loadData(supabase: ReturnType<typeof createClient>) {
    setDataLoading(true)
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

    // Load providers for the generate form (all providers)
    const { data: providersData, error: providersError } = await supabase
      .from('providers')
      .select('id, name_ar, name_en, governorate_id, city_id')
      .order('name_ar')

    if (providersError) {
      console.error('Error loading providers:', providersError)
    }
    console.log('Loaded providers:', providersData?.length || 0)

    setProviders((providersData || []) as Provider[])

    // Calculate stats - use net_amount_due if available, otherwise fall back to platform_commission
    const pending = settlementsTyped.filter(s => s.status === 'pending' || s.status === 'partially_paid')
    const paid = settlementsTyped.filter(s => s.status === 'paid')
    const overdue = settlementsTyped.filter(s => s.status === 'overdue' || s.status === 'disputed')

    // Helper to get the amount due from a settlement
    const getAmountDue = (s: Settlement) => {
      // Use new field if available, otherwise fall back to platform_commission
      const due = s.net_amount_due ?? s.platform_commission ?? 0
      const paid = s.amount_paid ?? 0
      return Math.max(0, due - paid)
    }

    setStats({
      totalPending: pending.reduce((sum, s) => sum + getAmountDue(s), 0),
      totalOverdue: overdue.reduce((sum, s) => sum + getAmountDue(s), 0),
      totalPaid: paid.reduce((sum, s) => sum + (s.amount_paid ?? s.platform_commission ?? 0), 0),
      pendingCount: pending.length,
      overdueCount: overdue.length,
      paidCount: paid.length,
    })
    setDataLoading(false)
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

      // Get all providers
      const { data: activeProviders, error: provError } = await supabase
        .from('providers')
        .select('id')

      if (provError) {
        console.error('Error loading providers for settlements:', provError)
      }
      console.log('Found providers for settlements:', activeProviders?.length || 0)

      if (!activeProviders || activeProviders.length === 0) {
        alert(locale === 'ar' ? 'لا يوجد مزودين نشطين' : 'No active providers found')
        return
      }

      let createdCount = 0
      const COMMISSION_RATE = 0.06 // 6%

      for (const provider of activeProviders) {
        // Get delivered orders for this provider in the period
        const { data: orders } = await supabase
          .from('orders')
          .select('id, total')
          .eq('provider_id', provider.id)
          .eq('status', 'delivered')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())

        if (orders && orders.length > 0) {
          const grossRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
          const platformCommission = grossRevenue * COMMISSION_RATE
          const netPayout = grossRevenue - platformCommission

          // Create settlement
          const { error: insertError } = await supabase
            .from('settlements')
            .insert({
              provider_id: provider.id,
              period_start: startDate.toISOString(),
              period_end: endDate.toISOString(),
              total_orders: orders.length,
              gross_revenue: grossRevenue,
              platform_commission: platformCommission,
              net_payout: netPayout,
              status: 'pending',
              orders_included: orders.map(o => o.id),
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

      // Get delivered orders for this provider in the period
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total')
        .eq('provider_id', generateForm.providerId)
        .eq('status', 'delivered')
        .gte('created_at', generateForm.periodStart)
        .lte('created_at', generateForm.periodEnd + 'T23:59:59')

      if (!orders || orders.length === 0) {
        alert(locale === 'ar' ? 'لا توجد طلبات في هذه الفترة' : 'No orders found in this period')
        return
      }

      const grossRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
      const platformCommission = grossRevenue * COMMISSION_RATE
      const netPayout = grossRevenue - platformCommission

      // Create settlement
      const { error: insertError } = await supabase
        .from('settlements')
        .insert({
          provider_id: generateForm.providerId,
          period_start: generateForm.periodStart,
          period_end: generateForm.periodEnd,
          total_orders: orders.length,
          gross_revenue: grossRevenue,
          platform_commission: platformCommission,
          net_payout: netPayout,
          status: 'pending',
          orders_included: orders.map(o => o.id),
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

      // Update settlement status to paid (matches database CHECK constraint)
      const { error } = await supabase
        .from('settlements')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: paymentForm.method,
          payment_reference: paymentForm.reference || null,
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
      disputed: { ar: 'متنازع عليه', en: 'Disputed' },
      waived: { ar: 'معفى', en: 'Waived' },
    }
    return labels[status]?.[locale === 'ar' ? 'ar' : 'en'] || status
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle2 className="w-3 h-3" />
      case 'waived': return <CheckCircle2 className="w-3 h-3" />
      case 'pending': return <Clock className="w-3 h-3" />
      case 'partially_paid': return <TrendingUp className="w-3 h-3" />
      case 'overdue': return <AlertTriangle className="w-3 h-3" />
      case 'disputed': return <AlertTriangle className="w-3 h-3" />
      default: return null
    }
  }

  if (loading) {
    return (
      <>
        <div className="sticky top-0 z-40 bg-white border-b border-slate-200 animate-pulse">
          <div className="h-16 px-4 flex items-center justify-between">
            <div className="h-6 w-32 bg-slate-200 rounded"></div>
            <div className="h-10 w-10 bg-slate-200 rounded-full"></div>
          </div>
        </div>
        <main className="flex-1 p-4 lg:p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent"></div>
        </main>
      </>
    )
  }

  if (!user || !isAdmin) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <h1 className="text-lg font-semibold text-slate-900">
              {locale === 'ar' ? 'إدارة التسويات' : 'Settlements Management'}
            </h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
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
        </main>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        user={user}
        title={locale === 'ar' ? 'إدارة التسويات' : 'Settlements Management'}
        onMenuClick={toggleSidebar}
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
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {locale === 'ar' ? 'تحديث' : 'Refresh'}
              </Button>

              {/* Link to Settlement Groups */}
              <Link href={`/${locale}/admin/settlements/groups`} className="ml-auto">
                <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
                  <Users className="w-4 h-4 mr-2" />
                  {locale === 'ar' ? 'مجموعات التسوية' : 'Settlement Groups'}
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Paid - Green card */}
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <span className="text-emerald-100 text-sm">{stats.paidCount} {locale === 'ar' ? 'تسوية' : 'settlements'}</span>
              </div>
              <p className="text-emerald-100 text-sm mb-1">{locale === 'ar' ? 'إجمالي المدفوع' : 'Total Paid'}</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalPaid, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
            </div>

            {/* Overdue - Red/Coral card (matching platform) */}
            <div className="bg-gradient-to-br from-red-400 to-red-500 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <span className="text-red-100 text-sm">{stats.overdueCount} {locale === 'ar' ? 'تسوية' : 'settlements'}</span>
              </div>
              <p className="text-red-100 text-sm mb-1">{locale === 'ar' ? 'مستحقات متأخرة' : 'Overdue Dues'}</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalOverdue, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
            </div>

            {/* Pending - Amber/Yellow card */}
            <div className="bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <span className="text-amber-100 text-sm">{stats.pendingCount} {locale === 'ar' ? 'تسوية' : 'settlements'}</span>
              </div>
              <p className="text-amber-100 text-sm mb-1">{locale === 'ar' ? 'مستحقات معلقة' : 'Pending Dues'}</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalPending, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
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
                <option value="partially_paid">{locale === 'ar' ? 'مدفوع جزئياً' : 'Partially Paid'}</option>
                <option value="paid">{locale === 'ar' ? 'مدفوع' : 'Paid'}</option>
                <option value="overdue">{locale === 'ar' ? 'متأخر' : 'Overdue'}</option>
                <option value="disputed">{locale === 'ar' ? 'متنازع عليه' : 'Disputed'}</option>
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
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'المزود' : 'Provider'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الفترة' : 'Period'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الطلبات' : 'Orders'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الإيرادات' : 'Revenue'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'العمولة المستحقة' : 'Commission Due'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSettlements.length > 0 ? (
                    filteredSettlements.map((settlement) => (
                      <tr key={settlement.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                              <Building className="w-5 h-5 text-slate-500" />
                            </div>
                            <span className="font-medium text-slate-900">
                              {locale === 'ar' ? settlement.provider?.name_ar : settlement.provider?.name_en}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <p className="text-slate-900">{formatDate(settlement.period_start, locale)}</p>
                            <p className="text-slate-500">{locale === 'ar' ? 'إلى' : 'to'} {formatDate(settlement.period_end, locale)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900">{formatNumber(settlement.total_orders, locale)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <p className="font-bold text-slate-900">{formatCurrency(settlement.gross_revenue || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
                            <p className="text-xs text-red-500">
                              -{locale === 'ar' ? 'عمولة' : 'Commission'}: {formatCurrency(settlement.platform_commission || 0, locale)}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <span className="font-bold text-amber-600">{formatCurrency(settlement.platform_commission || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                            <p className="text-xs text-slate-500">
                              {locale === 'ar' ? 'عمولة المنصة' : 'Platform commission'}
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
                                    amount: (settlement.net_amount_due ?? settlement.platform_commission ?? 0).toString(),
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
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
                  {locale === 'ar' ? 'المبلغ المستحق:' : 'Amount Due:'} <span className="font-bold text-amber-600">
                    {formatCurrency(selectedSettlement.net_amount_due ?? selectedSettlement.platform_commission ?? 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
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
    </>
  )
}

'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, useAdminSidebar, GeoFilter, useGeoFilter } from '@/components/admin'
import { formatNumber, formatCurrency, formatDate } from '@/lib/utils/formatters'
import {
  Shield,
  Search,
  Eye,
  RefreshCw,
  DollarSign,
  CreditCard,
  Banknote,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Building,
  Receipt,
  Wallet,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface SettlementRecord {
  id: string
  provider_id: string
  provider: { name_ar: string; name_en: string; governorate_id: string | null; city_id: string | null; district_id: string | null } | null
  gross_revenue: number
  platform_commission: number
  net_payout: number
  status: string
  period_start: string
  period_end: string
  paid_at: string | null
  created_at: string
}

interface OrderFinance {
  id: string
  total: number
  platform_commission: number
  delivery_fee: number
  payment_method: string
  payment_status: string
  status: string
  created_at: string
}

type FilterPeriod = 'today' | 'week' | 'month' | 'year' | 'all'
type FilterSettlementStatus = 'all' | 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'disputed' | 'waived'

export default function AdminFinancePage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const { toggle: toggleSidebar } = useAdminSidebar()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(true)
  const [settlements, setSettlements] = useState<SettlementRecord[]>([])
  const [filteredSettlements, setFilteredSettlements] = useState<SettlementRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [periodFilter, setPeriodFilter] = useState<FilterPeriod>('month')
  const [settlementStatusFilter, setSettlementStatusFilter] = useState<FilterSettlementStatus>('all')
  const { geoFilter, setGeoFilter } = useGeoFilter()

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCommission: 0,
    totalDeliveryFees: 0,
    pendingSettlements: 0,
    completedSettlements: 0,
    cashOrders: 0,
    cardOrders: 0,
    walletOrders: 0,
    revenueChange: 0,
    commissionChange: 0,
    ordersCount: 0,
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    filterSettlements()
  }, [settlements, searchQuery, settlementStatusFilter, geoFilter])

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
        setLoading(false) // Show page immediately
        loadFinanceData(supabase) // Load in background
        return
      }
    }

    setLoading(false)
  }

  async function loadFinanceData(supabase: ReturnType<typeof createClient>) {
    setDataLoading(true)

    const getDateRange = (period: FilterPeriod) => {
      const start = new Date()
      switch (period) {
        case 'today':
          start.setHours(0, 0, 0, 0)
          break
        case 'week':
          start.setDate(start.getDate() - 7)
          break
        case 'month':
          start.setMonth(start.getMonth() - 1)
          break
        case 'year':
          start.setFullYear(start.getFullYear() - 1)
          break
        default:
          return null
      }
      return start.toISOString()
    }

    const startDate = getDateRange(periodFilter)

    let ordersQuery = supabase
      .from('orders')
      .select('id, total, platform_commission, delivery_fee, payment_method, payment_status, status, created_at')
      .eq('status', 'delivered')

    if (startDate) {
      ordersQuery = ordersQuery.gte('created_at', startDate)
    }

    const { data: ordersData } = await ordersQuery

    const orders = (ordersData || []) as OrderFinance[]

    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
    const totalCommission = orders.reduce((sum, o) => sum + (o.platform_commission || 0), 0)
    const totalDeliveryFees = orders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0)

    const cashOrders = orders.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + (o.total || 0), 0)
    const cardOrders = orders.filter(o => o.payment_method === 'card').reduce((sum, o) => sum + (o.total || 0), 0)
    const walletOrders = orders.filter(o => o.payment_method === 'wallet').reduce((sum, o) => sum + (o.total || 0), 0)

    const getPreviousRange = (period: FilterPeriod) => {
      const end = new Date()
      const start = new Date()
      switch (period) {
        case 'today':
          end.setDate(end.getDate() - 1)
          start.setDate(start.getDate() - 1)
          end.setHours(23, 59, 59, 999)
          start.setHours(0, 0, 0, 0)
          break
        case 'week':
          end.setDate(end.getDate() - 7)
          start.setDate(start.getDate() - 14)
          break
        case 'month':
          end.setMonth(end.getMonth() - 1)
          start.setMonth(start.getMonth() - 2)
          break
        case 'year':
          end.setFullYear(end.getFullYear() - 1)
          start.setFullYear(start.getFullYear() - 2)
          break
        default:
          return { start: null, end: null }
      }
      return { start: start.toISOString(), end: end.toISOString() }
    }

    const prevRange = getPreviousRange(periodFilter)
    let prevRevenue = 0
    let prevCommission = 0

    if (prevRange.start && prevRange.end) {
      const { data: prevOrdersData } = await supabase
        .from('orders')
        .select('total, platform_commission')
        .eq('status', 'delivered')
        .gte('created_at', prevRange.start)
        .lte('created_at', prevRange.end)

      prevRevenue = (prevOrdersData || []).reduce((sum, o) => sum + (o.total || 0), 0)
      prevCommission = (prevOrdersData || []).reduce((sum, o) => sum + (o.platform_commission || 0), 0)
    }

    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0
    const commissionChange = prevCommission > 0 ? ((totalCommission - prevCommission) / prevCommission) * 100 : 0

    const { data: settlementsData } = await supabase
      .from('settlements')
      .select(`
        id,
        provider_id,
        gross_revenue,
        platform_commission,
        net_payout,
        status,
        period_start,
        period_end,
        paid_at,
        created_at,
        provider:providers(name_ar, name_en, governorate_id, city_id, district_id)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    const settlementsTyped = (settlementsData || []) as unknown as SettlementRecord[]
    setSettlements(settlementsTyped)

    const pendingSettlements = settlementsTyped.filter(s => s.status === 'pending' || s.status === 'partially_paid').reduce((sum, s) => sum + (s.net_payout || 0), 0)
    const completedSettlements = settlementsTyped.filter(s => s.status === 'paid' || s.status === 'waived').reduce((sum, s) => sum + (s.net_payout || 0), 0)

    setStats({
      totalRevenue,
      totalCommission,
      totalDeliveryFees,
      pendingSettlements,
      completedSettlements,
      cashOrders,
      cardOrders,
      walletOrders,
      revenueChange,
      commissionChange,
      ordersCount: orders.length,
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

    if (settlementStatusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === settlementStatusFilter)
    }

    // Geographic filter
    if (geoFilter.governorate_id || geoFilter.city_id || geoFilter.district_id) {
      filtered = filtered.filter(s => {
        if (geoFilter.district_id && s.provider?.district_id) {
          return s.provider.district_id === geoFilter.district_id
        }
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
    const supabase = createClient()
    await loadFinanceData(supabase)
  }

  const getSettlementStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'status-success'
      case 'waived': return 'status-success'
      case 'pending': return 'status-warning'
      case 'partially_paid': return 'status-in-progress'
      case 'overdue': return 'status-error'
      case 'disputed': return 'status-error'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getSettlementStatusLabel = (status: string) => {
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

  const getPeriodLabel = (period: FilterPeriod) => {
    const labels: Record<FilterPeriod, { ar: string; en: string }> = {
      today: { ar: 'اليوم', en: 'Today' },
      week: { ar: 'هذا الأسبوع', en: 'This Week' },
      month: { ar: 'هذا الشهر', en: 'This Month' },
      year: { ar: 'هذا العام', en: 'This Year' },
      all: { ar: 'الكل', en: 'All Time' },
    }
    return labels[period][locale === 'ar' ? 'ar' : 'en']
  }

  if (loading) {
    return (
      <>
        <div className="h-16 bg-white border-b border-slate-200 animate-pulse" />
        <main className="flex-1 p-6 flex items-center justify-center">
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
              {locale === 'ar' ? 'الإدارة المالية' : 'Finance Management'}
            </h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
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
        title={locale === 'ar' ? 'الإدارة المالية' : 'Finance Management'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Period Filter & Geographic Filter */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
            <div className="flex flex-col gap-4">
              {/* Period Filter */}
              <div className="flex flex-wrap items-center gap-2">
                {(['today', 'week', 'month', 'year', 'all'] as FilterPeriod[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      setPeriodFilter(period)
                      const supabase = createClient()
                      loadFinanceData(supabase)
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      periodFilter === period
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {getPeriodLabel(period)}
                  </button>
                ))}
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  className="flex items-center gap-2 ml-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  {locale === 'ar' ? 'تحديث' : 'Refresh'}
                </Button>
              </div>

              {/* Geographic Filter */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <span className="text-sm text-slate-500">{locale === 'ar' ? 'فلترة جغرافية:' : 'Geographic Filter:'}</span>
                <GeoFilter
                  value={geoFilter}
                  onChange={setGeoFilter}
                  showDistrict={true}
                />
              </div>
            </div>
          </div>

          {/* Revenue Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-[#22C55E] to-[#16A34A] rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6" />
                </div>
                {stats.revenueChange !== 0 && (
                  <div className={`flex items-center gap-1 text-sm ${stats.revenueChange > 0 ? 'text-green-100' : 'text-red-100'}`}>
                    {stats.revenueChange > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {formatNumber(Math.abs(stats.revenueChange), locale)}.{formatNumber(Math.round((Math.abs(stats.revenueChange) % 1) * 10), locale)}%
                  </div>
                )}
              </div>
              <p className="text-white/80 text-sm mb-1">{locale === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
              <p className="text-white/70 text-xs mt-2">{formatNumber(stats.ordersCount, locale)} {locale === 'ar' ? 'طلب' : 'orders'}</p>
            </div>

            <div className="bg-gradient-to-br from-[#009DE0] to-[#0080b8] rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Receipt className="w-6 h-6" />
                </div>
                {stats.commissionChange !== 0 && (
                  <div className={`flex items-center gap-1 text-sm ${stats.commissionChange > 0 ? 'text-blue-100' : 'text-red-100'}`}>
                    {stats.commissionChange > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {formatNumber(Math.abs(stats.commissionChange), locale)}.{formatNumber(Math.round((Math.abs(stats.commissionChange) % 1) * 10), locale)}%
                  </div>
                )}
              </div>
              <p className="text-white/80 text-sm mb-1">{locale === 'ar' ? 'عمولة المنصة' : 'Platform Commission'}</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalCommission, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
            </div>

            <div className="bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
              <p className="text-white/80 text-sm mb-1">{locale === 'ar' ? 'رسوم التوصيل' : 'Delivery Fees'}</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalDeliveryFees, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
            </div>

            <div className="bg-gradient-to-br from-[#F59E0B] to-[#D97706] rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
              <p className="text-white/80 text-sm mb-1">{locale === 'ar' ? 'تسويات معلقة' : 'Pending Settlements'}</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.pendingSettlements, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-card-bg-success rounded-xl flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{locale === 'ar' ? 'دفع نقدي' : 'Cash'}</p>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(stats.cashOrders, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-success h-2 rounded-full"
                  style={{ width: `${stats.totalRevenue > 0 ? (stats.cashOrders / stats.totalRevenue) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {formatNumber(stats.totalRevenue > 0 ? Math.round((stats.cashOrders / stats.totalRevenue) * 1000) / 10 : 0, locale)}%
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-card-bg-primary rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{locale === 'ar' ? 'بطاقة' : 'Card'}</p>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(stats.cardOrders, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{ width: `${stats.totalRevenue > 0 ? (stats.cardOrders / stats.totalRevenue) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {formatNumber(stats.totalRevenue > 0 ? Math.round((stats.cardOrders / stats.totalRevenue) * 1000) / 10 : 0, locale)}%
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-card-bg-purple rounded-xl flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-purple" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{locale === 'ar' ? 'محفظة' : 'Wallet'}</p>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(stats.walletOrders, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-purple h-2 rounded-full"
                  style={{ width: `${stats.totalRevenue > 0 ? (stats.walletOrders / stats.totalRevenue) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {formatNumber(stats.totalRevenue > 0 ? Math.round((stats.walletOrders / stats.totalRevenue) * 1000) / 10 : 0, locale)}%
              </p>
            </div>
          </div>

          {/* Settlements Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  {locale === 'ar' ? 'تسويات المتاجر' : 'Provider Settlements'}
                </h3>
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
                    <input
                      type="text"
                      placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full sm:w-64 ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500`}
                    />
                  </div>
                  <select
                    value={settlementStatusFilter}
                    onChange={(e) => setSettlementStatusFilter(e.target.value as FilterSettlementStatus)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  >
                    <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
                    <option value="pending">{locale === 'ar' ? 'معلق' : 'Pending'}</option>
                    <option value="partially_paid">{locale === 'ar' ? 'مدفوع جزئياً' : 'Partially Paid'}</option>
                    <option value="paid">{locale === 'ar' ? 'مدفوع' : 'Paid'}</option>
                    <option value="overdue">{locale === 'ar' ? 'متأخر' : 'Overdue'}</option>
                    <option value="disputed">{locale === 'ar' ? 'نزاع' : 'Disputed'}</option>
                    <option value="waived">{locale === 'ar' ? 'معفى' : 'Waived'}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'المتجر' : 'Provider'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الفترة' : 'Period'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'العمولة' : 'Commission'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الصافي' : 'Net'}</th>
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
                          <span className="font-medium text-slate-900">{formatCurrency(settlement.gross_revenue, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-red-600">-{formatCurrency(settlement.platform_commission, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-green-600">{formatCurrency(settlement.net_payout, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${getSettlementStatusColor(settlement.status)}`}>
                            {settlement.status === 'paid' && <CheckCircle2 className="w-3 h-3" />}
                            {settlement.status === 'pending' && <Clock className="w-3 h-3" />}
                            {settlement.status === 'partially_paid' && <RefreshCw className="w-3 h-3" />}
                            {settlement.status === 'disputed' && <XCircle className="w-3 h-3" />}
                            {settlement.status === 'overdue' && <XCircle className="w-3 h-3" />}
                            {getSettlementStatusLabel(settlement.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Link href={`/${locale}/admin/finance/settlements/${settlement.id}`}>
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
    </>
  )
}

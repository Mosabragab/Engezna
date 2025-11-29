'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import {
  Shield,
  Store,
  ShoppingBag,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  Users,
  Wallet,
  Bell,
  ChevronDown,
  Search,
  Eye,
  RefreshCw,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Banknote,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Download,
  Filter,
  HeadphonesIcon,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Building,
  Receipt,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface SettlementRecord {
  id: string
  provider_id: string
  provider: { name_ar: string; name_en: string } | null
  amount: number
  platform_commission: number
  net_amount: number
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
type FilterSettlementStatus = 'all' | 'pending' | 'processing' | 'completed' | 'failed'

export default function AdminFinancePage() {
  const locale = useLocale()
  const pathname = usePathname()
  const isRTL = locale === 'ar'

  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)

  const [settlements, setSettlements] = useState<SettlementRecord[]>([])
  const [filteredSettlements, setFilteredSettlements] = useState<SettlementRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [periodFilter, setPeriodFilter] = useState<FilterPeriod>('month')
  const [settlementStatusFilter, setSettlementStatusFilter] = useState<FilterSettlementStatus>('all')

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
  }, [settlements, searchQuery, settlementStatusFilter])

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
        await loadFinanceData(supabase)
      }
    }

    setLoading(false)
  }

  async function loadFinanceData(supabase: ReturnType<typeof createClient>) {
    // Get date ranges based on period filter
    const now = new Date()
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

    // Load orders for financial stats
    let ordersQuery = supabase
      .from('orders')
      .select('id, total, platform_commission, delivery_fee, payment_method, payment_status, status, created_at')
      .eq('status', 'delivered')

    if (startDate) {
      ordersQuery = ordersQuery.gte('created_at', startDate)
    }

    const { data: ordersData } = await ordersQuery

    const orders = (ordersData || []) as OrderFinance[]

    // Calculate stats
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
    const totalCommission = orders.reduce((sum, o) => sum + (o.platform_commission || 0), 0)
    const totalDeliveryFees = orders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0)

    const cashOrders = orders.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + (o.total || 0), 0)
    const cardOrders = orders.filter(o => o.payment_method === 'card').reduce((sum, o) => sum + (o.total || 0), 0)
    const walletOrders = orders.filter(o => o.payment_method === 'wallet').reduce((sum, o) => sum + (o.total || 0), 0)

    // Load previous period for comparison
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

    // Load settlements
    const { data: settlementsData } = await supabase
      .from('settlements')
      .select(`
        id,
        provider_id,
        amount,
        platform_commission,
        net_amount,
        status,
        period_start,
        period_end,
        paid_at,
        created_at,
        provider:providers(name_ar, name_en)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    const settlementsTyped = (settlementsData || []) as unknown as SettlementRecord[]
    setSettlements(settlementsTyped)

    const pendingSettlements = settlementsTyped.filter(s => s.status === 'pending').reduce((sum, s) => sum + (s.net_amount || 0), 0)
    const completedSettlements = settlementsTyped.filter(s => s.status === 'completed').reduce((sum, s) => sum + (s.net_amount || 0), 0)

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

    setFilteredSettlements(filtered)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = `/${locale}`
  }

  async function handleRefresh() {
    setLoading(true)
    const supabase = createClient()
    await loadFinanceData(supabase)
    setLoading(false)
  }

  const navItems = [
    { icon: Home, label: locale === 'ar' ? 'الرئيسية' : 'Dashboard', path: `/${locale}/admin` },
    { icon: Store, label: locale === 'ar' ? 'المتاجر' : 'Providers', path: `/${locale}/admin/providers` },
    { icon: ShoppingBag, label: locale === 'ar' ? 'الطلبات' : 'Orders', path: `/${locale}/admin/orders` },
    { icon: Users, label: locale === 'ar' ? 'العملاء' : 'Customers', path: `/${locale}/admin/customers` },
    { icon: Wallet, label: locale === 'ar' ? 'المالية' : 'Finance', path: `/${locale}/admin/finance`, active: true },
    { icon: BarChart3, label: locale === 'ar' ? 'التحليلات' : 'Analytics', path: `/${locale}/admin/analytics` },
    { icon: HeadphonesIcon, label: locale === 'ar' ? 'الدعم' : 'Support', path: `/${locale}/admin/support` },
    { icon: Activity, label: locale === 'ar' ? 'سجل النشاط' : 'Activity Log', path: `/${locale}/admin/activity-log` },
    { icon: Settings, label: locale === 'ar' ? 'الإعدادات' : 'Settings', path: `/${locale}/admin/settings` },
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG').format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getSettlementStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'processing': return 'bg-blue-100 text-blue-700'
      case 'failed': return 'bg-red-100 text-red-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getSettlementStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      pending: { ar: 'معلق', en: 'Pending' },
      processing: { ar: 'قيد المعالجة', en: 'Processing' },
      completed: { ar: 'مكتمل', en: 'Completed' },
      failed: { ar: 'فشل', en: 'Failed' },
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
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        fixed lg:static inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-50
        w-64 bg-white border-${isRTL ? 'l' : 'r'} border-slate-200 shadow-sm
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'} lg:translate-x-0
        flex flex-col
      `}>
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <Link href={`/${locale}/admin`} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-slate-900">{locale === 'ar' ? 'إنجزنا' : 'Engezna'}</h1>
                <p className="text-xs text-slate-500">{locale === 'ar' ? 'لوحة المشرفين' : 'Admin Panel'}</p>
              </div>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-500 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.active || pathname === item.path
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                  ${isActive ? 'bg-red-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-700">
                <Menu className="w-6 h-6" />
              </button>
            </div>

            <div className="hidden md:flex items-center justify-center flex-1">
              <h2 className="text-lg font-semibold text-slate-800">
                {locale === 'ar' ? 'الإدارة المالية' : 'Finance Management'}
              </h2>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg">
                <Bell className="w-5 h-5" />
              </button>
              <div className="relative" onMouseEnter={() => setAccountMenuOpen(true)} onMouseLeave={() => setAccountMenuOpen(false)}>
                <button className="flex items-center gap-2 p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="font-semibold text-sm text-red-600">{user?.email?.charAt(0).toUpperCase()}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {accountMenuOpen && (
                  <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full pt-2 w-56 z-50`}>
                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 py-2">
                      <button onClick={handleSignOut} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                        <LogOut className="w-4 h-4" />
                        {locale === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Period Filter */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
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

          {/* Revenue Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6" />
                </div>
                {stats.revenueChange !== 0 && (
                  <div className={`flex items-center gap-1 text-sm ${stats.revenueChange > 0 ? 'text-green-100' : 'text-red-100'}`}>
                    {stats.revenueChange > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {Math.abs(stats.revenueChange).toFixed(1)}%
                  </div>
                )}
              </div>
              <p className="text-green-100 text-sm mb-1">{locale === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
              <p className="text-green-100 text-xs mt-2">{stats.ordersCount} {locale === 'ar' ? 'طلب' : 'orders'}</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Receipt className="w-6 h-6" />
                </div>
                {stats.commissionChange !== 0 && (
                  <div className={`flex items-center gap-1 text-sm ${stats.commissionChange > 0 ? 'text-blue-100' : 'text-red-100'}`}>
                    {stats.commissionChange > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {Math.abs(stats.commissionChange).toFixed(1)}%
                  </div>
                )}
              </div>
              <p className="text-blue-100 text-sm mb-1">{locale === 'ar' ? 'عمولة المنصة' : 'Platform Commission'}</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalCommission)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
              <p className="text-purple-100 text-sm mb-1">{locale === 'ar' ? 'رسوم التوصيل' : 'Delivery Fees'}</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalDeliveryFees)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
              <p className="text-orange-100 text-sm mb-1">{locale === 'ar' ? 'تسويات معلقة' : 'Pending Settlements'}</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.pendingSettlements)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{locale === 'ar' ? 'دفع نقدي' : 'Cash'}</p>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(stats.cashOrders)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${stats.totalRevenue > 0 ? (stats.cashOrders / stats.totalRevenue) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {stats.totalRevenue > 0 ? ((stats.cashOrders / stats.totalRevenue) * 100).toFixed(1) : 0}%
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{locale === 'ar' ? 'بطاقة' : 'Card'}</p>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(stats.cardOrders)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${stats.totalRevenue > 0 ? (stats.cardOrders / stats.totalRevenue) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {stats.totalRevenue > 0 ? ((stats.cardOrders / stats.totalRevenue) * 100).toFixed(1) : 0}%
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{locale === 'ar' ? 'محفظة' : 'Wallet'}</p>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(stats.walletOrders)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ width: `${stats.totalRevenue > 0 ? (stats.walletOrders / stats.totalRevenue) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {stats.totalRevenue > 0 ? ((stats.walletOrders / stats.totalRevenue) * 100).toFixed(1) : 0}%
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
                    <option value="processing">{locale === 'ar' ? 'قيد المعالجة' : 'Processing'}</option>
                    <option value="completed">{locale === 'ar' ? 'مكتمل' : 'Completed'}</option>
                    <option value="failed">{locale === 'ar' ? 'فشل' : 'Failed'}</option>
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
                            <p className="text-slate-900">{formatDate(settlement.period_start)}</p>
                            <p className="text-slate-500">{locale === 'ar' ? 'إلى' : 'to'} {formatDate(settlement.period_end)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900">{formatCurrency(settlement.amount)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-red-600">-{formatCurrency(settlement.platform_commission)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-green-600">{formatCurrency(settlement.net_amount)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${getSettlementStatusColor(settlement.status)}`}>
                            {settlement.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                            {settlement.status === 'pending' && <Clock className="w-3 h-3" />}
                            {settlement.status === 'processing' && <RefreshCw className="w-3 h-3" />}
                            {settlement.status === 'failed' && <XCircle className="w-3 h-3" />}
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
      </div>
    </div>
  )
}

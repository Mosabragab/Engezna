'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, useAdminSidebar } from '@/components/admin'
import { formatNumber, formatCurrency, formatTimeAgo } from '@/lib/utils/formatters'
import {
  Shield,
  Store,
  ShoppingBag,
  Users,
  TrendingUp,
  TrendingDown,
  HeadphonesIcon,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Hourglass,
  Wallet,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface DashboardStats {
  ordersToday: number
  ordersWeek: number
  ordersChange: number
  gmvMonth: number
  gmvChange: number
  activeProviders: number
  pendingProviders: number
  totalCustomers: number
  newCustomersToday: number
  openTickets: number
  pendingApprovals: number
  commissionsMonth: number
  pendingSettlements: number
}

interface RecentOrder {
  id: string
  order_number: string
  total: number
  status: string
  created_at: string
  provider: { name_ar: string; name_en: string } | null
  customer: { full_name: string } | null
}

interface PendingProvider {
  id: string
  name_ar: string
  name_en: string
  category: string
  created_at: string
  phone: string
}

export default function AdminDashboard() {
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const { toggle: toggleSidebar } = useAdminSidebar()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    ordersToday: 0,
    ordersWeek: 0,
    ordersChange: 0,
    gmvMonth: 0,
    gmvChange: 0,
    activeProviders: 0,
    pendingProviders: 0,
    totalCustomers: 0,
    newCustomersToday: 0,
    openTickets: 0,
    pendingApprovals: 0,
    commissionsMonth: 0,
    pendingSettlements: 0,
  })
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [pendingProviders, setPendingProviders] = useState<PendingProvider[]>([])
  const [dataError, setDataError] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

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
        await loadDashboardData(supabase)
      }
    }

    setLoading(false)
  }

  async function loadDashboardData(supabase: ReturnType<typeof createClient>) {
    try {
      // Load stats from API
      const statsResponse = await fetch('/api/admin/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dashboard' }),
      })
      const statsResult = await statsResponse.json()

      // Load recent orders and pending providers in parallel
      const [
        { data: pendingProvidersData },
        { data: recentOrdersData },
      ] = await Promise.all([
        supabase.from('providers').select('id, name_ar, name_en, category, created_at, phone')
          .in('status', ['pending_approval', 'incomplete'])
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('orders')
          .select(`
            id,
            order_number,
            total,
            status,
            created_at,
            provider:providers(name_ar, name_en),
            customer:profiles(full_name)
          `)
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      // Set stats from API response
      if (statsResult.success && statsResult.data) {
        const apiStats = statsResult.data
        setStats({
          ordersToday: apiStats.orders?.todayCount || 0,
          ordersWeek: apiStats.orders?.thisWeekCount || 0,
          ordersChange: apiStats.orders?.weekChangePercent || apiStats.orders?.changePercent || 0,
          gmvMonth: apiStats.finance?.thisMonthRevenue || 0,
          gmvChange: apiStats.finance?.changePercent || 0,
          activeProviders: apiStats.providers?.approved || 0,
          pendingProviders: apiStats.providers?.pending || 0,
          totalCustomers: apiStats.users?.customers || 0,
          newCustomersToday: apiStats.users?.newThisMonth || 0,
          openTickets: 0,
          pendingApprovals: apiStats.providers?.pending || 0,
          commissionsMonth: apiStats.finance?.totalCommission || 0,
          pendingSettlements: apiStats.finance?.pendingSettlement || 0,
        })
      }

      setPendingProviders(pendingProvidersData || [])
      const transformedOrders = (recentOrdersData || []).map((order: {
        id: string
        order_number: string
        total: number
        status: string
        created_at: string
        provider: { name_ar: string; name_en: string }[] | { name_ar: string; name_en: string } | null
        customer: { full_name: string }[] | { full_name: string } | null
      }) => ({
        ...order,
        provider: Array.isArray(order.provider) ? order.provider[0] || null : order.provider,
        customer: Array.isArray(order.customer) ? order.customer[0] || null : order.customer,
      }))
      setRecentOrders(transformedOrders as RecentOrder[])
    } catch {
      setDataError(locale === 'ar' ? 'خطأ في تحميل بيانات لوحة التحكم' : 'Error loading dashboard data')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'status-success'
      case 'pending': return 'status-warning'
      case 'preparing': return 'status-in-progress'
      case 'cancelled': case 'rejected': return 'status-error'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      pending: { ar: 'معلق', en: 'Pending' },
      accepted: { ar: 'مقبول', en: 'Accepted' },
      preparing: { ar: 'قيد التحضير', en: 'Preparing' },
      ready: { ar: 'جاهز', en: 'Ready' },
      out_for_delivery: { ar: 'في الطريق', en: 'Out for Delivery' },
      delivered: { ar: 'تم التسليم', en: 'Delivered' },
      cancelled: { ar: 'ملغي', en: 'Cancelled' },
      rejected: { ar: 'مرفوض', en: 'Rejected' },
    }
    return labels[status]?.[locale === 'ar' ? 'ar' : 'en'] || status
  }

  // Loading and unauthorized states render inside the layout (sidebar stays visible)
  if (loading) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <div className="w-32 h-5 bg-slate-200 rounded animate-pulse" />
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
          </div>
        </main>
      </>
    )
  }

  if (!user || !isAdmin) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <h2 className="text-lg font-semibold text-slate-800">
              {locale === 'ar' ? 'لوحة القيادة' : 'Dashboard'}
            </h2>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
              <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2 text-slate-900">
                {locale === 'ar' ? 'لوحة الإدارة' : 'Admin Dashboard'}
              </h1>
              <p className="text-slate-600 mb-6">
                {locale === 'ar' ? 'يجب تسجيل الدخول كمسؤول للوصول' : 'Admin access required'}
              </p>
              <Link href={`/${locale}/auth/login`}>
                <Button size="lg" className="bg-red-600 hover:bg-red-700">
                  {locale === 'ar' ? 'تسجيل الدخول' : 'Login'}
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      {/* Header */}
      <AdminHeader
        user={user}
        title={locale === 'ar' ? 'لوحة القيادة' : 'Dashboard'}
        subtitle={locale === 'ar' ? 'نظرة عامة على المنصة' : 'Platform Overview'}
        onMenuClick={toggleSidebar}
        notificationCount={stats.pendingProviders + stats.openTickets}
      />

      {/* Dashboard Content */}
      <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Welcome */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {locale === 'ar' ? 'مرحباً، مسؤول' : 'Welcome, Admin'}
            </h2>
            <p className="text-slate-500">
              {locale === 'ar' ? 'إليك نظرة عامة على منصة إنجزنا' : "Here's an overview of Engezna platform"}
            </p>
          </div>

          {/* Error Alert */}
          {dataError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center justify-between">
              <span>{dataError}</span>
              <button
                onClick={() => {
                  setDataError(null)
                  const supabase = createClient()
                  loadDashboardData(supabase)
                }}
                className="text-sm bg-red-100 hover:bg-red-200 px-3 py-1 rounded-lg transition-colors"
              >
                {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
              </button>
            </div>
          )}

          {/* KPI Cards - Row 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* GMV */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-card-bg-success rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-success" />
                </div>
                <span className={`text-xs flex items-center gap-1 ${stats.gmvChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.gmvChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {formatNumber(Math.abs(stats.gmvChange), locale)}%
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.gmvMonth, locale)}</p>
              <p className="text-xs text-slate-500">{locale === 'ar' ? 'إجمالي المبيعات (الشهر)' : 'GMV (Month)'}</p>
            </div>

            {/* Orders Today */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-card-bg-primary rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                </div>
                <span className={`text-xs flex items-center gap-1 ${stats.ordersChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.ordersChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {formatNumber(Math.abs(stats.ordersChange), locale)}%
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.ordersToday, locale)}</p>
              <p className="text-xs text-slate-500">{locale === 'ar' ? 'طلبات اليوم' : "Today's Orders"}</p>
            </div>

            {/* Active Providers */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-card-bg-purple rounded-lg flex items-center justify-center">
                  <Store className="w-5 h-5 text-purple" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.activeProviders, locale)}</p>
              <p className="text-xs text-slate-500">{locale === 'ar' ? 'المتاجر النشطة' : 'Active Providers'}</p>
            </div>

            {/* New Customers */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-card-bg-info rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-info" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">+{formatNumber(stats.newCustomersToday, locale)}</p>
              <p className="text-xs text-slate-500">{locale === 'ar' ? 'عملاء جدد اليوم' : 'New Customers Today'}</p>
            </div>
          </div>

          {/* Attention Required Cards - Row 2 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Pending Providers */}
            <Link href={`/${locale}/admin/providers?status=pending`} className="bg-card-bg-amber rounded-xl p-4 border border-amber/30 hover:border-amber/50 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <Hourglass className="w-5 h-5 text-amber" />
                <span className="text-sm font-medium text-amber">
                  {locale === 'ar' ? 'متاجر جديدة' : 'New Providers'}
                </span>
              </div>
              <p className="text-3xl font-bold text-amber">{formatNumber(stats.pendingProviders, locale)}</p>
              <p className="text-xs text-amber/80">{locale === 'ar' ? 'تنتظر الموافقة' : 'Awaiting Approval'}</p>
            </Link>

            {/* Open Tickets */}
            <Link href={`/${locale}/admin/support`} className="bg-card-bg-primary rounded-xl p-4 border border-primary/30 hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <HeadphonesIcon className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-primary">
                  {locale === 'ar' ? 'تذاكر الدعم' : 'Support Tickets'}
                </span>
              </div>
              <p className="text-3xl font-bold text-primary">{formatNumber(stats.openTickets, locale)}</p>
              <p className="text-xs text-primary/80">{locale === 'ar' ? 'مفتوحة' : 'Open'}</p>
            </Link>

            {/* Pending Settlements */}
            <Link href={`/${locale}/admin/finance/settlements`} className="bg-card-bg-purple rounded-xl p-4 border border-purple/30 hover:border-purple/50 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <Wallet className="w-5 h-5 text-purple" />
                <span className="text-sm font-medium text-purple">
                  {locale === 'ar' ? 'تسويات معلقة' : 'Pending Settlements'}
                </span>
              </div>
              <p className="text-3xl font-bold text-purple">{formatCurrency(stats.pendingSettlements, locale)}</p>
              <p className="text-xs text-purple/80">{locale === 'ar' ? 'ج.م' : 'EGP'}</p>
            </Link>

            {/* Commissions */}
            <div className="bg-card-bg-success rounded-xl p-4 border border-success/30">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-5 h-5 text-success" />
                <span className="text-sm font-medium text-success">
                  {locale === 'ar' ? 'العمولات' : 'Commissions'}
                </span>
              </div>
              <p className="text-3xl font-bold text-success">{formatCurrency(stats.commissionsMonth, locale)}</p>
              <p className="text-xs text-success/80">{locale === 'ar' ? 'هذا الشهر' : 'This Month'}</p>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Orders */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">
                  {locale === 'ar' ? 'آخر الطلبات' : 'Recent Orders'}
                </h3>
                <Link href={`/${locale}/admin/orders`} className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1">
                  {locale === 'ar' ? 'عرض الكل' : 'View All'}
                  <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <div key={order.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-900">#{order.order_number}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">
                          {locale === 'ar' ? order.provider?.name_ar : order.provider?.name_en}
                        </span>
                        <span className="font-medium text-slate-700">
                          {formatCurrency(order.total, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{formatTimeAgo(order.created_at, locale)}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>{locale === 'ar' ? 'لا توجد طلبات حديثة' : 'No recent orders'}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Pending Providers */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">
                  {locale === 'ar' ? 'طلبات الانضمام' : 'Provider Applications'}
                </h3>
                <Link href={`/${locale}/admin/providers?status=pending`} className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1">
                  {locale === 'ar' ? 'عرض الكل' : 'View All'}
                  <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {pendingProviders.length > 0 ? (
                  pendingProviders.map((provider) => (
                    <div key={provider.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-900">
                          {locale === 'ar' ? provider.name_ar : provider.name_en}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                          {locale === 'ar' ? 'قيد المراجعة' : 'Pending'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 capitalize">{provider.category.replace('_', ' ')}</span>
                        <span className="text-slate-500">{provider.phone}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{formatTimeAgo(provider.created_at, locale)}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-300" />
                    <p>{locale === 'ar' ? 'لا توجد طلبات معلقة' : 'No pending applications'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="mt-6 bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-4">
              {locale === 'ar' ? 'ملخص المنصة' : 'Platform Summary'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-slate-500 mb-1">{locale === 'ar' ? 'إجمالي العملاء' : 'Total Customers'}</p>
                <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.totalCustomers, locale)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">{locale === 'ar' ? 'طلبات الأسبوع' : 'Weekly Orders'}</p>
                <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.ordersWeek, locale)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">{locale === 'ar' ? 'المتاجر النشطة' : 'Active Providers'}</p>
                <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.activeProviders, locale)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">{locale === 'ar' ? 'العمولات (الشهر)' : 'Commissions (Month)'}</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.commissionsMonth, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
              </div>
            </div>
          </div>
        </main>
    </>
  )
}

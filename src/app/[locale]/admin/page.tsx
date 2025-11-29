'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, AdminSidebar } from '@/components/admin'
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
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
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
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const monthAgo = new Date()
    monthAgo.setDate(monthAgo.getDate() - 30)

    const twoMonthsAgo = new Date()
    twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60)

    try {
      const [
        { data: ordersToday },
        { data: ordersWeek },
        { data: ordersLastWeek },
        { data: ordersMonth },
        { data: ordersLastMonth },
        { data: activeProviders },
        { data: pendingProvidersData },
        { data: totalCustomers },
        { data: newCustomersToday },
        { data: pendingSettlementsData },
        { data: recentOrdersData },
      ] = await Promise.all([
        supabase.from('orders').select('id').gte('created_at', today.toISOString()),
        supabase.from('orders').select('id').gte('created_at', weekAgo.toISOString()),
        supabase.from('orders').select('id')
          .gte('created_at', new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .lt('created_at', weekAgo.toISOString()),
        supabase.from('orders').select('total, platform_commission')
          .eq('status', 'delivered')
          .gte('created_at', monthAgo.toISOString()),
        supabase.from('orders').select('total')
          .eq('status', 'delivered')
          .gte('created_at', twoMonthsAgo.toISOString())
          .lt('created_at', monthAgo.toISOString()),
        supabase.from('providers').select('id')
          .in('status', ['open', 'closed', 'temporarily_paused', 'on_vacation']),
        supabase.from('providers').select('id, name_ar, name_en, category, created_at, phone')
          .eq('status', 'pending_approval')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('profiles').select('id').eq('role', 'customer'),
        supabase.from('profiles').select('id')
          .eq('role', 'customer')
          .gte('created_at', today.toISOString()),
        supabase.from('settlements').select('id').eq('status', 'pending'),
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

      const gmvMonth = ordersMonth?.reduce((sum, o) => sum + (o.total || 0), 0) || 0
      const gmvLastMonth = ordersLastMonth?.reduce((sum, o) => sum + (o.total || 0), 0) || 0
      const commissionsMonth = ordersMonth?.reduce((sum, o) => sum + (o.platform_commission || 0), 0) || 0

      const ordersWeekCount = ordersWeek?.length || 0
      const ordersLastWeekCount = ordersLastWeek?.length || 0
      const ordersChange = ordersLastWeekCount > 0
        ? Math.round(((ordersWeekCount - ordersLastWeekCount) / ordersLastWeekCount) * 100)
        : 0

      const gmvChange = gmvLastMonth > 0
        ? Math.round(((gmvMonth - gmvLastMonth) / gmvLastMonth) * 100)
        : 0

      setStats({
        ordersToday: ordersToday?.length || 0,
        ordersWeek: ordersWeekCount,
        ordersChange,
        gmvMonth,
        gmvChange,
        activeProviders: activeProviders?.length || 0,
        pendingProviders: pendingProvidersData?.length || 0,
        totalCustomers: totalCustomers?.length || 0,
        newCustomersToday: newCustomersToday?.length || 0,
        openTickets: 0,
        pendingApprovals: 0,
        commissionsMonth,
        pendingSettlements: pendingSettlementsData?.length || 0,
      })

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
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'preparing': return 'bg-blue-100 text-blue-700'
      case 'cancelled': case 'rejected': return 'bg-red-100 text-red-700'
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
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pendingProviders={stats.pendingProviders}
        openTickets={stats.openTickets}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <AdminHeader
          user={user}
          title={locale === 'ar' ? 'لوحة القيادة' : 'Dashboard'}
          subtitle={locale === 'ar' ? 'نظرة عامة على المنصة' : 'Platform Overview'}
          onMenuClick={() => setSidebarOpen(true)}
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

          {/* KPI Cards - Row 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* GMV */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
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
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-blue-600" />
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
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Store className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.activeProviders, locale)}</p>
              <p className="text-xs text-slate-500">{locale === 'ar' ? 'المتاجر النشطة' : 'Active Providers'}</p>
            </div>

            {/* New Customers */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-cyan-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">+{formatNumber(stats.newCustomersToday, locale)}</p>
              <p className="text-xs text-slate-500">{locale === 'ar' ? 'عملاء جدد اليوم' : 'New Customers Today'}</p>
            </div>
          </div>

          {/* Attention Required Cards - Row 2 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Pending Providers */}
            <Link href={`/${locale}/admin/providers?status=pending`} className="bg-amber-50 rounded-xl p-4 border border-amber-200 hover:border-amber-300 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <Hourglass className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  {locale === 'ar' ? 'متاجر جديدة' : 'New Providers'}
                </span>
              </div>
              <p className="text-3xl font-bold text-amber-700">{formatNumber(stats.pendingProviders, locale)}</p>
              <p className="text-xs text-amber-600">{locale === 'ar' ? 'تنتظر الموافقة' : 'Awaiting Approval'}</p>
            </Link>

            {/* Open Tickets */}
            <Link href={`/${locale}/admin/support`} className="bg-blue-50 rounded-xl p-4 border border-blue-200 hover:border-blue-300 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <HeadphonesIcon className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  {locale === 'ar' ? 'تذاكر الدعم' : 'Support Tickets'}
                </span>
              </div>
              <p className="text-3xl font-bold text-blue-700">{formatNumber(stats.openTickets, locale)}</p>
              <p className="text-xs text-blue-600">{locale === 'ar' ? 'مفتوحة' : 'Open'}</p>
            </Link>

            {/* Pending Settlements */}
            <Link href={`/${locale}/admin/finance/settlements`} className="bg-purple-50 rounded-xl p-4 border border-purple-200 hover:border-purple-300 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <Wallet className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">
                  {locale === 'ar' ? 'تسويات معلقة' : 'Pending Settlements'}
                </span>
              </div>
              <p className="text-3xl font-bold text-purple-700">{formatNumber(stats.pendingSettlements, locale)}</p>
              <p className="text-xs text-purple-600">{locale === 'ar' ? 'متجر' : 'Providers'}</p>
            </Link>

            {/* Commissions */}
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  {locale === 'ar' ? 'العمولات' : 'Commissions'}
                </span>
              </div>
              <p className="text-3xl font-bold text-green-700">{formatCurrency(stats.commissionsMonth, locale)}</p>
              <p className="text-xs text-green-600">{locale === 'ar' ? 'هذا الشهر' : 'This Month'}</p>
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
      </div>
    </div>
  )
}

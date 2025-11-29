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
  Clock,
  Users,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Bell,
  User as UserIcon,
  ChevronDown,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  HeadphonesIcon,
  FileText,
  Activity,
  CheckCircle2,
  XCircle,
  Hourglass,
  DollarSign,
  ArrowRight,
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
  const pathname = usePathname()
  const isRTL = locale === 'ar'
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
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
      // Check if user is admin
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
      // Run all queries in parallel
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
        // Orders today
        supabase.from('orders').select('id').gte('created_at', today.toISOString()),
        // Orders this week
        supabase.from('orders').select('id').gte('created_at', weekAgo.toISOString()),
        // Orders last week (for comparison)
        supabase.from('orders').select('id')
          .gte('created_at', new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .lt('created_at', weekAgo.toISOString()),
        // Orders this month (delivered only for GMV)
        supabase.from('orders').select('total, platform_commission')
          .eq('status', 'delivered')
          .gte('created_at', monthAgo.toISOString()),
        // Orders last month (for comparison)
        supabase.from('orders').select('total')
          .eq('status', 'delivered')
          .gte('created_at', twoMonthsAgo.toISOString())
          .lt('created_at', monthAgo.toISOString()),
        // Active providers
        supabase.from('providers').select('id')
          .in('status', ['open', 'closed', 'temporarily_paused', 'on_vacation']),
        // Pending providers
        supabase.from('providers').select('id, name_ar, name_en, category, created_at, phone')
          .eq('status', 'pending_approval')
          .order('created_at', { ascending: false })
          .limit(5),
        // Total customers
        supabase.from('profiles').select('id').eq('role', 'customer'),
        // New customers today
        supabase.from('profiles').select('id')
          .eq('role', 'customer')
          .gte('created_at', today.toISOString()),
        // Pending settlements
        supabase.from('settlements').select('id').eq('status', 'pending'),
        // Recent orders
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

      // Calculate GMV and commissions
      const gmvMonth = ordersMonth?.reduce((sum, o) => sum + (o.total || 0), 0) || 0
      const gmvLastMonth = ordersLastMonth?.reduce((sum, o) => sum + (o.total || 0), 0) || 0
      const commissionsMonth = ordersMonth?.reduce((sum, o) => sum + (o.platform_commission || 0), 0) || 0

      // Calculate week over week change
      const ordersWeekCount = ordersWeek?.length || 0
      const ordersLastWeekCount = ordersLastWeek?.length || 0
      const ordersChange = ordersLastWeekCount > 0
        ? Math.round(((ordersWeekCount - ordersLastWeekCount) / ordersLastWeekCount) * 100)
        : 0

      // Calculate month over month change
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
        openTickets: 0, // Will be updated when support_tickets table exists
        pendingApprovals: 0, // Will be updated when approval_requests table exists
        commissionsMonth,
        pendingSettlements: pendingSettlementsData?.length || 0,
      })

      setPendingProviders(pendingProvidersData || [])
      // Transform the data to match the expected interface
      // Supabase returns relations as arrays, so we need to extract the first element
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

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = `/${locale}`
  }

  const navItems = [
    {
      icon: Home,
      label: locale === 'ar' ? 'الرئيسية' : 'Dashboard',
      path: `/${locale}/admin`,
      active: pathname === `/${locale}/admin`
    },
    {
      icon: Store,
      label: locale === 'ar' ? 'المتاجر' : 'Providers',
      path: `/${locale}/admin/providers`,
      badge: stats.pendingProviders > 0 ? stats.pendingProviders.toString() : undefined
    },
    {
      icon: ShoppingBag,
      label: locale === 'ar' ? 'الطلبات' : 'Orders',
      path: `/${locale}/admin/orders`
    },
    {
      icon: Users,
      label: locale === 'ar' ? 'العملاء' : 'Customers',
      path: `/${locale}/admin/customers`
    },
    {
      icon: Wallet,
      label: locale === 'ar' ? 'المالية' : 'Finance',
      path: `/${locale}/admin/finance`
    },
    {
      icon: BarChart3,
      label: locale === 'ar' ? 'التحليلات' : 'Analytics',
      path: `/${locale}/admin/analytics`
    },
    {
      icon: HeadphonesIcon,
      label: locale === 'ar' ? 'الدعم' : 'Support',
      path: `/${locale}/admin/support`,
      badge: stats.openTickets > 0 ? stats.openTickets.toString() : undefined
    },
    {
      icon: Activity,
      label: locale === 'ar' ? 'سجل النشاط' : 'Activity Log',
      path: `/${locale}/admin/activity-log`
    },
    {
      icon: Settings,
      label: locale === 'ar' ? 'الإعدادات' : 'Settings',
      path: `/${locale}/admin/settings`
    },
  ]

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) {
      return locale === 'ar' ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`
    } else if (diffHours < 24) {
      return locale === 'ar' ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`
    } else {
      return locale === 'ar' ? `منذ ${diffDays} يوم` : `${diffDays}d ago`
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
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-50
        w-64 bg-white border-${isRTL ? 'l' : 'r'} border-slate-200 shadow-sm
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'} lg:translate-x-0
        flex flex-col
      `}>
        {/* Logo */}
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
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-500 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.active || pathname === item.path
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                  ${isActive
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                `}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.label}</span>
                {item.badge && (
                  <span className={`${isRTL ? 'mr-auto' : 'ml-auto'} bg-red-500 text-white text-xs px-2 py-0.5 rounded-full`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-500 hover:text-slate-700"
              >
                <Menu className="w-6 h-6" />
              </button>

              <Link href={`/${locale}/admin`} className="lg:hidden flex items-center gap-2">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-red-600">
                  {locale === 'ar' ? 'إنجزنا' : 'Engezna'}
                </span>
              </Link>
            </div>

            <div className="hidden md:flex items-center justify-center flex-1">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-slate-800">
                  {locale === 'ar' ? 'لوحة القيادة' : 'Dashboard'}
                </h2>
                <p className="text-xs text-slate-500">
                  {locale === 'ar' ? 'نظرة عامة على المنصة' : 'Platform Overview'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button className="relative p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                {(stats.pendingProviders > 0 || stats.openTickets > 0) && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {Math.min(stats.pendingProviders + stats.openTickets, 9)}+
                  </span>
                )}
              </button>

              <div
                className="relative"
                onMouseEnter={() => setAccountMenuOpen(true)}
                onMouseLeave={() => setAccountMenuOpen(false)}
              >
                <button className="flex items-center gap-2 p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="font-semibold text-sm text-red-600">
                      {user?.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden sm:inline text-sm font-medium text-slate-700">
                    {locale === 'ar' ? 'المسؤول' : 'Admin'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {accountMenuOpen && (
                  <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full pt-2 w-56 z-50`}>
                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 py-2">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-sm font-medium text-slate-900">{user?.email?.split('@')[0]}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                      </div>

                      <div className="py-1">
                        <Link
                          href={`/${locale}/admin/settings`}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <UserIcon className="w-4 h-4" />
                          {locale === 'ar' ? 'الإعدادات' : 'Settings'}
                        </Link>
                        <Link
                          href={`/${locale}`}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                          {locale === 'ar' ? 'العودة للموقع' : 'Back to Site'}
                        </Link>
                      </div>

                      <div className="border-t border-slate-100 pt-1">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          {locale === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

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
                  {stats.gmvChange}%
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.gmvMonth)}</p>
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
                  {stats.ordersChange}%
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.ordersToday}</p>
              <p className="text-xs text-slate-500">{locale === 'ar' ? 'طلبات اليوم' : "Today's Orders"}</p>
            </div>

            {/* Active Providers */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Store className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.activeProviders}</p>
              <p className="text-xs text-slate-500">{locale === 'ar' ? 'المتاجر النشطة' : 'Active Providers'}</p>
            </div>

            {/* New Customers */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-cyan-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">+{stats.newCustomersToday}</p>
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
              <p className="text-3xl font-bold text-amber-700">{stats.pendingProviders}</p>
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
              <p className="text-3xl font-bold text-blue-700">{stats.openTickets}</p>
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
              <p className="text-3xl font-bold text-purple-700">{stats.pendingSettlements}</p>
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
              <p className="text-3xl font-bold text-green-700">{formatCurrency(stats.commissionsMonth)}</p>
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
                        <span className="font-medium text-slate-700">{formatCurrency(order.total)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{formatTimeAgo(order.created_at)}</p>
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
                      <p className="text-xs text-slate-400 mt-1">{formatTimeAgo(provider.created_at)}</p>
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
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalCustomers)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">{locale === 'ar' ? 'طلبات الأسبوع' : 'Weekly Orders'}</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.ordersWeek)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">{locale === 'ar' ? 'المتاجر النشطة' : 'Active Providers'}</p>
                <p className="text-2xl font-bold text-slate-900">{stats.activeProviders}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">{locale === 'ar' ? 'العمولات (الشهر)' : 'Commissions (Month)'}</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.commissionsMonth)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

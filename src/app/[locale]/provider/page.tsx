'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import {
  Store,
  Package,
  ShoppingBag,
  BarChart3,
  Settings,
  ArrowRight,
  LogOut,
  Menu,
  X,
  Home,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileWarning,
  XCircle,
  Hourglass,
  Wallet,
  Tag,
  ChevronLeft,
  ChevronRight,
  Users,
  DollarSign,
  User as UserIcon,
} from 'lucide-react'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Provider type
interface Provider {
  id: string
  name_ar: string
  name_en: string
  logo_url: string | null
  status: 'incomplete' | 'pending_approval' | 'approved' | 'rejected' | 'open' | 'closed' | 'temporarily_paused' | 'on_vacation'
  category: string
  rejection_reason?: string | null
}

// Stats type
interface DashboardStats {
  todayOrders: number
  todayRevenue: number
  pendingOrders: number
  activeProducts: number
  totalOrders: number
  totalCustomers: number
}

export default function ProviderDashboard() {
  const locale = useLocale()
  const pathname = usePathname()
  const isRTL = locale === 'ar'
  const [user, setUser] = useState<User | null>(null)
  const [provider, setProvider] = useState<Provider | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [stats, setStats] = useState<DashboardStats>({
    todayOrders: 0,
    todayRevenue: 0,
    pendingOrders: 0,
    activeProducts: 0,
    totalOrders: 0,
    totalCustomers: 0,
  })

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    if (user) {
      // Load provider data (use limit(1) instead of single() to handle multiple providers)
      const { data: providerData } = await supabase
        .from('providers')
        .select('*')
        .eq('owner_id', user.id)
        .limit(1)

      if (providerData && providerData.length > 0) {
        setProvider(providerData[0])

        // Load stats for the provider
        await loadStats(providerData[0].id, supabase)
      }
    }

    setLoading(false)
  }

  async function loadStats(providerId: string, supabase: ReturnType<typeof createClient>) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get today's orders (only delivered orders for revenue calculation)
    const { data: todayOrdersData } = await supabase
      .from('orders')
      .select('id, total, status')
      .eq('provider_id', providerId)
      .gte('created_at', today.toISOString())

    // Get pending orders
    const { data: pendingData } = await supabase
      .from('orders')
      .select('id')
      .eq('provider_id', providerId)
      .in('status', ['pending', 'accepted', 'preparing'])

    // Get active products (menu_items table)
    const { data: productsData } = await supabase
      .from('menu_items')
      .select('id')
      .eq('provider_id', providerId)
      .eq('is_available', true)

    // Get total orders
    const { data: totalOrdersData } = await supabase
      .from('orders')
      .select('id')
      .eq('provider_id', providerId)

    // Get unique customers
    const { data: customersData } = await supabase
      .from('orders')
      .select('user_id')
      .eq('provider_id', providerId)

    const uniqueCustomers = new Set(customersData?.map(o => o.user_id) || [])

    // Calculate revenue from delivered orders only
    const deliveredOrders = todayOrdersData?.filter(o => o.status === 'delivered') || []

    setStats({
      todayOrders: todayOrdersData?.length || 0,
      todayRevenue: deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0),
      pendingOrders: pendingData?.length || 0,
      activeProducts: productsData?.length || 0,
      totalOrders: totalOrdersData?.length || 0,
      totalCustomers: uniqueCustomers.size,
    })
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = `/${locale}`
  }

  // Navigation items with proper paths
  const navItems = [
    {
      icon: Home,
      label: locale === 'ar' ? 'الرئيسية' : 'Dashboard',
      path: `/${locale}/provider`,
      active: pathname === `/${locale}/provider`
    },
    {
      icon: ShoppingBag,
      label: locale === 'ar' ? 'الطلبات' : 'Orders',
      path: `/${locale}/provider/orders`,
      badge: stats.pendingOrders > 0 ? stats.pendingOrders.toString() : undefined
    },
    {
      icon: Package,
      label: locale === 'ar' ? 'المنتجات' : 'Products',
      path: `/${locale}/provider/products`
    },
    {
      icon: BarChart3,
      label: locale === 'ar' ? 'التقارير' : 'Reports',
      path: `/${locale}/provider/reports`
    },
    {
      icon: Tag,
      label: locale === 'ar' ? 'العروض' : 'Promotions',
      path: `/${locale}/provider/promotions`
    },
    {
      icon: Wallet,
      label: locale === 'ar' ? 'المالية' : 'Finance',
      path: `/${locale}/provider/finance`
    },
    {
      icon: Clock,
      label: locale === 'ar' ? 'ساعات العمل' : 'Store Hours',
      path: `/${locale}/provider/store-hours`
    },
    {
      icon: Settings,
      label: locale === 'ar' ? 'الإعدادات' : 'Settings',
      path: `/${locale}/provider/settings`
    },
    {
      icon: UserIcon,
      label: locale === 'ar' ? 'الملف الشخصي' : 'Profile',
      path: `/${locale}/provider/profile`
    },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center bg-slate-800 p-8 rounded-2xl border border-slate-700">
          <Store className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2 text-white">
            {locale === 'ar' ? 'لوحة مقدم الخدمة' : 'Provider Dashboard'}
          </h1>
          <p className="text-slate-400 mb-6">
            {locale === 'ar' ? 'يجب تسجيل الدخول للوصول إلى لوحة التحكم' : 'Please login to access your dashboard'}
          </p>
          <Link href={`/${locale}/auth/login`}>
            <Button size="lg">
              {locale === 'ar' ? 'تسجيل الدخول' : 'Login'}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-50
        w-64 bg-slate-800 border-${isRTL ? 'l' : 'r'} border-slate-700
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'} lg:translate-x-0
        flex flex-col
      `}>
        {/* Logo */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <Link href={`/${locale}/provider`} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">{locale === 'ar' ? 'إنجزنا' : 'Engezna'}</h1>
                <p className="text-xs text-slate-400">{locale === 'ar' ? 'لوحة الشريك' : 'Partner Portal'}</p>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Store Info */}
        {provider && (
          <div className="p-4 border-b border-slate-700">
            <div className="bg-slate-700/50 rounded-xl p-3">
              <p className="text-sm font-medium truncate">
                {locale === 'ar' ? provider.name_ar : provider.name_en}
              </p>
              <p className="text-xs text-slate-400 capitalize">{provider.category.replace('_', ' ')}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2 h-2 rounded-full ${
                  provider.status === 'open' ? 'bg-green-500' :
                  provider.status === 'closed' ? 'bg-red-500' : 'bg-yellow-500'
                }`}></span>
                <span className="text-xs text-slate-400">
                  {provider.status === 'open' ? (locale === 'ar' ? 'مفتوح' : 'Open') :
                   provider.status === 'closed' ? (locale === 'ar' ? 'مغلق' : 'Closed') :
                   (locale === 'ar' ? 'متوقف مؤقتاً' : 'Paused')}
                </span>
              </div>
            </div>
          </div>
        )}

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
                    ? 'bg-primary text-white'
                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'}
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

        {/* User Section */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
              <span className="font-bold text-sm">
                {user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.email?.split('@')[0]}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={handleSignOut}
          >
            <LogOut className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {locale === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Header */}
        <header className="bg-slate-800/50 border-b border-slate-700 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-400 hover:text-white"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-xl font-bold">
                  {locale === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                </h2>
                <p className="text-sm text-slate-400">
                  {locale === 'ar' ? 'نظرة عامة على متجرك' : 'Overview of your store'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href={`/${locale}`}>
                <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  {isRTL ? <ChevronRight className="w-4 h-4 ml-1" /> : <ChevronLeft className="w-4 h-4 mr-1" />}
                  {locale === 'ar' ? 'العودة للموقع' : 'Back to Site'}
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Status Messages */}
          {provider?.status === 'incomplete' && (
            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl p-6 border border-yellow-500/30 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-yellow-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileWarning className="w-7 h-7 text-white" />
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-bold mb-2 text-yellow-300">
                    {locale === 'ar' ? 'أكمل ملفك الشخصي' : 'Complete Your Profile'}
                  </h3>
                  <p className="text-slate-300 mb-4 text-sm">
                    {locale === 'ar'
                      ? 'معلومات متجرك غير مكتملة. أكمل المعلومات التالية للحصول على الموافقة والبدء في استقبال الطلبات:'
                      : 'Your store information is incomplete. Complete the following to get approved and start receiving orders:'}
                  </p>
                  <Link href={`/${locale}/provider/complete-profile`}>
                    <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
                      {locale === 'ar' ? 'إكمال الملف' : 'Complete Profile'}
                      <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {provider?.status === 'pending_approval' && (
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl p-6 border border-blue-500/30 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Hourglass className="w-7 h-7 text-white" />
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-bold mb-2 text-blue-300">
                    {locale === 'ar' ? 'قيد المراجعة' : 'Under Review'}
                  </h3>
                  <p className="text-slate-300 text-sm">
                    {locale === 'ar'
                      ? 'تم إرسال طلبك وهو قيد المراجعة من فريقنا. سنقوم بإخطارك عند الموافقة على متجرك.'
                      : 'Your application has been submitted and is being reviewed by our team. We will notify you once your store is approved.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {provider?.status === 'rejected' && (
            <div className="bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-2xl p-6 border border-red-500/30 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-7 h-7 text-white" />
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-bold mb-2 text-red-300">
                    {locale === 'ar' ? 'تم رفض الطلب' : 'Application Rejected'}
                  </h3>
                  <p className="text-slate-300 mb-2 text-sm">
                    {locale === 'ar' ? 'سبب الرفض:' : 'Reason:'} {provider.rejection_reason || (locale === 'ar' ? 'لم يتم تحديد سبب' : 'No reason provided')}
                  </p>
                  <Link href={`/${locale}/provider/complete-profile`}>
                    <Button className="bg-red-500 hover:bg-red-600">
                      {locale === 'ar' ? 'تعديل وإعادة الإرسال' : 'Edit & Resubmit'}
                      <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* No Provider - Show registration prompt */}
          {!provider && user && (
            <div className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-2xl p-6 border border-orange-500/30 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-7 h-7 text-white" />
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-bold mb-2 text-orange-300">
                    {locale === 'ar' ? 'لم يتم إكمال التسجيل' : 'Registration Incomplete'}
                  </h3>
                  <p className="text-slate-300 mb-4 text-sm">
                    {locale === 'ar'
                      ? 'يبدو أنك لم تكمل تسجيلك كشريك. هل تريد التسجيل الآن؟'
                      : 'It seems you haven\'t completed your partner registration. Would you like to register now?'}
                  </p>
                  <Link href={`/${locale}/partner/register`}>
                    <Button className="bg-orange-500 hover:bg-orange-600">
                      {locale === 'ar' ? 'سجل كشريك' : 'Register as Partner'}
                      <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Dashboard Stats - Only for approved/open providers */}
          {(provider?.status === 'approved' || provider?.status === 'open' || provider?.status === 'closed' || provider?.status === 'temporarily_paused') && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Today's Orders */}
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="text-green-400 text-xs flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> +0%
                    </span>
                  </div>
                  <p className="text-2xl font-bold">{stats.todayOrders}</p>
                  <p className="text-xs text-slate-400">{locale === 'ar' ? 'طلبات اليوم' : "Today's Orders"}</p>
                </div>

                {/* Today's Revenue */}
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-400" />
                    </div>
                    <span className="text-green-400 text-xs flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> +0%
                    </span>
                  </div>
                  <p className="text-2xl font-bold">{stats.todayRevenue} <span className="text-sm text-slate-400">EGP</span></p>
                  <p className="text-xs text-slate-400">{locale === 'ar' ? 'إيرادات اليوم' : "Today's Revenue"}</p>
                </div>

                {/* Pending Orders */}
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-orange-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{stats.pendingOrders}</p>
                  <p className="text-xs text-slate-400">{locale === 'ar' ? 'طلبات قيد الانتظار' : 'Pending Orders'}</p>
                </div>

                {/* Active Products */}
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-purple-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{stats.activeProducts}</p>
                  <p className="text-xs text-slate-400">{locale === 'ar' ? 'المنتجات النشطة' : 'Active Products'}</p>
                </div>
              </div>

              {/* Performance Indicators */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-6">
                <h3 className="text-lg font-bold mb-4">{locale === 'ar' ? 'مؤشرات الأداء' : 'Performance Indicators'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">{locale === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}</p>
                    <p className="text-3xl font-bold">{stats.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">{locale === 'ar' ? 'إجمالي العملاء' : 'Total Customers'}</p>
                    <p className="text-3xl font-bold">{stats.totalCustomers}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">{locale === 'ar' ? 'المنتجات النشطة' : 'Active Products'}</p>
                    <p className="text-3xl font-bold">{stats.activeProducts}</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href={`/${locale}/provider/orders`} className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-primary transition-colors group">
                  <ShoppingBag className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                  <p className="font-medium">{locale === 'ar' ? 'الطلبات' : 'Orders'}</p>
                  <p className="text-xs text-slate-400">{locale === 'ar' ? 'إدارة الطلبات' : 'Manage orders'}</p>
                </Link>

                <Link href={`/${locale}/provider/products`} className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-primary transition-colors group">
                  <Package className="w-8 h-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                  <p className="font-medium">{locale === 'ar' ? 'المنتجات' : 'Products'}</p>
                  <p className="text-xs text-slate-400">{locale === 'ar' ? 'إدارة القائمة' : 'Manage menu'}</p>
                </Link>

                <Link href={`/${locale}/provider/reports`} className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-primary transition-colors group">
                  <BarChart3 className="w-8 h-8 text-green-400 mb-3 group-hover:scale-110 transition-transform" />
                  <p className="font-medium">{locale === 'ar' ? 'التقارير' : 'Reports'}</p>
                  <p className="text-xs text-slate-400">{locale === 'ar' ? 'عرض الإحصائيات' : 'View analytics'}</p>
                </Link>

                <Link href={`/${locale}/provider/settings`} className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-primary transition-colors group">
                  <Settings className="w-8 h-8 text-slate-400 mb-3 group-hover:scale-110 transition-transform" />
                  <p className="font-medium">{locale === 'ar' ? 'الإعدادات' : 'Settings'}</p>
                  <p className="text-xs text-slate-400">{locale === 'ar' ? 'إعدادات المتجر' : 'Store settings'}</p>
                </Link>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

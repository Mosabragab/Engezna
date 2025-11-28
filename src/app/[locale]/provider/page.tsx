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
  AlertCircle,
  TrendingUp,
  FileWarning,
  XCircle,
  Hourglass,
  Wallet,
  Tag,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Bell,
  User as UserIcon,
  ChevronDown,
} from 'lucide-react'

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
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
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
      const { data: providerData } = await supabase
        .from('providers')
        .select('*')
        .eq('owner_id', user.id)
        .limit(1)

      if (providerData && providerData.length > 0) {
        setProvider(providerData[0])
        await loadStats(providerData[0].id, supabase)
      }
    }

    setLoading(false)
  }

  async function loadStats(providerId: string, supabase: ReturnType<typeof createClient>) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Run all queries in parallel for faster loading
    const [
      { data: todayOrdersData },
      { data: pendingData },
      { data: productsData },
      { data: allOrdersData }
    ] = await Promise.all([
      supabase
        .from('orders')
        .select('id, total, status')
        .eq('provider_id', providerId)
        .gte('created_at', today.toISOString()),
      supabase
        .from('orders')
        .select('id')
        .eq('provider_id', providerId)
        .in('status', ['pending', 'accepted', 'preparing']),
      supabase
        .from('menu_items')
        .select('id')
        .eq('provider_id', providerId)
        .eq('is_available', true),
      supabase
        .from('orders')
        .select('id, customer_id')
        .eq('provider_id', providerId)
    ])

    const uniqueCustomers = new Set(allOrdersData?.map(o => o.customer_id) || [])
    const deliveredOrders = todayOrdersData?.filter(o => o.status === 'delivered') || []

    setStats({
      todayOrders: todayOrdersData?.length || 0,
      todayRevenue: deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0),
      pendingOrders: pendingData?.length || 0,
      activeProducts: productsData?.length || 0,
      totalOrders: allOrdersData?.length || 0,
      totalCustomers: uniqueCustomers.size,
    })
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
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
          <Store className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2 text-slate-900">
            {locale === 'ar' ? 'لوحة مقدم الخدمة' : 'Provider Dashboard'}
          </h1>
          <p className="text-slate-600 mb-6">
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Light Theme with Engezna Blue accent */}
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
            <Link href={`/${locale}/provider`} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-slate-900">{locale === 'ar' ? 'إنجزنا' : 'Engezna'}</h1>
                <p className="text-xs text-slate-500">{locale === 'ar' ? 'لوحة الشريك' : 'Partner Portal'}</p>
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

        {/* Store Info */}
        {provider && (
          <div className="p-4 border-b border-slate-200">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-sm font-medium text-slate-900 truncate">
                {locale === 'ar' ? provider.name_ar : provider.name_en}
              </p>
              <p className="text-xs text-slate-500 capitalize">{provider.category.replace('_', ' ')}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2 h-2 rounded-full ${
                  provider.status === 'open' ? 'bg-green-500' :
                  provider.status === 'closed' ? 'bg-red-500' : 'bg-amber-500'
                }`}></span>
                <span className="text-xs text-slate-600">
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
                    ? 'bg-primary text-white shadow-md'
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
        {/* Top Header - Engezna Brand Identity */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            {/* Right Side (RTL): Logo & Title */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-500 hover:text-slate-700"
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* Logo - visible on mobile, hidden on desktop (sidebar has it) */}
              <Link href={`/${locale}/provider`} className="lg:hidden flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Store className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-primary">
                  {locale === 'ar' ? 'إنجزنا' : 'Engezna'}
                </span>
              </Link>

            </div>

            {/* Center: Page Title on Desktop - Single clear title */}
            <div className="hidden md:flex items-center justify-center flex-1">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-slate-800">
                  {locale === 'ar' ? 'لوحة تحكم المتجر' : 'Store Dashboard'}
                </h2>
                <p className="text-xs text-slate-500">
                  {locale === 'ar' ? 'نظرة عامة على متجرك' : 'Overview of your store'}
                </p>
              </div>
            </div>

            {/* Left Side (RTL): Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Notifications */}
              <button className="relative p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                {stats.pendingOrders > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {stats.pendingOrders > 9 ? '9+' : stats.pendingOrders}
                  </span>
                )}
              </button>

              {/* Account Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setAccountMenuOpen(true)}
                onMouseLeave={() => setAccountMenuOpen(false)}
              >
                <button
                  className="flex items-center gap-2 p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="font-semibold text-sm text-primary">
                      {user?.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden sm:inline text-sm font-medium text-slate-700">
                    {locale === 'ar' ? 'حسابي' : 'My Account'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {accountMenuOpen && (
                  <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full pt-2 w-56 z-50`}>
                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 py-2">
                      {/* User Info */}
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-sm font-medium text-slate-900">{user?.email?.split('@')[0]}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        <Link
                          href={`/${locale}/provider/settings`}
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <UserIcon className="w-4 h-4" />
                          {locale === 'ar' ? 'حسابي' : 'My Account'}
                        </Link>
                        <Link
                          href={`/${locale}`}
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                          {locale === 'ar' ? 'العودة للموقع' : 'Back to Site'}
                        </Link>
                      </div>

                      {/* Logout */}
                      <div className="border-t border-slate-100 pt-1">
                        <button
                          onClick={() => {
                            setAccountMenuOpen(false)
                            handleSignOut()
                          }}
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
          {/* Status Messages */}
          {provider?.status === 'incomplete' && (
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-6 border border-amber-200 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileWarning className="w-7 h-7 text-white" />
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-bold mb-2 text-amber-800">
                    {locale === 'ar' ? 'أكمل ملفك الشخصي' : 'Complete Your Profile'}
                  </h3>
                  <p className="text-slate-700 mb-4 text-sm">
                    {locale === 'ar'
                      ? 'معلومات متجرك غير مكتملة. أكمل المعلومات التالية للحصول على الموافقة والبدء في استقبال الطلبات:'
                      : 'Your store information is incomplete. Complete the following to get approved and start receiving orders:'}
                  </p>
                  <Link href={`/${locale}/provider/complete-profile`}>
                    <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                      {locale === 'ar' ? 'إكمال الملف' : 'Complete Profile'}
                      <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {provider?.status === 'pending_approval' && (
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                  <Hourglass className="w-7 h-7 text-white" />
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-bold mb-2 text-primary">
                    {locale === 'ar' ? 'قيد المراجعة' : 'Under Review'}
                  </h3>
                  <p className="text-slate-700 text-sm">
                    {locale === 'ar'
                      ? 'تم إرسال طلبك وهو قيد المراجعة من فريقنا. سنقوم بإخطارك عند الموافقة على متجرك.'
                      : 'Your application has been submitted and is being reviewed by our team. We will notify you once your store is approved.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {provider?.status === 'rejected' && (
            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 border border-red-200 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-7 h-7 text-white" />
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-bold mb-2 text-red-700">
                    {locale === 'ar' ? 'تم رفض الطلب' : 'Application Rejected'}
                  </h3>
                  <p className="text-slate-700 mb-2 text-sm">
                    {locale === 'ar' ? 'سبب الرفض:' : 'Reason:'} {provider.rejection_reason || (locale === 'ar' ? 'لم يتم تحديد سبب' : 'No reason provided')}
                  </p>
                  <Link href={`/${locale}/provider/complete-profile`}>
                    <Button className="bg-red-500 hover:bg-red-600 text-white">
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
            <div className="bg-gradient-to-br from-primary/5 to-cyan-50 rounded-2xl p-6 border border-primary/20 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-7 h-7 text-white" />
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-bold mb-2 text-primary">
                    {locale === 'ar' ? 'لم يتم إكمال التسجيل' : 'Registration Incomplete'}
                  </h3>
                  <p className="text-slate-700 mb-4 text-sm">
                    {locale === 'ar'
                      ? 'يبدو أنك لم تكمل تسجيلك كشريك. هل تريد التسجيل الآن؟'
                      : 'It seems you haven\'t completed your partner registration. Would you like to register now?'}
                  </p>
                  <Link href={`/${locale}/partner/register`}>
                    <Button className="bg-primary hover:bg-primary/90 text-white">
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
              {/* Stats Grid - Using brand color system */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Today's Orders - Primary Blue Card */}
                <div className="bg-[hsl(var(--card-bg-primary))] rounded-xl p-4 border border-primary/20 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-primary/15 rounded-lg flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-primary" strokeWidth={1.8} />
                    </div>
                    <span className="text-success text-xs flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> +0%
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-[hsl(var(--text-primary))]">{stats.todayOrders}</p>
                  <p className="text-xs text-[hsl(var(--text-secondary))]">{locale === 'ar' ? 'طلبات اليوم' : "Today's Orders"}</p>
                </div>

                {/* Today's Revenue - Success Green Card */}
                <div className="bg-[hsl(var(--card-bg-success))] rounded-xl p-4 border border-success/20 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-success/15 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-success" strokeWidth={1.8} />
                    </div>
                    <span className="text-success text-xs flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> +0%
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-[hsl(var(--text-primary))]">{stats.todayRevenue} <span className="text-sm text-[hsl(var(--text-muted))]">EGP</span></p>
                  <p className="text-xs text-[hsl(var(--text-secondary))]">{locale === 'ar' ? 'إيرادات اليوم' : "Today's Revenue"}</p>
                </div>

                {/* Pending Orders - Warning Yellow Card */}
                <div className="bg-[hsl(var(--card-bg-warning))] rounded-xl p-4 border border-warning/20 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-warning/15 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-[hsl(42_100%_40%)]" strokeWidth={1.8} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-[hsl(var(--text-primary))]">{stats.pendingOrders}</p>
                  <p className="text-xs text-[hsl(var(--text-secondary))]">{locale === 'ar' ? 'طلبات قيد الانتظار' : 'Pending Orders'}</p>
                </div>

                {/* Active Products - Info Cyan Card */}
                <div className="bg-[hsl(var(--card-bg-info))] rounded-xl p-4 border border-info/20 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-info/15 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" strokeWidth={1.8} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-[hsl(var(--text-primary))]">{stats.activeProducts}</p>
                  <p className="text-xs text-[hsl(var(--text-secondary))]">{locale === 'ar' ? 'المنتجات النشطة' : 'Active Products'}</p>
                </div>
              </div>

              {/* Performance Indicators - Using text hierarchy */}
              <div className="bg-white rounded-xl p-6 border border-[hsl(var(--border))] shadow-sm mb-6">
                <h3 className="text-lg font-bold text-[hsl(var(--text-primary))] mb-4">{locale === 'ar' ? 'مؤشرات الأداء' : 'Performance Indicators'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-[hsl(var(--text-secondary))] mb-1">{locale === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}</p>
                    <p className="text-3xl font-bold text-[hsl(var(--text-primary))]">{stats.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[hsl(var(--text-secondary))] mb-1">{locale === 'ar' ? 'إجمالي العملاء' : 'Total Customers'}</p>
                    <p className="text-3xl font-bold text-[hsl(var(--text-primary))]">{stats.totalCustomers}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[hsl(var(--text-secondary))] mb-1">{locale === 'ar' ? 'المنتجات النشطة' : 'Active Products'}</p>
                    <p className="text-3xl font-bold text-[hsl(var(--text-primary))]">{stats.activeProducts}</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions - Using unified icon styling */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href={`/${locale}/provider/orders`} className="bg-white rounded-xl p-4 border border-[hsl(var(--border))] shadow-sm hover:border-primary hover:shadow-md transition-all group">
                  <ShoppingBag className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" strokeWidth={1.8} />
                  <p className="font-medium text-[hsl(var(--text-primary))]">{locale === 'ar' ? 'الطلبات' : 'Orders'}</p>
                  <p className="text-xs text-[hsl(var(--text-muted))]">{locale === 'ar' ? 'إدارة الطلبات' : 'Manage orders'}</p>
                </Link>

                <Link href={`/${locale}/provider/products`} className="bg-white rounded-xl p-4 border border-[hsl(var(--border))] shadow-sm hover:border-primary hover:shadow-md transition-all group">
                  <Package className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" strokeWidth={1.8} />
                  <p className="font-medium text-[hsl(var(--text-primary))]">{locale === 'ar' ? 'المنتجات' : 'Products'}</p>
                  <p className="text-xs text-[hsl(var(--text-muted))]">{locale === 'ar' ? 'إدارة القائمة' : 'Manage menu'}</p>
                </Link>

                <Link href={`/${locale}/provider/reports`} className="bg-white rounded-xl p-4 border border-[hsl(var(--border))] shadow-sm hover:border-primary hover:shadow-md transition-all group">
                  <BarChart3 className="w-8 h-8 text-success mb-3 group-hover:scale-110 transition-transform" strokeWidth={1.8} />
                  <p className="font-medium text-[hsl(var(--text-primary))]">{locale === 'ar' ? 'التقارير' : 'Reports'}</p>
                  <p className="text-xs text-[hsl(var(--text-muted))]">{locale === 'ar' ? 'عرض الإحصائيات' : 'View analytics'}</p>
                </Link>

                <Link href={`/${locale}/provider/settings`} className="bg-white rounded-xl p-4 border border-[hsl(var(--border))] shadow-sm hover:border-primary hover:shadow-md transition-all group">
                  <Settings className="w-8 h-8 text-[hsl(var(--text-secondary))] mb-3 group-hover:scale-110 transition-transform" strokeWidth={1.8} />
                  <p className="font-medium text-[hsl(var(--text-primary))]">{locale === 'ar' ? 'الإعدادات' : 'Settings'}</p>
                  <p className="text-xs text-[hsl(var(--text-muted))]">{locale === 'ar' ? 'إعدادات المتجر' : 'Store settings'}</p>
                </Link>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

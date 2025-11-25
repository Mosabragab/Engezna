'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
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
  Plus,
  LogOut,
  Menu,
  X,
  Home,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp
} from 'lucide-react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function ProviderDashboard() {
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    setLoading(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = `/${locale}`
  }

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

  const menuItems = [
    { icon: Home, label: locale === 'ar' ? 'الرئيسية' : 'Dashboard', active: true },
    { icon: ShoppingBag, label: locale === 'ar' ? 'الطلبات' : 'Orders', badge: '0' },
    { icon: Package, label: locale === 'ar' ? 'المنتجات' : 'Products' },
    { icon: BarChart3, label: locale === 'ar' ? 'التقارير' : 'Analytics' },
    { icon: Settings, label: locale === 'ar' ? 'الإعدادات' : 'Settings' },
  ]

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
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">{locale === 'ar' ? 'إنجزنا' : 'Engezna'}</h1>
                <p className="text-xs text-slate-400">{locale === 'ar' ? 'لوحة الشريك' : 'Partner Portal'}</p>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item, index) => (
            <button
              key={index}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                ${item.active 
                  ? 'bg-primary text-white' 
                  : 'text-slate-400 hover:bg-slate-700 hover:text-white'}
              `}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {item.badge && (
                <span className="ml-auto bg-slate-600 text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
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
            <LogOut className="w-4 h-4 mr-2" />
            {locale === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="bg-slate-800/50 border-b border-slate-700 px-6 py-4">
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
                  {locale === 'ar' ? 'مرحباً' : 'Welcome'}, {user.email?.split('@')[0]}! 👋
                </h2>
                <p className="text-sm text-slate-400">
                  {locale === 'ar' ? 'إليك ملخص متجرك اليوم' : "Here's your store summary for today"}
                </p>
              </div>
            </div>
            <Link href={`/${locale}`}>
              <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                {locale === 'ar' ? 'العودة للموقع' : 'Back to Site'}
              </Button>
            </Link>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Stat Card 1 */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-blue-400" />
                </div>
                <span className="text-green-400 text-sm flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" /> +0%
                </span>
              </div>
              <h3 className="text-3xl font-bold mb-1">0</h3>
              <p className="text-slate-400 text-sm">{locale === 'ar' ? 'طلبات اليوم' : "Today's Orders"}</p>
            </div>

            {/* Stat Card 2 */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                </div>
                <span className="text-green-400 text-sm flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" /> +0%
                </span>
              </div>
              <h3 className="text-3xl font-bold mb-1">0 EGP</h3>
              <p className="text-slate-400 text-sm">{locale === 'ar' ? 'إيرادات اليوم' : "Today's Revenue"}</p>
            </div>

            {/* Stat Card 3 */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-400" />
                </div>
              </div>
              <h3 className="text-3xl font-bold mb-1">0</h3>
              <p className="text-slate-400 text-sm">{locale === 'ar' ? 'طلبات قيد الانتظار' : 'Pending Orders'}</p>
            </div>

            {/* Stat Card 4 */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-purple-400" />
                </div>
              </div>
              <h3 className="text-3xl font-bold mb-1">0</h3>
              <p className="text-slate-400 text-sm">{locale === 'ar' ? 'المنتجات النشطة' : 'Active Products'}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Setup Store Card */}
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-6 border border-primary/30">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                  <Store className="w-7 h-7 text-white" />
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-bold mb-2">
                    {locale === 'ar' ? 'إعداد متجرك' : 'Setup Your Store'}
                  </h3>
                  <p className="text-slate-400 mb-4 text-sm">
                    {locale === 'ar' 
                      ? 'أضف معلومات متجرك ومنتجاتك للبدء في استقبال الطلبات من العملاء.'
                      : 'Add your store information and products to start receiving orders from customers.'}
                  </p>
                  <Button className="bg-primary hover:bg-primary/90">
                    {locale === 'ar' ? 'ابدأ الإعداد' : 'Start Setup'}
                    <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
                  </Button>
                </div>
              </div>
            </div>

            {/* Add Products Card */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-slate-700 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Plus className="w-7 h-7 text-slate-300" />
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-bold mb-2">
                    {locale === 'ar' ? 'إضافة منتجات' : 'Add Products'}
                  </h3>
                  <p className="text-slate-400 mb-4 text-sm">
                    {locale === 'ar' 
                      ? 'أضف منتجاتك مع الصور والأسعار والتفاصيل.'
                      : 'Add your products with images, prices, and descriptions.'}
                  </p>
                  <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                    {locale === 'ar' ? 'إضافة منتج' : 'Add Product'}
                    <Plus className={`w-4 h-4 ${isRTL ? 'mr-2' : 'ml-2'}`} />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Orders (Empty State) */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-lg font-bold">{locale === 'ar' ? 'أحدث الطلبات' : 'Recent Orders'}</h3>
            </div>
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-10 h-10 text-slate-500" />
              </div>
              <h4 className="text-lg font-medium mb-2 text-slate-300">
                {locale === 'ar' ? 'لا توجد طلبات بعد' : 'No orders yet'}
              </h4>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                {locale === 'ar' 
                  ? 'عندما تبدأ في استقبال طلبات من العملاء، ستظهر هنا.'
                  : 'When you start receiving orders from customers, they will appear here.'}
              </p>
            </div>
          </div>

          {/* Coming Soon Banner */}
          <div className="mt-6 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-2xl p-6 border border-orange-500/30">
            <div className="flex items-center gap-4">
              <AlertCircle className="w-8 h-8 text-orange-400 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-orange-300">
                  {locale === 'ar' ? '🚀 قريباً!' : '🚀 Coming Soon!'}
                </h3>
                <p className="text-sm text-slate-300">
                  {locale === 'ar' 
                    ? 'نحن نعمل على إطلاق منصة إنجزنا قريباً. ستتمكن من إدارة متجرك بالكامل من هنا.'
                    : 'We are working hard to launch Engezna soon. You will be able to manage your entire store from here.'}
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

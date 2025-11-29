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
  Save,
  RefreshCw,
  HeadphonesIcon,
  Activity,
  Percent,
  DollarSign,
  Truck,
  Clock,
  Globe,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Building,
  FileText,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PlatformSettings {
  id?: string
  platform_name_ar: string
  platform_name_en: string
  platform_commission_rate: number
  delivery_fee_base: number
  delivery_fee_per_km: number
  min_order_amount: number
  max_delivery_distance_km: number
  support_email: string
  support_phone: string
  address_ar: string
  address_en: string
  currency: string
  timezone: string
  maintenance_mode: boolean
  allow_cash_payment: boolean
  allow_card_payment: boolean
  allow_wallet_payment: boolean
  order_auto_cancel_minutes: number
  provider_commission_payout_day: number
}

const defaultSettings: PlatformSettings = {
  platform_name_ar: 'إنجزنا',
  platform_name_en: 'Engezna',
  platform_commission_rate: 15,
  delivery_fee_base: 10,
  delivery_fee_per_km: 2,
  min_order_amount: 50,
  max_delivery_distance_km: 15,
  support_email: 'support@engezna.com',
  support_phone: '+20123456789',
  address_ar: 'القاهرة، مصر',
  address_en: 'Cairo, Egypt',
  currency: 'EGP',
  timezone: 'Africa/Cairo',
  maintenance_mode: false,
  allow_cash_payment: true,
  allow_card_payment: true,
  allow_wallet_payment: true,
  order_auto_cancel_minutes: 30,
  provider_commission_payout_day: 1,
}

export default function AdminSettingsPage() {
  const locale = useLocale()
  const pathname = usePathname()
  const isRTL = locale === 'ar'

  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)

  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings)
  const [activeTab, setActiveTab] = useState<'general' | 'payments' | 'delivery' | 'notifications'>('general')

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
        await loadSettings(supabase)
      }
    }

    setLoading(false)
  }

  async function loadSettings(supabase: ReturnType<typeof createClient>) {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .single()

    if (data) {
      setSettings({ ...defaultSettings, ...data })
    }
  }

  async function handleSaveSettings() {
    setSaving(true)
    setSaveSuccess(false)

    const supabase = createClient()

    const { error } = await supabase
      .from('platform_settings')
      .upsert({
        id: settings.id || undefined,
        ...settings,
        updated_at: new Date().toISOString(),
      })

    if (!error) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }

    setSaving(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = `/${locale}`
  }

  const navItems = [
    { icon: Home, label: locale === 'ar' ? 'الرئيسية' : 'Dashboard', path: `/${locale}/admin` },
    { icon: Store, label: locale === 'ar' ? 'المتاجر' : 'Providers', path: `/${locale}/admin/providers` },
    { icon: ShoppingBag, label: locale === 'ar' ? 'الطلبات' : 'Orders', path: `/${locale}/admin/orders` },
    { icon: Users, label: locale === 'ar' ? 'العملاء' : 'Customers', path: `/${locale}/admin/customers` },
    { icon: Wallet, label: locale === 'ar' ? 'المالية' : 'Finance', path: `/${locale}/admin/finance` },
    { icon: BarChart3, label: locale === 'ar' ? 'التحليلات' : 'Analytics', path: `/${locale}/admin/analytics` },
    { icon: HeadphonesIcon, label: locale === 'ar' ? 'الدعم' : 'Support', path: `/${locale}/admin/support` },
    { icon: Activity, label: locale === 'ar' ? 'سجل النشاط' : 'Activity Log', path: `/${locale}/admin/activity-log` },
    { icon: Settings, label: locale === 'ar' ? 'الإعدادات' : 'Settings', path: `/${locale}/admin/settings`, active: true },
  ]

  const tabs = [
    { id: 'general', label: locale === 'ar' ? 'عام' : 'General', icon: Building },
    { id: 'payments', label: locale === 'ar' ? 'الدفع' : 'Payments', icon: CreditCard },
    { id: 'delivery', label: locale === 'ar' ? 'التوصيل' : 'Delivery', icon: Truck },
    { id: 'notifications', label: locale === 'ar' ? 'الإشعارات' : 'Notifications', icon: Bell },
  ]

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
                {locale === 'ar' ? 'إعدادات المنصة' : 'Platform Settings'}
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
          {/* Tabs */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Settings Form */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  {locale === 'ar' ? 'الإعدادات العامة' : 'General Settings'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'اسم المنصة (عربي)' : 'Platform Name (Arabic)'}
                    </label>
                    <input
                      type="text"
                      value={settings.platform_name_ar}
                      onChange={(e) => setSettings({ ...settings, platform_name_ar: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'اسم المنصة (إنجليزي)' : 'Platform Name (English)'}
                    </label>
                    <input
                      type="text"
                      value={settings.platform_name_en}
                      onChange={(e) => setSettings({ ...settings, platform_name_en: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'البريد الإلكتروني للدعم' : 'Support Email'}
                    </label>
                    <div className="relative">
                      <Mail className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                      <input
                        type="email"
                        value={settings.support_email}
                        onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                        className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'هاتف الدعم' : 'Support Phone'}
                    </label>
                    <div className="relative">
                      <Phone className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                      <input
                        type="tel"
                        value={settings.support_phone}
                        onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
                        className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'العنوان (عربي)' : 'Address (Arabic)'}
                    </label>
                    <input
                      type="text"
                      value={settings.address_ar}
                      onChange={(e) => setSettings({ ...settings, address_ar: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'العنوان (إنجليزي)' : 'Address (English)'}
                    </label>
                    <input
                      type="text"
                      value={settings.address_en}
                      onChange={(e) => setSettings({ ...settings, address_en: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-800">
                      {locale === 'ar' ? 'وضع الصيانة' : 'Maintenance Mode'}
                    </p>
                    <p className="text-sm text-yellow-700">
                      {locale === 'ar' ? 'عند التفعيل، لن يتمكن المستخدمون من الوصول للمنصة' : 'When enabled, users cannot access the platform'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.maintenance_mode}
                      onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  {locale === 'ar' ? 'إعدادات الدفع' : 'Payment Settings'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'نسبة عمولة المنصة (%)' : 'Platform Commission Rate (%)'}
                    </label>
                    <div className="relative">
                      <Percent className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                      <input
                        type="number"
                        value={settings.platform_commission_rate}
                        onChange={(e) => setSettings({ ...settings, platform_commission_rate: parseFloat(e.target.value) || 0 })}
                        className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
                        min="0"
                        max="100"
                        step="0.5"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'الحد الأدنى للطلب' : 'Minimum Order Amount'}
                    </label>
                    <div className="relative">
                      <DollarSign className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                      <input
                        type="number"
                        value={settings.min_order_amount}
                        onChange={(e) => setSettings({ ...settings, min_order_amount: parseFloat(e.target.value) || 0 })}
                        className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
                        min="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'يوم صرف العمولات' : 'Commission Payout Day'}
                    </label>
                    <select
                      value={settings.provider_commission_payout_day}
                      onChange={(e) => setSettings({ ...settings, provider_commission_payout_day: parseInt(e.target.value) })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                    >
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'العملة' : 'Currency'}
                    </label>
                    <select
                      value={settings.currency}
                      onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                    >
                      <option value="EGP">{locale === 'ar' ? 'جنيه مصري (EGP)' : 'Egyptian Pound (EGP)'}</option>
                      <option value="USD">{locale === 'ar' ? 'دولار أمريكي (USD)' : 'US Dollar (USD)'}</option>
                      <option value="SAR">{locale === 'ar' ? 'ريال سعودي (SAR)' : 'Saudi Riyal (SAR)'}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-slate-900">{locale === 'ar' ? 'طرق الدفع المتاحة' : 'Available Payment Methods'}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={settings.allow_cash_payment}
                        onChange={(e) => setSettings({ ...settings, allow_cash_payment: e.target.checked })}
                        className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                      />
                      <span className="text-slate-700">{locale === 'ar' ? 'الدفع النقدي' : 'Cash Payment'}</span>
                    </label>
                    <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={settings.allow_card_payment}
                        onChange={(e) => setSettings({ ...settings, allow_card_payment: e.target.checked })}
                        className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                      />
                      <span className="text-slate-700">{locale === 'ar' ? 'البطاقة البنكية' : 'Card Payment'}</span>
                    </label>
                    <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={settings.allow_wallet_payment}
                        onChange={(e) => setSettings({ ...settings, allow_wallet_payment: e.target.checked })}
                        className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                      />
                      <span className="text-slate-700">{locale === 'ar' ? 'المحفظة الإلكترونية' : 'E-Wallet'}</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'delivery' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  {locale === 'ar' ? 'إعدادات التوصيل' : 'Delivery Settings'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'رسوم التوصيل الأساسية' : 'Base Delivery Fee'}
                    </label>
                    <div className="relative">
                      <DollarSign className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                      <input
                        type="number"
                        value={settings.delivery_fee_base}
                        onChange={(e) => setSettings({ ...settings, delivery_fee_base: parseFloat(e.target.value) || 0 })}
                        className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
                        min="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'رسوم التوصيل لكل كم' : 'Delivery Fee Per KM'}
                    </label>
                    <div className="relative">
                      <DollarSign className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                      <input
                        type="number"
                        value={settings.delivery_fee_per_km}
                        onChange={(e) => setSettings({ ...settings, delivery_fee_per_km: parseFloat(e.target.value) || 0 })}
                        className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
                        min="0"
                        step="0.5"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'أقصى مسافة توصيل (كم)' : 'Max Delivery Distance (KM)'}
                    </label>
                    <div className="relative">
                      <MapPin className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                      <input
                        type="number"
                        value={settings.max_delivery_distance_km}
                        onChange={(e) => setSettings({ ...settings, max_delivery_distance_km: parseFloat(e.target.value) || 0 })}
                        className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
                        min="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'وقت إلغاء الطلب التلقائي (دقيقة)' : 'Auto-Cancel Time (minutes)'}
                    </label>
                    <div className="relative">
                      <Clock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                      <input
                        type="number"
                        value={settings.order_auto_cancel_minutes}
                        onChange={(e) => setSettings({ ...settings, order_auto_cancel_minutes: parseInt(e.target.value) || 0 })}
                        className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  {locale === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings'}
                </h3>

                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-lg">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>{locale === 'ar' ? 'إعدادات الإشعارات قيد التطوير' : 'Notification settings coming soon'}</p>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
              {saveSuccess && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{locale === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully'}</span>
                </div>
              )}
              <div className={saveSuccess ? '' : 'ml-auto'}>
                <Button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {locale === 'ar' ? 'حفظ الإعدادات' : 'Save Settings'}
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

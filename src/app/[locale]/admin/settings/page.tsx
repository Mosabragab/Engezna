'use client'

import { useLocale } from 'next-intl'
import { useCallback, useEffect, useState} from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, useAdminSidebar } from '@/components/admin'
import { formatNumber } from '@/lib/utils/formatters'
import {
  Shield,
  Save,
  RefreshCw,
  Percent,
  DollarSign,
  Truck,
  Clock,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Building,
  Bell,
  Lock,
  Eye,
  EyeOff,
  User as UserIcon,
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
  // Commission settings
  default_commission_rate: number
  max_commission_rate: number
  grace_period_days: number
  grace_period_enabled: boolean
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
  // Commission settings - 0% for 6 months, max 7% after
  default_commission_rate: 7.0,
  max_commission_rate: 7.0,
  grace_period_days: 180, // 6 months
  grace_period_enabled: true,
}

export default function AdminSettingsPage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const { toggle: toggleSidebar } = useAdminSidebar()

  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings)
  const [activeTab, setActiveTab] = useState<'general' | 'commission' | 'payments' | 'delivery' | 'notifications' | 'account'>('general')

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  const loadSettings = useCallback(async (supabase: ReturnType<typeof createClient>) => {
    const { data } = await supabase
      .from('platform_settings')
      .select('*')
      .single()

    if (data) {
      setSettings({ ...defaultSettings, ...data })
    }
  }, [])

  const checkAuth = useCallback(async () => {
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
  }, [loadSettings])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

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

  async function handleChangePassword() {
    setPasswordError('')
    setPasswordSuccess(false)

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(locale === 'ar' ? 'جميع الحقول مطلوبة' : 'All fields are required')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError(locale === 'ar' ? 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' : 'New password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(locale === 'ar' ? 'كلمة المرور الجديدة غير متطابقة' : 'New passwords do not match')
      return
    }

    setChangingPassword(true)

    const supabase = createClient()

    // First verify current password by re-authenticating
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email || '',
      password: currentPassword,
    })

    if (signInError) {
      setPasswordError(locale === 'ar' ? 'كلمة المرور الحالية غير صحيحة' : 'Current password is incorrect')
      setChangingPassword(false)
      return
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      setPasswordError(locale === 'ar' ? 'فشل في تغيير كلمة المرور' : 'Failed to change password')
      setChangingPassword(false)
      return
    }

    // Success
    setPasswordSuccess(true)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setPasswordSuccess(false), 3000)
    setChangingPassword(false)
  }

  const tabs = [
    { id: 'general', label: locale === 'ar' ? 'عام' : 'General', icon: Building },
    { id: 'commission', label: locale === 'ar' ? 'العمولات' : 'Commission', icon: Percent },
    { id: 'payments', label: locale === 'ar' ? 'الدفع' : 'Payments', icon: CreditCard },
    { id: 'delivery', label: locale === 'ar' ? 'التوصيل' : 'Delivery', icon: Truck },
    { id: 'notifications', label: locale === 'ar' ? 'الإشعارات' : 'Notifications', icon: Bell },
    { id: 'account', label: locale === 'ar' ? 'الحساب' : 'Account', icon: UserIcon },
  ]

  if (loading) {
    return (
      <>
        <div className="h-16 bg-white border-b border-slate-200 animate-pulse" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent"></div>
        </div>
      </>
    )
  }

  if (!user || !isAdmin) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <h1 className="text-lg font-semibold text-slate-900">
              {locale === 'ar' ? 'إعدادات المنصة' : 'Platform Settings'}
            </h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center bg-slate-50">
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
      </>
    )
  }

  return (
    <>
      <AdminHeader
        user={user}
        title={locale === 'ar' ? 'إعدادات المنصة' : 'Platform Settings'}
        onMenuClick={toggleSidebar}
      />

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

            {activeTab === 'commission' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  {locale === 'ar' ? 'إعدادات العمولات' : 'Commission Settings'}
                </h3>

                {/* Commission Overview Card */}
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <Percent className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-green-800">
                        {locale === 'ar' ? 'نموذج العمولات الحالي' : 'Current Commission Model'}
                      </h4>
                      <p className="text-sm text-green-700 mt-1">
                        {locale === 'ar'
                          ? `${settings.grace_period_enabled ? `0% لمدة ${Math.round(settings.grace_period_days / 30)} شهور (فترة مجانية)، ` : ''}ثم حد أقصى ${settings.max_commission_rate}%`
                          : `${settings.grace_period_enabled ? `0% for ${Math.round(settings.grace_period_days / 30)} months (free period), ` : ''}then max ${settings.max_commission_rate}%`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Default Commission Rate */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'نسبة العمولة الافتراضية (%)' : 'Default Commission Rate (%)'}
                    </label>
                    <div className="relative">
                      <Percent className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                      <input
                        type="number"
                        value={settings.default_commission_rate}
                        onChange={(e) => setSettings({ ...settings, default_commission_rate: parseFloat(e.target.value) || 0 })}
                        className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
                        min="0"
                        max="100"
                        step="0.5"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {locale === 'ar'
                        ? 'النسبة المطبقة على مقدمي الخدمات بعد انتهاء الفترة المجانية'
                        : 'Rate applied to providers after grace period ends'}
                    </p>
                  </div>

                  {/* Max Commission Rate */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'الحد الأقصى للعمولة (%)' : 'Maximum Commission Rate (%)'}
                    </label>
                    <div className="relative">
                      <Percent className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                      <input
                        type="number"
                        value={settings.max_commission_rate}
                        onChange={(e) => setSettings({ ...settings, max_commission_rate: parseFloat(e.target.value) || 0 })}
                        className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
                        min="0"
                        max="100"
                        step="0.5"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {locale === 'ar'
                        ? 'لا يمكن للعمولة تجاوز هذه النسبة حتى مع التعديلات الخاصة بالمحافظات'
                        : 'Commission cannot exceed this rate even with governorate overrides'}
                    </p>
                  </div>

                  {/* Grace Period Duration */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'مدة الفترة المجانية (أيام)' : 'Grace Period Duration (days)'}
                    </label>
                    <div className="relative">
                      <Clock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                      <input
                        type="number"
                        value={settings.grace_period_days}
                        onChange={(e) => setSettings({ ...settings, grace_period_days: parseInt(e.target.value) || 0 })}
                        className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
                        min="0"
                        step="30"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {locale === 'ar'
                        ? `180 يوم = 6 شهور. حالياً: ${Math.round(settings.grace_period_days / 30)} شهور`
                        : `180 days = 6 months. Currently: ${Math.round(settings.grace_period_days / 30)} months`}
                    </p>
                  </div>

                  {/* Commission Payout Day */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'يوم صرف العمولات الشهري' : 'Monthly Commission Payout Day'}
                    </label>
                    <select
                      value={settings.provider_commission_payout_day}
                      onChange={(e) => setSettings({ ...settings, provider_commission_payout_day: parseInt(e.target.value) })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                    >
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>
                          {locale === 'ar' ? `يوم ${formatNumber(day, locale)}` : `Day ${formatNumber(day, locale)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Grace Period Toggle */}
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-800">
                      {locale === 'ar' ? 'تفعيل الفترة المجانية' : 'Enable Grace Period'}
                    </p>
                    <p className="text-sm text-blue-700">
                      {locale === 'ar'
                        ? 'عند التفعيل، يحصل مقدمو الخدمات الجدد على فترة مجانية بدون عمولة'
                        : 'When enabled, new providers get a commission-free period'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.grace_period_enabled}
                      onChange={(e) => setSettings({ ...settings, grace_period_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Info Box */}
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">
                        {locale === 'ar' ? 'ملاحظة مهمة' : 'Important Note'}
                      </p>
                      <ul className="text-sm text-amber-700 mt-1 space-y-1 list-disc list-inside">
                        <li>
                          {locale === 'ar'
                            ? 'يمكن تعيين نسب عمولة خاصة لكل محافظة من صفحة إدارة المواقع'
                            : 'Custom commission rates can be set per governorate from the Locations page'}
                        </li>
                        <li>
                          {locale === 'ar'
                            ? 'مقدمو الخدمات المعفيون أو ذوو النسب الخاصة لا يتأثرون بهذه الإعدادات'
                            : 'Exempt providers or those with custom rates are not affected by these settings'}
                        </li>
                      </ul>
                    </div>
                  </div>
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
                        <option key={day} value={day}>{formatNumber(day, locale)}</option>
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

            {activeTab === 'account' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  {locale === 'ar' ? 'إعدادات الحساب' : 'Account Settings'}
                </h3>

                {/* Admin Email Display */}
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-500">
                        {locale === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                      </p>
                      <p className="font-medium text-slate-900">{user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Change Password Section */}
                <div className="border border-slate-200 rounded-lg p-6">
                  <h4 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-red-600" />
                    {locale === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                  </h4>

                  <div className="space-y-4 max-w-md">
                    {/* Current Password */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {locale === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}
                      </label>
                      <div className="relative">
                        <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className={`w-full ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
                          placeholder={locale === 'ar' ? 'أدخل كلمة المرور الحالية' : 'Enter current password'}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600`}
                        >
                          {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {locale === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
                      </label>
                      <div className="relative">
                        <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className={`w-full ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
                          placeholder={locale === 'ar' ? 'أدخل كلمة المرور الجديدة' : 'Enter new password'}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600`}
                        >
                          {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm New Password */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {locale === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
                      </label>
                      <div className="relative">
                        <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={`w-full ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
                          placeholder={locale === 'ar' ? 'أعد إدخال كلمة المرور الجديدة' : 'Re-enter new password'}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600`}
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Error Message */}
                    {passwordError && (
                      <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm">{passwordError}</span>
                      </div>
                    )}

                    {/* Success Message */}
                    {passwordSuccess && (
                      <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-sm">
                          {locale === 'ar' ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully'}
                        </span>
                      </div>
                    )}

                    {/* Submit Button */}
                    <Button
                      onClick={handleChangePassword}
                      disabled={changingPassword}
                      className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
                    >
                      {changingPassword ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Lock className="w-4 h-4" />
                      )}
                      {locale === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button - Only show for platform settings tabs */}
            {activeTab !== 'account' && (
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
            )}
          </div>
        </main>
    </>
  )
}

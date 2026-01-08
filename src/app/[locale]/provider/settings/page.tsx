'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ProviderLayout } from '@/components/provider'
import { ACTIVE_PROVIDER_STATUSES } from '@/types/database'
import {
  Settings,
  Store,
  Truck,
  Bell,
  Camera,
  Save,
  RefreshCw,
  Check,
  MapPin,
  Phone,
  Clock,
  DollarSign,
  Power,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  User,
  Loader2,
  Trash2,
  Package,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

type Provider = {
  id: string
  name_ar: string
  name_en: string
  phone: string | null
  address_ar: string | null
  address_en: string | null
  logo_url: string | null
  status: string
  delivery_fee: number | null
  estimated_delivery_time_min: number | null
  min_order_amount: number | null
  delivery_radius_km: number | null
  // Pickup settings
  supports_pickup: boolean
  pickup_instructions_ar: string | null
  pickup_instructions_en: string | null
  estimated_pickup_time_min: number | null
}


export default function ProviderSettingsPage() {
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'

  const [provider, setProvider] = useState<Provider | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'store' | 'delivery' | 'pickup' | 'status' | 'account'>('store')
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Password change states
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Delete account states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  // Form states
  const [nameAr, setNameAr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [phone, setPhone] = useState('')
  const [addressAr, setAddressAr] = useState('')
  const [addressEn, setAddressEn] = useState('')
  const [deliveryFee, setDeliveryFee] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [minimumOrder, setMinimumOrder] = useState('')
  const [deliveryRadius, setDeliveryRadius] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  // Pickup settings
  const [supportsPickup, setSupportsPickup] = useState(false)
  const [pickupInstructionsAr, setPickupInstructionsAr] = useState('')
  const [pickupInstructionsEn, setPickupInstructionsEn] = useState('')
  const [estimatedPickupTime, setEstimatedPickupTime] = useState('')
  const [savingPickup, setSavingPickup] = useState(false)
  const [savedPickup, setSavedPickup] = useState(false)

  const checkAuthAndLoadProvider = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/provider/settings`)
      return
    }

    setUserEmail(user.email || null)

    const { data: providersData } = await supabase
      .from('providers')
      .select('*')
      .eq('owner_id', user.id)
      .limit(1)

    const providerData = providersData?.[0]
    if (!providerData || !ACTIVE_PROVIDER_STATUSES.includes(providerData.status)) {
      router.push(`/${locale}/provider`)
      return
    }

    setProvider(providerData)
    setNameAr(providerData.name_ar || '')
    setNameEn(providerData.name_en || '')
    setPhone(providerData.phone || '')
    setAddressAr(providerData.address_ar || '')
    setAddressEn(providerData.address_en || '')
    setDeliveryFee(providerData.delivery_fee?.toString() || '')
    setDeliveryTime(providerData.estimated_delivery_time_min?.toString() || '')
    setMinimumOrder(providerData.min_order_amount?.toString() || '')
    setDeliveryRadius(providerData.delivery_radius_km?.toString() || '')
    setLogoPreview(providerData.logo_url)

    // Load pickup settings
    setSupportsPickup(providerData.supports_pickup || false)
    setPickupInstructionsAr(providerData.pickup_instructions_ar || '')
    setPickupInstructionsEn(providerData.pickup_instructions_en || '')
    setEstimatedPickupTime(providerData.estimated_pickup_time_min?.toString() || '15')

    setLoading(false)
  }, [locale, router])

  useEffect(() => {
    checkAuthAndLoadProvider()
  }, [checkAuthAndLoadProvider])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert(locale === 'ar' ? 'حجم الصورة يجب أن يكون أقل من 2MB' : 'Image must be less than 2MB')
        return
      }
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  const handleSaveStore = async () => {
    if (!provider) return

    setSaving(true)
    const supabase = createClient()

    let logoUrl = provider.logo_url

    // Upload new logo if selected
    if (logoFile) {
      const fileExt = logoFile.name.split('.').pop()
      const fileName = `provider-logos/${provider.id}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(fileName, logoFile, { upsert: true })

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('public')
          .getPublicUrl(fileName)
        logoUrl = publicUrl
      }
    }

    const { error } = await supabase
      .from('providers')
      .update({
        name_ar: nameAr,
        name_en: nameEn,
        phone: phone || null,
        address_ar: addressAr || null,
        address_en: addressEn || null,
        logo_url: logoUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', provider.id)

    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      setProvider(prev => prev ? { ...prev, logo_url: logoUrl } : null)
    }

    setSaving(false)
  }

  const handleSaveDelivery = async () => {
    if (!provider) return

    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('providers')
      .update({
        delivery_fee: deliveryFee ? parseFloat(deliveryFee) : null,
        estimated_delivery_time_min: deliveryTime ? parseInt(deliveryTime) : null,
        min_order_amount: minimumOrder ? parseFloat(minimumOrder) : null,
        delivery_radius_km: deliveryRadius ? parseFloat(deliveryRadius) : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', provider.id)

    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }

    setSaving(false)
  }

  const handleSavePickup = async () => {
    if (!provider) return

    setSavingPickup(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('providers')
      .update({
        supports_pickup: supportsPickup,
        pickup_instructions_ar: pickupInstructionsAr || null,
        pickup_instructions_en: pickupInstructionsEn || null,
        estimated_pickup_time_min: estimatedPickupTime ? parseInt(estimatedPickupTime) : 15,
        updated_at: new Date().toISOString()
      })
      .eq('id', provider.id)

    if (!error) {
      setSavedPickup(true)
      setTimeout(() => setSavedPickup(false), 3000)
      setProvider(prev => prev ? {
        ...prev,
        supports_pickup: supportsPickup,
        pickup_instructions_ar: pickupInstructionsAr || null,
        pickup_instructions_en: pickupInstructionsEn || null,
        estimated_pickup_time_min: estimatedPickupTime ? parseInt(estimatedPickupTime) : 15,
      } : null)
    }

    setSavingPickup(false)
  }

  const handleToggleStatus = async (newStatus: 'open' | 'closed' | 'temporarily_paused') => {
    if (!provider) return

    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('providers')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', provider.id)

    if (!error) {
      setProvider(prev => prev ? { ...prev, status: newStatus } : null)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }

    setSaving(false)
  }

  const handlePasswordChange = async () => {
    if (!userEmail) return

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({
        type: 'error',
        text: locale === 'ar' ? 'جميع الحقول مطلوبة' : 'All fields are required'
      })
      return
    }

    if (newPassword.length < 8) {
      setPasswordMessage({
        type: 'error',
        text: locale === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters'
      })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        type: 'error',
        text: locale === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match'
      })
      return
    }

    setSavingPassword(true)
    setPasswordMessage(null)

    const supabase = createClient()

    // Verify current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    })

    if (signInError) {
      setPasswordMessage({
        type: 'error',
        text: locale === 'ar' ? 'كلمة المرور الحالية غير صحيحة' : 'Current password is incorrect'
      })
      setSavingPassword(false)
      return
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      setPasswordMessage({
        type: 'error',
        text: locale === 'ar' ? 'فشل تحديث كلمة المرور' : 'Failed to update password'
      })
    } else {
      setPasswordMessage({
        type: 'success',
        text: locale === 'ar' ? 'تم تحديث كلمة المرور بنجاح' : 'Password updated successfully'
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        setShowPasswordForm(false)
        setPasswordMessage(null)
      }, 2000)
    }

    setSavingPassword(false)
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = `/${locale}`
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE' && deleteConfirmText !== 'حذف') {
      return
    }

    setDeletingAccount(true)

    try {
      // Call API to delete account
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        // Sign out and redirect
        const supabase = createClient()
        await supabase.auth.signOut()
        window.location.href = `/${locale}`
      } else {
        const data = await response.json()
        alert(data.error || (locale === 'ar' ? 'فشل حذف الحساب' : 'Failed to delete account'))
      }
    } catch (error) {
      console.error('Delete account error:', error)
      alert(locale === 'ar' ? 'حدث خطأ أثناء حذف الحساب' : 'An error occurred while deleting account')
    } finally {
      setDeletingAccount(false)
    }
  }

  const tabs = [
    { key: 'store', label_ar: 'معلومات المتجر', label_en: 'Store Info', icon: Store },
    { key: 'delivery', label_ar: 'التوصيل', label_en: 'Delivery', icon: Truck },
    { key: 'pickup', label_ar: 'الاستلام', label_en: 'Pickup', icon: Package },
    { key: 'status', label_ar: 'حالة المتجر', label_en: 'Store Status', icon: Power },
    { key: 'account', label_ar: 'الحساب', label_en: 'Account', icon: User },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-slate-500">
            {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <ProviderLayout
      pageTitle={{ ar: 'إعدادات المتجر', en: 'Store Settings' }}
      pageSubtitle={{ ar: 'إدارة إعدادات متجرك', en: 'Manage your store settings' }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as 'store' | 'delivery' | 'pickup' | 'status' | 'account')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === tab.key
                      ? 'bg-primary text-white'
                      : 'bg-white text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {locale === 'ar' ? tab.label_ar : tab.label_en}
                </button>
              )
            })}
          </div>

          {/* Store Info Tab */}
          {activeTab === 'store' && (
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  {locale === 'ar' ? 'معلومات المتجر' : 'Store Information'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Logo */}
                <div className="text-center">
                  <div className="relative w-24 h-24 mx-auto mb-3">
                    {logoPreview ? (
                      <Image
                        src={logoPreview}
                        alt="Logo"
                        fill
                        className="rounded-full object-cover border-2 border-slate-300"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center">
                        <Store className="w-10 h-10 text-slate-500" />
                      </div>
                    )}
                    <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/80">
                      <Camera className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-slate-500">
                    {locale === 'ar' ? 'الحد الأقصى 2MB' : 'Max 2MB'}
                  </p>
                </div>

                {/* Name AR */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {locale === 'ar' ? 'اسم المتجر (عربي)' : 'Store Name (Arabic)'}
                  </label>
                  <Input
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    className="bg-white border-slate-200 text-slate-900"
                    dir="rtl"
                  />
                </div>

                {/* Name EN */}
                <div>
                  <label className="block text-sm text-slate-500 mb-1">
                    {locale === 'ar' ? 'اسم المتجر (إنجليزي)' : 'Store Name (English)'}
                  </label>
                  <Input
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className="bg-white border-slate-200 text-slate-900"
                    dir="ltr"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm text-slate-500 mb-1 flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {locale === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-white border-slate-200 text-slate-900"
                    dir="ltr"
                    type="tel"
                  />
                </div>

                {/* Address AR */}
                <div>
                  <label className="block text-sm text-slate-500 mb-1 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {locale === 'ar' ? 'العنوان (عربي)' : 'Address (Arabic)'}
                  </label>
                  <Input
                    value={addressAr}
                    onChange={(e) => setAddressAr(e.target.value)}
                    className="bg-white border-slate-200 text-slate-900"
                    dir="rtl"
                  />
                </div>

                {/* Address EN */}
                <div>
                  <label className="block text-sm text-slate-500 mb-1">
                    {locale === 'ar' ? 'العنوان (إنجليزي)' : 'Address (English)'}
                  </label>
                  <Input
                    value={addressEn}
                    onChange={(e) => setAddressEn(e.target.value)}
                    className="bg-white border-slate-200 text-slate-900"
                    dir="ltr"
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleSaveStore}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {locale === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                    </>
                  ) : saved ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {locale === 'ar' ? 'تم الحفظ!' : 'Saved!'}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {locale === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Delivery Tab */}
          {activeTab === 'delivery' && (
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  {locale === 'ar' ? 'إعدادات التوصيل' : 'Delivery Settings'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Delivery Fee */}
                <div>
                  <label className="block text-sm text-slate-500 mb-1 flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    {locale === 'ar' ? 'رسوم التوصيل (ج.م)' : 'Delivery Fee (EGP)'}
                  </label>
                  <Input
                    type="number"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    className="bg-white border-slate-200 text-slate-900"
                    placeholder="10"
                  />
                </div>

                {/* Delivery Time */}
                <div>
                  <label className="block text-sm text-slate-500 mb-1 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {locale === 'ar' ? 'وقت التوصيل المتوقع' : 'Expected Delivery Time'}
                  </label>
                  <Input
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="bg-white border-slate-200 text-slate-900"
                    placeholder={locale === 'ar' ? '30-45 دقيقة' : '30-45 min'}
                  />
                </div>

                {/* Minimum Order */}
                <div>
                  <label className="block text-sm text-slate-500 mb-1">
                    {locale === 'ar' ? 'الحد الأدنى للطلب (ج.م)' : 'Minimum Order (EGP)'}
                  </label>
                  <Input
                    type="number"
                    value={minimumOrder}
                    onChange={(e) => setMinimumOrder(e.target.value)}
                    className="bg-white border-slate-200 text-slate-900"
                    placeholder="50"
                  />
                </div>

                {/* Delivery Radius */}
                <div>
                  <label className="block text-sm text-slate-500 mb-1">
                    {locale === 'ar' ? 'نطاق التوصيل (كم)' : 'Delivery Radius (km)'}
                  </label>
                  <Input
                    type="number"
                    value={deliveryRadius}
                    onChange={(e) => setDeliveryRadius(e.target.value)}
                    className="bg-white border-slate-200 text-slate-900"
                    placeholder="5"
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleSaveDelivery}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {locale === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                    </>
                  ) : saved ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {locale === 'ar' ? 'تم الحفظ!' : 'Saved!'}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {locale === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Pickup Tab */}
          {activeTab === 'pickup' && (
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  {locale === 'ar' ? 'إعدادات الاستلام من المتجر' : 'Pickup Settings'}
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  {locale === 'ar'
                    ? 'فعّل هذا الخيار للسماح للعملاء باستلام طلباتهم من المتجر مباشرة'
                    : 'Enable this option to allow customers to pick up their orders from your store'}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable Pickup Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <Label className="text-slate-900 font-medium">
                      {locale === 'ar' ? 'دعم الاستلام من المتجر' : 'Support Customer Pickup'}
                    </Label>
                    <p className="text-sm text-slate-500 mt-1">
                      {locale === 'ar'
                        ? 'السماح للعملاء باختيار استلام الطلب بأنفسهم'
                        : 'Allow customers to collect their orders themselves'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSupportsPickup(!supportsPickup)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      supportsPickup ? 'bg-primary' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        supportsPickup ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Pickup Settings - Only show if enabled */}
                {supportsPickup && (
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    {/* Estimated Pickup Time */}
                    <div>
                      <Label className="block text-sm text-slate-500 mb-1 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {locale === 'ar' ? 'وقت التحضير المتوقع (دقيقة)' : 'Estimated Preparation Time (minutes)'}
                      </Label>
                      <Input
                        type="number"
                        value={estimatedPickupTime}
                        onChange={(e) => setEstimatedPickupTime(e.target.value)}
                        className="bg-white border-slate-200 text-slate-900"
                        placeholder="15"
                        min="5"
                        max="120"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        {locale === 'ar'
                          ? 'الوقت المتوقع لتجهيز الطلب للاستلام'
                          : 'Expected time to prepare order for pickup'}
                      </p>
                    </div>

                    {/* Pickup Instructions AR */}
                    <div>
                      <Label className="block text-sm text-slate-500 mb-1 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {locale === 'ar' ? 'تعليمات الاستلام (عربي)' : 'Pickup Instructions (Arabic)'}
                      </Label>
                      <Textarea
                        value={pickupInstructionsAr}
                        onChange={(e) => setPickupInstructionsAr(e.target.value)}
                        className="bg-white border-slate-200 text-slate-900"
                        dir="rtl"
                        rows={3}
                        placeholder={locale === 'ar'
                          ? 'مثال: الاستلام من الباب الخلفي، اذكر رقم الطلب عند الوصول'
                          : 'Example: Pickup from back door, mention order number on arrival'}
                      />
                    </div>

                    {/* Pickup Instructions EN */}
                    <div>
                      <Label className="block text-sm text-slate-500 mb-1">
                        {locale === 'ar' ? 'تعليمات الاستلام (إنجليزي)' : 'Pickup Instructions (English)'}
                      </Label>
                      <Textarea
                        value={pickupInstructionsEn}
                        onChange={(e) => setPickupInstructionsEn(e.target.value)}
                        className="bg-white border-slate-200 text-slate-900"
                        dir="ltr"
                        rows={3}
                        placeholder="Example: Pick up from counter, please show order confirmation"
                      />
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-1">
                            {locale === 'ar' ? 'ملاحظة' : 'Note'}
                          </p>
                          <p>
                            {locale === 'ar'
                              ? 'عند تفعيل هذا الخيار، سيتمكن العملاء من اختيار "استلام من المتجر" عند الطلب، وسيتم تصفير رسوم التوصيل تلقائياً.'
                              : 'When enabled, customers can choose "Pickup" at checkout, and delivery fees will be automatically waived.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handleSavePickup}
                  disabled={savingPickup}
                >
                  {savingPickup ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {locale === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                    </>
                  ) : savedPickup ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {locale === 'ar' ? 'تم الحفظ!' : 'Saved!'}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {locale === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Status Tab */}
          {activeTab === 'status' && (
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-900 flex items-center gap-2 text-xl font-bold">
                  <Power className="w-5 h-5" />
                  {locale === 'ar' ? 'حالة المتجر' : 'Store Status'}
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  {locale === 'ar'
                    ? 'اختر حالة متجرك الحالية من الخيارات أدناه'
                    : 'Choose your current store status from the options below'}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Status Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">
                    {locale === 'ar' ? 'الحالة الحالية:' : 'Current Status:'}
                  </span>
                  <span className={`px-3 py-1 rounded-lg text-sm font-semibold border ${
                    provider?.status === 'open'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : provider?.status === 'closed'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {provider?.status === 'open'
                      ? locale === 'ar' ? 'مفتوح' : 'Open'
                      : provider?.status === 'closed'
                      ? locale === 'ar' ? 'مغلق' : 'Closed'
                      : locale === 'ar' ? 'متوقف مؤقتاً' : 'Temporarily Paused'}
                  </span>
                </div>

                {/* Divider */}
                <hr className="border-slate-200" />

                {/* Status Options */}
                <div className="space-y-3">
                  {/* Open Option */}
                  <button
                    onClick={() => handleToggleStatus('open')}
                    disabled={saving || provider?.status === 'open'}
                    className={`w-full p-4 rounded-lg border transition-all flex items-center gap-3 ${
                      provider?.status === 'open'
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      provider?.status === 'open'
                        ? 'border-emerald-500 bg-emerald-500'
                        : 'border-slate-300 bg-white'
                    }`}>
                      {provider?.status === 'open' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="text-start flex-1">
                      <p className={`font-semibold ${
                        provider?.status === 'open' ? 'text-emerald-700' : 'text-slate-700'
                      }`}>
                        {locale === 'ar' ? 'مفتوح' : 'Open'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {locale === 'ar'
                          ? 'المتجر يستقبل الطلبات'
                          : 'Store is accepting orders'}
                      </p>
                    </div>
                    {provider?.status === 'open' && (
                      <Check className="w-5 h-5 text-emerald-500" />
                    )}
                  </button>

                  {/* Temporarily Paused Option */}
                  <button
                    onClick={() => handleToggleStatus('temporarily_paused')}
                    disabled={saving || provider?.status === 'temporarily_paused'}
                    className={`w-full p-4 rounded-lg border transition-all flex items-center gap-3 ${
                      provider?.status === 'temporarily_paused'
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      provider?.status === 'temporarily_paused'
                        ? 'border-amber-500 bg-amber-500'
                        : 'border-slate-300 bg-white'
                    }`}>
                      {provider?.status === 'temporarily_paused' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="text-start flex-1">
                      <p className={`font-semibold ${
                        provider?.status === 'temporarily_paused' ? 'text-amber-700' : 'text-slate-700'
                      }`}>
                        {locale === 'ar' ? 'متوقف مؤقتاً' : 'Temporarily Paused'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {locale === 'ar'
                          ? 'توقف مؤقت عن استقبال الطلبات'
                          : 'Temporarily not accepting orders'}
                      </p>
                    </div>
                    {provider?.status === 'temporarily_paused' && (
                      <Check className="w-5 h-5 text-amber-500" />
                    )}
                  </button>

                  {/* Closed Option */}
                  <button
                    onClick={() => handleToggleStatus('closed')}
                    disabled={saving || provider?.status === 'closed'}
                    className={`w-full p-4 rounded-lg border transition-all flex items-center gap-3 ${
                      provider?.status === 'closed'
                        ? 'border-red-400 bg-red-50'
                        : 'border-slate-200 hover:border-red-300 hover:bg-red-50/50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      provider?.status === 'closed'
                        ? 'border-red-500 bg-red-500'
                        : 'border-slate-300 bg-white'
                    }`}>
                      {provider?.status === 'closed' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="text-start flex-1">
                      <p className={`font-semibold ${
                        provider?.status === 'closed' ? 'text-red-700' : 'text-slate-700'
                      }`}>
                        {locale === 'ar' ? 'مغلق' : 'Closed'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {locale === 'ar'
                          ? 'المتجر مغلق ولا يستقبل طلبات'
                          : 'Store is closed and not accepting orders'}
                      </p>
                    </div>
                    {provider?.status === 'closed' && (
                      <Check className="w-5 h-5 text-red-500" />
                    )}
                  </button>
                </div>

                {/* Warning Notice */}
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>
                    {locale === 'ar'
                      ? 'تغيير الحالة سيؤثر على ظهور متجرك للعملاء وقدرتهم على تقديم الطلبات.'
                      : 'Changing status will affect your store visibility and customers\' ability to place orders.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <>
              {/* Account Info */}
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="text-slate-900 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {locale === 'ar' ? 'معلومات الحساب' : 'Account Info'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">
                        {userEmail?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-lg text-slate-900">{userEmail?.split('@')[0]}</p>
                      <p className="text-slate-500 text-sm">{userEmail}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security Section - Password Change */}
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="text-slate-900 flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    {locale === 'ar' ? 'الأمان' : 'Security'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!showPasswordForm ? (
                    <button
                      onClick={() => setShowPasswordForm(true)}
                      className="w-full p-4 rounded-xl border border-slate-300 hover:border-slate-400 transition-all flex items-center justify-start"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-100">
                          <Lock className="w-5 h-5" />
                        </div>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <p className="font-medium text-slate-900">{locale === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}</p>
                          <p className="text-xs text-slate-500">
                            {locale === 'ar' ? 'تحديث كلمة المرور الخاصة بك' : 'Update your password'}
                          </p>
                        </div>
                      </div>
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-slate-900 flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          {locale === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                        </h4>
                        <button
                          onClick={() => {
                            setShowPasswordForm(false)
                            setPasswordMessage(null)
                            setCurrentPassword('')
                            setNewPassword('')
                            setConfirmPassword('')
                          }}
                          className="text-slate-500 hover:text-slate-900"
                        >
                          {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                      </div>

                      {/* Current Password */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-600">
                          {locale === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}
                        </label>
                        <div className="relative">
                          <Input
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className={`bg-white border-slate-200 ${isRTL ? 'pl-10' : 'pr-10'}`}
                            placeholder={locale === 'ar' ? 'أدخل كلمة المرور الحالية' : 'Enter current password'}
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-500`}
                          >
                            {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* New Password */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-600">
                          {locale === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
                        </label>
                        <div className="relative">
                          <Input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className={`bg-white border-slate-200 ${isRTL ? 'pl-10' : 'pr-10'}`}
                            placeholder={locale === 'ar' ? 'أدخل كلمة المرور الجديدة' : 'Enter new password'}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-500`}
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm Password */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-600">
                          {locale === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                        </label>
                        <Input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="bg-white border-slate-200"
                          placeholder={locale === 'ar' ? 'أعد إدخال كلمة المرور الجديدة' : 'Re-enter new password'}
                        />
                      </div>

                      {/* Password Message */}
                      {passwordMessage && (
                        <div className={`flex items-center gap-2 p-3 rounded-lg ${
                          passwordMessage.type === 'success'
                            ? 'bg-[hsl(158_100%_38%/0.15)] text-deal'
                            : 'bg-[hsl(358_100%_68%/0.15)] text-error'
                        }`}>
                          {passwordMessage.type === 'success' ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <AlertCircle className="w-4 h-4" />
                          )}
                          <span className="text-sm">{passwordMessage.text}</span>
                        </div>
                      )}

                      {/* Save Button */}
                      <Button
                        onClick={handlePasswordChange}
                        disabled={savingPassword}
                        className="w-full"
                      >
                        {savingPassword ? (
                          <>
                            <Loader2 className={`w-4 h-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                            {locale === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                          </>
                        ) : (
                          <>
                            <Check className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                            {locale === 'ar' ? 'حفظ كلمة المرور' : 'Save Password'}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Delete Account Section */}
              <Card className="bg-white border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600 flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    {locale === 'ar' ? 'حذف الحساب' : 'Delete Account'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!showDeleteConfirm ? (
                    <div>
                      <p className="text-sm text-slate-600 mb-4">
                        {locale === 'ar'
                          ? 'حذف حسابك سيؤدي إلى إزالة جميع بياناتك بشكل نهائي. هذا الإجراء لا يمكن التراجع عنه.'
                          : 'Deleting your account will permanently remove all your data. This action cannot be undone.'}
                      </p>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full p-4 rounded-xl border border-red-300 hover:border-red-400 hover:bg-red-50 transition-all flex items-center justify-start"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-red-100">
                            <Trash2 className="w-5 h-5 text-red-600" />
                          </div>
                          <div className={isRTL ? 'text-right' : 'text-left'}>
                            <p className="font-medium text-red-600">{locale === 'ar' ? 'حذف حسابي' : 'Delete My Account'}</p>
                            <p className="text-xs text-slate-500">
                              {locale === 'ar' ? 'حذف الحساب والبيانات نهائياً' : 'Permanently delete account and data'}
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-red-700">
                              {locale === 'ar' ? 'تحذير: هذا الإجراء نهائي!' : 'Warning: This action is permanent!'}
                            </p>
                            <p className="text-sm text-red-600 mt-1">
                              {locale === 'ar'
                                ? 'سيتم حذف متجرك وجميع المنتجات والطلبات والتقييمات المرتبطة به.'
                                : 'Your store and all associated products, orders, and reviews will be deleted.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">
                          {locale === 'ar'
                            ? 'اكتب "حذف" للتأكيد'
                            : 'Type "DELETE" to confirm'}
                        </label>
                        <Input
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          className="bg-white border-slate-300"
                          placeholder={locale === 'ar' ? 'حذف' : 'DELETE'}
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setShowDeleteConfirm(false)
                            setDeleteConfirmText('')
                          }}
                        >
                          {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                        </Button>
                        <Button
                          className="flex-1 !bg-red-600 hover:!bg-red-700 !text-white"
                          onClick={handleDeleteAccount}
                          disabled={deletingAccount || (deleteConfirmText !== 'DELETE' && deleteConfirmText !== 'حذف')}
                        >
                          {deletingAccount ? (
                            <>
                              <Loader2 className={`w-4 h-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                              {locale === 'ar' ? 'جاري الحذف...' : 'Deleting...'}
                            </>
                          ) : (
                            <>
                              <Trash2 className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                              {locale === 'ar' ? 'حذف نهائياً' : 'Delete Permanently'}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sign Out */}
              <Button
                variant="outline"
                size="lg"
                className="w-full border-red-500/50 text-red-500 hover:bg-red-500/10"
                onClick={handleSignOut}
              >
                <LogOut className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {locale === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
              </Button>
            </>
          )}

          {/* Quick Links */}
          <Card className="bg-white border-slate-200">
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500 mb-3">
                {locale === 'ar' ? 'روابط سريعة' : 'Quick Links'}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href={`/${locale}/provider/store-hours`}>
                  <Button variant="outline" size="sm" className="border-slate-300">
                    <Clock className="w-4 h-4 mr-2" />
                    {locale === 'ar' ? 'ساعات العمل' : 'Store Hours'}
                  </Button>
                </Link>
                <Link href={`/${locale}/provider/products`}>
                  <Button variant="outline" size="sm" className="border-slate-300">
                    <Store className="w-4 h-4 mr-2" />
                    {locale === 'ar' ? 'المنتجات' : 'Products'}
                  </Button>
                </Link>
                <Link href={`/${locale}/provider/orders`}>
                  <Button variant="outline" size="sm" className="border-slate-300">
                    <Bell className="w-4 h-4 mr-2" />
                    {locale === 'ar' ? 'الطلبات' : 'Orders'}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProviderLayout>
  )
}

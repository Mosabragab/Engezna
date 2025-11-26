'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  ArrowRight,
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
} from 'lucide-react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

type Provider = {
  id: string
  name_ar: string
  name_en: string
  phone: string | null
  address: string | null
  logo_url: string | null
  status: string
  delivery_fee: number | null
  delivery_time: string | null
  minimum_order: number | null
  delivery_radius: number | null
  governorate_id: string | null
  city_id: string | null
}

type Location = {
  id: string
  name_ar: string
  name_en: string
}

export default function ProviderSettingsPage() {
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'

  const [provider, setProvider] = useState<Provider | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'store' | 'delivery' | 'status'>('store')

  // Form states
  const [nameAr, setNameAr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [deliveryFee, setDeliveryFee] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [minimumOrder, setMinimumOrder] = useState('')
  const [deliveryRadius, setDeliveryRadius] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  // Location states
  const [governorates, setGovernorates] = useState<Location[]>([])
  const [cities, setCities] = useState<Location[]>([])
  const [selectedGovernorate, setSelectedGovernorate] = useState('')
  const [selectedCity, setSelectedCity] = useState('')

  useEffect(() => {
    checkAuthAndLoadProvider()
    loadGovernorates()
  }, [])

  useEffect(() => {
    if (selectedGovernorate) {
      loadCities(selectedGovernorate)
    } else {
      setCities([])
      setSelectedCity('')
    }
  }, [selectedGovernorate])

  const checkAuthAndLoadProvider = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/provider/settings`)
      return
    }

    const { data: providerData } = await supabase
      .from('providers')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (!providerData || !['approved', 'open', 'closed', 'temporarily_paused'].includes(providerData.status)) {
      router.push(`/${locale}/provider`)
      return
    }

    setProvider(providerData)
    setNameAr(providerData.name_ar || '')
    setNameEn(providerData.name_en || '')
    setPhone(providerData.phone || '')
    setAddress(providerData.address || '')
    setDeliveryFee(providerData.delivery_fee?.toString() || '')
    setDeliveryTime(providerData.delivery_time || '')
    setMinimumOrder(providerData.minimum_order?.toString() || '')
    setDeliveryRadius(providerData.delivery_radius?.toString() || '')
    setSelectedGovernorate(providerData.governorate_id || '')
    setSelectedCity(providerData.city_id || '')
    setLogoPreview(providerData.logo_url)

    setLoading(false)
  }

  const loadGovernorates = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('governorates')
      .select('id, name_ar, name_en')
      .order('name_ar')
    if (data) setGovernorates(data)
  }

  const loadCities = async (governorateId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('cities')
      .select('id, name_ar, name_en')
      .eq('governorate_id', governorateId)
      .order('name_ar')
    if (data) setCities(data)
  }

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
        address: address || null,
        governorate_id: selectedGovernorate || null,
        city_id: selectedCity || null,
        logo_url: logoUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', provider.id)

    if (error) {
      console.error('Error saving:', error)
    } else {
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
        delivery_time: deliveryTime || null,
        minimum_order: minimumOrder ? parseFloat(minimumOrder) : null,
        delivery_radius: deliveryRadius ? parseFloat(deliveryRadius) : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', provider.id)

    if (error) {
      console.error('Error saving:', error)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }

    setSaving(false)
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

    if (error) {
      console.error('Error updating status:', error)
    } else {
      setProvider(prev => prev ? { ...prev, status: newStatus } : null)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }

    setSaving(false)
  }

  const tabs = [
    { key: 'store', label_ar: 'معلومات المتجر', label_en: 'Store Info', icon: Store },
    { key: 'delivery', label_ar: 'التوصيل', label_en: 'Delivery', icon: Truck },
    { key: 'status', label_ar: 'حالة المتجر', label_en: 'Store Status', icon: Power },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-slate-400">
            {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/${locale}/provider`}
              className="flex items-center gap-2 text-slate-400 hover:text-white"
            >
              {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              <span>{locale === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</span>
            </Link>
            <h1 className="text-xl font-bold text-primary flex items-center gap-2">
              <Settings className="w-5 h-5" />
              {locale === 'ar' ? 'إعدادات المتجر' : 'Store Settings'}
            </h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as 'store' | 'delivery' | 'status')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === tab.key
                      ? 'bg-primary text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
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
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
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
                        className="rounded-full object-cover border-2 border-slate-600"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-slate-700 flex items-center justify-center">
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
                    className="bg-slate-700 border-slate-600 text-white"
                    dir="rtl"
                  />
                </div>

                {/* Name EN */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {locale === 'ar' ? 'اسم المتجر (إنجليزي)' : 'Store Name (English)'}
                  </label>
                  <Input
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    dir="ltr"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1 flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {locale === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    dir="ltr"
                    type="tel"
                  />
                </div>

                {/* Governorate */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {locale === 'ar' ? 'المحافظة' : 'Governorate'}
                  </label>
                  <select
                    value={selectedGovernorate}
                    onChange={(e) => setSelectedGovernorate(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">{locale === 'ar' ? 'اختر المحافظة' : 'Select Governorate'}</option>
                    {governorates.map((gov) => (
                      <option key={gov.id} value={gov.id}>
                        {locale === 'ar' ? gov.name_ar : gov.name_en}
                      </option>
                    ))}
                  </select>
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {locale === 'ar' ? 'المدينة' : 'City'}
                  </label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={!selectedGovernorate}
                  >
                    <option value="">{locale === 'ar' ? 'اختر المدينة' : 'Select City'}</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {locale === 'ar' ? city.name_ar : city.name_en}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {locale === 'ar' ? 'العنوان التفصيلي' : 'Detailed Address'}
                  </label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
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
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  {locale === 'ar' ? 'إعدادات التوصيل' : 'Delivery Settings'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Delivery Fee */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1 flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    {locale === 'ar' ? 'رسوم التوصيل (ج.م)' : 'Delivery Fee (EGP)'}
                  </label>
                  <Input
                    type="number"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="10"
                  />
                </div>

                {/* Delivery Time */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {locale === 'ar' ? 'وقت التوصيل المتوقع' : 'Expected Delivery Time'}
                  </label>
                  <Input
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder={locale === 'ar' ? '30-45 دقيقة' : '30-45 min'}
                  />
                </div>

                {/* Minimum Order */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {locale === 'ar' ? 'الحد الأدنى للطلب (ج.م)' : 'Minimum Order (EGP)'}
                  </label>
                  <Input
                    type="number"
                    value={minimumOrder}
                    onChange={(e) => setMinimumOrder(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="50"
                  />
                </div>

                {/* Delivery Radius */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {locale === 'ar' ? 'نطاق التوصيل (كم)' : 'Delivery Radius (km)'}
                  </label>
                  <Input
                    type="number"
                    value={deliveryRadius}
                    onChange={(e) => setDeliveryRadius(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
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

          {/* Status Tab */}
          {activeTab === 'status' && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Power className="w-5 h-5" />
                  {locale === 'ar' ? 'حالة المتجر' : 'Store Status'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Status */}
                <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                  <p className="text-sm text-slate-400 mb-2">
                    {locale === 'ar' ? 'الحالة الحالية' : 'Current Status'}
                  </p>
                  <span className={`px-4 py-2 rounded-full text-lg font-bold ${
                    provider?.status === 'open'
                      ? 'bg-green-500/20 text-green-400'
                      : provider?.status === 'closed'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {provider?.status === 'open'
                      ? locale === 'ar' ? 'مفتوح' : 'Open'
                      : provider?.status === 'closed'
                      ? locale === 'ar' ? 'مغلق' : 'Closed'
                      : locale === 'ar' ? 'متوقف مؤقتاً' : 'Temporarily Paused'}
                  </span>
                </div>

                {/* Status Options */}
                <div className="space-y-3">
                  <button
                    onClick={() => handleToggleStatus('open')}
                    disabled={saving || provider?.status === 'open'}
                    className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                      provider?.status === 'open'
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-slate-600 hover:border-green-500/50 hover:bg-green-500/5'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${
                      provider?.status === 'open' ? 'bg-green-500' : 'bg-slate-600'
                    }`} />
                    <div className="text-start flex-1">
                      <p className="font-bold text-green-400">
                        {locale === 'ar' ? 'مفتوح' : 'Open'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {locale === 'ar'
                          ? 'المتجر يستقبل الطلبات'
                          : 'Store is accepting orders'}
                      </p>
                    </div>
                    {provider?.status === 'open' && (
                      <Check className="w-5 h-5 text-green-500" />
                    )}
                  </button>

                  <button
                    onClick={() => handleToggleStatus('temporarily_paused')}
                    disabled={saving || provider?.status === 'temporarily_paused'}
                    className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                      provider?.status === 'temporarily_paused'
                        ? 'border-yellow-500 bg-yellow-500/10'
                        : 'border-slate-600 hover:border-yellow-500/50 hover:bg-yellow-500/5'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${
                      provider?.status === 'temporarily_paused' ? 'bg-yellow-500' : 'bg-slate-600'
                    }`} />
                    <div className="text-start flex-1">
                      <p className="font-bold text-yellow-400">
                        {locale === 'ar' ? 'متوقف مؤقتاً' : 'Temporarily Paused'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {locale === 'ar'
                          ? 'توقف مؤقت عن استقبال الطلبات'
                          : 'Temporarily not accepting orders'}
                      </p>
                    </div>
                    {provider?.status === 'temporarily_paused' && (
                      <Check className="w-5 h-5 text-yellow-500" />
                    )}
                  </button>

                  <button
                    onClick={() => handleToggleStatus('closed')}
                    disabled={saving || provider?.status === 'closed'}
                    className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                      provider?.status === 'closed'
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-slate-600 hover:border-red-500/50 hover:bg-red-500/5'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${
                      provider?.status === 'closed' ? 'bg-red-500' : 'bg-slate-600'
                    }`} />
                    <div className="text-start flex-1">
                      <p className="font-bold text-red-400">
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

                {/* Warning */}
                <div className="flex items-start gap-2 p-3 bg-yellow-500/10 rounded-lg text-yellow-400 text-sm">
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

          {/* Quick Links */}
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <p className="text-sm text-slate-400 mb-3">
                {locale === 'ar' ? 'روابط سريعة' : 'Quick Links'}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href={`/${locale}/provider/store-hours`}>
                  <Button variant="outline" size="sm" className="border-slate-600">
                    <Clock className="w-4 h-4 mr-2" />
                    {locale === 'ar' ? 'ساعات العمل' : 'Store Hours'}
                  </Button>
                </Link>
                <Link href={`/${locale}/provider/products`}>
                  <Button variant="outline" size="sm" className="border-slate-600">
                    <Store className="w-4 h-4 mr-2" />
                    {locale === 'ar' ? 'المنتجات' : 'Products'}
                  </Button>
                </Link>
                <Link href={`/${locale}/provider/orders`}>
                  <Button variant="outline" size="sm" className="border-slate-600">
                    <Bell className="w-4 h-4 mr-2" />
                    {locale === 'ar' ? 'الطلبات' : 'Orders'}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

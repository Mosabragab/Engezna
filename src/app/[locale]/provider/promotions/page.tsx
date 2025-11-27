'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  ArrowRight,
  Tag,
  Plus,
  Percent,
  Calendar,
  Gift,
  Clock,
  Check,
  X,
  Trash2,
  Edit2,
  Power,
  AlertCircle,
  Sparkles,
  Package,
  CheckSquare,
  Square,
} from 'lucide-react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

type Promotion = {
  id: string
  provider_id: string
  name_ar: string
  name_en: string
  type: 'percentage' | 'fixed' | 'buy_x_get_y'
  discount_value: number
  buy_quantity?: number
  get_quantity?: number
  min_order_amount?: number
  max_discount?: number
  start_date: string
  end_date: string
  is_active: boolean
  applies_to: 'all' | 'specific'
  product_ids?: string[]
  created_at: string
}

type Product = {
  id: string
  name_ar: string
  name_en: string
}

export default function PromotionsPage() {
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'

  const [providerId, setProviderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'upcoming' | 'expired'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    type: 'percentage' as 'percentage' | 'fixed' | 'buy_x_get_y',
    discount_value: '',
    buy_quantity: '',
    get_quantity: '',
    min_order_amount: '',
    max_discount: '',
    start_date: '',
    end_date: '',
    applies_to: 'all' as 'all' | 'specific',
    product_ids: [] as string[],
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    checkAuthAndLoadPromotions()
  }, [])

  const checkAuthAndLoadPromotions = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/provider/promotions`)
      return
    }

    const { data: providerData } = await supabase
      .from('providers')
      .select('id, status')
      .eq('owner_id', user.id)
      .limit(1)

    const provider = providerData?.[0]
    if (!provider || !['approved', 'open', 'closed', 'temporarily_paused'].includes(provider.status)) {
      router.push(`/${locale}/provider`)
      return
    }

    setProviderId(provider.id)
    await loadPromotions(provider.id)
    await loadProducts(provider.id)

    setLoading(false)
  }

  const loadPromotions = async (provId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('promotions')
      .select('*')
      .eq('provider_id', provId)
      .order('created_at', { ascending: false })

    if (data) setPromotions(data)
  }

  const loadProducts = async (provId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('menu_items')
      .select('id, name_ar, name_en')
      .eq('provider_id', provId)
      .eq('is_available', true)
      .order('name_ar')

    if (data) setProducts(data)
  }

  const getPromotionStatus = (promo: Promotion) => {
    const now = new Date()
    const start = new Date(promo.start_date)
    const end = new Date(promo.end_date)

    if (!promo.is_active) return 'inactive'
    if (now < start) return 'upcoming'
    if (now > end) return 'expired'
    return 'active'
  }

  const filteredPromotions = promotions.filter(promo => {
    if (activeTab === 'all') return true
    const status = getPromotionStatus(promo)
    if (activeTab === 'active') return status === 'active'
    if (activeTab === 'upcoming') return status === 'upcoming'
    if (activeTab === 'expired') return status === 'expired' || status === 'inactive'
    return true
  })

  const stats = {
    active: promotions.filter(p => getPromotionStatus(p) === 'active').length,
    upcoming: promotions.filter(p => getPromotionStatus(p) === 'upcoming').length,
    expired: promotions.filter(p => getPromotionStatus(p) === 'expired' || getPromotionStatus(p) === 'inactive').length,
    total: promotions.length,
  }

  const resetForm = () => {
    setFormData({
      name_ar: '',
      name_en: '',
      type: 'percentage',
      discount_value: '',
      buy_quantity: '',
      get_quantity: '',
      min_order_amount: '',
      max_discount: '',
      start_date: '',
      end_date: '',
      applies_to: 'all',
      product_ids: [],
    })
    setEditingPromotion(null)
  }

  const handleEdit = (promo: Promotion) => {
    setFormData({
      name_ar: promo.name_ar,
      name_en: promo.name_en,
      type: promo.type,
      discount_value: promo.discount_value.toString(),
      buy_quantity: promo.buy_quantity?.toString() || '',
      get_quantity: promo.get_quantity?.toString() || '',
      min_order_amount: promo.min_order_amount?.toString() || '',
      max_discount: promo.max_discount?.toString() || '',
      start_date: promo.start_date.split('T')[0],
      end_date: promo.end_date.split('T')[0],
      applies_to: promo.applies_to,
      product_ids: promo.product_ids || [],
    })
    setEditingPromotion(promo)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!providerId) return

    setSaving(true)
    const supabase = createClient()

    const promoData = {
      provider_id: providerId,
      name_ar: formData.name_ar,
      name_en: formData.name_en,
      type: formData.type,
      discount_value: parseFloat(formData.discount_value) || 0,
      buy_quantity: formData.type === 'buy_x_get_y' ? parseInt(formData.buy_quantity) || null : null,
      get_quantity: formData.type === 'buy_x_get_y' ? parseInt(formData.get_quantity) || null : null,
      min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : null,
      max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
      start_date: formData.start_date,
      end_date: formData.end_date,
      is_active: true,
      applies_to: formData.applies_to,
      product_ids: formData.applies_to === 'specific' ? formData.product_ids : null,
    }

    let error

    if (editingPromotion) {
      const result = await supabase
        .from('promotions')
        .update(promoData)
        .eq('id', editingPromotion.id)
      error = result.error
    } else {
      const result = await supabase
        .from('promotions')
        .insert(promoData)
      error = result.error
    }

    if (error) {
      console.error('Error saving promotion:', error)
    } else {
      await loadPromotions(providerId)
      setShowForm(false)
      resetForm()
    }

    setSaving(false)
  }

  const handleToggleActive = async (promo: Promotion) => {
    if (!providerId) return

    const supabase = createClient()
    await supabase
      .from('promotions')
      .update({ is_active: !promo.is_active })
      .eq('id', promo.id)

    await loadPromotions(providerId)
  }

  const handleDelete = async (promoId: string) => {
    if (!providerId) return
    if (!confirm(locale === 'ar' ? 'هل تريد حذف هذا العرض؟' : 'Delete this promotion?')) return

    const supabase = createClient()
    await supabase
      .from('promotions')
      .delete()
      .eq('id', promoId)

    await loadPromotions(providerId)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const tabs = [
    { key: 'all', label_ar: 'الكل', label_en: 'All', count: stats.total },
    { key: 'active', label_ar: 'نشط', label_en: 'Active', count: stats.active },
    { key: 'upcoming', label_ar: 'قادم', label_en: 'Upcoming', count: stats.upcoming },
    { key: 'expired', label_ar: 'منتهي', label_en: 'Expired', count: stats.expired },
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/${locale}/provider`}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-900"
            >
              {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              <span>{locale === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</span>
            </Link>
            <h1 className="text-xl font-bold text-primary flex items-center gap-2">
              <Tag className="w-5 h-5" />
              {locale === 'ar' ? 'العروض والخصومات' : 'Promotions'}
            </h1>
            <Button size="sm" onClick={() => { resetForm(); setShowForm(true) }}>
              <Plus className="w-4 h-4 mr-1" />
              {locale === 'ar' ? 'عرض جديد' : 'New Promotion'}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-4 text-center border border-slate-200">
              <p className="text-2xl font-bold text-deal">{stats.active}</p>
              <p className="text-xs text-slate-500">{locale === 'ar' ? 'نشط' : 'Active'}</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center border border-slate-200">
              <p className="text-2xl font-bold text-info">{stats.upcoming}</p>
              <p className="text-xs text-slate-500">{locale === 'ar' ? 'قادم' : 'Upcoming'}</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center border border-slate-200">
              <p className="text-2xl font-bold text-slate-500">{stats.expired}</p>
              <p className="text-xs text-slate-500">{locale === 'ar' ? 'منتهي' : 'Expired'}</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center border border-slate-200">
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
              <p className="text-xs text-slate-500">{locale === 'ar' ? 'الإجمالي' : 'Total'}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'bg-primary text-white'
                    : 'bg-white text-slate-500 hover:bg-slate-100'
                }`}
              >
                {locale === 'ar' ? tab.label_ar : tab.label_en}
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Promotions List */}
          {filteredPromotions.length === 0 ? (
            <Card className="bg-white border-slate-200">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Tag className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-medium text-slate-600 mb-2">
                  {locale === 'ar' ? 'لا توجد عروض' : 'No promotions'}
                </h3>
                <p className="text-slate-500 text-sm mb-4">
                  {locale === 'ar'
                    ? 'أنشئ عرضاً جديداً لجذب المزيد من العملاء'
                    : 'Create a new promotion to attract more customers'}
                </p>
                <Button onClick={() => { resetForm(); setShowForm(true) }}>
                  <Plus className="w-4 h-4 mr-2" />
                  {locale === 'ar' ? 'إنشاء عرض' : 'Create Promotion'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredPromotions.map((promo) => {
                const status = getPromotionStatus(promo)
                return (
                  <Card key={promo.id} className="bg-white border-slate-200 overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            promo.type === 'percentage' ? 'bg-[hsl(158_100%_38%/0.2)]' :
                            promo.type === 'fixed' ? 'bg-[hsl(194_86%_58%/0.2)]' : 'bg-[hsl(198_100%_44%/0.2)]'
                          }`}>
                            {promo.type === 'percentage' ? (
                              <Percent className="w-6 h-6 text-deal" />
                            ) : promo.type === 'fixed' ? (
                              <Tag className="w-6 h-6 text-info" />
                            ) : (
                              <Gift className="w-6 h-6 text-primary" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">
                              {locale === 'ar' ? promo.name_ar : promo.name_en}
                            </h3>
                            <p className="text-slate-500 text-sm">
                              {promo.type === 'percentage'
                                ? `${promo.discount_value}% ${locale === 'ar' ? 'خصم' : 'off'}`
                                : promo.type === 'fixed'
                                ? `${promo.discount_value} ${locale === 'ar' ? 'ج.م خصم' : 'EGP off'}`
                                : `${locale === 'ar' ? 'اشتري' : 'Buy'} ${promo.buy_quantity} ${locale === 'ar' ? 'واحصل على' : 'get'} ${promo.get_quantity} ${locale === 'ar' ? 'مجاناً' : 'free'}`}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(promo.start_date)} - {formatDate(promo.end_date)}
                              </span>
                              {promo.min_order_amount && (
                                <span>
                                  {locale === 'ar' ? 'الحد الأدنى:' : 'Min:'} {promo.min_order_amount} {locale === 'ar' ? 'ج.م' : 'EGP'}
                                </span>
                              )}
                              <span className={`flex items-center gap-1 ${promo.applies_to === 'specific' ? 'text-primary' : ''}`}>
                                {promo.applies_to === 'specific' ? (
                                  <>
                                    <CheckSquare className="w-3 h-3" />
                                    {promo.product_ids?.length || 0} {locale === 'ar' ? 'منتج محدد' : 'specific products'}
                                  </>
                                ) : (
                                  <>
                                    <Package className="w-3 h-3" />
                                    {locale === 'ar' ? 'جميع المنتجات' : 'All products'}
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            status === 'active' ? 'bg-[hsl(158_100%_38%/0.2)] text-deal' :
                            status === 'upcoming' ? 'bg-[hsl(194_86%_58%/0.2)] text-info' :
                            'bg-slate-200 text-slate-500'
                          }`}>
                            {status === 'active' ? (locale === 'ar' ? 'نشط' : 'Active') :
                             status === 'upcoming' ? (locale === 'ar' ? 'قادم' : 'Upcoming') :
                             (locale === 'ar' ? 'منتهي' : 'Expired')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(promo)}
                          className="border-slate-300"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          {locale === 'ar' ? 'تعديل' : 'Edit'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(promo)}
                          className={`border-slate-300 ${promo.is_active ? 'text-premium' : 'text-deal'}`}
                        >
                          <Power className="w-4 h-4 mr-1" />
                          {promo.is_active
                            ? (locale === 'ar' ? 'إيقاف' : 'Disable')
                            : (locale === 'ar' ? 'تفعيل' : 'Enable')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(promo.id)}
                          className="border-slate-300 text-error"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          {locale === 'ar' ? 'حذف' : 'Delete'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <Card className="bg-white border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {editingPromotion
                  ? (locale === 'ar' ? 'تعديل العرض' : 'Edit Promotion')
                  : (locale === 'ar' ? 'عرض جديد' : 'New Promotion')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Name AR */}
              <div>
                <label className="block text-sm text-slate-500 mb-1">
                  {locale === 'ar' ? 'اسم العرض (عربي)' : 'Promotion Name (Arabic)'}
                </label>
                <Input
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  className="bg-white border-slate-200 text-slate-900"
                  dir="rtl"
                  placeholder={locale === 'ar' ? 'مثال: خصم نهاية الأسبوع' : 'e.g., Weekend Discount'}
                />
              </div>

              {/* Name EN */}
              <div>
                <label className="block text-sm text-slate-500 mb-1">
                  {locale === 'ar' ? 'اسم العرض (إنجليزي)' : 'Promotion Name (English)'}
                </label>
                <Input
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  className="bg-white border-slate-200 text-slate-900"
                  dir="ltr"
                  placeholder="e.g., Weekend Discount"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm text-slate-500 mb-1">
                  {locale === 'ar' ? 'نوع العرض' : 'Promotion Type'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'percentage' })}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      formData.type === 'percentage'
                        ? 'border-[hsl(158_100%_38%)] bg-[hsl(158_100%_38%/0.1)]'
                        : 'border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <Percent className="w-5 h-5 mx-auto mb-1 text-deal" />
                    <p className="text-xs">{locale === 'ar' ? 'نسبة مئوية' : 'Percentage'}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'fixed' })}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      formData.type === 'fixed'
                        ? 'border-[hsl(194_86%_58%)] bg-[hsl(194_86%_58%/0.1)]'
                        : 'border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <Tag className="w-5 h-5 mx-auto mb-1 text-info" />
                    <p className="text-xs">{locale === 'ar' ? 'مبلغ ثابت' : 'Fixed Amount'}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'buy_x_get_y' })}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      formData.type === 'buy_x_get_y'
                        ? 'border-primary bg-[hsl(198_100%_44%/0.1)]'
                        : 'border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <Gift className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <p className="text-xs">{locale === 'ar' ? 'اشتري واحصل' : 'Buy X Get Y'}</p>
                  </button>
                </div>
              </div>

              {/* Discount Value */}
              {formData.type !== 'buy_x_get_y' && (
                <div>
                  <label className="block text-sm text-slate-500 mb-1">
                    {formData.type === 'percentage'
                      ? (locale === 'ar' ? 'نسبة الخصم (%)' : 'Discount Percentage (%)')
                      : (locale === 'ar' ? 'قيمة الخصم (ج.م)' : 'Discount Amount (EGP)')}
                  </label>
                  <Input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    className="bg-white border-slate-200 text-slate-900"
                    placeholder={formData.type === 'percentage' ? '20' : '50'}
                  />
                </div>
              )}

              {/* Buy X Get Y */}
              {formData.type === 'buy_x_get_y' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-500 mb-1">
                      {locale === 'ar' ? 'اشتري (عدد)' : 'Buy (quantity)'}
                    </label>
                    <Input
                      type="number"
                      value={formData.buy_quantity}
                      onChange={(e) => setFormData({ ...formData, buy_quantity: e.target.value })}
                      className="bg-white border-slate-200 text-slate-900"
                      placeholder="2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-500 mb-1">
                      {locale === 'ar' ? 'واحصل على (عدد)' : 'Get (quantity)'}
                    </label>
                    <Input
                      type="number"
                      value={formData.get_quantity}
                      onChange={(e) => setFormData({ ...formData, get_quantity: e.target.value })}
                      className="bg-white border-slate-200 text-slate-900"
                      placeholder="1"
                    />
                  </div>
                </div>
              )}

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-500 mb-1">
                    {locale === 'ar' ? 'تاريخ البداية' : 'Start Date'}
                  </label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="bg-white border-slate-200 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">
                    {locale === 'ar' ? 'تاريخ النهاية' : 'End Date'}
                  </label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="bg-white border-slate-200 text-slate-900"
                  />
                </div>
              </div>

              {/* Min Order & Max Discount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-500 mb-1">
                    {locale === 'ar' ? 'الحد الأدنى للطلب (ج.م)' : 'Minimum Order (EGP)'}
                  </label>
                  <Input
                    type="number"
                    value={formData.min_order_amount}
                    onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                    className="bg-white border-slate-200 text-slate-900"
                    placeholder={locale === 'ar' ? 'اختياري' : 'Optional'}
                  />
                </div>
                {formData.type === 'percentage' && (
                  <div>
                    <label className="block text-sm text-slate-500 mb-1">
                      {locale === 'ar' ? 'أقصى خصم (ج.م)' : 'Max Discount (EGP)'}
                    </label>
                    <Input
                      type="number"
                      value={formData.max_discount}
                      onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                      className="bg-white border-slate-200 text-slate-900"
                      placeholder={locale === 'ar' ? 'اختياري' : 'Optional'}
                    />
                  </div>
                )}
              </div>

              {/* Applies To */}
              <div>
                <label className="block text-sm text-slate-500 mb-2">
                  {locale === 'ar' ? 'ينطبق على' : 'Applies To'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, applies_to: 'all', product_ids: [] })}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      formData.applies_to === 'all'
                        ? 'border-primary bg-primary/10'
                        : 'border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <Package className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <p className="text-xs">{locale === 'ar' ? 'جميع المنتجات' : 'All Products'}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, applies_to: 'specific' })}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      formData.applies_to === 'specific'
                        ? 'border-primary bg-primary/10'
                        : 'border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <CheckSquare className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <p className="text-xs">{locale === 'ar' ? 'منتجات محددة' : 'Specific Products'}</p>
                  </button>
                </div>
              </div>

              {/* Product Selection */}
              {formData.applies_to === 'specific' && (
                <div>
                  <label className="block text-sm text-slate-500 mb-2">
                    {locale === 'ar' ? 'اختر المنتجات' : 'Select Products'} ({formData.product_ids.length} {locale === 'ar' ? 'منتج' : 'selected'})
                  </label>
                  <div className="max-h-48 overflow-y-auto bg-slate-50 rounded-lg p-2 space-y-1">
                    {products.length === 0 ? (
                      <p className="text-sm text-slate-500 p-2 text-center">
                        {locale === 'ar' ? 'لا توجد منتجات متاحة' : 'No products available'}
                      </p>
                    ) : (
                      products.map((product) => {
                        const isSelected = formData.product_ids.includes(product.id)
                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setFormData({
                                  ...formData,
                                  product_ids: formData.product_ids.filter(id => id !== product.id)
                                })
                              } else {
                                setFormData({
                                  ...formData,
                                  product_ids: [...formData.product_ids, product.id]
                                })
                              }
                            }}
                            className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                              isSelected ? 'bg-primary/20' : 'hover:bg-slate-200'
                            }`}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-primary flex-shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-500 flex-shrink-0" />
                            )}
                            <span className="text-sm text-left flex-1">
                              {locale === 'ar' ? product.name_ar : product.name_en}
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                  {formData.applies_to === 'specific' && formData.product_ids.length === 0 && (
                    <p className="text-xs text-premium mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {locale === 'ar' ? 'يرجى اختيار منتج واحد على الأقل' : 'Please select at least one product'}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  className="flex-1"
                  onClick={handleSave}
                  disabled={saving || !formData.name_ar || !formData.start_date || !formData.end_date || (formData.applies_to === 'specific' && formData.product_ids.length === 0)}
                >
                  {saving ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      {locale === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {locale === 'ar' ? 'حفظ' : 'Save'}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setShowForm(false); resetForm() }}
                  className="border-slate-300"
                >
                  <X className="w-4 h-4 mr-2" />
                  {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

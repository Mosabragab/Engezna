'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  ArrowLeft,
  ArrowRight,
  Save,
  RefreshCw,
  ImagePlus,
  X,
  Package,
  DollarSign,
  Clock,
  FileText,
  Leaf,
  Flame,
  Info,
  Trash2,
  FolderOpen,
  Plus,
} from 'lucide-react'

type Category = {
  id: string
  name_ar: string
  name_en: string
}

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function EditProductPage() {
  const params = useParams()
  const productId = params.id as string
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'

  const [providerId, setProviderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Category state
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryAr, setNewCategoryAr] = useState('')
  const [newCategoryEn, setNewCategoryEn] = useState('')
  const [savingCategory, setSavingCategory] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    description_ar: '',
    description_en: '',
    price: '',
    original_price: '',
    image_url: '',
    is_available: true,
    is_vegetarian: false,
    is_spicy: false,
    preparation_time_min: '15',
    calories: '',
    category_id: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    checkAuthAndLoadProduct()
  }, [productId])

  const checkAuthAndLoadProduct = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/provider/products/${productId}`)
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

    // Load categories
    await loadCategories(provider.id)

    // Load product
    const { data: product, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('id', productId)
      .eq('provider_id', provider.id)
      .single()

    if (error || !product) {
      console.error('Error loading product:', error)
      router.push(`/${locale}/provider/products`)
      return
    }

    setFormData({
      name_ar: product.name_ar || '',
      name_en: product.name_en || '',
      description_ar: product.description_ar || '',
      description_en: product.description_en || '',
      price: product.price?.toString() || '',
      original_price: product.original_price?.toString() || '',
      image_url: product.image_url || '',
      is_available: product.is_available ?? true,
      is_vegetarian: product.is_vegetarian ?? false,
      is_spicy: product.is_spicy ?? false,
      preparation_time_min: product.preparation_time_min?.toString() || '15',
      calories: product.calories?.toString() || '',
      category_id: product.category_id || '',
    })

    if (product.image_url) {
      setImagePreview(product.image_url)
    }

    setLoading(false)
  }

  const loadCategories = async (provId: string) => {
    setLoadingCategories(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('provider_id', provId)
      .order('name_ar', { ascending: true })

    if (!error && data) {
      setCategories(data)
    }
    setLoadingCategories(false)
  }

  const handleCreateCategory = async () => {
    if (!newCategoryAr.trim() || !newCategoryEn.trim() || !providerId) return

    setSavingCategory(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('product_categories')
      .insert({
        provider_id: providerId,
        name_ar: newCategoryAr.trim(),
        name_en: newCategoryEn.trim(),
      })
      .select()
      .single()

    if (!error && data) {
      setCategories(prev => [...prev, data])
      setFormData(prev => ({ ...prev, category_id: data.id }))
      setNewCategoryAr('')
      setNewCategoryEn('')
      setShowNewCategory(false)
    }
    setSavingCategory(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, image: locale === 'ar' ? 'الملف يجب أن يكون صورة' : 'File must be an image' }))
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, image: locale === 'ar' ? 'حجم الصورة يجب أن يكون أقل من 2 ميجابايت' : 'Image must be less than 2MB' }))
      return
    }

    setUploading(true)
    setErrors(prev => ({ ...prev, image: '' }))

    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `products/${providerId}/${Date.now()}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('public')
        .upload(fileName, file, { upsert: true })

      if (error) {
        console.error('Upload error:', error)
        setErrors(prev => ({ ...prev, image: locale === 'ar' ? 'فشل رفع الصورة' : 'Failed to upload image' }))
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(fileName)

      setFormData(prev => ({ ...prev, image_url: publicUrl }))
      setImagePreview(publicUrl)
    } catch (err) {
      console.error('Upload error:', err)
      setErrors(prev => ({ ...prev, image: locale === 'ar' ? 'فشل رفع الصورة' : 'Failed to upload image' }))
    } finally {
      setUploading(false)
    }
  }

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image_url: '' }))
    setImagePreview(null)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name_ar.trim()) {
      newErrors.name_ar = locale === 'ar' ? 'الاسم بالعربية مطلوب' : 'Arabic name is required'
    }
    if (!formData.name_en.trim()) {
      newErrors.name_en = locale === 'ar' ? 'الاسم بالإنجليزية مطلوب' : 'English name is required'
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = locale === 'ar' ? 'السعر مطلوب ويجب أن يكون أكبر من 0' : 'Price is required and must be greater than 0'
    }
    if (formData.original_price && parseFloat(formData.original_price) <= parseFloat(formData.price)) {
      newErrors.original_price = locale === 'ar' ? 'السعر الأصلي يجب أن يكون أكبر من السعر الحالي' : 'Original price must be greater than current price'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !providerId) return

    setSaving(true)
    const supabase = createClient()

    const productData = {
      name_ar: formData.name_ar.trim(),
      name_en: formData.name_en.trim(),
      description_ar: formData.description_ar.trim() || null,
      description_en: formData.description_en.trim() || null,
      price: parseFloat(formData.price),
      original_price: formData.original_price ? parseFloat(formData.original_price) : null,
      image_url: formData.image_url || null,
      is_available: formData.is_available,
      is_vegetarian: formData.is_vegetarian,
      is_spicy: formData.is_spicy,
      preparation_time_min: parseInt(formData.preparation_time_min) || 15,
      calories: formData.calories ? parseInt(formData.calories) : null,
      category_id: formData.category_id || null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('menu_items')
      .update(productData)
      .eq('id', productId)

    if (error) {
      console.error('Error updating product:', error)
      setErrors(prev => ({ ...prev, submit: locale === 'ar' ? 'فشل تحديث المنتج' : 'Failed to update product' }))
      setSaving(false)
      return
    }

    router.push(`/${locale}/provider/products`)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', productId)

    if (error) {
      console.error('Error deleting product:', error)
      setErrors(prev => ({ ...prev, submit: locale === 'ar' ? 'فشل حذف المنتج' : 'Failed to delete product' }))
      setDeleting(false)
      return
    }

    router.push(`/${locale}/provider/products`)
  }

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
              href={`/${locale}/provider/products`}
              className="flex items-center gap-2 text-slate-400 hover:text-white"
            >
              {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              <span>{locale === 'ar' ? 'المنتجات' : 'Products'}</span>
            </Link>
            <h1 className="text-xl font-bold text-primary">
              {locale === 'ar' ? 'تعديل المنتج' : 'Edit Product'}
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="bg-slate-800 border-slate-700 max-w-md w-full">
            <CardContent className="pt-6">
              <div className="text-center">
                <Trash2 className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">
                  {locale === 'ar' ? 'حذف المنتج؟' : 'Delete Product?'}
                </h3>
                <p className="text-slate-400 mb-6">
                  {locale === 'ar'
                    ? 'هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.'
                    : 'Are you sure you want to delete this product? This action cannot be undone.'}
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-slate-600"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      locale === 'ar' ? 'حذف' : 'Delete'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="container mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
          {/* Product Image */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ImagePlus className="w-5 h-5" />
                {locale === 'ar' ? 'صورة المنتج' : 'Product Image'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={removeImage}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                  {uploading ? (
                    <RefreshCw className="w-8 h-8 text-slate-500 animate-spin" />
                  ) : (
                    <>
                      <ImagePlus className="w-8 h-8 text-slate-500 mb-2" />
                      <span className="text-sm text-slate-500">
                        {locale === 'ar' ? 'اضغط لرفع صورة' : 'Click to upload image'}
                      </span>
                      <span className="text-xs text-slate-600 mt-1">
                        {locale === 'ar' ? 'الحد الأقصى 2 ميجابايت' : 'Max 2MB'}
                      </span>
                    </>
                  )}
                </label>
              )}
              {errors.image && (
                <p className="text-red-400 text-sm mt-2">{errors.image}</p>
              )}
            </CardContent>
          </Card>

          {/* Product Category */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                {locale === 'ar' ? 'تصنيف المنتج' : 'Product Category'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showNewCategory ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {locale === 'ar' ? 'اختر التصنيف' : 'Select Category'}
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={formData.category_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={loadingCategories}
                      >
                        <option value="">
                          {loadingCategories
                            ? (locale === 'ar' ? 'جاري التحميل...' : 'Loading...')
                            : (locale === 'ar' ? 'بدون تصنيف' : 'No Category')}
                        </option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {locale === 'ar' ? cat.name_ar : cat.name_en}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowNewCategory(true)}
                        className="border-slate-600 text-white hover:bg-slate-700"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {categories.length === 0 && !loadingCategories && (
                      <p className="text-xs text-slate-500 mt-2">
                        {locale === 'ar'
                          ? 'لا توجد تصنيفات بعد. أضف تصنيفًا جديدًا للبدء.'
                          : 'No categories yet. Add a new category to get started.'}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4 p-4 bg-slate-700/50 rounded-lg">
                  <h4 className="text-sm font-medium text-white">
                    {locale === 'ar' ? 'إضافة تصنيف جديد' : 'Add New Category'}
                  </h4>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {locale === 'ar' ? 'اسم التصنيف (عربي)' : 'Category Name (Arabic)'} *
                    </label>
                    <input
                      type="text"
                      value={newCategoryAr}
                      onChange={(e) => setNewCategoryAr(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder={locale === 'ar' ? 'مثال: المشروبات' : 'e.g., المشروبات'}
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {locale === 'ar' ? 'اسم التصنيف (إنجليزي)' : 'Category Name (English)'} *
                    </label>
                    <input
                      type="text"
                      value={newCategoryEn}
                      onChange={(e) => setNewCategoryEn(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., Beverages"
                      dir="ltr"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowNewCategory(false)
                        setNewCategoryAr('')
                        setNewCategoryEn('')
                      }}
                      className="flex-1 border-slate-600 text-white hover:bg-slate-700"
                    >
                      {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={savingCategory || !newCategoryAr.trim() || !newCategoryEn.trim()}
                      className="flex-1"
                    >
                      {savingCategory
                        ? (locale === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                        : (locale === 'ar' ? 'إضافة' : 'Add')}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Package className="w-5 h-5" />
                {locale === 'ar' ? 'معلومات المنتج' : 'Product Info'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Arabic Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {locale === 'ar' ? 'اسم المنتج (عربي)' : 'Product Name (Arabic)'} *
                </label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={(e) => setFormData(prev => ({ ...prev, name_ar: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  dir="rtl"
                />
                {errors.name_ar && (
                  <p className="text-red-400 text-sm mt-1">{errors.name_ar}</p>
                )}
              </div>

              {/* English Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {locale === 'ar' ? 'اسم المنتج (إنجليزي)' : 'Product Name (English)'} *
                </label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) => setFormData(prev => ({ ...prev, name_en: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  dir="ltr"
                />
                {errors.name_en && (
                  <p className="text-red-400 text-sm mt-1">{errors.name_en}</p>
                )}
              </div>

              {/* Arabic Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {locale === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}
                </label>
                <textarea
                  value={formData.description_ar}
                  onChange={(e) => setFormData(prev => ({ ...prev, description_ar: e.target.value }))}
                  rows={3}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  dir="rtl"
                />
              </div>

              {/* English Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {locale === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'}
                </label>
                <textarea
                  value={formData.description_en}
                  onChange={(e) => setFormData(prev => ({ ...prev, description_en: e.target.value }))}
                  rows={3}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  dir="ltr"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                {locale === 'ar' ? 'التسعير' : 'Pricing'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {locale === 'ar' ? 'السعر (ج.م)' : 'Price (EGP)'} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {errors.price && (
                    <p className="text-red-400 text-sm mt-1">{errors.price}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {locale === 'ar' ? 'السعر الأصلي' : 'Original Price'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.original_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, original_price: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {errors.original_price && (
                    <p className="text-red-400 text-sm mt-1">{errors.original_price}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {locale === 'ar' ? 'معلومات إضافية' : 'Additional Info'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    {locale === 'ar' ? 'وقت التحضير (دقيقة)' : 'Prep Time (min)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.preparation_time_min}
                    onChange={(e) => setFormData(prev => ({ ...prev, preparation_time_min: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {locale === 'ar' ? 'السعرات الحرارية' : 'Calories'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.calories}
                    onChange={(e) => setFormData(prev => ({ ...prev, calories: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-4 border-t border-slate-700">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-5 h-5 text-green-400" />
                    <span className="text-slate-300">
                      {locale === 'ar' ? 'نباتي' : 'Vegetarian'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, is_vegetarian: !prev.is_vegetarian }))}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      formData.is_vegetarian ? 'bg-green-500' : 'bg-slate-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-0.5 ${
                      formData.is_vegetarian ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-red-400" />
                    <span className="text-slate-300">
                      {locale === 'ar' ? 'حار' : 'Spicy'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, is_spicy: !prev.is_spicy }))}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      formData.is_spicy ? 'bg-red-500' : 'bg-slate-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-0.5 ${
                      formData.is_spicy ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    <span className="text-slate-300">
                      {locale === 'ar' ? 'متاح للطلب' : 'Available for order'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, is_available: !prev.is_available }))}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      formData.is_available ? 'bg-primary' : 'bg-slate-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-0.5 ${
                      formData.is_available ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400 text-center">{errors.submit}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={saving}
          >
            {saving ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                {locale === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                {locale === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}

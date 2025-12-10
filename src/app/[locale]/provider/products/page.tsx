'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ProviderLayout } from '@/components/provider'
import { ACTIVE_PROVIDER_STATUSES } from '@/types/database'
import {
  Package,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
  ImageOff,
  DollarSign,
  Clock,
  Eye,
  EyeOff,
  FileUp,
  Sparkles,
  FolderPlus,
  X,
  Tag,
  Gift,
} from 'lucide-react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

type MenuItem = {
  id: string
  name_ar: string
  name_en: string
  description_ar: string | null
  description_en: string | null
  price: number
  original_price: number | null
  image_url: string | null
  is_available: boolean
  has_stock: boolean
  preparation_time_min: number
  display_order: number
  created_at: string
  category_id: string | null
  category?: {
    id: string
    name_ar: string
    name_en: string
  } | null
}

type FilterType = 'all' | 'available' | 'unavailable'

type Category = {
  id: string
  name_ar: string
  name_en: string
}

type Promotion = {
  id: string
  type: 'percentage' | 'fixed' | 'buy_x_get_y'
  discount_value: number
  name_ar: string
  name_en: string
  applies_to: 'all' | 'specific'
  product_ids?: string[]
}

export default function ProviderProductsPage() {
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'

  const [products, setProducts] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [providerId, setProviderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  // Category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryNameAr, setNewCategoryNameAr] = useState('')
  const [newCategoryNameEn, setNewCategoryNameEn] = useState('')
  const [categoryLoading, setCategoryLoading] = useState(false)

  useEffect(() => {
    checkAuthAndLoadProducts()
  }, [])

  const checkAuthAndLoadProducts = async () => {
    setLoading(true)
    const supabase = createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/provider/products`)
      return
    }

    // Get provider ID
    const { data: providerData } = await supabase
      .from('providers')
      .select('id, status')
      .eq('owner_id', user.id)
      .limit(1)

    const provider = providerData?.[0]
    if (!provider || !ACTIVE_PROVIDER_STATUSES.includes(provider.status)) {
      router.push(`/${locale}/provider`)
      return
    }

    setProviderId(provider.id)
    await loadProducts(provider.id)
    setLoading(false)
  }

  const loadProducts = async (provId: string) => {
    const supabase = createClient()

    // First get all products
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('provider_id', provId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching products:', error)
      return
    }

    // Then get categories for this provider
    const { data: categoriesData } = await supabase
      .from('provider_categories')
      .select('id, name_ar, name_en')
      .eq('provider_id', provId)
      .order('display_order', { ascending: true })

    // Store categories for filter tabs
    setCategories(categoriesData || [])

    // Map categories to products
    const categoryMap = new Map(categoriesData?.map(c => [c.id, c]) || [])
    const productsWithCategories = (data || []).map(product => ({
      ...product,
      category: product.category_id ? categoryMap.get(product.category_id) || null : null
    }))

    setProducts(productsWithCategories)

    // Fetch active promotions for this provider
    const now = new Date().toISOString()
    const { data: promotionsData } = await supabase
      .from('promotions')
      .select('id, type, discount_value, name_ar, name_en, applies_to, product_ids')
      .eq('provider_id', provId)
      .eq('is_active', true)
      .lte('start_date', now)
      .gte('end_date', now)

    if (promotionsData) {
      setPromotions(promotionsData)
    }
  }

  const handleRefresh = async () => {
    if (!providerId) return
    setRefreshing(true)
    await loadProducts(providerId)
    setRefreshing(false)
  }

  const handleToggleAvailability = async (productId: string, currentStatus: boolean) => {
    setActionLoading(productId)
    const supabase = createClient()

    const { error } = await supabase
      .from('menu_items')
      .update({
        is_available: !currentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)

    if (!error && providerId) {
      await loadProducts(providerId)
    }
    setActionLoading(null)
  }

  const handleDeleteProduct = async (productId: string) => {
    setActionLoading(productId)
    const supabase = createClient()

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', productId)

    if (!error && providerId) {
      await loadProducts(providerId)
    }
    setActionLoading(null)
    setDeleteConfirm(null)
  }

  // Smart Arabic text normalization for search
  const normalizeArabicText = (text: string): string => {
    return text
      .toLowerCase()
      // Normalize Taa Marbuta and Haa (ة ↔ ه)
      .replace(/[ةه]/g, 'ه')
      // Normalize Alef variants (أ إ آ ا)
      .replace(/[أإآا]/g, 'ا')
      // Normalize Yaa variants (ي ى)
      .replace(/[يى]/g, 'ي')
      // Remove Tashkeel (diacritics)
      .replace(/[\u064B-\u065F]/g, '')
      // Normalize spaces
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Handle adding new category
  const handleAddCategory = async () => {
    if (!newCategoryNameAr.trim() || !providerId) return

    setCategoryLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('provider_categories')
      .insert({
        provider_id: providerId,
        name_ar: newCategoryNameAr.trim(),
        name_en: newCategoryNameEn.trim() || newCategoryNameAr.trim(),
        display_order: categories.length,
        is_active: true
      })

    if (!error) {
      await loadProducts(providerId)
      setShowCategoryModal(false)
      setNewCategoryNameAr('')
      setNewCategoryNameEn('')
    }
    setCategoryLoading(false)
  }

  const filterProducts = (products: MenuItem[]) => {
    let filtered = products

    // Filter by category
    if (selectedCategory === 'uncategorized') {
      filtered = filtered.filter(p => !p.category_id)
    } else if (selectedCategory) {
      filtered = filtered.filter(p => p.category_id === selectedCategory)
    }

    // Filter by availability
    if (filter === 'available') {
      filtered = filtered.filter(p => p.is_available)
    } else if (filter === 'unavailable') {
      filtered = filtered.filter(p => !p.is_available)
    }

    // Filter by search query with smart Arabic normalization
    if (searchQuery.trim()) {
      const normalizedQuery = normalizeArabicText(searchQuery)
      filtered = filtered.filter(p => {
        const nameAr = normalizeArabicText(p.name_ar || '')
        const nameEn = (p.name_en || '').toLowerCase()
        const descAr = normalizeArabicText(p.description_ar || '')
        const descEn = (p.description_en || '').toLowerCase()

        return nameAr.includes(normalizedQuery) ||
               nameEn.includes(normalizedQuery) ||
               descAr.includes(normalizedQuery) ||
               descEn.includes(normalizedQuery)
      })
    }

    return filtered
  }

  // Get product count per category
  const getCategoryProductCount = (categoryId: string) => {
    return products.filter(p => p.category_id === categoryId).length
  }

  // Get uncategorized products count
  const uncategorizedCount = products.filter(p => !p.category_id).length

  // Get promotion for a specific product
  const getProductPromotion = (productId: string): Promotion | null => {
    for (const promo of promotions) {
      if (promo.applies_to === 'all') {
        return promo
      }
      if (promo.applies_to === 'specific' && promo.product_ids?.includes(productId)) {
        return promo
      }
    }
    return null
  }

  // Check if product has promotion or discount
  const hasPromotionOrDiscount = (product: MenuItem): boolean => {
    const hasPromo = getProductPromotion(product.id) !== null
    const hasDiscount = product.original_price !== null && product.original_price > product.price
    return hasPromo || hasDiscount
  }

  // Sort products: promotions/discounts first
  const filteredProducts = filterProducts(products).sort((a, b) => {
    const aHasPromo = hasPromotionOrDiscount(a)
    const bHasPromo = hasPromotionOrDiscount(b)
    if (aHasPromo && !bHasPromo) return -1
    if (!aHasPromo && bHasPromo) return 1
    return 0
  })
  const availableCount = products.filter(p => p.is_available).length
  const unavailableCount = products.filter(p => !p.is_available).length

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
      pageTitle={{ ar: 'إدارة المنتجات', en: 'Products' }}
      pageSubtitle={{ ar: 'إدارة قائمة منتجاتك', en: 'Manage your product menu' }}
    >
      <div className="">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[hsl(198_100%_44%/0.2)] rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{products.length}</p>
                <p className="text-xs text-slate-500">{locale === 'ar' ? 'إجمالي المنتجات' : 'Total Products'}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[hsl(158_100%_38%/0.2)] rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-deal" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{availableCount}</p>
                <p className="text-xs text-slate-500">{locale === 'ar' ? 'متاح' : 'Available'}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[hsl(358_100%_68%/0.2)] rounded-lg flex items-center justify-center">
                <EyeOff className="w-5 h-5 text-error" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{unavailableCount}</p>
                <p className="text-xs text-slate-500">{locale === 'ar' ? 'غير متاح' : 'Unavailable'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Add Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder={locale === 'ar' ? 'ابحث عن منتج...' : 'Search products...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 px-10 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="lg"
              variant="outline"
              className="border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              onClick={() => setShowCategoryModal(true)}
            >
              <FolderPlus className="w-5 h-5 me-2" />
              {locale === 'ar' ? 'إضافة تصنيف' : 'Add Category'}
            </Button>
            <Link href={`/${locale}/provider/menu-import`}>
              <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10 hover:text-primary">
                <Sparkles className="w-5 h-5 me-2" />
                {locale === 'ar' ? 'استيراد المنتجات' : 'Import Products'}
              </Button>
            </Link>
            <Link href={`/${locale}/provider/products/new`}>
              <Button size="lg">
                <Plus className="w-5 h-5 me-2" />
                {locale === 'ar' ? 'إضافة منتج' : 'Add Product'}
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className={filter !== 'all' ? 'border-slate-300 text-slate-600' : ''}
          >
            {locale === 'ar' ? 'الكل' : 'All'}
            <span className="mx-1 text-xs opacity-70">({products.length})</span>
          </Button>
          <Button
            variant={filter === 'available' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('available')}
            className={filter !== 'available' ? 'border-slate-300 text-slate-600' : ''}
          >
            {locale === 'ar' ? 'متاح' : 'Available'}
            <span className="mx-1 text-xs opacity-70">({availableCount})</span>
          </Button>
          <Button
            variant={filter === 'unavailable' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unavailable')}
            className={filter !== 'unavailable' ? 'border-slate-300 text-slate-600' : ''}
          >
            {locale === 'ar' ? 'غير متاح' : 'Unavailable'}
            <span className="mx-1 text-xs opacity-70">({unavailableCount})</span>
          </Button>
        </div>

        {/* Category Filter Tabs */}
        {categories.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-slate-500 mb-2">
              {locale === 'ar' ? 'التصنيفات' : 'Categories'}
            </h4>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={selectedCategory === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className={selectedCategory !== null ? 'border-slate-300 text-slate-600' : ''}
              >
                {locale === 'ar' ? 'جميع التصنيفات' : 'All Categories'}
                <span className="mx-1 text-xs opacity-70">({products.length})</span>
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className={selectedCategory !== category.id ? 'border-slate-300 text-slate-600' : ''}
                >
                  {locale === 'ar' ? category.name_ar : category.name_en}
                  <span className="mx-1 text-xs opacity-70">({getCategoryProductCount(category.id)})</span>
                </Button>
              ))}
              {uncategorizedCount > 0 && (
                <Button
                  variant={selectedCategory === 'uncategorized' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('uncategorized')}
                  className={selectedCategory !== 'uncategorized' ? 'border-slate-300 text-slate-600' : ''}
                >
                  {locale === 'ar' ? 'بدون تصنيف' : 'Uncategorized'}
                  <span className="mx-1 text-xs opacity-70">({uncategorizedCount})</span>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-slate-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {searchQuery
                ? locale === 'ar' ? 'لا توجد نتائج' : 'No results found'
                : filter === 'all'
                ? locale === 'ar' ? 'لا توجد منتجات بعد' : 'No products yet'
                : filter === 'available'
                ? locale === 'ar' ? 'لا توجد منتجات متاحة' : 'No available products'
                : locale === 'ar' ? 'لا توجد منتجات غير متاحة' : 'No unavailable products'}
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              {locale === 'ar'
                ? 'أضف منتجاتك ليتمكن العملاء من الطلب'
                : 'Add your products so customers can order'}
            </p>
            {!searchQuery && filter === 'all' && (
              <Link href={`/${locale}/provider/products/new`}>
                <Button>
                  <Plus className="w-5 h-5 mr-2" />
                  {locale === 'ar' ? 'إضافة أول منتج' : 'Add First Product'}
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => {
              const isLoading = actionLoading === product.id
              const showDeleteConfirm = deleteConfirm === product.id
              const promo = getProductPromotion(product.id)

              return (
                <Card key={product.id} className={`bg-white border-slate-200 overflow-hidden ${promo ? 'ring-2 ring-primary/30' : ''}`}>
                  <CardContent className="p-0">
                    {/* Product Image */}
                    <div className="relative h-40 bg-slate-100">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={locale === 'ar' ? product.name_ar : product.name_en}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageOff className="w-12 h-12 text-slate-500" />
                        </div>
                      )}

                      {/* Availability Badge */}
                      <div className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'}`}>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.is_available
                            ? 'bg-[hsl(158_100%_38%/0.2)] text-deal'
                            : 'bg-[hsl(358_100%_68%/0.2)] text-error'
                        }`}>
                          {product.is_available
                            ? locale === 'ar' ? 'متاح' : 'Available'
                            : locale === 'ar' ? 'غير متاح' : 'Unavailable'}
                        </span>
                      </div>

                      {/* Promotion Badge */}
                      {promo ? (
                        <div className={`absolute top-2 ${isRTL ? 'right-2' : 'left-2'}`}>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-primary to-primary/80 text-white flex items-center gap-1">
                            {promo.type === 'percentage' ? (
                              <>
                                {locale === 'ar' ? 'خصم' : 'Off'} {promo.discount_value}%
                              </>
                            ) : promo.type === 'fixed' ? (
                              <>
                                <Tag className="w-3 h-3" />
                                {promo.discount_value} {locale === 'ar' ? 'ج.م' : 'EGP'}
                              </>
                            ) : (
                              <>
                                <Gift className="w-3 h-3" />
                                {locale === 'ar' ? 'عرض' : 'Offer'}
                              </>
                            )}
                          </span>
                        </div>
                      ) : product.original_price && product.original_price > product.price ? (
                        <div className={`absolute top-2 ${isRTL ? 'right-2' : 'left-2'}`}>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500 text-white">
                            {Math.round((1 - product.price / product.original_price) * 100)}% {locale === 'ar' ? 'خصم' : 'OFF'}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      {/* Category Badge */}
                      {product.category && (
                        <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full mb-2">
                          {locale === 'ar' ? product.category.name_ar : product.category.name_en}
                        </span>
                      )}
                      <h3 className="font-bold text-lg mb-1 line-clamp-1">
                        {locale === 'ar' ? product.name_ar : product.name_en}
                      </h3>
                      {(product.description_ar || product.description_en) && (
                        <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                          {locale === 'ar' ? product.description_ar : product.description_en}
                        </p>
                      )}

                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-primary">
                            {product.price.toFixed(2)}
                          </span>
                          <span className="text-sm text-slate-500">
                            {locale === 'ar' ? 'ج.م' : 'EGP'}
                          </span>
                          {product.original_price && product.original_price > product.price && (
                            <span className="text-sm text-slate-500 line-through">
                              {product.original_price.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Clock className="w-4 h-4" />
                          {product.preparation_time_min} {locale === 'ar' ? 'د' : 'min'}
                        </div>
                      </div>

                      {/* Actions */}
                      {showDeleteConfirm ? (
                        <div className="space-y-2">
                          <p className="text-sm text-center text-red-400">
                            {locale === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Confirm delete?'}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 border-slate-300"
                              onClick={() => setDeleteConfirm(null)}
                            >
                              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleDeleteProduct(product.id)}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                locale === 'ar' ? 'حذف' : 'Delete'
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-slate-300"
                            onClick={() => handleToggleAvailability(product.id, product.is_available)}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : product.is_available ? (
                              <>
                                <EyeOff className="w-4 h-4 mr-1" />
                                {locale === 'ar' ? 'إخفاء' : 'Hide'}
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-1" />
                                {locale === 'ar' ? 'إظهار' : 'Show'}
                              </>
                            )}
                          </Button>
                          <Link href={`/${locale}/provider/products/${product.id}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full border-slate-300">
                              <Edit className="w-4 h-4 mr-1" />
                              {locale === 'ar' ? 'تعديل' : 'Edit'}
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                            onClick={() => setDeleteConfirm(product.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowCategoryModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">
                {locale === 'ar' ? 'إضافة تصنيف جديد' : 'Add New Category'}
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'اسم التصنيف (عربي) *' : 'Category Name (Arabic) *'}
                </label>
                <input
                  type="text"
                  value={newCategoryNameAr}
                  onChange={(e) => setNewCategoryNameAr(e.target.value)}
                  placeholder={locale === 'ar' ? 'مثال: بيتزا' : 'e.g., Pizza'}
                  className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'اسم التصنيف (إنجليزي)' : 'Category Name (English)'}
                </label>
                <input
                  type="text"
                  value={newCategoryNameEn}
                  onChange={(e) => setNewCategoryNameEn(e.target.value)}
                  placeholder={locale === 'ar' ? 'اختياري' : 'Optional'}
                  className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-slate-100">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCategoryModal(false)}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                className="flex-1"
                onClick={handleAddCategory}
                disabled={!newCategoryNameAr.trim() || categoryLoading}
              >
                {categoryLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  locale === 'ar' ? 'إضافة' : 'Add'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ProviderLayout>
  )
}

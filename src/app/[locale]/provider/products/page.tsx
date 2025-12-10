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

export default function ProviderProductsPage() {
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'

  const [products, setProducts] = useState<MenuItem[]>([])
  const [providerId, setProviderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

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

    const { data, error } = await supabase
      .from('menu_items')
      .select(`
        *,
        category:provider_categories!category_id (
          id,
          name_ar,
          name_en
        )
      `)
      .eq('provider_id', provId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching products:', error)
      return
    }

    setProducts(data || [])
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

  const filterProducts = (products: MenuItem[]) => {
    let filtered = products

    // Filter by availability
    if (filter === 'available') {
      filtered = filtered.filter(p => p.is_available)
    } else if (filter === 'unavailable') {
      filtered = filtered.filter(p => !p.is_available)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.name_ar.toLowerCase().includes(query) ||
        p.name_en.toLowerCase().includes(query) ||
        p.description_ar?.toLowerCase().includes(query) ||
        p.description_en?.toLowerCase().includes(query)
      )
    }

    return filtered
  }

  const filteredProducts = filterProducts(products)
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
          <div className="relative flex-1">
            <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder={locale === 'ar' ? 'ابحث عن منتج...' : 'Search products...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 px-10 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2">
            <Link href={`/${locale}/provider/menu-import`}>
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-primary text-primary hover:bg-primary/10">
                <Sparkles className="w-5 h-5 me-2" />
                {locale === 'ar' ? 'استيراد المنتجات' : 'Import Products'}
              </Button>
            </Link>
            <Link href={`/${locale}/provider/products/new`}>
              <Button size="lg" className="w-full sm:w-auto">
                <Plus className="w-5 h-5 me-2" />
                {locale === 'ar' ? 'إضافة منتج' : 'Add Product'}
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
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

              return (
                <Card key={product.id} className="bg-white border-slate-200 overflow-hidden">
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

                      {/* Discount Badge */}
                      {product.original_price && product.original_price > product.price && (
                        <div className={`absolute top-2 ${isRTL ? 'right-2' : 'left-2'}`}>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary text-white">
                            {Math.round((1 - product.price / product.original_price) * 100)}% {locale === 'ar' ? 'خصم' : 'OFF'}
                          </span>
                        </div>
                      )}
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
    </ProviderLayout>
  )
}

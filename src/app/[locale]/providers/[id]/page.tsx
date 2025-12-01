'use client'

import { useEffect, useState, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/lib/store/cart'
import { Button } from '@/components/ui/button'
import { ProductCard, RatingStars, StatusBadge, EmptyState } from '@/components/customer/shared'
import {
  Clock,
  DollarSign,
  MapPin,
  ShoppingCart,
  ArrowLeft,
  ArrowRight,
  Heart,
  Share2,
} from 'lucide-react'

type Provider = {
  id: string
  name_ar: string
  name_en: string
  description_ar: string | null
  description_en: string | null
  category: string
  logo_url: string | null
  cover_image_url: string | null
  phone: string
  rating: number
  total_reviews: number
  delivery_fee: number
  min_order_amount: number
  estimated_delivery_time_min: number
  status: string
  commission_rate: number
}

type MenuItem = {
  id: string
  provider_id: string
  name_ar: string
  name_en: string
  description_ar: string | null
  description_en: string | null
  price: number
  original_price?: number | null
  image_url: string | null
  is_available: boolean
  is_vegetarian: boolean
  is_spicy: boolean
  preparation_time_min: number
  category_id?: string | null
}

type MenuCategory = {
  id: string
  name_ar: string
  name_en: string
  display_order: number
}

export default function ProviderDetailPage() {
  const params = useParams()
  const providerId = params.id as string
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations()

  const { addItem, removeItem, getItemQuantity, getTotal, getItemCount } = useCart()

  const [provider, setProvider] = useState<Provider | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const categoriesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchProviderData()
  }, [providerId])

  async function fetchProviderData() {
    setLoading(true)
    const supabase = createClient()

    // Fetch provider
    const { data: providerData, error: providerError } = await supabase
      .from('providers')
      .select('*')
      .eq('id', providerId)
      .single()

    if (providerError) {
      console.error('Error fetching provider:', providerError)
    } else {
      setProvider(providerData)
    }

    // Fetch menu categories
    const { data: categoriesData } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('provider_id', providerId)
      .order('display_order')

    if (categoriesData && categoriesData.length > 0) {
      setCategories(categoriesData)
    }

    // Fetch menu items
    const { data: menuData, error: menuError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('provider_id', providerId)
      .order('display_order')

    if (menuError) {
      console.error('Error fetching menu items:', menuError)
    } else {
      setMenuItems(menuData || [])
    }

    setLoading(false)
  }

  // Filter menu items by category
  const filteredMenuItems = selectedCategory
    ? menuItems.filter((item) => item.category_id === selectedCategory)
    : menuItems

  // Get available items
  const availableItems = filteredMenuItems.filter((item) => item.is_available)
  const unavailableItems = filteredMenuItems.filter((item) => !item.is_available)

  const handleAddToCart = (menuItem: MenuItem) => {
    if (provider) {
      addItem(menuItem, {
        id: provider.id,
        name_ar: provider.name_ar,
        name_en: provider.name_en,
        delivery_fee: provider.delivery_fee,
        min_order_amount: provider.min_order_amount,
        estimated_delivery_time_min: provider.estimated_delivery_time_min,
        commission_rate: provider.commission_rate,
      })
    }
  }

  const cartTotal = getTotal()
  const cartItemCount = getItemCount()

  const getName = (item: MenuItem | Provider) => {
    return locale === 'ar' ? item.name_ar : item.name_en
  }

  const getDescription = (item: MenuItem | Provider) => {
    return locale === 'ar' ? item.description_ar : item.description_en
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">
            {locale === 'ar' ? 'المتجر غير موجود' : 'Provider not found'}
          </p>
          <Link href={`/${locale}/providers`} className="text-primary hover:underline mt-4 inline-block">
            {locale === 'ar' ? 'العودة إلى المتاجر' : 'Back to providers'}
          </Link>
        </div>
      </div>
    )
  }

  const handleQuantityChange = (item: MenuItem, quantity: number) => {
    const currentQty = getItemQuantity(item.id)
    if (quantity > currentQty) {
      handleAddToCart(item)
    } else if (quantity < currentQty) {
      removeItem(item.id)
    }
  }

  const mapProviderStatus = (status: string): 'open' | 'closed' | 'busy' | 'paused' | 'pending' => {
    switch (status) {
      case 'open':
        return 'open'
      case 'closed':
        return 'closed'
      case 'temporarily_paused':
        return 'paused'
      case 'pending_approval':
        return 'pending'
      default:
        return 'closed'
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href={`/${locale}/providers`} className="flex items-center gap-2 text-slate-500 hover:text-primary">
              {locale === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              <span className="text-sm">{locale === 'ar' ? 'رجوع' : 'Back'}</span>
            </Link>
            <div className="flex items-center gap-3">
              <button className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-red-500 transition-colors">
                <Heart className="w-5 h-5" />
              </button>
              <button className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-primary transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Provider Cover & Info */}
      <div className="bg-white border-b">
        {/* Cover Image */}
        {provider.cover_image_url && (
          <div className="h-40 md:h-56 bg-slate-100 relative">
            <img
              src={provider.cover_image_url}
              alt={getName(provider)}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        )}

        {/* Provider Info */}
        <div className="container mx-auto px-4 py-4">
          <div className="flex gap-4">
            {/* Logo */}
            {provider.logo_url && (
              <div className={`w-20 h-20 rounded-xl overflow-hidden border-4 border-white shadow-lg flex-shrink-0 ${provider.cover_image_url ? '-mt-12 relative z-10' : ''}`}>
                <img
                  src={provider.logo_url}
                  alt={getName(provider)}
                  className="w-full h-full object-cover bg-white"
                />
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 truncate">
                  {getName(provider)}
                </h1>
                <StatusBadge status={mapProviderStatus(provider.status)} size="sm" />
              </div>

              {/* Rating */}
              <div className="mt-1">
                <RatingStars
                  rating={provider.rating}
                  showCount
                  count={provider.total_reviews}
                  size="sm"
                />
              </div>

              {/* Quick Info */}
              <div className="flex flex-wrap gap-3 mt-3 text-sm text-slate-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{provider.estimated_delivery_time_min} {locale === 'ar' ? 'د' : 'min'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  <span>{provider.delivery_fee} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{locale === 'ar' ? 'الحد الأدنى' : 'Min'}: {provider.min_order_amount} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {getDescription(provider) && (
            <p className="text-sm text-slate-500 mt-3 line-clamp-2">{getDescription(provider)}</p>
          )}
        </div>
      </div>

      {/* Category Navigation */}
      {categories.length > 0 && (
        <div
          ref={categoriesRef}
          className="bg-white border-b sticky top-[57px] z-40 overflow-x-auto scrollbar-hide"
        >
          <div className="container mx-auto px-4">
            <div className="flex gap-1 py-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === null
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {locale === 'ar' ? 'الكل' : 'All'}
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === category.id
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {locale === 'ar' ? category.name_ar : category.name_en}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Menu */}
      <div className="container mx-auto px-4 py-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">
          {locale === 'ar' ? 'القائمة' : 'Menu'}
          {selectedCategory && categories.length > 0 && (
            <span className="text-slate-400 font-normal">
              {' - '}
              {locale === 'ar'
                ? categories.find((c) => c.id === selectedCategory)?.name_ar
                : categories.find((c) => c.id === selectedCategory)?.name_en}
            </span>
          )}
        </h2>

        {filteredMenuItems.length === 0 ? (
          <EmptyState
            icon="menu"
            title={locale === 'ar' ? 'لا توجد عناصر' : 'No items found'}
            description={
              locale === 'ar'
                ? 'لا توجد عناصر في هذا القسم حالياً'
                : 'No menu items available in this category'
            }
          />
        ) : (
          <>
            {/* Available Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableItems.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  quantity={getItemQuantity(item.id)}
                  onQuantityChange={(qty) => handleQuantityChange(item, qty)}
                  variant="horizontal"
                />
              ))}
            </div>

            {/* Unavailable Items */}
            {unavailableItems.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-medium text-slate-400 mb-3">
                  {locale === 'ar' ? 'غير متاح حالياً' : 'Currently Unavailable'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                  {unavailableItems.map((item) => (
                    <ProductCard
                      key={item.id}
                      product={item}
                      variant="horizontal"
                      showAddButton={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Cart Button */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  <span className="font-semibold">
                    {cartItemCount} {locale === 'ar' ? 'عنصر' : 'items'}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {locale === 'ar' ? 'المجموع' : 'Total'}: {cartTotal.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                </div>
              </div>

              <Button
                size="lg"
                className="gap-2"
                onClick={() => router.push(`/${locale}/checkout`)}
              >
                {locale === 'ar' ? 'إتمام الطلب' : 'Checkout'}
                {locale === 'ar' ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

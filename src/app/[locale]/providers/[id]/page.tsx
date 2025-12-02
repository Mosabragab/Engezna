'use client'

import { useEffect, useState, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/lib/store/cart'
import { useFavorites } from '@/hooks/customer'
import { Button } from '@/components/ui/button'
import { ProductCard, RatingStars, StatusBadge, EmptyState } from '@/components/customer/shared'
import { VoiceOrderFAB } from '@/components/customer/voice'
import { BottomNavigation } from '@/components/customer/layout'
import {
  Clock,
  Truck,
  MapPin,
  ShoppingCart,
  ArrowLeft,
  ArrowRight,
  Heart,
  Share2,
  Star,
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
  const { isFavorite, toggleFavorite, isAuthenticated } = useFavorites()

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

  const isProviderFavorite = isFavorite(providerId)

  const handleFavoriteClick = async () => {
    if (!isAuthenticated) {
      router.push(`/${locale}/auth/login`)
      return
    }
    await toggleFavorite(providerId)
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
            <h1 className="font-bold text-lg text-slate-900 truncate max-w-[200px]">
              {getName(provider)}
            </h1>
            <div className="flex items-center gap-3">
              <button
                onClick={handleFavoriteClick}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  isProviderFavorite
                    ? 'bg-red-50 text-red-500'
                    : 'bg-slate-100 text-slate-500 hover:text-red-500'
                }`}
              >
                <Heart className={`w-5 h-5 ${isProviderFavorite ? 'fill-red-500' : ''}`} />
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
        <div className="h-44 bg-slate-100 relative">
          {provider.cover_image_url ? (
            <img
              src={provider.cover_image_url}
              alt={getName(provider)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <span className="text-6xl">🏪</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

          {/* Logo overlay */}
          {provider.logo_url && (
            <div className="absolute bottom-0 start-4 translate-y-1/2 w-20 h-20 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-white z-10">
              <img
                src={provider.logo_url}
                alt={getName(provider)}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Provider Info */}
        <div className="px-4 pt-12 pb-4">
          {/* Name & Status */}
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              {getName(provider)}
            </h1>
            <StatusBadge status={mapProviderStatus(provider.status)} size="sm" />
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-full">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-sm text-amber-700">{provider.rating.toFixed(1)}</span>
            </div>
            <span className="text-sm text-slate-400">
              ({provider.total_reviews} {locale === 'ar' ? 'تقييم' : 'reviews'})
            </span>
          </div>

          {/* Quick Info Pills */}
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full text-sm text-slate-600">
              <Clock className="w-4 h-4 text-primary" />
              <span>{provider.estimated_delivery_time_min} {locale === 'ar' ? 'دقيقة' : 'min'}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full text-sm text-slate-600">
              <Truck className="w-4 h-4 text-primary" />
              <span>
                {provider.delivery_fee === 0
                  ? (locale === 'ar' ? 'توصيل مجاني' : 'Free delivery')
                  : `${provider.delivery_fee} ${locale === 'ar' ? 'ج.م' : 'EGP'}`
                }
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full text-sm text-slate-600">
              <MapPin className="w-4 h-4 text-primary" />
              <span>{locale === 'ar' ? 'حد أدنى' : 'Min'} {provider.min_order_amount} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
            </div>
          </div>

          {/* Description */}
          {getDescription(provider) && (
            <p className="text-sm text-slate-500 mt-3 leading-relaxed">{getDescription(provider)}</p>
          )}
        </div>
      </div>

      {/* Category Navigation - Sticky */}
      {categories.length > 0 && (
        <div
          ref={categoriesRef}
          className="bg-white border-b sticky top-[57px] z-40 shadow-sm"
        >
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 px-4 py-3">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  selectedCategory === null
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {locale === 'ar' ? 'الكل' : 'All'}
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    selectedCategory === category.id
                      ? 'bg-primary text-white shadow-sm'
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
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            {locale === 'ar' ? 'القائمة' : 'Menu'}
            {selectedCategory && categories.length > 0 && (
              <span className="text-slate-400 font-normal text-base">
                {' - '}
                {locale === 'ar'
                  ? categories.find((c) => c.id === selectedCategory)?.name_ar
                  : categories.find((c) => c.id === selectedCategory)?.name_en}
              </span>
            )}
          </h2>
          <span className="text-sm text-slate-400">
            {filteredMenuItems.length} {locale === 'ar' ? 'صنف' : 'items'}
          </span>
        </div>

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
            <div className="space-y-3">
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
              <div className="mt-6">
                <h3 className="text-sm font-medium text-slate-400 mb-3">
                  {locale === 'ar' ? 'غير متاح حالياً' : 'Currently Unavailable'}
                </h3>
                <div className="space-y-3 opacity-50">
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
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl z-50 safe-area-bottom">
          <div className="px-4 py-3">
            <button
              onClick={() => router.push(`/${locale}/cart`)}
              className="w-full bg-primary text-white rounded-xl py-3 px-4 flex items-center justify-between hover:bg-primary/90 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div className="text-start">
                  <div className="font-semibold">
                    {cartItemCount} {locale === 'ar' ? 'عنصر' : 'items'}
                  </div>
                  <div className="text-sm text-white/80">
                    {locale === 'ar' ? 'عرض السلة' : 'View Cart'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">
                  {cartTotal.toFixed(0)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                </span>
                {locale === 'ar' ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Voice Order FAB - Show only when cart is empty */}
      {cartItemCount === 0 && <VoiceOrderFAB />}

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}

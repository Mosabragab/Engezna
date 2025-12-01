'use client'

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/lib/store/cart'
import { Button } from '@/components/ui/button'
import {
  Star,
  Clock,
  DollarSign,
  MapPin,
  Phone,
  Plus,
  Minus,
  ShoppingCart,
  ArrowLeft,
  ArrowRight
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
  image_url: string | null
  is_available: boolean
  is_vegetarian: boolean
  is_spicy: boolean
  preparation_time_min: number
}

type CartItem = {
  menuItem: MenuItem
  quantity: number
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
  const [loading, setLoading] = useState(true)

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

    // Fetch menu items
    const { data: menuData, error: menuError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('provider_id', providerId)
      .eq('is_available', true)
      .order('display_order')

    if (menuError) {
      console.error('Error fetching menu items:', menuError)
    } else {
      setMenuItems(menuData || [])
    }

    setLoading(false)
  }

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

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href={`/${locale}/providers`} className="flex items-center gap-2 text-muted-foreground hover:text-primary">
              {locale === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              <span>{locale === 'ar' ? 'رجوع' : 'Back'}</span>
            </Link>
            <Link href={`/${locale}`} className="text-xl font-bold text-primary">
              {locale === 'ar' ? 'إنجزنا' : 'Engezna'}
            </Link>
          </div>
        </div>
      </header>

      {/* Provider Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Logo */}
            {provider.logo_url && (
              <div className="w-24 h-24 rounded-xl overflow-hidden border-4 border-white shadow-lg flex-shrink-0">
                <img
                  src={provider.logo_url}
                  alt={getName(provider)}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{getName(provider)}</h1>
              {getDescription(provider) && (
                <p className="text-muted-foreground mb-4">{getDescription(provider)}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{provider.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">
                    ({provider.total_reviews} {locale === 'ar' ? 'تقييم' : 'reviews'})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>
                    {provider.estimated_delivery_time_min} {locale === 'ar' ? 'دقيقة' : 'min'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  <span>
                    {locale === 'ar' ? 'توصيل' : 'Delivery'}: {provider.delivery_fee} {locale === 'ar' ? 'ج.م' : 'EGP'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {locale === 'ar' ? 'الحد الأدنى' : 'Min order'}: {provider.min_order_amount} {locale === 'ar' ? 'ج.م' : 'EGP'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">
          {locale === 'ar' ? 'القائمة' : 'Menu'}
        </h2>

        {menuItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {locale === 'ar' ? 'لا توجد عناصر في القائمة حالياً' : 'No menu items available'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item) => {
              const quantity = getItemQuantity(item.id)

              return (
                <div
                  key={item.id}
                  className="bg-card rounded-xl border p-4 hover:shadow-lg transition-all"
                >
                  {/* Item Image */}
                  {item.image_url && (
                    <div className="w-full h-40 rounded-lg overflow-hidden mb-4">
                      <img
                        src={item.image_url}
                        alt={getName(item)}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Item Info */}
                  <h3 className="font-bold text-lg mb-1">{getName(item)}</h3>
                  {getDescription(item) && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {getDescription(item)}
                    </p>
                  )}

                  {/* Tags */}
                  <div className="flex gap-2 mb-3">
                    {item.is_vegetarian && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        {locale === 'ar' ? 'نباتي' : 'Vegetarian'}
                      </span>
                    )}
                    {item.is_spicy && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                        {locale === 'ar' ? 'حار' : 'Spicy'}
                      </span>
                    )}
                  </div>

                  {/* Price and Add to Cart */}
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary">
                      {item.price} {locale === 'ar' ? 'ج.م' : 'EGP'}
                    </span>

                    {quantity === 0 ? (
                      <Button
                        onClick={() => handleAddToCart(item)}
                        size="sm"
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        {locale === 'ar' ? 'إضافة' : 'Add'}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => removeItem(item.id)}
                          size="sm"
                          variant="outline"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="font-bold w-8 text-center">{quantity}</span>
                        <Button
                          onClick={() => handleAddToCart(item)}
                          size="sm"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
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

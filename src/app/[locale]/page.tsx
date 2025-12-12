'use client'

import { useEffect, useState, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { CustomerLayout } from '@/components/customer/layout'
import {
  HeroSection,
  CategoriesSection,
  OffersCarousel,
  ReorderSection,
  TopRatedSection,
  NearbySection,
} from '@/components/customer/home'
import { ChatFAB, SmartAssistant } from '@/components/customer/chat'
import { useGuestLocation } from '@/lib/hooks/useGuestLocation'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/lib/store/cart'
import { guestLocationStorage } from '@/lib/hooks/useGuestLocation'
import { Loader2 } from 'lucide-react'

// Demo offers data - Unified blue gradient colors per brand guidelines
const demoOffers = [
  {
    id: '1',
    title_ar: 'خصم ٣٠٪',
    title_en: '30% Off',
    description_ar: 'على جميع البيتزا من سلطان بيتزا',
    description_en: 'On all pizzas from Sultan Pizza',
    background_color: '#009DE0',
    discount_percentage: 30,
    image_url: '/images/offers/pizza.jpg',
  },
  {
    id: '2',
    title_ar: 'توصيل مجاني',
    title_en: 'Free Delivery',
    description_ar: 'على الطلبات فوق ١٠٠ ج.م من لافندر كافيه',
    description_en: 'On orders over 100 EGP from Lavender Cafe',
    background_color: '#0088CC',
    image_url: '/images/offers/coffee.jpg',
  },
  {
    id: '3',
    title_ar: 'اشتري ١ واحصل ١',
    title_en: 'Buy 1 Get 1',
    description_ar: 'على جميع العصائر من عصائر الشفا',
    description_en: 'On all juices from Al-Shifa Juices',
    background_color: '#0077B6',
    discount_percentage: 50,
    image_url: '/images/offers/juice.jpg',
  },
]

// Type for last order display
interface LastOrderDisplay {
  id: string
  providerName: string
  providerNameAr: string
  providerLogo?: string
  providerId: string
  items: string[]
  itemsAr: string[]
  total: number
  createdAt: Date
}

export default function HomePage() {
  const locale = useLocale()
  const router = useRouter()
  const { addItem, clearCart } = useCart()
  const { location: guestLocation } = useGuestLocation()
  const guestCityId = guestLocation.cityId
  const guestGovernorateId = guestLocation.governorateId
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [lastOrder, setLastOrder] = useState<LastOrderDisplay | null>(null)
  const [nearbyProviders, setNearbyProviders] = useState<any[]>([])
  const [topRatedProviders, setTopRatedProviders] = useState<any[]>([])
  const [userCityId, setUserCityId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | undefined>()
  const [isReordering, setIsReordering] = useState(false)
  const [isCheckingLocation, setIsCheckingLocation] = useState(true)

  // Check if user has location set - redirect to welcome page if not
  useEffect(() => {
    async function checkLocationAndAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Logged-in user - check profile for location
        const { data: profile } = await supabase
          .from('profiles')
          .select('governorate_id')
          .eq('id', user.id)
          .single()

        if (!profile?.governorate_id) {
          // Logged-in user without location - redirect to select location
          router.replace(`/${locale}/profile/governorate`)
          return
        }
        // User has location, proceed
        setUserId(user.id)
        setIsCheckingLocation(false)
      } else {
        // Guest user - check localStorage
        const guestLocation = guestLocationStorage.get()
        if (!guestLocation?.governorateId) {
          // Guest without location - redirect to welcome page
          router.replace(`/${locale}/welcome`)
          return
        }
        // Guest has location, proceed
        setIsCheckingLocation(false)
      }
    }

    checkLocationAndAuth()
  }, [locale, router])

  // Load user's city and providers
  useEffect(() => {
    if (!isCheckingLocation) {
      loadUserCityAndProviders()
      loadLastOrder()
    }
  }, [isCheckingLocation])

  // Listen for guest location changes
  useEffect(() => {
    const handleLocationChange = () => {
      loadUserCityAndProviders()
    }
    window.addEventListener('guestLocationChanged', handleLocationChange)
    return () => {
      window.removeEventListener('guestLocationChanged', handleLocationChange)
    }
  }, [])

  // Load last completed order for reorder section
  async function loadLastOrder() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLastOrder(null)
      return
    }

    // Fetch last delivered order with provider and items
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        total,
        created_at,
        provider_id,
        providers:provider_id (
          id,
          name_ar,
          name_en,
          logo_url
        ),
        order_items (
          quantity,
          item_name_ar,
          item_name_en
        )
      `)
      .eq('customer_id', user.id)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !order) {
      setLastOrder(null)
      return
    }

    const provider = order.providers as any
    const items = order.order_items as any[]

    setLastOrder({
      id: order.id,
      providerId: order.provider_id,
      providerName: provider?.name_en || 'Provider',
      providerNameAr: provider?.name_ar || 'المتجر',
      providerLogo: provider?.logo_url || undefined,
      items: items.map(i => `${i.quantity} ${i.item_name_en}`),
      itemsAr: items.map(i => `${i.quantity} ${i.item_name_ar}`),
      total: order.total,
      createdAt: new Date(order.created_at),
    })
  }

  async function loadUserCityAndProviders() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let cityId: string | null = null
    let governorateId: string | null = null

    if (user) {
      // Logged-in user - get city and governorate from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('city_id, governorate_id')
        .eq('id', user.id)
        .single()

      if (profile?.city_id) {
        cityId = profile.city_id
        setUserCityId(cityId)
      }
      if (profile?.governorate_id) {
        governorateId = profile.governorate_id
      }
    } else {
      // Guest user - get city from localStorage
      const guestLocation = guestLocationStorage.get()
      if (guestLocation?.cityId) {
        cityId = guestLocation.cityId
        setUserCityId(cityId)
      }
      // Get governorate for fallback filtering
      governorateId = guestLocation?.governorateId || null
    }

    // Fetch providers filtered by city (or governorate if no city)
    fetchNearbyProviders(cityId, governorateId)
    fetchTopRatedProviders(cityId, governorateId)
  }

  async function fetchNearbyProviders(cityId: string | null, governorateId: string | null = null) {
    const supabase = createClient()

    // Build query with proper filtering
    let query = supabase
      .from('providers')
      .select('id, name_ar, name_en, logo_url, cover_image_url, category, status, city_id, governorate_id')
      .in('status', ['open', 'closed'])

    // Filter by city or governorate - STRICT filtering
    if (cityId) {
      query = query.eq('city_id', cityId)
    } else if (governorateId) {
      query = query.eq('governorate_id', governorateId)
    }

    const { data } = await query.limit(10)

    if (data) {
      // Add mock distance for demo
      const withDistance = data.slice(0, 6).map((p, i) => ({
        ...p,
        distance: 0.5 + i * 0.3,
      }))
      setNearbyProviders(withDistance)
    } else {
      setNearbyProviders([])
    }
  }

  async function fetchTopRatedProviders(cityId: string | null, governorateId: string | null = null) {
    const supabase = createClient()

    // Build query with proper filtering
    let query = supabase
      .from('providers')
      .select('id, name_ar, name_en, logo_url, cover_image_url, category, status, city_id, governorate_id, rating, is_featured, delivery_fee, estimated_delivery_time_min')
      .in('status', ['open', 'closed'])

    // Filter by city or governorate - STRICT filtering
    if (cityId) {
      query = query.eq('city_id', cityId)
    } else if (governorateId) {
      query = query.eq('governorate_id', governorateId)
    }

    const { data } = await query
      .order('is_featured', { ascending: false })
      .order('rating', { ascending: false })
      .limit(10)

    if (data) {
      setTopRatedProviders(data.slice(0, 6))
    } else {
      setTopRatedProviders([])
    }
  }

  const handleChatClick = () => {
    setIsChatOpen(true)
  }

  const handleSearchClick = () => {
    router.push(`/${locale}/providers`)
  }

  const handleCategoryClick = (categoryId: string) => {
    router.push(`/${locale}/providers?category=${categoryId}`)
  }

  const handleViewAllOffers = () => {
    router.push(`/${locale}/offers`)
  }

  const handleViewAllTopRated = () => {
    router.push(`/${locale}/providers?sort=rating`)
  }

  const handleViewAllNearby = () => {
    router.push(`/${locale}/providers?sort=distance`)
  }

  const handleReorder = async (orderId: string) => {
    if (isReordering || !lastOrder) return
    setIsReordering(true)

    try {
      const supabase = createClient()

      // Fetch order items with their menu_item_id
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('menu_item_id, quantity')
        .eq('order_id', orderId)

      if (itemsError || !orderItems || orderItems.length === 0) {
        console.error('Failed to fetch order items:', itemsError)
        router.push(`/${locale}/orders/${orderId}`)
        return
      }

      // Fetch the provider info
      const { data: provider, error: providerError } = await supabase
        .from('providers')
        .select('id, name_ar, name_en, delivery_fee, min_order_amount, estimated_delivery_time_min, commission_rate, category')
        .eq('id', lastOrder.providerId)
        .single()

      if (providerError || !provider) {
        console.error('Failed to fetch provider:', providerError)
        router.push(`/${locale}/orders/${orderId}`)
        return
      }

      // Fetch menu items that are still available
      const menuItemIds = orderItems.map(item => item.menu_item_id).filter(Boolean)

      if (menuItemIds.length === 0) {
        router.push(`/${locale}/providers/${lastOrder.providerId}`)
        return
      }

      const { data: menuItems, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .in('id', menuItemIds)
        .eq('is_available', true)

      if (menuError || !menuItems || menuItems.length === 0) {
        // No items available, redirect to provider page
        router.push(`/${locale}/providers/${lastOrder.providerId}`)
        return
      }

      // Clear existing cart and add items
      clearCart()

      // Add each available item to cart
      for (const orderItem of orderItems) {
        const menuItem = menuItems.find(m => m.id === orderItem.menu_item_id)
        if (menuItem) {
          // Add item with quantity
          for (let i = 0; i < orderItem.quantity; i++) {
            addItem(menuItem, provider)
          }
        }
      }

      // Navigate to checkout
      router.push(`/${locale}/checkout`)
    } catch (error) {
      console.error('Reorder error:', error)
      router.push(`/${locale}/orders/${orderId}`)
    } finally {
      setIsReordering(false)
    }
  }

  const handleViewOrderDetails = (orderId: string) => {
    router.push(`/${locale}/orders/${orderId}`)
  }

  // Show loading while checking location
  if (isCheckingLocation) {
    return (
      <CustomerLayout showHeader={false} showBottomNav={false}>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </CustomerLayout>
    )
  }

  return (
    <CustomerLayout showHeader={true} showBottomNav={true}>
      <div className="pb-4">
        {/* Hero Section with Chat CTA */}
        <HeroSection
          onChatClick={handleChatClick}
          onSearchClick={handleSearchClick}
        />

        {/* Categories */}
        <CategoriesSection
          onCategoryClick={handleCategoryClick}
          className="mt-4"
        />

        {/* Offers Carousel */}
        <OffersCarousel
          offers={demoOffers}
          onViewAll={handleViewAllOffers}
          className="mt-6"
        />

        {/* Reorder Section */}
        <ReorderSection
          lastOrder={lastOrder}
          onReorder={handleReorder}
          onViewDetails={handleViewOrderDetails}
          className="mt-2"
        />

        {/* Top Rated */}
        <TopRatedSection
          providers={topRatedProviders}
          onViewAll={handleViewAllTopRated}
          className="mt-2"
        />

        {/* Nearby */}
        <NearbySection
          providers={nearbyProviders}
          onViewAll={handleViewAllNearby}
          className="mt-2"
        />
      </div>

      {/* AI Smart Assistant */}
      <ChatFAB
        onClick={() => setIsChatOpen(!isChatOpen)}
        isOpen={isChatOpen}
      />
      <SmartAssistant
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        userId={userId}
        cityId={userCityId || guestCityId || undefined}
        governorateId={guestGovernorateId || undefined}
      />
    </CustomerLayout>
  )
}

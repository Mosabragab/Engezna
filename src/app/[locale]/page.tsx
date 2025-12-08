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
import { ChatFAB } from '@/components/customer/voice'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/lib/store/cart'

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
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [lastOrder, setLastOrder] = useState<LastOrderDisplay | null>(null)
  const [nearbyProviders, setNearbyProviders] = useState<any[]>([])
  const [topRatedProviders, setTopRatedProviders] = useState<any[]>([])
  const [userCityId, setUserCityId] = useState<string | null>(null)
  const [isReordering, setIsReordering] = useState(false)

  // Load user's city and providers
  useEffect(() => {
    loadUserCityAndProviders()
    loadLastOrder()
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
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('city_id')
        .eq('id', user.id)
        .single()

      if (profile?.city_id) {
        cityId = profile.city_id
        setUserCityId(cityId)
      }
    }

    // Fetch providers filtered by city
    fetchNearbyProviders(cityId)
    fetchTopRatedProviders(cityId)
  }

  async function fetchNearbyProviders(cityId: string | null) {
    const supabase = createClient()

    let query = supabase
      .from('providers')
      .select('id, name_ar, name_en, logo_url, cover_image_url, category, status, city_id')
      .in('status', ['open', 'closed'])

    // Filter by city if user has set one
    if (cityId) {
      query = query.eq('city_id', cityId)
    }

    const { data } = await query.limit(6)

    // Fallback: If no providers found for user's city, show all providers
    if (data?.length === 0 && cityId) {
      const { data: allData } = await supabase
        .from('providers')
        .select('id, name_ar, name_en, logo_url, cover_image_url, category, status, city_id')
        .in('status', ['open', 'closed'])
        .limit(6)

      if (allData) {
        const withDistance = allData.map((p, i) => ({
          ...p,
          distance: 0.5 + i * 0.3,
        }))
        setNearbyProviders(withDistance)
      }
    } else if (data) {
      // Add mock distance for demo
      const withDistance = data.map((p, i) => ({
        ...p,
        distance: 0.5 + i * 0.3,
      }))
      setNearbyProviders(withDistance)
    }
  }

  async function fetchTopRatedProviders(cityId: string | null) {
    const supabase = createClient()

    let query = supabase
      .from('providers')
      .select('*')
      .in('status', ['open', 'closed'])
      .order('is_featured', { ascending: false })
      .order('rating', { ascending: false })

    // Filter by city if user has set one
    if (cityId) {
      query = query.eq('city_id', cityId)
    }

    const { data } = await query.limit(6)

    // Fallback: If no providers found for user's city, show all providers
    if (data?.length === 0 && cityId) {
      const { data: allData } = await supabase
        .from('providers')
        .select('*')
        .in('status', ['open', 'closed'])
        .order('is_featured', { ascending: false })
        .order('rating', { ascending: false })
        .limit(6)

      if (allData) {
        setTopRatedProviders(allData)
      }
    } else if (data) {
      setTopRatedProviders(data)
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

      {/* Chat FAB */}
      <ChatFAB
        isOpen={isChatOpen}
        onOpenChange={setIsChatOpen}
      />
    </CustomerLayout>
  )
}

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
import { VoiceOrderFAB } from '@/components/customer/voice'
import { createClient } from '@/lib/supabase/client'

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

// Demo last order
const demoLastOrder = {
  id: 'order-123',
  providerName: 'Sultan Pizza',
  providerNameAr: 'سلطان بيتزا',
  providerLogo: undefined,
  items: ['2 Chicken Shawarma', '1 Large Pizza'],
  itemsAr: ['٢ شاورما فراخ', '١ بيتزا كبيرة'],
  total: 140,
  createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
}

export default function HomePage() {
  const locale = useLocale()
  const router = useRouter()
  const [isVoiceOpen, setIsVoiceOpen] = useState(false)
  const [lastOrder, setLastOrder] = useState<typeof demoLastOrder | null>(null)
  const [nearbyProviders, setNearbyProviders] = useState<any[]>([])
  const [topRatedProviders, setTopRatedProviders] = useState<any[]>([])
  const [userCityId, setUserCityId] = useState<string | null>(null)

  // Load user's city and providers
  useEffect(() => {
    loadUserCityAndProviders()
    // For demo, show the last order
    setLastOrder(demoLastOrder)
  }, [])

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

  const handleVoiceClick = () => {
    setIsVoiceOpen(true)
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

  const handleReorder = (orderId: string) => {
    // Would add items to cart and navigate
    router.push(`/${locale}/cart`)
  }

  const handleViewOrderDetails = (orderId: string) => {
    router.push(`/${locale}/orders/${orderId}`)
  }

  return (
    <CustomerLayout showHeader={true} showBottomNav={true}>
      <div className="pb-4">
        {/* Hero Section with Voice CTA */}
        <HeroSection
          onVoiceClick={handleVoiceClick}
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

      {/* Voice Order FAB */}
      <VoiceOrderFAB
        isOpen={isVoiceOpen}
        onOpenChange={setIsVoiceOpen}
      />
    </CustomerLayout>
  )
}

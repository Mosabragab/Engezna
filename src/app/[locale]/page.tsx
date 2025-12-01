'use client'

import { useEffect, useState } from 'react'
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
import { useTopRatedProviders } from '@/hooks/customer/useProviders'
import { createClient } from '@/lib/supabase/client'

// Demo offers data
const demoOffers = [
  {
    id: '1',
    title: 'خصم ٣٠٪',
    titleEn: '30% Off',
    description: 'على جميع البيتزا',
    descriptionEn: 'On all pizzas',
    providerName: 'سلطان بيتزا',
    providerNameEn: 'Sultan Pizza',
    discountPercentage: 30,
    imageUrl: '/images/offers/pizza.jpg',
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    title: 'توصيل مجاني',
    titleEn: 'Free Delivery',
    description: 'على الطلبات فوق ١٠٠ ج.م',
    descriptionEn: 'On orders over 100 EGP',
    providerName: 'لافندر كافيه',
    providerNameEn: 'Lavender Cafe',
    imageUrl: '/images/offers/coffee.jpg',
    validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  },
  {
    id: '3',
    title: 'اشتري ١ واحصل ١',
    titleEn: 'Buy 1 Get 1',
    description: 'على جميع العصائر',
    descriptionEn: 'On all juices',
    providerName: 'عصائر الشفا',
    providerNameEn: 'Al-Shifa Juices',
    imageUrl: '/images/offers/juice.jpg',
    validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
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

  // Fetch top rated providers
  const { providers: topRatedProviders, isLoading: topRatedLoading } = useTopRatedProviders(6)

  // Load last order and nearby providers
  useEffect(() => {
    // For demo, show the last order
    setLastOrder(demoLastOrder)

    // Fetch nearby providers (using same hook but could be location-based)
    fetchNearbyProviders()
  }, [])

  async function fetchNearbyProviders() {
    const supabase = createClient()
    const { data } = await supabase
      .from('providers')
      .select('id, name_ar, name_en, logo_url, cover_image_url, category, status')
      .in('status', ['open', 'closed'])
      .limit(6)

    if (data) {
      // Add mock distance for demo
      const withDistance = data.map((p, i) => ({
        ...p,
        distance: 0.5 + i * 0.3,
      }))
      setNearbyProviders(withDistance)
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
      <VoiceOrderFAB />
    </CustomerLayout>
  )
}

'use client'

import { useLocale } from 'next-intl'
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Offer {
  id: string
  title_ar: string
  title_en: string
  description_ar?: string
  description_en?: string
  image_url?: string
  background_color?: string
  link?: string
  discount_percentage?: number
}

// Unified brand colors - all offers use blue gradient
const demoOffers: Offer[] = [
  {
    id: '1',
    title_ar: 'خصم 30% على أول طلب',
    title_en: '30% Off First Order',
    description_ar: 'استخدم كود WELCOME30',
    description_en: 'Use code WELCOME30',
    background_color: '#009DE0',
    discount_percentage: 30,
  },
  {
    id: '2',
    title_ar: 'توصيل مجاني',
    title_en: 'Free Delivery',
    description_ar: 'للطلبات فوق 100 جنيه',
    description_en: 'On orders above 100 EGP',
    background_color: '#0088CC',
  },
  {
    id: '3',
    title_ar: 'عروض نهاية الأسبوع',
    title_en: 'Weekend Deals',
    description_ar: 'خصومات تصل إلى 50%',
    description_en: 'Up to 50% off',
    background_color: '#0077B6',
    discount_percentage: 50,
  },
]

interface OffersCarouselProps {
  offers?: Offer[]
  autoPlay?: boolean
  autoPlayInterval?: number
  title?: string
  showArrows?: boolean
  showViewAll?: boolean
  onViewAll?: () => void
  className?: string
}

export function OffersCarousel({
  offers = demoOffers,
  autoPlay = true,
  autoPlayInterval = 4000,
  title,
  showArrows = true,
  showViewAll = false,
  onViewAll,
  className = '',
}: OffersCarouselProps) {
  const locale = useLocale()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const isRTL = locale === 'ar'

  const sectionTitle = title || (locale === 'ar' ? 'العروض' : 'Offers')

  // Auto-play
  useEffect(() => {
    if (!autoPlay || offers.length <= 1 || isPaused) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % offers.length)
    }, autoPlayInterval)

    return () => clearInterval(interval)
  }, [autoPlay, autoPlayInterval, offers.length, isPaused])

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + offers.length) % offers.length)
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % offers.length)
  }

  // Pause on interaction
  const handleInteractionStart = () => setIsPaused(true)
  const handleInteractionEnd = () => {
    setTimeout(() => setIsPaused(false), 3000)
  }

  if (offers.length === 0) return null

  // Calculate transform based on RTL and current index
  // Card width is 85vw, gap is 16px (gap-4)
  const getTransform = () => {
    const cardWidthPercent = 85
    const gapPx = 16
    // In RTL, we move in positive direction; in LTR, negative direction
    const direction = isRTL ? 1 : -1
    return `translateX(calc(${direction * currentIndex * cardWidthPercent}vw + ${direction * currentIndex * gapPx}px))`
  }

  return (
    <section className={`bg-slate-50 px-4 py-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">{sectionTitle}</h2>
        <div className="flex items-center gap-2">
          {(showViewAll || onViewAll) && (
            <button
              onClick={onViewAll}
              className="text-sm text-primary font-medium"
            >
              {locale === 'ar' ? 'عرض الكل' : 'View All'}
            </button>
          )}
          {showArrows && offers.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Carousel */}
      <div
        className="relative overflow-hidden -mx-4 px-4"
        onTouchStart={handleInteractionStart}
        onTouchEnd={handleInteractionEnd}
        onMouseEnter={handleInteractionStart}
        onMouseLeave={handleInteractionEnd}
      >
        <div
          className="flex gap-4 will-change-transform"
          style={{
            transform: getTransform(),
            // Spring-like transition for smooth carousel movement
            transition: 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          {offers.map((offer) => {
            const OfferContent = (
              <div
                className="flex-shrink-0 w-[85vw] max-w-sm rounded-2xl p-6 text-white relative overflow-hidden"
                style={{ backgroundColor: offer.background_color || '#009DE0' }}
              >
                {/* Background decoration */}
                <div className="absolute -top-10 -end-10 w-32 h-32 bg-white/10 rounded-full" />
                <div className="absolute -bottom-6 -start-6 w-24 h-24 bg-white/10 rounded-full" />

                {/* Discount badge */}
                {offer.discount_percentage && (
                  <div className="absolute top-4 end-4 bg-white text-slate-900 font-bold text-sm px-2 py-1 rounded-lg">
                    {offer.discount_percentage}%
                  </div>
                )}

                {/* Content */}
                <div className="relative z-10">
                  <h3 className="text-xl font-bold mb-2">
                    {locale === 'ar' ? offer.title_ar : offer.title_en}
                  </h3>
                  {(offer.description_ar || offer.description_en) && (
                    <p className="text-white/90 text-sm">
                      {locale === 'ar' ? offer.description_ar : offer.description_en}
                    </p>
                  )}
                </div>

                {/* Image placeholder */}
                {offer.image_url && (
                  <div className="absolute bottom-4 end-4 w-24 h-24">
                    <img
                      src={offer.image_url}
                      alt={locale === 'ar' ? offer.title_ar : offer.title_en}
                      loading="lazy"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
              </div>
            )

            return offer.link ? (
              <Link key={offer.id} href={offer.link}>
                {OfferContent}
              </Link>
            ) : (
              <div key={offer.id}>{OfferContent}</div>
            )
          })}
        </div>
      </div>

      {/* Dots indicator */}
      {offers.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {offers.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-primary w-4'
                  : 'bg-slate-300 hover:bg-slate-400'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  )
}

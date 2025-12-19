'use client'

import { useLocale } from 'next-intl'
import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

// Types
interface HomepageBanner {
  id: string
  title_ar: string
  title_en: string
  description_ar?: string | null
  description_en?: string | null
  image_url?: string | null
  background_color?: string | null
  gradient_start?: string | null
  gradient_end?: string | null
  badge_text_ar?: string | null
  badge_text_en?: string | null
  has_glassmorphism?: boolean
  cta_text_ar?: string | null
  cta_text_en?: string | null
  link_url?: string | null
  link_type?: string | null
  link_id?: string | null
  image_position?: 'start' | 'end' | 'background'
  is_countdown_active?: boolean
  countdown_end_time?: string | null
  display_order?: number
}

// Fallback demo offers (used when no database banners exist)
const fallbackOffers: HomepageBanner[] = [
  {
    id: '1',
    title_ar: 'عرض بيتزا السلطان',
    title_en: 'Sultan Pizza Offer',
    description_ar: 'خصم ٣٠٪ على جميع البيتزا',
    description_en: '30% off all pizzas',
    badge_text_ar: 'خصم ٣٠٪',
    badge_text_en: '30% OFF',
    gradient_start: '#009DE0',
    gradient_end: '#0077B6',
    cta_text_ar: 'اطلب الآن',
    cta_text_en: 'Order Now',
    link_url: '/providers?category=restaurants',
    image_position: 'end',
    has_glassmorphism: true,
  },
  {
    id: '2',
    title_ar: 'توصيل مجاني',
    title_en: 'Free Delivery',
    description_ar: 'على الطلبات فوق ١٠٠ ج.م',
    description_en: 'On orders over 100 EGP',
    badge_text_ar: 'توصيل مجاني',
    badge_text_en: 'Free Delivery',
    gradient_start: '#0088CC',
    gradient_end: '#005A8C',
    cta_text_ar: 'اطلب الآن',
    cta_text_en: 'Order Now',
    link_url: '/providers?category=coffee_desserts',
    image_position: 'end',
    has_glassmorphism: true,
  },
  {
    id: '3',
    title_ar: 'عصائر الشفا',
    title_en: 'Al-Shifa Juices',
    description_ar: 'اشتري ١ واحصل على ١ مجاناً',
    description_en: 'Buy 1 Get 1 Free',
    badge_text_ar: 'اشتري ١ واحصل ١',
    badge_text_en: 'Buy 1 Get 1',
    gradient_start: '#0077B6',
    gradient_end: '#005580',
    cta_text_ar: 'اطلب الآن',
    cta_text_en: 'Order Now',
    link_url: '/providers?category=vegetables_fruits',
    image_position: 'end',
    has_glassmorphism: true,
  },
]

interface OffersCarouselProps {
  banners?: HomepageBanner[]
  autoPlay?: boolean
  autoPlayInterval?: number
  title?: string
  showViewAll?: boolean
  onViewAll?: () => void
  className?: string
}

// Countdown Timer Component
function CountdownTimer({ endTime }: { endTime: string }) {
  const locale = useLocale()
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(endTime).getTime() - new Date().getTime()
      if (difference > 0) {
        setTimeLeft({
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / (1000 * 60)) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        })
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)
    return () => clearInterval(timer)
  }, [endTime])

  const formatNum = (n: number) => n.toString().padStart(2, '0')

  return (
    <div className="flex items-center gap-1 text-white/90 text-xs font-medium">
      <span className="bg-white/20 backdrop-blur-sm rounded px-1.5 py-0.5">
        {formatNum(timeLeft.hours)}
      </span>
      <span>:</span>
      <span className="bg-white/20 backdrop-blur-sm rounded px-1.5 py-0.5">
        {formatNum(timeLeft.minutes)}
      </span>
      <span>:</span>
      <span className="bg-white/20 backdrop-blur-sm rounded px-1.5 py-0.5">
        {formatNum(timeLeft.seconds)}
      </span>
      <span className="ms-1 opacity-75">
        {locale === 'ar' ? 'متبقي' : 'left'}
      </span>
    </div>
  )
}

// Single Banner Card Component
function BannerCard({
  banner,
  isActive,
  locale,
  isDesktop,
}: {
  banner: HomepageBanner
  isActive: boolean
  locale: string
  isDesktop: boolean
}) {
  const isRTL = locale === 'ar'

  const title = locale === 'ar' ? banner.title_ar : banner.title_en
  const description = locale === 'ar' ? banner.description_ar : banner.description_en
  const badgeText = locale === 'ar' ? banner.badge_text_ar : banner.badge_text_en
  const ctaText = locale === 'ar' ? banner.cta_text_ar : banner.cta_text_en

  const gradientStyle = {
    background: `linear-gradient(135deg, ${banner.gradient_start || '#009DE0'} 0%, ${banner.gradient_end || '#0077B6'} 100%)`,
  }

  const imageOnStart = banner.image_position === 'start'
  const imageOnBackground = banner.image_position === 'background'

  const CardContent = (
    <motion.div
      className={`
        relative overflow-hidden rounded-2xl
        ${isDesktop ? 'aspect-[16/9]' : 'aspect-[16/9]'}
        ${isDesktop && !isActive ? 'opacity-70' : 'opacity-100'}
      `}
      style={gradientStyle}
      whileHover={isDesktop ? { scale: 1.02 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Background Image (if image_position is 'background') */}
      {imageOnBackground && banner.image_url && (
        <div className="absolute inset-0">
          <img
            src={banner.image_url}
            alt=""
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      )}

      {/* Decorative Circles */}
      <div className="absolute -top-12 -end-12 w-40 h-40 bg-white/10 rounded-full blur-sm" />
      <div className="absolute -bottom-8 -start-8 w-32 h-32 bg-white/10 rounded-full blur-sm" />

      {/* Content Container */}
      <div className={`
        relative z-10 h-full p-5 md:p-6
        flex ${imageOnStart ? 'flex-row-reverse' : 'flex-row'}
        items-center justify-between gap-4
      `}>
        {/* Text Content */}
        <div className={`flex-1 ${imageOnStart ? 'text-end' : 'text-start'}`}>
          {/* Badge */}
          {badgeText && (
            <div className={`
              inline-block mb-3
              ${banner.has_glassmorphism
                ? 'bg-white/20 backdrop-blur-md border border-white/30'
                : 'bg-white/25'
              }
              rounded-xl px-3 py-1.5 md:px-4 md:py-2
            `}>
              <span className="text-white font-bold text-sm md:text-base">
                {badgeText}
              </span>
            </div>
          )}

          {/* Title */}
          <h3 className="text-white font-bold text-lg md:text-xl lg:text-2xl mb-1 md:mb-2 leading-tight">
            {title}
          </h3>

          {/* Description */}
          {description && (
            <p className="text-white/85 text-sm md:text-base mb-3 md:mb-4 line-clamp-2">
              {description}
            </p>
          )}

          {/* Countdown Timer */}
          {banner.is_countdown_active && banner.countdown_end_time && (
            <div className="mb-3">
              <CountdownTimer endTime={banner.countdown_end_time} />
            </div>
          )}

          {/* CTA Button */}
          {ctaText && (
            <motion.button
              className="
                bg-white text-slate-900 font-semibold
                px-4 py-2 md:px-6 md:py-2.5
                rounded-xl text-sm md:text-base
                shadow-lg shadow-black/10
                hover:bg-white/95 hover:shadow-xl
                transition-all duration-200
              "
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              {ctaText}
            </motion.button>
          )}
        </div>

        {/* Product Image (3D Effect - breaks border) */}
        {!imageOnBackground && banner.image_url && (
          <div className={`
            relative
            ${isDesktop ? 'w-36 h-36 md:w-40 md:h-40' : 'w-28 h-28 sm:w-32 sm:h-32'}
            flex-shrink-0
          `}>
            <motion.img
              src={banner.image_url}
              alt={title}
              className="
                w-full h-full object-contain
                drop-shadow-2xl
                transform translate-y-2
              "
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              style={{
                filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.3))',
              }}
            />
          </div>
        )}
      </div>
    </motion.div>
  )

  // Wrap with Link if link_url exists
  if (banner.link_url) {
    return (
      <Link href={`/${locale}${banner.link_url}`} className="block">
        {CardContent}
      </Link>
    )
  }

  return CardContent
}

export function OffersCarousel({
  banners: propBanners,
  autoPlay = true,
  autoPlayInterval = 5000,
  title,
  showViewAll = true,
  onViewAll,
  className = '',
}: OffersCarouselProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [banners, setBanners] = useState<HomepageBanner[]>(propBanners || [])
  const [isLoading, setIsLoading] = useState(!propBanners)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null)

  const sectionTitle = title || (locale === 'ar' ? 'العروض' : 'Offers')

  // Detect desktop
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024)
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  // Fetch banners from database
  useEffect(() => {
    if (propBanners) {
      setBanners(propBanners)
      setIsLoading(false)
      return
    }

    async function fetchBanners() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('homepage_banners')
          .select('*')
          .eq('is_active', true)
          .lte('starts_at', new Date().toISOString())
          .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)
          .order('display_order', { ascending: true })

        if (error) throw error

        if (data && data.length > 0) {
          setBanners(data)
        } else {
          setBanners(fallbackOffers)
        }
      } catch (error) {
        // Use fallback on error
        setBanners(fallbackOffers)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBanners()
  }, [propBanners])

  // Auto-play logic
  useEffect(() => {
    if (!autoPlay || banners.length <= 1 || isPaused || (isDesktop && isHovered)) {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current)
        autoPlayRef.current = null
      }
      return
    }

    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length)
    }, autoPlayInterval)

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current)
      }
    }
  }, [autoPlay, autoPlayInterval, banners.length, isPaused, isDesktop, isHovered])

  // Scroll to index on change (mobile snap scroll)
  useEffect(() => {
    if (!isDesktop && scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const cardWidth = container.offsetWidth * 0.85 + 16 // 85% + gap
      const scrollPosition = isRTL
        ? -(currentIndex * cardWidth)
        : currentIndex * cardWidth

      container.scrollTo({
        left: isRTL ? container.scrollWidth - container.offsetWidth + scrollPosition : scrollPosition,
        behavior: 'smooth',
      })
    }
  }, [currentIndex, isDesktop, isRTL])

  // Handle scroll events for mobile snap
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || isDesktop) return

    const container = scrollContainerRef.current
    const cardWidth = container.offsetWidth * 0.85 + 16
    const scrollLeft = isRTL
      ? container.scrollWidth - container.offsetWidth - container.scrollLeft
      : container.scrollLeft
    const newIndex = Math.round(scrollLeft / cardWidth)

    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < banners.length) {
      setCurrentIndex(newIndex)
    }
  }, [currentIndex, banners.length, isDesktop, isRTL])

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length)
  }

  // Pause on interaction
  const handleInteractionStart = () => setIsPaused(true)
  const handleInteractionEnd = () => {
    setTimeout(() => setIsPaused(false), 3000)
  }

  if (isLoading) {
    return (
      <section className={`bg-slate-50 px-4 py-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-24 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`
                flex-shrink-0 rounded-2xl bg-slate-200 animate-pulse
                ${isDesktop ? 'w-[calc(33.333%-11px)]' : 'w-[85%]'}
                aspect-[16/9]
              `}
            />
          ))}
        </div>
      </section>
    )
  }

  if (banners.length === 0) return null

  // Desktop: Show 3 cards
  const visibleBanners = isDesktop
    ? (() => {
        const result = []
        for (let i = 0; i < Math.min(3, banners.length); i++) {
          const index = (currentIndex + i) % banners.length
          result.push({ ...banners[index], _index: index })
        }
        return result
      })()
    : banners

  return (
    <section className={`bg-slate-50 px-4 py-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">{sectionTitle}</h2>
        <div className="flex items-center gap-2">
          {showViewAll && onViewAll && (
            <button
              onClick={onViewAll}
              className="text-sm text-primary font-medium hover:underline"
            >
              {locale === 'ar' ? 'عرض الكل' : 'View All'}
            </button>
          )}

          {/* Desktop Navigation Arrows (hover only) */}
          {isDesktop && banners.length > 3 && (
            <motion.div
              className="flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <button
                onClick={handlePrev}
                className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-primary hover:text-primary transition-colors shadow-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-primary hover:text-primary transition-colors shadow-sm"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Carousel Container */}
      <div
        className="relative"
        onMouseEnter={() => {
          setIsHovered(true)
          handleInteractionStart()
        }}
        onMouseLeave={() => {
          setIsHovered(false)
          handleInteractionEnd()
        }}
      >
        {/* Mobile: Scroll Snap Carousel */}
        {!isDesktop && (
          <div
            ref={scrollContainerRef}
            className="
              flex gap-4 overflow-x-auto
              snap-x snap-mandatory
              scrollbar-hide
              -mx-4 px-4
              pb-2
            "
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
            onScroll={handleScroll}
            onTouchStart={handleInteractionStart}
            onTouchEnd={handleInteractionEnd}
          >
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                className="
                  flex-shrink-0 w-[85%]
                  snap-center
                "
              >
                <BannerCard
                  banner={banner}
                  isActive={index === currentIndex}
                  locale={locale}
                  isDesktop={false}
                />
              </div>
            ))}
          </div>
        )}

        {/* Desktop: 3-Card Grid with Animation */}
        {isDesktop && (
          <div className="grid grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {visibleBanners.map((banner, idx) => (
                <motion.div
                  key={`${banner.id}-${(banner as any)._index}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{
                    opacity: 1,
                    scale: idx === 0 ? 1 : 0.98,
                  }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 25,
                  }}
                >
                  <BannerCard
                    banner={banner}
                    isActive={idx === 0}
                    locale={locale}
                    isDesktop={true}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Progress Bars (Modern style) */}
      {banners.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className="relative h-1 rounded-full overflow-hidden transition-all duration-300"
              style={{
                width: index === currentIndex ? '24px' : '8px',
                backgroundColor: index === currentIndex ? 'transparent' : '#CBD5E1',
              }}
            >
              {index === currentIndex && (
                <motion.div
                  className="absolute inset-0 bg-primary rounded-full"
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    duration: autoPlay ? autoPlayInterval / 1000 : 0.3,
                    ease: 'linear',
                  }}
                  key={currentIndex}
                />
              )}
              {index !== currentIndex && (
                <div className="absolute inset-0 bg-slate-300 rounded-full" />
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

'use client'

import { useLocale } from 'next-intl'
import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

// Helper function to calculate color luminance
function getContrastTextColor(hexColor: string): 'light' | 'dark' {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? 'dark' : 'light'
}

function getGradientTextColor(startColor: string, endColor: string): 'light' | 'dark' {
  const startLuminance = getContrastTextColor(startColor)
  const endLuminance = getContrastTextColor(endColor)
  if (startLuminance === 'dark' || endLuminance === 'dark') {
    return 'dark'
  }
  return 'light'
}

interface PartnerBanner {
  id: string
  title_ar: string
  title_en: string
  description_ar?: string | null
  description_en?: string | null
  image_url?: string | null
  gradient_start?: string | null
  gradient_end?: string | null
  badge_text_ar?: string | null
  badge_text_en?: string | null
  has_glassmorphism?: boolean
  cta_text_ar?: string | null
  cta_text_en?: string | null
  link_url?: string | null
  image_position?: 'start' | 'end' | 'background'
  is_countdown_active?: boolean
  countdown_end_time?: string | null
}

// Fallback partner banners
const fallbackPartnerBanners: PartnerBanner[] = [
  {
    id: 'p1',
    title_ar: 'انضم لأكبر منصة توصيل',
    title_en: 'Join the Largest Delivery Platform',
    description_ar: 'سجل متجرك الآن واحصل على شهر مجاني',
    description_en: 'Register your store and get one month free',
    badge_text_ar: 'شهر مجاني',
    badge_text_en: 'Free Month',
    gradient_start: '#009DE0',
    gradient_end: '#0077B6',
    cta_text_ar: 'سجل الآن',
    cta_text_en: 'Register Now',
    link_url: '/partner/register',
    image_position: 'end',
    has_glassmorphism: true,
  },
  {
    id: 'p2',
    title_ar: 'وصّل لعملاء جدد',
    title_en: 'Reach New Customers',
    description_ar: 'أكثر من 10,000 عميل نشط في انتظار خدماتك',
    description_en: 'More than 10,000 active customers waiting',
    badge_text_ar: '+10K عميل',
    badge_text_en: '+10K Customers',
    gradient_start: '#00C27A',
    gradient_end: '#00A066',
    cta_text_ar: 'ابدأ البيع',
    cta_text_en: 'Start Selling',
    link_url: '/partner/register',
    image_position: 'end',
    has_glassmorphism: true,
  },
  {
    id: 'p3',
    title_ar: 'لوحة تحكم متكاملة',
    title_en: 'Complete Dashboard',
    description_ar: 'تتبع طلباتك وأرباحك في مكان واحد',
    description_en: 'Track orders and earnings in one place',
    badge_text_ar: 'مجاني 100%',
    badge_text_en: '100% Free',
    gradient_start: '#8B5CF6',
    gradient_end: '#7C3AED',
    cta_text_ar: 'اكتشف المزيد',
    cta_text_en: 'Learn More',
    link_url: '/partner/register',
    image_position: 'end',
    has_glassmorphism: true,
  },
]

interface PartnerBannersCarouselProps {
  autoPlay?: boolean
  autoPlayInterval?: number
  className?: string
}

function PartnerBannerCard({
  banner,
  isActive,
  locale,
  isDesktop,
}: {
  banner: PartnerBanner
  isActive: boolean
  locale: string
  isDesktop: boolean
}) {
  const title = locale === 'ar' ? banner.title_ar : banner.title_en
  const description = locale === 'ar' ? banner.description_ar : banner.description_en
  const badgeText = locale === 'ar' ? banner.badge_text_ar : banner.badge_text_en
  const ctaText = locale === 'ar' ? banner.cta_text_ar : banner.cta_text_en

  const gradientStart = banner.gradient_start || '#009DE0'
  const gradientEnd = banner.gradient_end || '#0077B6'

  const gradientStyle = {
    background: `linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%)`,
  }

  const textMode = getGradientTextColor(gradientStart, gradientEnd)
  const isDarkText = textMode === 'dark'

  const textColorClass = isDarkText ? 'text-slate-800' : 'text-white'
  const textColorSecondary = isDarkText ? 'text-slate-600' : 'text-white/85'
  const badgeBgClass = isDarkText
    ? (banner.has_glassmorphism ? 'bg-slate-800/15 backdrop-blur-md border border-slate-800/20' : 'bg-slate-800/20')
    : (banner.has_glassmorphism ? 'bg-white/20 backdrop-blur-md border border-white/30' : 'bg-white/25')
  const badgeTextClass = isDarkText ? 'text-slate-800' : 'text-white'
  const decorativeCircleClass = isDarkText ? 'bg-slate-800/5' : 'bg-white/10'
  const ctaButtonClass = isDarkText
    ? 'bg-slate-800 text-white hover:bg-slate-700'
    : 'bg-white text-slate-900 hover:bg-white/95'

  const imageOnStart = banner.image_position === 'start'
  const imageOnBackground = banner.image_position === 'background'

  const CardContent = (
    <motion.div
      className={`
        relative overflow-hidden rounded-2xl
        aspect-[16/9]
        ${isDesktop && !isActive ? 'opacity-70' : 'opacity-100'}
      `}
      style={gradientStyle}
      whileHover={isDesktop ? { scale: 1.02 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
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

      <div className={`absolute -top-12 -end-12 w-40 h-40 ${decorativeCircleClass} rounded-full blur-sm`} />
      <div className={`absolute -bottom-8 -start-8 w-32 h-32 ${decorativeCircleClass} rounded-full blur-sm`} />

      <div className={`
        relative z-10 h-full p-5 md:p-6
        flex ${imageOnStart ? 'flex-row-reverse' : 'flex-row'}
        items-center justify-between gap-4
      `}>
        <div className={`flex-1 ${imageOnStart ? 'text-end' : 'text-start'}`}>
          {badgeText && (
            <div className={`
              inline-block mb-3
              ${badgeBgClass}
              rounded-xl px-3 py-1.5 md:px-4 md:py-2
            `}>
              <span className={`${badgeTextClass} font-bold text-sm md:text-base`}>
                {badgeText}
              </span>
            </div>
          )}

          <h3 className={`${textColorClass} font-bold text-lg md:text-xl lg:text-2xl mb-1 md:mb-2 leading-tight`}>
            {title}
          </h3>

          {description && (
            <p className={`${textColorSecondary} text-sm md:text-base mb-3 md:mb-4 line-clamp-2`}>
              {description}
            </p>
          )}

          {ctaText && (
            <motion.button
              className={`
                ${ctaButtonClass} font-semibold
                px-4 py-2 md:px-6 md:py-2.5
                rounded-xl text-sm md:text-base
                shadow-lg shadow-black/10
                hover:shadow-xl
                transition-all duration-200
              `}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              {ctaText}
            </motion.button>
          )}
        </div>

        {!imageOnBackground && banner.image_url && (
          <div className={`
            relative
            ${isDesktop ? 'w-36 h-36 md:w-40 md:h-40' : 'w-28 h-28 sm:w-32 sm:h-32'}
            flex-shrink-0
          `}>
            <motion.img
              src={banner.image_url}
              alt={title}
              className="w-full h-full object-contain transform translate-y-1"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              style={{
                filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.15)) drop-shadow(0 16px 32px rgba(0,0,0,0.1))',
              }}
            />
          </div>
        )}
      </div>
    </motion.div>
  )

  if (banner.link_url) {
    return (
      <Link href={`/${locale}${banner.link_url}`} className="block">
        {CardContent}
      </Link>
    )
  }

  return CardContent
}

function ProgressIndicator({
  totalItems,
  currentIndex,
  scrollProgress,
  onSelect,
  autoPlay,
  autoPlayInterval,
  isRTL,
}: {
  totalItems: number
  currentIndex: number
  scrollProgress: number
  onSelect: (index: number) => void
  autoPlay: boolean
  autoPlayInterval: number
  isRTL: boolean
}) {
  return (
    <div className="flex items-center justify-center gap-1.5 mt-4">
      {Array.from({ length: totalItems }).map((_, index) => {
        const distance = Math.abs(scrollProgress - index)
        const isActive = index === currentIndex
        const width = isActive ? 24 : Math.max(8, 16 - distance * 8)

        return (
          <motion.button
            key={index}
            onClick={() => onSelect(index)}
            className="relative h-1.5 rounded-full overflow-hidden bg-[#009DE0]/20"
            animate={{
              width,
              opacity: isActive ? 1 : 0.5 + (1 - Math.min(distance, 1)) * 0.3
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
          >
            <motion.div
              className="absolute inset-0 bg-[#009DE0] rounded-full"
              initial={false}
              animate={{ scaleX: isActive ? 1 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{ originX: isRTL ? 1 : 0 }}
            />
            {isActive && autoPlay && (
              <motion.div
                className="absolute inset-0 bg-[#009DE0]/60 rounded-full"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: autoPlayInterval / 1000, ease: 'linear' }}
                style={{ originX: isRTL ? 1 : 0 }}
                key={`progress-${currentIndex}`}
              />
            )}
          </motion.button>
        )
      })}
    </div>
  )
}

export function PartnerBannersCarousel({
  autoPlay = true,
  autoPlayInterval = 5000,
  className = '',
}: PartnerBannersCarouselProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [banners, setBanners] = useState<PartnerBanner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Detect desktop
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024)
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  // Fetch partner banners from database
  useEffect(() => {
    async function fetchBanners() {
      try {
        const supabase = createClient()

        const { data, error } = await supabase
          .from('homepage_banners')
          .select('*')
          .eq('is_active', true)
          .eq('banner_type', 'partner')
          .lte('starts_at', new Date().toISOString())
          .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)
          .order('display_order', { ascending: true })

        if (error) throw error

        if (data && data.length > 0) {
          setBanners(data)
        } else {
          setBanners(fallbackPartnerBanners)
        }
      } catch (error) {
        setBanners(fallbackPartnerBanners)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBanners()
  }, [])

  // Auto-play logic
  useEffect(() => {
    if (!autoPlay || banners.length <= 1 || isPaused || (isDesktop && isHovered)) {
      return
    }

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length)
    }, autoPlayInterval)

    return () => clearInterval(timer)
  }, [autoPlay, autoPlayInterval, banners.length, isPaused, isDesktop, isHovered])

  // Scroll to current index
  useEffect(() => {
    if (isDesktop || !scrollContainerRef.current || banners.length === 0) return

    const container = scrollContainerRef.current
    const cards = container.querySelectorAll('[data-partner-banner-card]')
    if (cards.length === 0) return

    const card = cards[currentIndex] as HTMLElement
    if (!card) return

    setIsAutoScrolling(true)

    card.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })

    setScrollProgress(currentIndex)

    const resetTimer = setTimeout(() => {
      setIsAutoScrolling(false)
    }, 500)

    return () => clearTimeout(resetTimer)
  }, [currentIndex, isDesktop, banners.length])

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || isDesktop || isAutoScrolling) return

    const container = scrollContainerRef.current
    const containerWidth = container.offsetWidth
    const scrollLeft = container.scrollLeft
    const cardWidth = containerWidth * 0.85 + 16

    const newIndex = Math.round(scrollLeft / cardWidth)
    const clampedIndex = Math.max(0, Math.min(newIndex, banners.length - 1))

    const progress = scrollLeft / (cardWidth * (banners.length - 1))
    setScrollProgress(progress * (banners.length - 1))

    if (clampedIndex !== currentIndex) {
      setCurrentIndex(clampedIndex)
    }
  }, [currentIndex, banners.length, isDesktop, isAutoScrolling])

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length)
  }

  const handleTouchStart = () => setIsPaused(true)
  const handleTouchEnd = () => {
    setTimeout(() => setIsPaused(false), 2000)
  }

  if (isLoading) {
    return (
      <div className={`px-4 py-6 ${className}`}>
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
      </div>
    )
  }

  if (banners.length === 0) return null

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
    <div className={`${className}`}>
      <div
        className="relative"
        onMouseEnter={() => {
          setIsHovered(true)
          if (isDesktop) setIsPaused(true)
        }}
        onMouseLeave={() => {
          setIsHovered(false)
          if (isDesktop) setTimeout(() => setIsPaused(false), 1000)
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
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                data-partner-banner-card
                className="flex-shrink-0 w-[85%] snap-center"
              >
                <PartnerBannerCard
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
          <div className="relative">
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
                    <PartnerBannerCard
                      banner={banner}
                      isActive={idx === 0}
                      locale={locale}
                      isDesktop={true}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Desktop Navigation Arrows */}
            {banners.length > 3 && (
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between pointer-events-none px-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  onClick={handlePrev}
                  className="w-11 h-11 rounded-full bg-white/90 border border-slate-200 flex items-center justify-center hover:border-[#009DE0] hover:text-[#009DE0] transition-colors shadow-lg pointer-events-auto"
                  aria-label={locale === 'ar' ? 'السابق' : 'Previous'}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNext}
                  className="w-11 h-11 rounded-full bg-white/90 border border-slate-200 flex items-center justify-center hover:border-[#009DE0] hover:text-[#009DE0] transition-colors shadow-lg pointer-events-auto"
                  aria-label={locale === 'ar' ? 'التالي' : 'Next'}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      {banners.length > 1 && (
        <ProgressIndicator
          totalItems={banners.length}
          currentIndex={currentIndex}
          scrollProgress={scrollProgress}
          onSelect={setCurrentIndex}
          autoPlay={autoPlay && !isPaused}
          autoPlayInterval={autoPlayInterval}
          isRTL={isRTL}
        />
      )}
    </div>
  )
}

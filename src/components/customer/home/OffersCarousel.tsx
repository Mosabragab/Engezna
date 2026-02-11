'use client';

import { useLocale } from 'next-intl';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useUserLocation } from '@/lib/contexts/LocationContext';

// Helper function to calculate color luminance and determine if text should be dark or light
function getContrastTextColor(hexColor: string): 'light' | 'dark' {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance using the formula
  // Higher values = lighter color
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // If luminance > 0.6, background is light, so use dark text
  return luminance > 0.6 ? 'dark' : 'light';
}

// Get average luminance of gradient (checks both start and end colors)
function getGradientTextColor(startColor: string, endColor: string): 'light' | 'dark' {
  const startLuminance = getContrastTextColor(startColor);
  const endLuminance = getContrastTextColor(endColor);

  // If either color is light, use dark text for safety
  if (startLuminance === 'dark' || endLuminance === 'dark') {
    return 'dark';
  }
  return 'light';
}

// Types
type ImagePosition = 'start' | 'end' | 'center' | 'background';
type ImageSize = 'small' | 'medium' | 'large';

interface HomepageBanner {
  id: string;
  title_ar: string;
  title_en: string;
  description_ar?: string | null;
  description_en?: string | null;
  image_url?: string | null;
  background_color?: string | null;
  gradient_start?: string | null;
  gradient_end?: string | null;
  badge_text_ar?: string | null;
  badge_text_en?: string | null;
  has_glassmorphism?: boolean;
  cta_text_ar?: string | null;
  cta_text_en?: string | null;
  link_url?: string | null;
  link_type?: string | null;
  link_id?: string | null;
  image_position?: ImagePosition;
  image_size?: ImageSize;
  is_countdown_active?: boolean;
  countdown_end_time?: string | null;
  display_order?: number;
}

// Unified image size configuration - relative to banner height for consistency
// All sizes are designed to work harmoniously within the 16:9 aspect ratio
const IMAGE_SIZE_CONFIG: Record<
  ImageSize,
  {
    containerClass: string;
    maxHeight: string;
    label_ar: string;
    label_en: string;
  }
> = {
  small: {
    containerClass: 'w-auto h-[45%] max-w-[25%]',
    maxHeight: '45%',
    label_ar: 'صغير',
    label_en: 'Small',
  },
  medium: {
    containerClass: 'w-auto h-[55%] max-w-[30%]',
    maxHeight: '55%',
    label_ar: 'وسط',
    label_en: 'Medium',
  },
  large: {
    containerClass: 'w-auto h-[65%] max-w-[35%]',
    maxHeight: '65%',
    label_ar: 'كبير',
    label_en: 'Large',
  },
};

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
    image_size: 'medium',
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
    image_size: 'medium',
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
    image_size: 'medium',
    has_glassmorphism: true,
  },
];

interface OffersCarouselProps {
  banners?: HomepageBanner[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
  title?: string;
  showViewAll?: boolean;
  onViewAll?: () => void;
  className?: string;
}

// Track if this is the first OffersCarousel render (for LCP optimization)
let isFirstRender = true;

// Countdown Timer Component
function CountdownTimer({
  endTime,
  isDarkText = false,
}: {
  endTime: string;
  isDarkText?: boolean;
}) {
  const locale = useLocale();
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(endTime).getTime() - new Date().getTime();
      if (difference > 0) {
        setTimeLeft({
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / (1000 * 60)) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  const formatNum = (n: number) => n.toString().padStart(2, '0');

  const textColor = isDarkText ? 'text-slate-700' : 'text-white/90';
  const bgColor = isDarkText ? 'bg-slate-800/10' : 'bg-white/20';

  return (
    <div className={`flex items-center gap-1 ${textColor} text-xs font-medium`}>
      <span className={`${bgColor} backdrop-blur-sm rounded px-1.5 py-0.5`}>
        {formatNum(timeLeft.hours)}
      </span>
      <span>:</span>
      <span className={`${bgColor} backdrop-blur-sm rounded px-1.5 py-0.5`}>
        {formatNum(timeLeft.minutes)}
      </span>
      <span>:</span>
      <span className={`${bgColor} backdrop-blur-sm rounded px-1.5 py-0.5`}>
        {formatNum(timeLeft.seconds)}
      </span>
      <span className="ms-1 opacity-75">{locale === 'ar' ? 'متبقي' : 'left'}</span>
    </div>
  );
}

// P7: Fire-and-forget banner event tracking
function trackBannerEvent(bannerId: string, eventType: 'impression' | 'click') {
  // Skip tracking for fallback/demo banners (numeric IDs)
  if (/^\d+$/.test(bannerId)) return;
  fetch('/api/banners/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ banner_id: bannerId, event_type: eventType }),
  }).catch(() => {
    // Silently ignore tracking failures
  });
}

// Single Banner Card Component
function BannerCard({
  banner,
  isActive,
  locale,
  isDesktop,
  isLCPCandidate = false,
}: {
  banner: HomepageBanner;
  isActive: boolean;
  locale: string;
  isDesktop: boolean;
  isLCPCandidate?: boolean;
}) {
  const title = locale === 'ar' ? banner.title_ar : banner.title_en;
  const description = locale === 'ar' ? banner.description_ar : banner.description_en;
  const badgeText = locale === 'ar' ? banner.badge_text_ar : banner.badge_text_en;
  const ctaText = locale === 'ar' ? banner.cta_text_ar : banner.cta_text_en;

  // P7: Track impression when banner becomes active
  const impressionTracked = useRef(false);
  useEffect(() => {
    if (isActive && !impressionTracked.current) {
      impressionTracked.current = true;
      trackBannerEvent(banner.id, 'impression');
    }
  }, [isActive, banner.id]);

  const gradientStart = banner.gradient_start || '#009DE0';
  const gradientEnd = banner.gradient_end || '#0077B6';

  const gradientStyle = {
    background: `linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%)`,
  };

  // Determine text color based on background brightness
  const textMode = getGradientTextColor(gradientStart, gradientEnd);
  const isDarkText = textMode === 'dark';

  // Text color classes
  const textColorClass = isDarkText ? 'text-slate-800' : 'text-white';
  const textColorSecondary = isDarkText ? 'text-slate-600' : 'text-white/85';
  const badgeBgClass = isDarkText
    ? banner.has_glassmorphism
      ? 'bg-slate-800/15 backdrop-blur-md border border-slate-800/20'
      : 'bg-slate-800/20'
    : banner.has_glassmorphism
      ? 'bg-white/20 backdrop-blur-md border border-white/30'
      : 'bg-white/25';
  const badgeTextClass = isDarkText ? 'text-slate-800' : 'text-white';
  const decorativeCircleClass = isDarkText ? 'bg-slate-800/5' : 'bg-white/10';
  const ctaButtonClass = isDarkText
    ? 'bg-slate-800 text-white hover:bg-slate-700'
    : 'bg-white text-slate-900 hover:bg-white/95';

  const imagePosition = banner.image_position || 'end';
  const imageSize = banner.image_size || 'medium';
  const sizeConfig = IMAGE_SIZE_CONFIG[imageSize];

  const imageOnStart = imagePosition === 'start';
  const imageOnCenter = imagePosition === 'center';
  const imageOnBackground = imagePosition === 'background';

  const CardContent = (
    <motion.div
      className={`
        relative overflow-hidden rounded-2xl
        aspect-[16/9]
        ${isDesktop && !isActive ? 'opacity-70' : 'opacity-100'}
      `}
      style={gradientStyle}
      whileHover={isDesktop ? { scale: 1.01 } : undefined}
      transition={{ type: 'tween', duration: 0.4, ease: 'easeOut' }}
    >
      {/* Background Image (if image_position is 'background') */}
      {imageOnBackground && banner.image_url && (
        <div className="absolute inset-0">
          <Image
            src={banner.image_url}
            alt=""
            fill
            className="object-cover opacity-30"
            sizes="(max-width: 768px) 85vw, 33vw"
            priority={isLCPCandidate}
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      )}

      {/* Decorative Circles */}
      <div
        className={`absolute -top-12 -end-12 w-40 h-40 ${decorativeCircleClass} rounded-full blur-sm`}
      />
      <div
        className={`absolute -bottom-8 -start-8 w-32 h-32 ${decorativeCircleClass} rounded-full blur-sm`}
      />

      {/* Content Container */}
      <div
        className={`
        relative z-10 h-full p-5 md:p-6
        flex ${imageOnCenter ? 'flex-col' : imageOnStart ? 'flex-row-reverse' : 'flex-row'}
        items-center ${imageOnCenter ? 'justify-center text-center' : 'justify-between'} gap-4
      `}
      >
        {/* Text Content */}
        <div
          className={`${imageOnCenter ? '' : 'flex-1'} ${imageOnCenter ? 'text-center' : imageOnStart ? 'text-end' : 'text-start'}`}
        >
          {/* Badge */}
          {badgeText && (
            <div
              className={`
              inline-block mb-3
              ${badgeBgClass}
              rounded-xl px-3 py-1.5 md:px-4 md:py-2
            `}
            >
              <span className={`${badgeTextClass} font-bold text-sm md:text-base`}>
                {badgeText}
              </span>
            </div>
          )}

          {/* Title */}
          <h3
            className={`${textColorClass} font-bold text-lg md:text-xl lg:text-2xl mb-1 md:mb-2 leading-tight`}
          >
            {title}
          </h3>

          {/* Description */}
          {description && (
            <p className={`${textColorSecondary} text-sm md:text-base mb-3 md:mb-4 line-clamp-2`}>
              {description}
            </p>
          )}

          {/* Countdown Timer */}
          {banner.is_countdown_active && banner.countdown_end_time && (
            <div className="mb-3">
              <CountdownTimer endTime={banner.countdown_end_time} isDarkText={isDarkText} />
            </div>
          )}

          {/* CTA Button */}
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
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
            >
              {ctaText}
            </motion.button>
          )}
        </div>

        {/* Product Image (Unified sizing system) */}
        {!imageOnBackground && banner.image_url && (
          <motion.div
            className="relative flex-shrink-0 flex items-center justify-center"
            style={{
              height: sizeConfig.maxHeight,
              maxWidth: imageOnCenter ? '40%' : '35%',
              minWidth: imageOnCenter ? '30%' : '25%',
            }}
            initial={isLCPCandidate ? false : { scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <Image
              src={banner.image_url}
              alt={title}
              width={200}
              height={150}
              className="w-auto h-full max-w-full object-contain"
              sizes="(max-width: 768px) 25vw, 15vw"
              priority={isLCPCandidate}
              unoptimized
              style={{
                filter:
                  'drop-shadow(0 8px 16px rgba(0,0,0,0.15)) drop-shadow(0 16px 32px rgba(0,0,0,0.1))',
              }}
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );

  // Wrap with Link if link_url exists
  if (banner.link_url) {
    return (
      <Link
        href={`/${locale}${banner.link_url}`}
        className="block"
        onClick={() => trackBannerEvent(banner.id, 'click')}
      >
        {CardContent}
      </Link>
    );
  }

  return CardContent;
}

// Liquid Progress Indicator Component
function LiquidProgressIndicator({
  totalItems,
  currentIndex,
  scrollProgress,
  onSelect,
  autoPlay,
  autoPlayInterval,
  isRTL,
}: {
  totalItems: number;
  currentIndex: number;
  scrollProgress: number;
  onSelect: (index: number) => void;
  autoPlay: boolean;
  autoPlayInterval: number;
  isRTL: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-1.5 mt-4">
      {Array.from({ length: totalItems }).map((_, index) => {
        // Calculate distance for liquid effect
        const distance = Math.abs(scrollProgress - index);
        const isActive = index === currentIndex;

        // Width based on distance (liquid stretch effect)
        const width = isActive ? 24 : Math.max(8, 16 - distance * 8);

        return (
          <motion.button
            key={index}
            onClick={() => onSelect(index)}
            className="relative h-1.5 rounded-full overflow-hidden bg-slate-200"
            animate={{
              width,
              opacity: isActive ? 1 : 0.5 + (1 - Math.min(distance, 1)) * 0.3,
            }}
            transition={{ type: 'tween', duration: 0.5, ease: 'easeInOut' }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Active fill */}
            <motion.div
              className="absolute inset-0 bg-primary rounded-full"
              initial={false}
              animate={{
                scaleX: isActive ? 1 : 0,
              }}
              transition={{
                type: 'tween',
                duration: 0.4,
                ease: 'easeInOut',
              }}
              style={{ originX: isRTL ? 1 : 0 }}
            />

            {/* Auto-play progress fill */}
            {isActive && autoPlay && (
              <motion.div
                className="absolute inset-0 bg-primary/60 rounded-full"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  duration: autoPlayInterval / 1000,
                  ease: 'linear',
                }}
                style={{ originX: isRTL ? 1 : 0 }}
                key={`progress-${currentIndex}`}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
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
  const locale = useLocale();
  const isRTL = locale === 'ar';

  // Get user's location for banner targeting
  const { governorateId, cityId, isLoading: isLocationLoading } = useUserLocation();

  const [banners, setBanners] = useState<HomepageBanner[]>(propBanners || []);
  const [isLoading, setIsLoading] = useState(!propBanners);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const sectionTitle = title || (locale === 'ar' ? 'العروض' : 'Offers');

  // Detect desktop
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Fetch banners from database - filtered by user's location
  useEffect(() => {
    if (propBanners) {
      setBanners(propBanners);
      setIsLoading(false);
      return;
    }

    // Wait for location to load before fetching banners
    if (isLocationLoading) return;

    async function fetchBanners() {
      try {
        const supabase = createClient();

        // Try to use the RPC function if available (more efficient)
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_banners_for_location', {
          p_governorate_id: governorateId || null,
          p_city_id: cityId || null,
        });

        if (!rpcError && rpcData && rpcData.length > 0) {
          setBanners(rpcData);
          setIsLoading(false);
          return;
        }

        // Fallback: manual filtering if RPC not available
        const { data, error } = await supabase
          .from('homepage_banners')
          .select('*')
          .eq('is_active', true)
          .eq('banner_type', 'customer')
          .lte('starts_at', new Date().toISOString())
          .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)
          .order('display_order', { ascending: true });

        if (error) throw error;

        // Filter by location on client side
        const filteredData = (data || []).filter((banner) => {
          // National banners (no location restriction)
          if (!banner.governorate_id && !banner.city_id) return true;

          // User has no location set - only show national banners
          if (!governorateId) return false;

          // Governorate-level banners
          if (banner.governorate_id === governorateId && !banner.city_id) return true;

          // City-level banners
          if (banner.governorate_id === governorateId && banner.city_id === cityId) return true;

          return false;
        });

        if (filteredData.length > 0) {
          setBanners(filteredData);
        } else {
          setBanners(fallbackOffers);
        }
      } catch (error) {
        setBanners(fallbackOffers);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBanners();
  }, [propBanners, isLocationLoading, governorateId, cityId]);

  // Auto-play logic - RTL aware
  useEffect(() => {
    if (!autoPlay || banners.length <= 1 || isPaused || (isDesktop && isHovered)) {
      return;
    }

    const timer = setInterval(() => {
      // In RTL, move in reverse direction for natural feel
      if (isRTL) {
        setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
      } else {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
      }
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [autoPlay, autoPlayInterval, banners.length, isPaused, isDesktop, isHovered, isRTL]);

  // Scroll to current index (auto-play and programmatic navigation)
  useEffect(() => {
    if (isDesktop || !scrollContainerRef.current || banners.length === 0) return;

    const container = scrollContainerRef.current;
    const cards = container.querySelectorAll('[data-banner-card]');
    if (cards.length === 0) return;

    const card = cards[currentIndex] as HTMLElement;
    if (!card) return;

    // Set flag to prevent handleScroll from interfering
    setIsAutoScrolling(true);

    // Calculate the scroll position to center the card
    // Use scrollLeft directly to avoid any vertical page scrolling
    const cardWidth = card.offsetWidth;
    const containerWidth = container.offsetWidth;
    const cardLeft = card.offsetLeft;
    const scrollTarget = cardLeft - (containerWidth - cardWidth) / 2;

    container.scrollTo({
      left: scrollTarget,
      behavior: 'smooth',
    });

    // Update scroll progress
    setScrollProgress(currentIndex);

    // Reset flag after animation completes
    const resetTimer = setTimeout(() => {
      setIsAutoScrolling(false);
    }, 500);

    return () => clearTimeout(resetTimer);
  }, [currentIndex, isDesktop, banners.length]);

  // Handle scroll events for snap detection
  const handleScroll = useCallback(() => {
    // Skip if we're auto-scrolling or on desktop
    if (!scrollContainerRef.current || isDesktop || isAutoScrolling) return;

    const container = scrollContainerRef.current;
    const containerWidth = container.offsetWidth;
    const scrollLeft = container.scrollLeft;
    const cardWidth = containerWidth * 0.85 + 16; // 85% width + gap

    // Calculate current card based on scroll position
    const newIndex = Math.round(scrollLeft / cardWidth);
    const clampedIndex = Math.max(0, Math.min(newIndex, banners.length - 1));

    // Update scroll progress for liquid effect
    const progress = scrollLeft / (cardWidth * (banners.length - 1));
    setScrollProgress(progress * (banners.length - 1));

    if (clampedIndex !== currentIndex) {
      setCurrentIndex(clampedIndex);
    }
  }, [currentIndex, banners.length, isDesktop, isAutoScrolling]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  // Pause handlers
  const handleTouchStart = () => setIsPaused(true);
  const handleTouchEnd = () => {
    setTimeout(() => setIsPaused(false), 2000);
  };

  if (isLoading) {
    return (
      <section className={`bg-white px-4 py-6 ${className}`}>
        <div className="flex items-center justify-between mb-5">
          <div className="h-7 w-28 bg-slate-100 rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`
                flex-shrink-0 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 animate-pulse
                ${isDesktop ? 'w-[calc(33.333%-11px)]' : 'w-[85%]'}
                aspect-[16/9]
              `}
            />
          ))}
        </div>
      </section>
    );
  }

  if (banners.length === 0) {
    // Return null when no banners - the section simply won't render
    // Using h-0 was causing CLS issues
    return null;
  }

  // Desktop: Show 3 cards
  const visibleBanners = isDesktop
    ? (() => {
        const result = [];
        for (let i = 0; i < Math.min(3, banners.length); i++) {
          const index = (currentIndex + i) % banners.length;
          result.push({ ...banners[index], _index: index });
        }
        return result;
      })()
    : banners;

  return (
    <section className={`bg-white px-4 py-6 ${className}`}>
      {/* Header - Elegant */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-slate-900">{sectionTitle}</h2>
        <div className="flex items-center gap-3">
          {showViewAll && onViewAll && (
            <button
              onClick={onViewAll}
              className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              {locale === 'ar' ? 'عرض الكل' : 'View All'}
            </button>
          )}

          {/* Desktop Navigation Arrows - Elegant */}
          {isDesktop && banners.length > 3 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center hover:bg-primary hover:border-primary hover:text-white text-slate-500 transition-all duration-200 shadow-sm group active:scale-95"
                aria-label={locale === 'ar' ? 'السابق' : 'Previous'}
              >
                <ChevronLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
              <button
                onClick={handleNext}
                className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center hover:bg-primary hover:border-primary hover:text-white text-slate-500 transition-all duration-200 shadow-sm group active:scale-95"
                aria-label={locale === 'ar' ? 'التالي' : 'Next'}
              >
                <ChevronRight className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Carousel Container */}
      <div
        className="relative"
        onMouseEnter={() => {
          setIsHovered(true);
          if (isDesktop) setIsPaused(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          if (isDesktop) setTimeout(() => setIsPaused(false), 1000);
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
            {banners.map((banner, index) => {
              // First banner on first render is LCP candidate
              const isLCP = index === 0 && isFirstRender;
              if (index === 0 && isFirstRender) {
                isFirstRender = false;
              }
              return (
                <div key={banner.id} data-banner-card className="flex-shrink-0 w-[85%] snap-center">
                  <BannerCard
                    banner={banner}
                    isActive={index === currentIndex}
                    locale={locale}
                    isDesktop={false}
                    isLCPCandidate={isLCP}
                  />
                </div>
              );
            })}
            {/* Spacer for last banner padding */}
            <div className="flex-shrink-0 w-4" aria-hidden="true" />
          </div>
        )}

        {/* Desktop: 3-Card Grid with Animation */}
        {isDesktop && (
          <div className="grid grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {visibleBanners.map((banner, idx) => {
                // First banner on first render is LCP candidate
                const isLCP = idx === 0 && isFirstRender;
                if (idx === 0 && isFirstRender) {
                  isFirstRender = false;
                }
                return (
                  <motion.div
                    key={`${banner.id}-${(banner as any)._index}`}
                    initial={isLCP ? false : { opacity: 0, scale: 0.98 }}
                    animate={{
                      opacity: 1,
                      scale: idx === 0 ? 1 : 0.99,
                    }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{
                      type: 'tween',
                      duration: 0.6,
                      ease: [0.25, 0.1, 0.25, 1],
                    }}
                  >
                    <BannerCard
                      banner={banner}
                      isActive={idx === 0}
                      locale={locale}
                      isDesktop={true}
                      isLCPCandidate={isLCP}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Liquid Progress Indicator */}
      {banners.length > 1 && (
        <LiquidProgressIndicator
          totalItems={banners.length}
          currentIndex={currentIndex}
          scrollProgress={scrollProgress}
          onSelect={setCurrentIndex}
          autoPlay={autoPlay && !isPaused}
          autoPlayInterval={autoPlayInterval}
          isRTL={isRTL}
        />
      )}
    </section>
  );
}

'use client'

import { useLocale } from 'next-intl'
import Link from 'next/link'
import { Star, Clock, Truck, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Provider {
  id: string
  name_ar: string
  name_en: string
  logo_url?: string | null
  cover_image_url?: string | null
  rating: number
  review_count?: number
  total_reviews?: number
  estimated_delivery_time_min: number
  delivery_fee: number
  status: string
}

interface TopRatedSectionProps {
  title?: string
  providers?: Provider[]
  onViewAll?: () => void
  showViewAll?: boolean
  className?: string
}

/**
 * Top Rated Section - Horizontal scrolling list of top-rated providers
 * Design: Section title with "View All" link, horizontal scroll cards
 */
export function TopRatedSection({
  title,
  providers = [],
  onViewAll,
  showViewAll = true,
  className = '',
}: TopRatedSectionProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const sectionTitle = title || (isRTL ? 'الأعلى تقييماً' : 'Top Rated')

  if (providers.length === 0) return null

  return (
    <section className={cn('py-4', className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          <h2 className="text-lg font-bold text-slate-900">{sectionTitle}</h2>
        </div>
        {showViewAll && onViewAll && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-primary text-sm font-medium hover:underline"
          >
            {isRTL ? 'عرض الكل' : 'View All'}
            {isRTL ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Horizontal Scroll Cards - CSS Scroll Snap */}
      <div
        className="snap-carousel px-4 pb-2 gap-3"
        style={{ scrollPaddingInlineStart: '16px' }}
      >
        {providers.map((provider) => (
          <ProviderMiniCard key={provider.id} provider={provider} locale={locale} />
        ))}
      </div>
    </section>
  )
}

// Mini Provider Card for horizontal scroll
function ProviderMiniCard({ provider, locale }: { provider: Provider; locale: string }) {
  const isRTL = locale === 'ar'
  const name = isRTL ? provider.name_ar : provider.name_en

  return (
    <Link
      href={`/${locale}/providers/${provider.id}`}
      className={cn(
        'w-36 bg-white rounded-2xl overflow-hidden',
        'border border-[#E2E8F0] shadow-sm',
        'hover:shadow-md transition-all duration-200',
        'active:scale-[0.98]', // Press feedback
        'will-change-transform' // GPU acceleration
      )}
    >
      {/* Image - 16:9 aspect ratio */}
      <div className="relative aspect-[16/10] bg-slate-100">
        {provider.cover_image_url || provider.logo_url ? (
          <img
            src={provider.cover_image_url || provider.logo_url || undefined}
            alt={name}
            loading="lazy" // Lazy loading for performance
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            🏪
          </div>
        )}
        {/* Status Badge */}
        {provider.status === 'closed' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-xs font-medium">
              {isRTL ? 'مغلق' : 'Closed'}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2">
        <h3 className="font-semibold text-slate-900 text-sm truncate mb-1">
          {name}
        </h3>
        <div className="flex items-center gap-1 text-xs text-slate-600 mb-1">
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          <span className="font-medium">{provider.rating.toFixed(1)}</span>
          <Clock className="w-3 h-3 ms-1" />
          <span>{provider.estimated_delivery_time_min}{isRTL ? 'د' : 'm'}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Truck className="w-3 h-3" />
          <span>
            {provider.delivery_fee === 0
              ? (isRTL ? 'مجاني' : 'Free')
              : `${provider.delivery_fee} ${isRTL ? 'ج.م' : 'EGP'}`
            }
          </span>
        </div>
      </div>
    </Link>
  )
}

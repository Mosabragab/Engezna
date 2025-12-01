'use client'

import { useLocale } from 'next-intl'
import Link from 'next/link'
import { MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Provider {
  id: string
  name_ar: string
  name_en: string
  logo_url?: string
  cover_image_url?: string
  category: string
  distance?: number // in km
  status: 'open' | 'closed' | 'busy'
}

interface NearbySectionProps {
  title?: string
  providers?: Provider[]
  onViewAll?: () => void
  showViewAll?: boolean
  className?: string
}

/**
 * Nearby Section - Horizontal scrolling list of nearby providers
 * Design: Section title with "View All" link, horizontal scroll cards with distance
 */
export function NearbySection({
  title,
  providers = [],
  onViewAll,
  showViewAll = true,
  className = '',
}: NearbySectionProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const sectionTitle = title || (isRTL ? 'قريب منك' : 'Nearby')

  if (providers.length === 0) return null

  return (
    <section className={cn('py-4', className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
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

      {/* Horizontal Scroll Cards */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 px-4 pb-2">
          {providers.map((provider) => (
            <NearbyMiniCard key={provider.id} provider={provider} locale={locale} />
          ))}
        </div>
      </div>
    </section>
  )
}

// Category emoji mapping
const categoryEmojis: Record<string, string> = {
  restaurant: '🍔',
  coffee_shop: '☕',
  grocery: '🛒',
  vegetables_fruits: '🥬',
  bakery: '🥐',
  pharmacy: '💊',
  juice: '🧃',
  desserts: '🍰',
}

// Mini Provider Card for nearby section
function NearbyMiniCard({ provider, locale }: { provider: Provider; locale: string }) {
  const isRTL = locale === 'ar'
  const name = isRTL ? provider.name_ar : provider.name_en
  const emoji = categoryEmojis[provider.category] || '🏪'

  return (
    <Link
      href={`/${locale}/providers/${provider.id}`}
      className="flex-shrink-0 w-32 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Image */}
      <div className="relative h-20 bg-slate-100">
        {provider.cover_image_url || provider.logo_url ? (
          <img
            src={provider.cover_image_url || provider.logo_url}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">
            {emoji}
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
        {provider.distance !== undefined && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="w-3 h-3" />
            <span>
              {provider.distance.toFixed(1)} {isRTL ? 'كم' : 'km'}
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}

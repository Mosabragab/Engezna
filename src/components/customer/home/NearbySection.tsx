'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, ChevronLeft, ChevronRight, Crown, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Provider {
  id: string;
  name_ar: string;
  name_en: string;
  logo_url?: string | null;
  cover_image_url?: string | null;
  category: string;
  distance?: number; // in km
  status: string;
  is_featured?: boolean;
  is_verified?: boolean;
}

interface NearbySectionProps {
  title?: string;
  providers?: Provider[];
  onViewAll?: () => void;
  showViewAll?: boolean;
  className?: string;
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
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const sectionTitle = title || (isRTL ? 'قريب منك' : 'Nearby');

  if (providers.length === 0) return null;

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
            aria-label={isRTL ? 'عرض جميع المتاجر القريبة' : 'View all nearby stores'}
            className="flex items-center gap-1 text-primary text-sm font-medium hover:underline min-h-[44px] min-w-[44px] justify-center"
          >
            {isRTL ? 'عرض الكل' : 'View All'}
          </button>
        )}
      </div>

      {/* Horizontal Scroll Cards - CSS Scroll Snap */}
      <div className="snap-carousel px-4 pb-2 gap-3" style={{ scrollPaddingInlineStart: '16px' }}>
        {providers.map((provider) => (
          <NearbyMiniCard key={provider.id} provider={provider} locale={locale} />
        ))}
      </div>
    </section>
  );
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
};

// Mini Provider Card for nearby section
function NearbyMiniCard({ provider, locale }: { provider: Provider; locale: string }) {
  const isRTL = locale === 'ar';
  const name = isRTL ? provider.name_ar : provider.name_en;
  const emoji = categoryEmojis[provider.category] || '🏪';

  return (
    <Link
      href={`/${locale}/providers/${provider.id}`}
      className={cn(
        'w-32 bg-white rounded-2xl overflow-hidden',
        'border border-[#E2E8F0] shadow-sm',
        'hover:shadow-md transition-all duration-200',
        'active:scale-[0.98]', // Press feedback
        'will-change-transform' // GPU acceleration
      )}
    >
      {/* Image - 16:10 aspect ratio with reserved space */}
      <div className="relative aspect-[16/10] bg-slate-100">
        {provider.cover_image_url || provider.logo_url ? (
          <Image
            src={provider.cover_image_url || provider.logo_url || ''}
            alt={name}
            fill
            sizes="128px"
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">{emoji}</div>
        )}
        {/* Featured Badge */}
        {provider.is_featured && (
          <div className="absolute top-1 start-1 bg-amber-400/95 backdrop-blur-sm text-amber-900 p-1 rounded-md">
            <Crown className="w-3 h-3" />
          </div>
        )}
        {/* Status Badge */}
        {provider.status === 'closed' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-xs font-medium">{isRTL ? 'مغلق' : 'Closed'}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2">
        <div className="flex items-center gap-1 mb-1">
          <h3 className="font-semibold text-slate-900 text-sm truncate">{name}</h3>
          {provider.is_verified && (
            <BadgeCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
          )}
        </div>
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
  );
}

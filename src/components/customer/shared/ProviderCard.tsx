'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Clock, Truck, MapPin, Heart, BadgeCheck, Crown } from 'lucide-react';
import { useState } from 'react';

interface Provider {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  category: string;
  logo_url: string | null;
  cover_image_url: string | null;
  rating: number;
  total_reviews: number;
  delivery_fee: number;
  min_order_amount: number;
  estimated_delivery_time_min: number;
  status: 'open' | 'closed' | 'temporarily_paused' | 'on_vacation' | 'pending_approval';
  is_featured?: boolean;
  is_verified?: boolean;
}

interface ProviderCardProps {
  provider: Provider;
  variant?: 'default' | 'compact' | 'horizontal';
  showDistance?: boolean;
  distance?: number;
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
  showPopularItem?: string;
}

export function ProviderCard({
  provider,
  variant = 'default',
  showDistance = false,
  distance,
  isFavorite = false,
  onFavoriteToggle,
  showPopularItem,
}: ProviderCardProps) {
  const locale = useLocale();
  const t = useTranslations('providers');
  const [favorite, setFavorite] = useState(isFavorite);

  const name = locale === 'ar' ? provider.name_ar : provider.name_en;
  const isOpen = provider.status === 'open';
  const isClosed = provider.status === 'closed';

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorite(!favorite);
    onFavoriteToggle?.();
  };

  // Calculate discount if exists (placeholder for now)
  const hasDiscount = false;
  const discountPercentage = 0;

  if (variant === 'compact') {
    return (
      <Link href={`/${locale}/providers/${provider.id}`} className="block group">
        <div className="card-elegant overflow-hidden">
          {/* Square aspect ratio for logo display */}
          <div className="relative aspect-square bg-slate-50 img-zoom-container flex items-center justify-center p-4">
            {provider.logo_url ? (
              <Image
                src={provider.logo_url}
                alt={name}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                className="object-contain img-zoom p-3"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl">
                <span className="text-4xl">🏪</span>
              </div>
            )}
            {/* Featured Badge */}
            {provider.is_featured && (
              <div className="absolute top-2 start-2 bg-amber-400/95 backdrop-blur-md text-amber-900 px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm">
                <Crown className="w-3 h-3" />
              </div>
            )}
            {/* Closed Overlay */}
            {isClosed && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                <span className="text-white font-medium px-3 py-1 bg-red-500 rounded-full text-sm shadow-lg">
                  {t('closed')}
                </span>
              </div>
            )}
          </div>
          <div className="p-3.5">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-sm truncate text-slate-800 group-hover:text-primary transition-colors">
                {name}
              </h3>
              {/* Verified Badge */}
              {provider.is_verified && (
                <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
              <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="font-medium text-amber-700">{provider.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/${locale}/providers/${provider.id}`} className="block group">
      <div className="card-product">
        {/* Logo Image - Square aspect ratio */}
        <div className="relative aspect-square bg-slate-50 img-zoom-container flex items-center justify-center">
          {provider.logo_url ? (
            <Image
              src={provider.logo_url}
              alt={name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-contain img-zoom p-4"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
              <span className="text-5xl">🏪</span>
            </div>
          )}

          {/* Featured Badge */}
          {provider.is_featured && (
            <div className="absolute top-3 start-3 bg-amber-400/95 backdrop-blur-md text-amber-900 px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm">
              <Crown className="w-3.5 h-3.5" />
              <span>{locale === 'ar' ? 'مميز' : 'Featured'}</span>
            </div>
          )}

          {/* Discount Badge */}
          {hasDiscount && !provider.is_featured && (
            <div className="absolute top-3 start-3 badge-discount-elegant">
              -{discountPercentage}%
            </div>
          )}

          {/* Favorite Button - min 44x44px for touch targets (WCAG) */}
          {onFavoriteToggle && (
            <button
              onClick={handleFavoriteClick}
              aria-label={
                favorite
                  ? locale === 'ar'
                    ? 'إزالة من المفضلة'
                    : 'Remove from favorites'
                  : locale === 'ar'
                    ? 'إضافة للمفضلة'
                    : 'Add to favorites'
              }
              aria-pressed={favorite}
              className="absolute top-2 end-2 w-11 h-11 bg-white/95 backdrop-blur-md rounded-xl flex items-center justify-center shadow-elegant hover:bg-white hover:shadow-elegant-lg transition-all duration-200 active:scale-95"
            >
              <Heart
                className={`w-5 h-5 transition-colors duration-200 ${
                  favorite ? 'fill-red-500 text-red-500' : 'text-slate-400'
                }`}
              />
            </button>
          )}

          {/* Status Badge - Elegant glassmorphism */}
          <div
            className={`absolute bottom-3 start-3 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md shadow-sm ${
              isOpen ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'
            }`}
          >
            {isOpen ? t('open') : t('closed')}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Name & Verified Badge */}
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg text-slate-900 group-hover:text-primary transition-colors">
              {name}
            </h3>
            {/* Verified Badge */}
            {provider.is_verified && (
              <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-lg text-xs font-medium">
                <BadgeCheck className="w-3.5 h-3.5" />
                <span>{locale === 'ar' ? 'موثّق' : 'Verified'}</span>
              </div>
            )}
          </div>

          {/* Rating - Elegant pill */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-lg">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-sm text-amber-700">{provider.rating.toFixed(1)}</span>
            </div>
            <span className="text-sm text-slate-500">
              ({provider.total_reviews} {t('reviews')})
            </span>
          </div>

          {/* Details - Elegant pills */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg text-sm text-slate-600">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium">
                {provider.estimated_delivery_time_min} {locale === 'ar' ? 'د' : 'min'}
              </span>
            </div>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm ${
                provider.delivery_fee === 0
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-50 text-slate-600'
              }`}
            >
              <Truck
                className={`w-3.5 h-3.5 ${provider.delivery_fee === 0 ? 'text-emerald-500' : 'text-primary'}`}
              />
              <span className="font-medium">
                {provider.delivery_fee === 0
                  ? locale === 'ar'
                    ? 'مجاني'
                    : 'Free'
                  : `${provider.delivery_fee} ${locale === 'ar' ? 'ج.م' : 'EGP'}`}
              </span>
            </div>
            {showDistance && distance && (
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg text-sm text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium">
                  {distance.toFixed(1)} {locale === 'ar' ? 'كم' : 'km'}
                </span>
              </div>
            )}
          </div>

          {/* Popular Item */}
          {showPopularItem && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-600 flex items-center gap-2">
              <span className="text-amber-500">🔥</span>
              <span className="font-medium">{showPopularItem}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

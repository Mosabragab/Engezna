'use client'

import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { Star, Clock, Truck, MapPin, Heart } from 'lucide-react'
import { useState } from 'react'

interface Provider {
  id: string
  name_ar: string
  name_en: string
  description_ar: string | null
  description_en: string | null
  category: string
  logo_url: string | null
  cover_image_url: string | null
  rating: number
  total_reviews: number
  delivery_fee: number
  min_order_amount: number
  estimated_delivery_time_min: number
  status: 'open' | 'closed' | 'temporarily_paused' | 'on_vacation' | 'pending_approval'
}

interface ProviderCardProps {
  provider: Provider
  variant?: 'default' | 'compact' | 'horizontal'
  showDistance?: boolean
  distance?: number
  isFavorite?: boolean
  onFavoriteToggle?: () => void
  showPopularItem?: string
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
  const locale = useLocale()
  const t = useTranslations('providers')
  const [favorite, setFavorite] = useState(isFavorite)

  const name = locale === 'ar' ? provider.name_ar : provider.name_en
  const isOpen = provider.status === 'open'
  const isClosed = provider.status === 'closed'

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setFavorite(!favorite)
    onFavoriteToggle?.()
  }

  // Calculate discount if exists (placeholder for now)
  const hasDiscount = false
  const discountPercentage = 0

  if (variant === 'compact') {
    return (
      <Link href={`/${locale}/providers/${provider.id}`} className="block">
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
          <div className="relative aspect-[4/3] bg-slate-100">
            {provider.cover_image_url ? (
              <img
                src={provider.cover_image_url}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/5">
                <span className="text-4xl">🏪</span>
              </div>
            )}
            {/* Closed Overlay */}
            {isClosed && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-medium px-3 py-1 bg-red-500 rounded-full text-sm">
                  {t('closed')}
                </span>
              </div>
            )}
          </div>
          <div className="p-3">
            <h3 className="font-semibold text-sm truncate">{name}</h3>
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span>{provider.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link href={`/${locale}/providers/${provider.id}`} className="block group">
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg transition-all duration-300">
        {/* Cover Image */}
        <div className="relative aspect-[16/9] bg-slate-100">
          {provider.cover_image_url ? (
            <img
              src={provider.cover_image_url}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
              <span className="text-6xl">🏪</span>
            </div>
          )}

          {/* Discount Badge */}
          {hasDiscount && (
            <div className="absolute top-3 start-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
              -{discountPercentage}%
            </div>
          )}

          {/* Favorite Button */}
          {onFavoriteToggle && (
            <button
              onClick={handleFavoriteClick}
              className="absolute top-3 end-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  favorite ? 'fill-red-500 text-red-500' : 'text-slate-400'
                }`}
              />
            </button>
          )}

          {/* Status Badge */}
          <div className={`absolute bottom-3 start-3 px-2 py-1 rounded-full text-xs font-medium ${
            isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {isOpen ? t('open') : t('closed')}
          </div>

          {/* Logo */}
          {provider.logo_url && (
            <div className="absolute bottom-3 end-3 w-12 h-12 bg-white rounded-full border-2 border-white shadow-lg overflow-hidden">
              <img
                src={provider.logo_url}
                alt={name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Name & Category */}
          <h3 className="font-bold text-lg text-slate-900 group-hover:text-primary transition-colors">
            {name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-sm">{provider.rating.toFixed(1)}</span>
            </div>
            <span className="text-sm text-slate-400">
              ({provider.total_reviews} {t('reviews')})
            </span>
          </div>

          {/* Details */}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-slate-500">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{provider.estimated_delivery_time_min} {locale === 'ar' ? 'د' : 'min'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Truck className="w-4 h-4" />
              <span>
                {provider.delivery_fee === 0
                  ? (locale === 'ar' ? 'مجاني' : 'Free')
                  : `${provider.delivery_fee} ${locale === 'ar' ? 'ج.م' : 'EGP'}`
                }
              </span>
            </div>
            {showDistance && distance && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{distance.toFixed(1)} {locale === 'ar' ? 'كم' : 'km'}</span>
              </div>
            )}
          </div>

          {/* Popular Item */}
          {showPopularItem && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-600">
              <span className="text-amber-500">🔥</span> {showPopularItem}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

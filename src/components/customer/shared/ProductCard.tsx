'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Plus, Minus, Flame, Leaf } from 'lucide-react'

interface MenuItem {
  id: string
  name_ar: string
  name_en: string
  description_ar: string | null
  description_en: string | null
  price: number
  original_price?: number | null
  image_url: string | null
  is_available: boolean
  is_vegetarian: boolean
  is_spicy: boolean
  preparation_time_min: number
}

interface ProductCardProps {
  product: MenuItem
  quantity?: number
  onQuantityChange?: (quantity: number) => void
  onCustomize?: () => void
  variant?: 'default' | 'compact' | 'horizontal'
  showAddButton?: boolean
  className?: string
}

export function ProductCard({
  product,
  quantity = 0,
  onQuantityChange,
  onCustomize,
  variant = 'default',
  showAddButton = true,
  className = '',
}: ProductCardProps) {
  const locale = useLocale()
  const t = useTranslations('providerDetail')

  const name = locale === 'ar' ? product.name_ar : product.name_en
  const description = locale === 'ar' ? product.description_ar : product.description_en
  const currency = locale === 'ar' ? 'ج.م' : 'EGP'

  const hasDiscount = product.original_price && product.original_price > product.price
  const discountPercentage = hasDiscount
    ? Math.round(((product.original_price! - product.price) / product.original_price!) * 100)
    : 0

  const handleIncrease = () => {
    if (onQuantityChange) {
      onQuantityChange(quantity + 1)
    }
  }

  const handleDecrease = () => {
    if (onQuantityChange && quantity > 0) {
      onQuantityChange(quantity - 1)
    }
  }

  if (variant === 'compact') {
    return (
      <div className={`bg-white rounded-xl border border-slate-100 p-3 ${!product.is_available ? 'opacity-60' : ''} ${className}`}>
        <div className="flex gap-3">
          {/* Image */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-slate-900 text-sm truncate">{name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-primary font-bold text-sm">{product.price} {currency}</span>
              {hasDiscount && (
                <span className="text-slate-400 line-through text-xs">{product.original_price} {currency}</span>
              )}
            </div>
          </div>

          {/* Add Button */}
          {showAddButton && product.is_available && (
            <button
              onClick={handleIncrease}
              className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    )
  }

  if (variant === 'horizontal') {
    return (
      <div className={`bg-white rounded-xl border border-slate-100 p-4 ${!product.is_available ? 'opacity-60' : ''} ${className}`}>
        <div className="flex gap-4">
          {/* Image */}
          <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
            )}
            {hasDiscount && (
              <div className="absolute top-1 start-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                -{discountPercentage}%
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col">
            <h4 className="font-semibold text-slate-900">{name}</h4>
            {description && (
              <p className="text-sm text-slate-500 line-clamp-2 mt-1">{description}</p>
            )}

            {/* Tags */}
            <div className="flex items-center gap-2 mt-2">
              {product.is_spicy && (
                <span className="inline-flex items-center gap-1 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                  <Flame className="w-3 h-3" />
                  {locale === 'ar' ? 'حار' : 'Spicy'}
                </span>
              )}
              {product.is_vegetarian && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  <Leaf className="w-3 h-3" />
                  {locale === 'ar' ? 'نباتي' : 'Veg'}
                </span>
              )}
            </div>

            {/* Price & Quantity */}
            <div className="flex items-center justify-between mt-auto pt-2">
              <div className="flex items-center gap-2">
                <span className="text-primary font-bold">{product.price} {currency}</span>
                {hasDiscount && (
                  <span className="text-slate-400 line-through text-sm">{product.original_price} {currency}</span>
                )}
              </div>

              {showAddButton && product.is_available && (
                <div className="flex items-center gap-2">
                  {quantity > 0 ? (
                    <>
                      <button
                        onClick={handleDecrease}
                        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:border-primary hover:text-primary transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-6 text-center font-semibold">{quantity}</span>
                    </>
                  ) : null}
                  <button
                    onClick={handleIncrease}
                    className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {!product.is_available && (
          <div className="text-center text-sm text-red-500 mt-2">
            {locale === 'ar' ? 'غير متاح حالياً' : 'Currently unavailable'}
          </div>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <div className={`bg-white rounded-xl border border-slate-100 overflow-hidden ${!product.is_available ? 'opacity-60' : ''} ${className}`}>
      {/* Image */}
      <div className="relative aspect-square bg-slate-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🍽️</div>
        )}
        {hasDiscount && (
          <div className="absolute top-2 start-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
            -{discountPercentage}%
          </div>
        )}
        {!product.is_available && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-red-500 text-white text-sm font-medium px-3 py-1 rounded-full">
              {locale === 'ar' ? 'غير متاح' : 'Unavailable'}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h4 className="font-semibold text-slate-900 line-clamp-1">{name}</h4>
        {description && (
          <p className="text-sm text-slate-500 line-clamp-2 mt-1">{description}</p>
        )}

        {/* Tags */}
        {(product.is_spicy || product.is_vegetarian) && (
          <div className="flex items-center gap-2 mt-2">
            {product.is_spicy && (
              <span className="inline-flex items-center gap-1 text-xs text-red-500">
                <Flame className="w-3 h-3" />
              </span>
            )}
            {product.is_vegetarian && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                <Leaf className="w-3 h-3" />
              </span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-primary font-bold text-lg">{product.price} {currency}</span>
          {hasDiscount && (
            <span className="text-slate-400 line-through text-sm">{product.original_price} {currency}</span>
          )}
        </div>

        {/* Quantity Controls */}
        {showAddButton && product.is_available && (
          <div className="flex items-center justify-center gap-3 mt-4">
            {quantity > 0 ? (
              <>
                <button
                  onClick={handleDecrease}
                  className="w-10 h-10 rounded-full border-2 border-primary text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="w-8 text-center font-bold text-lg">{quantity}</span>
                <button
                  onClick={handleIncrease}
                  className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={handleIncrease}
                className="w-full h-10 rounded-full bg-primary text-white font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-5 h-5" />
                {t('addToCart')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

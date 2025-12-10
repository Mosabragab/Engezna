'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Plus, Minus, Flame, Leaf, ChevronDown, Tag, Gift } from 'lucide-react'
import type { PricingType } from '@/types/menu-import'

interface ProductVariant {
  id: string
  variant_type: 'size' | 'weight' | 'option'
  name_ar: string
  name_en: string | null
  price: number
  original_price: number | null
  is_default: boolean
  display_order: number
  is_available: boolean
}

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
  // Variant support
  has_variants?: boolean
  pricing_type?: PricingType
  variants?: ProductVariant[]
}

interface PromotionInfo {
  type: 'percentage' | 'fixed' | 'buy_x_get_y'
  discount_value: number
  name_ar?: string
  name_en?: string
}

interface ProductCardProps {
  product: MenuItem
  quantity?: number
  onQuantityChange?: (quantity: number) => void
  onCustomize?: () => void
  onSelectVariant?: () => void
  variant?: 'default' | 'compact' | 'horizontal'
  showAddButton?: boolean
  className?: string
  promotion?: PromotionInfo | null
}

export function ProductCard({
  product,
  quantity = 0,
  onQuantityChange,
  onCustomize,
  onSelectVariant,
  variant = 'default',
  showAddButton = true,
  className = '',
  promotion = null,
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

  // Check if product has variants
  const hasVariants = product.has_variants && product.variants && product.variants.length > 0

  // Get price range for products with variants
  const getPriceDisplay = () => {
    if (hasVariants && product.variants) {
      const prices = product.variants.map(v => v.price).sort((a, b) => a - b)
      const minPrice = prices[0]
      const maxPrice = prices[prices.length - 1]
      if (minPrice === maxPrice) {
        return { price: minPrice, hasRange: false }
      }
      return { minPrice, maxPrice, hasRange: true }
    }
    return { price: product.price, hasRange: false }
  }

  const priceDisplay = getPriceDisplay()

  const handleIncrease = (e: React.MouseEvent) => {
    e.stopPropagation()
    // If product has variants, open variant selection
    if (hasVariants && onSelectVariant) {
      onSelectVariant()
      return
    }
    if (onQuantityChange) {
      onQuantityChange(quantity + 1)
    }
  }

  const handleDecrease = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onQuantityChange && quantity > 0) {
      onQuantityChange(quantity - 1)
    }
  }

  // Get variant type label
  const getVariantLabel = () => {
    if (!hasVariants || !product.variants) return null
    const variantType = product.variants[0]?.variant_type
    const count = product.variants.length
    if (variantType === 'size') {
      return locale === 'ar' ? `${count} أحجام` : `${count} sizes`
    }
    if (variantType === 'weight') {
      return locale === 'ar' ? `${count} أوزان` : `${count} weights`
    }
    return locale === 'ar' ? `${count} خيارات` : `${count} options`
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
      <div className={`bg-white rounded-xl border border-slate-100 p-4 ${!product.is_available ? 'opacity-60' : ''} ${promotion ? 'ring-2 ring-primary/30' : ''} ${className}`}>
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
            {/* Promotion Badge - Shows first if there's a promotion */}
            {promotion ? (
              <div className="absolute top-1 start-1 bg-gradient-to-r from-primary to-primary/80 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 shadow-sm">
                {promotion.type === 'percentage' ? (
                  <>
                    <span>{locale === 'ar' ? 'خصم' : 'Off'}</span>
                    <span>{promotion.discount_value}%</span>
                  </>
                ) : promotion.type === 'fixed' ? (
                  <>
                    <Tag className="w-3 h-3" />
                    <span>{promotion.discount_value}</span>
                  </>
                ) : (
                  <>
                    <Gift className="w-3 h-3" />
                    <span>{locale === 'ar' ? 'عرض' : 'Offer'}</span>
                  </>
                )}
              </div>
            ) : hasDiscount && (
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

            {/* Variant Info */}
            {hasVariants && (
              <div className="flex items-center gap-1 mt-1">
                <ChevronDown className="w-3 h-3 text-primary" />
                <span className="text-xs text-primary font-medium">{getVariantLabel()}</span>
              </div>
            )}

            {/* Price & Quantity */}
            <div className="flex items-center justify-between mt-auto pt-2">
              <div className="flex items-center gap-2">
                {priceDisplay.hasRange ? (
                  <span className="text-primary font-bold">
                    {priceDisplay.minPrice} - {priceDisplay.maxPrice} {currency}
                  </span>
                ) : (
                  <>
                    <span className="text-primary font-bold">{priceDisplay.price || product.price} {currency}</span>
                    {hasDiscount && (
                      <span className="text-slate-400 line-through text-sm">{product.original_price} {currency}</span>
                    )}
                  </>
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
    <div className={`bg-white rounded-xl border border-slate-100 overflow-hidden ${!product.is_available ? 'opacity-60' : ''} ${promotion ? 'ring-2 ring-primary/30' : ''} ${className}`}>
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
        {/* Promotion Badge */}
        {promotion ? (
          <div className="absolute top-2 start-2 bg-gradient-to-r from-primary to-primary/80 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md">
            {promotion.type === 'percentage' ? (
              <>
                <span>{locale === 'ar' ? 'خصم' : 'Off'}</span>
                <span>{promotion.discount_value}%</span>
              </>
            ) : promotion.type === 'fixed' ? (
              <>
                <Tag className="w-3.5 h-3.5" />
                <span>{promotion.discount_value} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
              </>
            ) : (
              <>
                <Gift className="w-3.5 h-3.5" />
                <span>{locale === 'ar' ? 'عرض' : 'Offer'}</span>
              </>
            )}
          </div>
        ) : hasDiscount && (
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

        {/* Variant Info */}
        {hasVariants && (
          <div className="flex items-center gap-1 mt-2">
            <ChevronDown className="w-3 h-3 text-primary" />
            <span className="text-xs text-primary font-medium">{getVariantLabel()}</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2 mt-3">
          {priceDisplay.hasRange ? (
            <span className="text-primary font-bold text-lg">
              {priceDisplay.minPrice} - {priceDisplay.maxPrice} {currency}
            </span>
          ) : (
            <>
              <span className="text-primary font-bold text-lg">{priceDisplay.price || product.price} {currency}</span>
              {hasDiscount && (
                <span className="text-slate-400 line-through text-sm">{product.original_price} {currency}</span>
              )}
            </>
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

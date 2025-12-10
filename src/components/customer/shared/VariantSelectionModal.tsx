'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { X, Plus, Minus, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  provider_id: string
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
  category_id?: string | null
  has_variants?: boolean
  pricing_type?: 'fixed' | 'per_unit' | 'variants'
  variants?: ProductVariant[]
}

interface VariantSelectionModalProps {
  product: MenuItem
  isOpen: boolean
  onClose: () => void
  onAddToCart: (product: MenuItem, variant: ProductVariant, quantity: number) => void
}

export function VariantSelectionModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
}: VariantSelectionModalProps) {
  const locale = useLocale()
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants?.find(v => v.is_default) || product.variants?.[0] || null
  )
  const [quantity, setQuantity] = useState(1)

  if (!isOpen) return null

  const currency = locale === 'ar' ? 'ج.م' : 'EGP'
  const name = locale === 'ar' ? product.name_ar : product.name_en
  const description = locale === 'ar' ? product.description_ar : product.description_en

  const getVariantName = (variant: ProductVariant) => {
    return locale === 'ar' ? variant.name_ar : (variant.name_en || variant.name_ar)
  }

  const getVariantTypeLabel = () => {
    const variantType = product.variants?.[0]?.variant_type
    if (variantType === 'size') {
      return locale === 'ar' ? 'اختر الحجم' : 'Select Size'
    }
    if (variantType === 'weight') {
      return locale === 'ar' ? 'اختر الوزن' : 'Select Weight'
    }
    return locale === 'ar' ? 'اختر الخيار' : 'Select Option'
  }

  const handleAddToCart = () => {
    if (selectedVariant) {
      onAddToCart(product, selectedVariant, quantity)
      onClose()
    }
  }

  const totalPrice = selectedVariant ? selectedVariant.price * quantity : 0

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-auto relative" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-900">{name}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Image */}
        {product.image_url && (
          <div className="w-full h-48 bg-slate-100">
            <img
              src={product.image_url}
              alt={name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Description */}
          {description && (
            <p className="text-sm text-slate-500">{description}</p>
          )}

          {/* Variant Selection */}
          <div>
            <h4 className="font-medium text-slate-900 mb-3">{getVariantTypeLabel()}</h4>
            <div className="space-y-2">
              {product.variants?.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    selectedVariant?.id === variant.id
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedVariant?.id === variant.id
                        ? 'border-primary bg-primary'
                        : 'border-slate-300'
                    }`}>
                      {selectedVariant?.id === variant.id && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className={`font-medium ${
                      selectedVariant?.id === variant.id ? 'text-primary' : 'text-slate-700'
                    }`}>
                      {getVariantName(variant)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {variant.original_price && variant.original_price > variant.price && (
                      <span className="text-slate-400 line-through text-sm">
                        {variant.original_price} {currency}
                      </span>
                    )}
                    <span className={`font-bold ${
                      selectedVariant?.id === variant.id ? 'text-primary' : 'text-slate-900'
                    }`}>
                      {variant.price} {currency}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <h4 className="font-medium text-slate-900 mb-3">
              {locale === 'ar' ? 'الكمية' : 'Quantity'}
            </h4>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-500 hover:border-primary hover:text-primary transition-colors"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-xl font-bold text-slate-900 w-8 text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer - Extra padding for mobile */}
        <div className="bg-white border-t border-slate-100 p-4 pb-6">
          <Button
            onClick={handleAddToCart}
            disabled={!selectedVariant}
            className="w-full h-12 text-base font-medium"
          >
            <span>{locale === 'ar' ? 'أضف للسلة' : 'Add to Cart'}</span>
            <span className="mx-2">-</span>
            <span>{totalPrice} {currency}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

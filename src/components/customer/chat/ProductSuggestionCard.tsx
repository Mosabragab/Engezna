/**
 * ProductSuggestionCard - Mini product card for chat suggestions
 */

'use client';

import { memo } from 'react';
import Image from 'next/image';
import { Plus, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ChatProduct } from '@/types/chat';

interface ProductSuggestionCardProps {
  product: ChatProduct;
  onAddToCart?: () => void;
  className?: string;
}

export const ProductSuggestionCard = memo(function ProductSuggestionCard({
  product,
  onAddToCart,
  className,
}: ProductSuggestionCardProps) {
  const hasDiscount = product.original_price && product.original_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - product.price / product.original_price!) * 100)
    : 0;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 bg-white rounded-xl border border-gray-100 shadow-sm',
        'hover:border-primary/30 transition-colors',
        className
      )}
    >
      {/* Product Image */}
      <div className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name_ar}
            fill
            className="object-cover"
            sizes="56px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
        )}

        {/* Discount badge */}
        {hasDiscount && (
          <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-bl-lg">
            -{discountPercent}%
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-gray-900 truncate">{product.name_ar}</h4>
        <p className="text-xs text-gray-500 truncate">
          {product.provider_name_ar}
          {product.rating && (
            <span className="inline-flex items-center mr-2">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 ml-0.5" />
              {product.rating.toFixed(1)}
            </span>
          )}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-bold text-sm text-primary">{product.price} ج.م</span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">{product.original_price} ج.م</span>
          )}
        </div>
      </div>

      {/* Add Button */}
      <Button
        size="icon"
        variant="outline"
        className="flex-shrink-0 w-8 h-8 rounded-full border-primary text-primary hover:bg-primary hover:text-white"
        onClick={(e) => {
          e.stopPropagation();
          onAddToCart?.();
        }}
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
});

export default ProductSuggestionCard;

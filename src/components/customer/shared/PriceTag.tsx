'use client';

import { useLocale } from 'next-intl';

interface PriceTagProps {
  price: number;
  originalPrice?: number | null;
  size?: 'sm' | 'md' | 'lg';
  showCurrency?: boolean;
  className?: string;
}

export function PriceTag({
  price,
  originalPrice,
  size = 'md',
  showCurrency = true,
  className = '',
}: PriceTagProps) {
  const locale = useLocale();
  const currency = locale === 'ar' ? 'ج.م' : 'EGP';

  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercentage = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const sizeClasses = {
    sm: {
      price: 'text-sm font-semibold',
      original: 'text-xs',
      discount: 'text-[10px] px-1 py-0.5',
    },
    md: {
      price: 'text-base font-bold',
      original: 'text-sm',
      discount: 'text-xs px-1.5 py-0.5',
    },
    lg: {
      price: 'text-xl font-bold',
      original: 'text-base',
      discount: 'text-sm px-2 py-1',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className={`flex items-center flex-wrap gap-2 ${className}`}>
      {/* Current Price */}
      <span className={`text-primary ${classes.price}`}>
        {price.toFixed(2)} {showCurrency && currency}
      </span>

      {/* Original Price (if discounted) */}
      {hasDiscount && (
        <span className={`text-slate-400 line-through ${classes.original}`}>
          {originalPrice.toFixed(2)} {showCurrency && currency}
        </span>
      )}

      {/* Discount Badge */}
      {hasDiscount && (
        <span className={`bg-red-100 text-red-600 font-medium rounded ${classes.discount}`}>
          -{discountPercentage}%
        </span>
      )}
    </div>
  );
}

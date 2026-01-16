'use client';

import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  showValue?: boolean;
  showCount?: boolean;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RatingStars({
  rating,
  maxRating = 5,
  showValue = true,
  showCount = false,
  count = 0,
  size = 'md',
  className = '',
}: RatingStarsProps) {
  const sizeClasses = {
    sm: { star: 'w-3 h-3', text: 'text-xs', gap: 'gap-0.5' },
    md: { star: 'w-4 h-4', text: 'text-sm', gap: 'gap-1' },
    lg: { star: 'w-5 h-5', text: 'text-base', gap: 'gap-1.5' },
  };

  const classes = sizeClasses[size];

  // Round rating to nearest 0.5
  const roundedRating = Math.round(rating * 2) / 2;

  return (
    <div className={`flex items-center ${classes.gap} ${className}`}>
      {/* Stars */}
      <div className={`flex items-center ${classes.gap}`}>
        {Array.from({ length: maxRating }).map((_, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= roundedRating;
          const isHalf = !isFilled && starValue - 0.5 <= roundedRating;

          return (
            <div key={index} className="relative">
              {/* Background star (gray) */}
              <Star className={`${classes.star} text-slate-200 fill-slate-200`} />

              {/* Foreground star (yellow) */}
              {(isFilled || isHalf) && (
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: isHalf ? '50%' : '100%' }}
                >
                  <Star className={`${classes.star} text-yellow-400 fill-yellow-400`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Rating value */}
      {showValue && (
        <span className={`font-semibold text-slate-900 ${classes.text}`}>{rating.toFixed(1)}</span>
      )}

      {/* Review count */}
      {showCount && count > 0 && (
        <span className={`text-slate-400 ${classes.text}`}>({count})</span>
      )}
    </div>
  );
}

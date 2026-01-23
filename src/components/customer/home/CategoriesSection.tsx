'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  key: string;
  nameAr: string;
  nameEn: string;
  emoji: string;
  gradient: string;
}

// Active categories - 4 categories currently available
// Updated December 2024 - New design with emoji and gradient backgrounds
// Keys must match database category values: restaurant_cafe, coffee_patisserie, grocery, vegetables_fruits
const categories: Category[] = [
  {
    id: '1',
    key: 'restaurant_cafe',
    nameAr: 'مطاعم',
    nameEn: 'Restaurants',
    emoji: '🍔',
    gradient: 'linear-gradient(145deg, rgba(254,243,199,0.85) 0%, rgba(254,249,195,0.7) 100%)',
  },
  {
    id: '2',
    key: 'coffee_patisserie',
    nameAr: 'البن والحلويات',
    nameEn: 'Coffee & Sweets',
    emoji: '☕',
    gradient: 'linear-gradient(145deg, rgba(245,235,220,0.9) 0%, rgba(237,224,205,0.75) 100%)',
  },
  {
    id: '3',
    key: 'grocery',
    nameAr: 'سوبر ماركت',
    nameEn: 'Supermarket',
    emoji: '🛒',
    gradient: 'linear-gradient(145deg, rgba(224,244,255,0.9) 0%, rgba(186,230,253,0.75) 100%)',
  },
  {
    id: '4',
    key: 'vegetables_fruits',
    nameAr: 'خضروات وفواكه',
    nameEn: 'Vegetables & Fruits',
    emoji: '🍌',
    gradient: 'linear-gradient(145deg, rgba(209,250,229,0.85) 0%, rgba(167,243,208,0.7) 100%)',
  },
  {
    id: '5',
    key: 'pharmacy',
    nameAr: 'صيدليات',
    nameEn: 'Pharmacies',
    emoji: '💊',
    gradient: 'linear-gradient(145deg, rgba(252,231,243,0.9) 0%, rgba(249,168,212,0.7) 100%)',
  },
];

interface CategoriesSectionProps {
  selectedCategory?: string;
  onCategoryClick?: (categoryKey: string) => void;
  showViewAll?: boolean;
  onViewAll?: () => void;
  className?: string;
}

export function CategoriesSection({
  selectedCategory,
  onCategoryClick,
  showViewAll = true,
  onViewAll,
  className = '',
}: CategoriesSectionProps) {
  const locale = useLocale();

  const sectionTitle = locale === 'ar' ? 'الأقسام' : 'Categories';

  return (
    <section className={cn('py-6 px-4 bg-white', className)}>
      {/* Section Header - Elegant */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-bold text-slate-900">{sectionTitle}</h2>
        {showViewAll && (
          <button
            onClick={onViewAll}
            aria-label={locale === 'ar' ? 'عرض جميع الأقسام' : 'View all categories'}
            className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 min-h-[44px] min-w-[44px] justify-center"
          >
            {locale === 'ar' ? 'عرض الكل' : 'View All'}
          </button>
        )}
      </div>

      {/* Categories Grid - Elegant Design with Hover Effects */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3 items-start">
        {categories.map((category, index) => {
          const isSelected = selectedCategory === category.key;

          const cardContent = (
            <div className="flex flex-col items-center">
              {/* Card - Elegant floating design */}
              <div
                className={cn(
                  'w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] md:w-[84px] md:h-[84px] lg:w-[100px] lg:h-[100px]',
                  'rounded-2xl md:rounded-3xl flex items-center justify-center',
                  'transition-transform duration-300 cursor-pointer relative will-change-transform',
                  'hover:scale-105',
                  'active:scale-95',
                  isSelected && 'scale-105 ring-2 ring-primary'
                )}
                style={{
                  background: category.gradient,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)',
                }}
              >
                {/* Subtle inner glow */}
                <div className="absolute inset-0 rounded-2xl md:rounded-3xl bg-gradient-to-br from-white/30 to-transparent pointer-events-none" />
                <span
                  className="text-[26px] sm:text-[30px] md:text-[36px] lg:text-[44px] leading-none select-none relative z-10"
                  style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.12))' }}
                >
                  {category.emoji}
                </span>
              </div>

              {/* Label - Elegant typography with fixed height for alignment */}
              <span
                className={cn(
                  'mt-2 text-[10px] sm:text-xs font-semibold text-center leading-tight',
                  'min-h-[28px] sm:min-h-[32px] flex items-start justify-center',
                  isSelected ? 'text-primary' : 'text-slate-700'
                )}
              >
                {locale === 'ar' ? category.nameAr : category.nameEn}
              </span>
            </div>
          );

          const categoryName = locale === 'ar' ? category.nameAr : category.nameEn;

          if (onCategoryClick) {
            return (
              <button
                key={category.id}
                onClick={() => onCategoryClick(category.key)}
                aria-label={
                  locale === 'ar' ? `اختيار قسم ${categoryName}` : `Select ${categoryName} category`
                }
                aria-pressed={isSelected}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-2xl min-h-[44px]"
              >
                {cardContent}
              </button>
            );
          }

          return (
            <Link
              key={category.id}
              href={`/${locale}/providers?category=${category.key}`}
              aria-label={locale === 'ar' ? `تصفح ${categoryName}` : `Browse ${categoryName}`}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-2xl"
            >
              {cardContent}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export { categories };
export type { Category };

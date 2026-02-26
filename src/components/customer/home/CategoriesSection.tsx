'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { type BusinessCategory, getCategoryGradient } from '@/lib/supabase/business-categories';
import { getCachedBusinessCategories } from '@/lib/cache/cached-queries';

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
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch categories from cache layer (eliminates hundreds of thousands of direct DB queries)
  useEffect(() => {
    async function fetchCategories() {
      try {
        const data = await getCachedBusinessCategories();
        if (data && data.length > 0) {
          setCategories(data as unknown as BusinessCategory[]);
        }
      } catch {
        // Silent fallback — categories will show empty
      }
      setLoading(false);
    }
    fetchCategories();
  }, []);

  const sectionTitle = locale === 'ar' ? 'الأقسام' : 'Categories';

  // Show skeleton while loading
  if (loading) {
    return (
      <section className={cn('py-6 px-4 bg-white', className)}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-slate-900">{sectionTitle}</h2>
        </div>
        <div className="grid grid-cols-5 gap-2 sm:gap-3 items-start">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center animate-pulse">
              <div className="w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] md:w-[84px] md:h-[84px] lg:w-[100px] lg:h-[100px] rounded-2xl md:rounded-3xl bg-slate-200" />
              <div className="mt-2 h-4 w-16 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={cn('py-6 px-4 bg-white', className)}>
      {/* Section Header - Elegant */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-bold text-slate-900">{sectionTitle}</h2>
        {showViewAll && (
          <button
            onClick={onViewAll}
            aria-label={locale === 'ar' ? 'عرض جميع الأقسام' : 'View all categories'}
            className="text-sm font-semibold text-primary-dark hover:text-primary transition-colors flex items-center gap-1 min-h-[44px] min-w-[44px] justify-center"
          >
            {locale === 'ar' ? 'عرض الكل' : 'View All'}
          </button>
        )}
      </div>

      {/* Categories Grid - Elegant Design with Hover Effects */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3 items-start">
        {categories.map((category) => {
          const isSelected = selectedCategory === category.code;
          const gradient = getCategoryGradient(category.code);
          const categoryName = locale === 'ar' ? category.name_ar : category.name_en;

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
                  background: gradient,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)',
                }}
              >
                {/* Subtle inner glow */}
                <div className="absolute inset-0 rounded-2xl md:rounded-3xl bg-gradient-to-br from-white/30 to-transparent pointer-events-none" />
                <span
                  className="text-[26px] sm:text-[30px] md:text-[36px] lg:text-[44px] leading-none select-none relative z-10"
                  style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.12))' }}
                >
                  {category.icon || '📦'}
                </span>
              </div>

              {/* Label - Elegant typography with fixed height for alignment */}
              <span
                className={cn(
                  'mt-2 text-[10px] sm:text-xs font-semibold text-center leading-tight',
                  'min-h-[28px] sm:min-h-[32px] flex items-start justify-center',
                  isSelected ? 'text-primary-dark' : 'text-slate-700'
                )}
              >
                {categoryName}
              </span>
            </div>
          );

          if (onCategoryClick) {
            return (
              <button
                key={category.id}
                onClick={() => onCategoryClick(category.code)}
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
              href={`/${locale}/providers?category=${category.code}`}
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

// Re-export types for backwards compatibility
export type { BusinessCategory as Category };

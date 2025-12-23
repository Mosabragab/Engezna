'use client'

import { useLocale } from 'next-intl'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Category {
  id: string
  key: string
  nameAr: string
  nameEn: string
  emoji: string
  gradient: string
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
    gradient: 'linear-gradient(145deg, rgba(254,243,199,0.85) 0%, rgba(254,249,195,0.7) 100%)'
  },
  {
    id: '2',
    key: 'coffee_patisserie',
    nameAr: 'البن والحلويات',
    nameEn: 'Coffee & Sweets',
    emoji: '☕',
    gradient: 'linear-gradient(145deg, rgba(245,235,220,0.9) 0%, rgba(237,224,205,0.75) 100%)'
  },
  {
    id: '3',
    key: 'grocery',
    nameAr: 'سوبر ماركت',
    nameEn: 'Supermarket',
    emoji: '🛒',
    gradient: 'linear-gradient(145deg, rgba(224,244,255,0.9) 0%, rgba(186,230,253,0.75) 100%)'
  },
  {
    id: '4',
    key: 'vegetables_fruits',
    nameAr: 'خضروات وفواكه',
    nameEn: 'Vegetables & Fruits',
    emoji: '🍌',
    gradient: 'linear-gradient(145deg, rgba(209,250,229,0.85) 0%, rgba(167,243,208,0.7) 100%)'
  },
]

interface CategoriesSectionProps {
  selectedCategory?: string
  onCategoryClick?: (categoryKey: string) => void
  showViewAll?: boolean
  onViewAll?: () => void
  className?: string
}

export function CategoriesSection({
  selectedCategory,
  onCategoryClick,
  showViewAll = true,
  onViewAll,
  className = '',
}: CategoriesSectionProps) {
  const locale = useLocale()

  const sectionTitle = locale === 'ar' ? 'الأقسام' : 'Categories'

  return (
    <section className={cn('py-5 px-4 bg-slate-50', className)}>
      {/* Section Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-slate-900">{sectionTitle}</h2>
        {showViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm font-medium text-[#009DE0] hover:underline"
          >
            {locale === 'ar' ? 'عرض الكل' : 'View All'}
          </button>
        )}
      </div>

      {/* Categories Grid - Responsive: 4 columns, larger cards */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {categories.map((category) => {
          const isSelected = selectedCategory === category.key

          const cardContent = (
            <div className="flex flex-col items-center">
              {/* Card - Larger responsive sizes */}
              <div
                className={cn(
                  'w-[72px] h-[72px] sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28',
                  'rounded-2xl md:rounded-[20px] flex items-center justify-center',
                  'transition-all duration-300 cursor-pointer',
                  'hover:scale-105 hover:-translate-y-0.5',
                  isSelected && 'scale-105'
                )}
                style={{
                  background: category.gradient,
                  boxShadow: isSelected
                    ? '0 0 0 2.5px #009DE0, 0 8px 25px rgba(0,157,224,0.2)'
                    : '0 2px 8px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
                  }
                }}
              >
                <span
                  className="text-[28px] sm:text-[32px] md:text-[38px] lg:text-[44px] leading-none select-none"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                >
                  {category.emoji}
                </span>
              </div>

              {/* Label - Responsive text */}
              <span className="mt-2 text-[11px] sm:text-xs md:text-sm font-medium text-slate-600 text-center leading-tight line-clamp-2">
                {locale === 'ar' ? category.nameAr : category.nameEn}
              </span>
            </div>
          )

          if (onCategoryClick) {
            return (
              <button
                key={category.id}
                onClick={() => onCategoryClick(category.key)}
                className="focus:outline-none"
              >
                {cardContent}
              </button>
            )
          }

          return (
            <Link
              key={category.id}
              href={`/${locale}/providers?category=${category.key}`}
            >
              {cardContent}
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export { categories }
export type { Category }

'use client'

import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  UtensilsCrossed,
  Coffee,
  ShoppingBasket,
  Apple,
} from 'lucide-react'
import type { ReactNode } from 'react'

interface Category {
  id: string
  name_ar: string
  name_en: string
  icon: ReactNode
  color: string
  bgColor: string
}

// Categories with unified brand colors (primary blue)
const defaultCategories: Category[] = [
  {
    id: 'restaurant',
    name_ar: 'مطاعم',
    name_en: 'Restaurants',
    icon: <UtensilsCrossed className="w-6 h-6" />,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    id: 'cafe',
    name_ar: 'مقاهي',
    name_en: 'Cafes',
    icon: <Coffee className="w-6 h-6" />,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    id: 'supermarket',
    name_ar: 'بقالة',
    name_en: 'Groceries',
    icon: <ShoppingBasket className="w-6 h-6" />,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    id: 'vegetables_fruits',
    name_ar: 'خضار',
    name_en: 'Veggies',
    icon: <Apple className="w-6 h-6" />,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
]

interface CategoriesSectionProps {
  categories?: Category[]
  title?: string
  showViewAll?: boolean
  onViewAll?: () => void
  onCategoryClick?: (categoryId: string) => void
  className?: string
}

export function CategoriesSection({
  categories = defaultCategories,
  title,
  showViewAll = true,
  onViewAll,
  onCategoryClick,
  className = '',
}: CategoriesSectionProps) {
  const locale = useLocale()
  const t = useTranslations('home')

  const sectionTitle = title || (locale === 'ar' ? 'الأقسام' : 'Categories')

  return (
    <section className={`bg-slate-50 px-4 py-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">{sectionTitle}</h2>
        {showViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-primary font-medium"
          >
            {locale === 'ar' ? 'عرض الكل' : 'View All'}
          </button>
        )}
      </div>

      {/* Categories Grid - Horizontal Scroll on Mobile */}
      <div className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
        <div className="flex gap-3 md:grid md:grid-cols-4 lg:grid-cols-8">
          {categories.map((category) => {
            const content = (
              <div className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-slate-100 hover:border-primary/30 hover:shadow-md transition-all">
                <div className={`w-12 h-12 rounded-full ${category.bgColor} ${category.color} flex items-center justify-center`}>
                  {category.icon}
                </div>
                <span className="text-xs font-medium text-slate-700 text-center line-clamp-1">
                  {locale === 'ar' ? category.name_ar : category.name_en}
                </span>
              </div>
            )

            if (onCategoryClick) {
              return (
                <button
                  key={category.id}
                  onClick={() => onCategoryClick(category.id)}
                  className="flex-shrink-0 w-[88px] md:w-auto text-start"
                >
                  {content}
                </button>
              )
            }

            return (
              <Link
                key={category.id}
                href={`/${locale}/providers?category=${category.id}`}
                className="flex-shrink-0 w-[88px] md:w-auto"
              >
                {content}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

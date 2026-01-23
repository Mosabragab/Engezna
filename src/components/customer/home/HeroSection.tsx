'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  onSearch?: (query: string) => void;
  onSearchClick?: () => void;
  className?: string;
}

/**
 * Hero Section for the homepage with search functionality
 * Design: Elegant gradient with floating search bar - "Elegant Simplicity"
 */
export function HeroSection({
  onSearch,
  onSearchClick,
  className = '',
}: HeroSectionProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch?.(searchQuery.trim());
    } else {
      onSearchClick?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <section className={cn('relative overflow-hidden', className)}>
      {/* Elegant Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#E8F7FF] via-[#F0FAFF] to-white" />
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/5 to-transparent" />

      {/* Content */}
      <div className="relative px-4 pt-8 pb-10">
        {/* CTA Text */}
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
            {isRTL ? 'عايز تطلب إيه؟' : 'What do you want to order?'}
          </h2>
          <p className="text-slate-500 text-sm md:text-base">
            {isRTL
              ? 'ابحث في المطاعم، السوبر ماركت، الصيدليات، وأكتر'
              : 'Search restaurants, supermarkets, pharmacies & more'}
          </p>
        </div>

        {/* Elegant Search Bar */}
        <div className="relative max-w-2xl mx-auto group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
          <div className="relative bg-white rounded-2xl shadow-elegant border border-slate-100/80 focus-within:border-primary/30 focus-within:shadow-elegant-lg transition-all duration-300">
            <div className="flex items-center px-5 py-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isRTL
                    ? 'ابحث عن متجر أو منتج...'
                    : 'Search for a store or product...'
                }
                className={`flex-1 mx-4 bg-transparent text-slate-900 placeholder:text-slate-400 text-base outline-none ${
                  isRTL ? 'text-right' : 'text-left'
                }`}
              />
              <button
                onClick={handleSearch}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-primary/90 rounded-xl text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/25 active:scale-95 transition-all duration-200"
                aria-label={isRTL ? 'بحث' : 'Search'}
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">{isRTL ? 'بحث' : 'Search'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

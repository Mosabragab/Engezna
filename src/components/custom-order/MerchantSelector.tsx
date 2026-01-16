'use client';

import { useState, useMemo } from 'react';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { Star, Truck, Clock, Check, AlertCircle, Search, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import type { MerchantSelectorProps, ProviderWithCustomSettings } from '@/types/custom-order';
import { MAX_BROADCAST_PROVIDERS } from '@/types/custom-order';

interface ExtendedMerchantSelectorProps extends MerchantSelectorProps {
  className?: string;
  showSearch?: boolean;
}

export function MerchantSelector({
  providers,
  selected,
  onSelectionChange,
  maxSelection = MAX_BROADCAST_PROVIDERS,
  className,
  showSearch = true,
}: ExtendedMerchantSelectorProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const [searchQuery, setSearchQuery] = useState('');

  // Filter providers by search
  const filteredProviders = useMemo(() => {
    if (!searchQuery.trim()) return providers;

    const query = searchQuery.toLowerCase();
    return providers.filter(
      (p) => p.name_ar.toLowerCase().includes(query) || p.name_en.toLowerCase().includes(query)
    );
  }, [providers, searchQuery]);

  // Check if can select more
  const canSelectMore = selected.length < maxSelection;

  // Toggle provider selection
  const toggleProvider = (providerId: string) => {
    if (selected.includes(providerId)) {
      // Deselect
      onSelectionChange(selected.filter((id) => id !== providerId));
    } else if (canSelectMore) {
      // Select
      onSelectionChange([...selected, providerId]);
    }
  };

  // Get selection index for ordering badge
  const getSelectionIndex = (providerId: string) => {
    return selected.indexOf(providerId);
  };

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">
          {isRTL ? 'اختر المتاجر' : 'Select Merchants'}
        </h3>
        <span
          className={cn(
            'text-sm font-medium px-2.5 py-1 rounded-full',
            selected.length === maxSelection
              ? 'bg-amber-100 text-amber-700'
              : selected.length > 0
                ? 'bg-primary/10 text-primary'
                : 'bg-slate-100 text-slate-500'
          )}
        >
          {selected.length}/{maxSelection}
        </span>
      </div>

      {/* Info Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-slate-600">
            {isRTL
              ? `اختر حتى ${maxSelection} متاجر لإرسال طلبك. أول متجر يسعر يفوز!`
              : `Choose up to ${maxSelection} merchants to send your order. First to price wins!`}
          </p>
        </div>
      </div>

      {/* Search */}
      {showSearch && providers.length > 5 && (
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRTL ? 'ابحث عن متجر...' : 'Search merchants...'}
            className="ps-10"
          />
        </div>
      )}

      {/* Providers Grid */}
      <div className="grid gap-3">
        <AnimatePresence>
          {filteredProviders.map((provider, index) => {
            const isSelected = selected.includes(provider.id);
            const selectionIndex = getSelectionIndex(provider.id);
            const isDisabled = !isSelected && !canSelectMore;

            return (
              <motion.button
                key={provider.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.03 }}
                type="button"
                onClick={() => toggleProvider(provider.id)}
                disabled={isDisabled}
                className={cn(
                  'relative w-full p-4 rounded-2xl border-2 text-start transition-all duration-200',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                    : isDisabled
                      ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Logo */}
                  <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                    {provider.logo_url ? (
                      <img
                        src={provider.logo_url}
                        alt={isRTL ? provider.name_ar : provider.name_en}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        🏪
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 truncate">
                      {isRTL ? provider.name_ar : provider.name_en}
                    </h4>

                    {/* Stats */}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {/* Rating */}
                      <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-medium text-amber-700">
                          {provider.rating?.toFixed(1) || '0.0'}
                        </span>
                      </div>

                      {/* Delivery Fee */}
                      <div
                        className={cn(
                          'flex items-center gap-1 px-2 py-0.5 rounded-md',
                          provider.delivery_fee === 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        <Truck className="w-3 h-3" />
                        <span className="text-xs font-medium">
                          {provider.delivery_fee === 0
                            ? isRTL
                              ? 'مجاني'
                              : 'Free'
                            : `${provider.delivery_fee} ${isRTL ? 'ج.م' : 'EGP'}`}
                        </span>
                      </div>

                      {/* Delivery Time */}
                      <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs font-medium">
                          {provider.estimated_delivery_time_min || 30} {isRTL ? 'د' : 'min'}
                        </span>
                      </div>
                    </div>

                    {/* Min Order */}
                    {provider.min_order_amount > 0 && (
                      <p className="text-xs text-slate-500 mt-1.5">
                        {isRTL ? 'الحد الأدنى للطلب: ' : 'Min. order: '}
                        <span className="font-medium">
                          {provider.min_order_amount} {isRTL ? 'ج.م' : 'EGP'}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Selection Indicator */}
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                      isSelected
                        ? 'bg-primary border-primary text-white'
                        : 'border-slate-300 bg-white'
                    )}
                  >
                    {isSelected && selectionIndex !== -1 ? (
                      <span className="text-xs font-bold">{selectionIndex + 1}</span>
                    ) : isSelected ? (
                      <Check className="w-4 h-4" />
                    ) : null}
                  </div>
                </div>

                {/* Custom Order Features */}
                {provider.custom_order_settings && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    {provider.custom_order_settings.accepts_text && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        📝 {isRTL ? 'نص' : 'Text'}
                      </span>
                    )}
                    {provider.custom_order_settings.accepts_voice && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        🎤 {isRTL ? 'صوت' : 'Voice'}
                      </span>
                    )}
                    {provider.custom_order_settings.accepts_image && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        📷 {isRTL ? 'صور' : 'Images'}
                      </span>
                    )}
                    {provider.custom_order_settings.show_price_history && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">
                        📊 {isRTL ? 'سعر سابق' : 'Price history'}
                      </span>
                    )}
                  </div>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredProviders.length === 0 && (
        <div className="text-center py-8">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">
            {searchQuery
              ? isRTL
                ? 'لا توجد نتائج مطابقة'
                : 'No matching results'
              : isRTL
                ? 'لا توجد متاجر متاحة في منطقتك'
                : 'No merchants available in your area'}
          </p>
        </div>
      )}

      {/* Selection Summary */}
      {selected.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-0 bg-gradient-to-t from-white via-white pt-4 pb-2"
        >
          <div className="bg-primary/10 rounded-xl p-3">
            <p className="text-sm text-primary font-medium text-center">
              {isRTL
                ? `تم اختيار ${selected.length} ${selected.length === 1 ? 'متجر' : 'متاجر'}`
                : `${selected.length} ${selected.length === 1 ? 'merchant' : 'merchants'} selected`}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

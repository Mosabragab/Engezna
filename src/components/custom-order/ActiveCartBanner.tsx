'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { ShoppingCart, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import type { ActiveCartBannerProps } from '@/types/custom-order';

interface ExtendedActiveCartBannerProps extends ActiveCartBannerProps {
  className?: string;
  position?: 'top' | 'bottom';
  variant?: 'compact' | 'full';
}

export function ActiveCartBanner({
  cartProvider,
  onViewCart,
  onDismiss,
  className,
  position = 'top',
  variant = 'full',
}: ExtendedActiveCartBannerProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    // Delay actual dismiss to allow animation
    setTimeout(() => {
      onDismiss();
    }, 200);
  };

  if (!isVisible) return null;

  if (variant === 'compact') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
          className={cn(
            'fixed z-40 start-4 end-4 sm:start-auto sm:end-6 sm:w-80',
            position === 'top' ? 'top-4' : 'bottom-24 sm:bottom-6',
            className
          )}
        >
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{cartProvider.name}</p>
              <p className="text-xs text-slate-500">
                {cartProvider.itemCount} {isRTL ? 'عناصر' : 'items'}
              </p>
            </div>

            <Button size="sm" variant="ghost" onClick={onViewCart} className="shrink-0 gap-1">
              {isRTL ? 'عرض' : 'View'}
              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </Button>

            <button
              onClick={handleDismiss}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
        className={cn(
          'bg-amber-50 border-y border-amber-200',
          position === 'top' ? '' : 'fixed bottom-16 inset-x-0 sm:relative sm:bottom-auto',
          className
        )}
      >
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800">
                {isRTL
                  ? `لديك سلة تسوق نشطة من "${cartProvider.name}"`
                  : `You have an active cart from "${cartProvider.name}"`}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                {isRTL
                  ? `${cartProvider.itemCount} عناصر في السلة • سيتم حذفها عند إرسال الطلب الخاص`
                  : `${cartProvider.itemCount} items in cart • Will be removed when sending custom order`}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={onViewCart}
                className="bg-white gap-1 text-amber-700 border-amber-300 hover:bg-amber-50"
              >
                {isRTL ? 'عرض السلة' : 'View Cart'}
                <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </Button>

              <button
                onClick={handleDismiss}
                className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
                aria-label={isRTL ? 'إغلاق' : 'Dismiss'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Simple inline notification variant
export function ActiveCartNotice({
  cartProvider,
  onViewCart,
  className,
}: {
  cartProvider: { name: string; itemCount: number };
  onViewCart: () => void;
  className?: string;
}) {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  return (
    <div
      className={cn(
        'flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3',
        className
      )}
    >
      <ShoppingCart className="w-4 h-4 text-amber-600 shrink-0" />
      <p className="text-sm text-amber-700 flex-1">
        {isRTL
          ? `لديك ${cartProvider.itemCount} عناصر في السلة من "${cartProvider.name}"`
          : `You have ${cartProvider.itemCount} items from "${cartProvider.name}"`}
      </p>
      <button
        onClick={onViewCart}
        className="text-sm font-medium text-amber-700 hover:text-amber-800 underline-offset-2 hover:underline"
      >
        {isRTL ? 'عرض' : 'View'}
      </button>
    </div>
  );
}

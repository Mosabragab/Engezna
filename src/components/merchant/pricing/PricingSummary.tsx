'use client';

import { useMemo } from 'react';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  Receipt,
  Truck,
  Calculator,
  Wallet,
  TrendingUp,
  Package,
  AlertCircle,
  Info,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { CustomOrderItem } from '@/types/custom-order';
import {
  useCustomOrderFinancials,
  formatCurrency,
  COMMISSION_TIERS,
} from '@/hooks/useCustomOrderFinancials';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface PricingSummaryProps {
  items: CustomOrderItem[];
  deliveryFee: number;
  onDeliveryFeeChange?: (fee: number) => void;
  className?: string;
  variant?: 'compact' | 'detailed' | 'full';
  showMerchantPayout?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export function PricingSummary({
  items,
  deliveryFee,
  onDeliveryFeeChange,
  className,
  variant = 'detailed',
  showMerchantPayout = true,
}: PricingSummaryProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  // Use the financial calculations hook
  const financials = useCustomOrderFinancials({
    items,
    deliveryFee,
  });

  // Format currency with locale
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Get commission tier description
  const getCommissionTierDesc = () => {
    const rate = financials.commissionRate * 100;
    if (rate >= 7) return isRTL ? 'نسبة أساسية' : 'Base rate';
    if (rate >= 6) return isRTL ? 'نسبة متوسطة' : 'Mid tier';
    return isRTL ? 'نسبة مميزة' : 'Premium tier';
  };

  // Compact variant
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4',
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {isRTL ? 'الإجمالي للعميل' : 'Customer Total'}
            </span>
          </div>
          <span className="text-xl font-bold text-primary">
            {formatAmount(financials.customerTotal)} {isRTL ? 'ج.م' : 'EGP'}
          </span>
        </div>

        {showMerchantPayout && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {isRTL ? 'صافي ربحك' : 'Your payout'}
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {formatAmount(financials.merchantPayout)} {isRTL ? 'ج.م' : 'EGP'}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Detailed / Full variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">
            {isRTL ? 'ملخص الفاتورة' : 'Invoice Summary'}
          </h3>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Items Summary */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600 dark:text-slate-400">
              {isRTL ? 'عدد الأصناف' : 'Items count'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {financials.itemsCount}
            </span>
            {financials.unavailableItemsCount > 0 && (
              <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded">
                -{financials.unavailableItemsCount}
              </span>
            )}
            {financials.substitutedItemsCount > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded">
                {financials.substitutedItemsCount} {isRTL ? 'بديل' : 'sub'}
              </span>
            )}
          </div>
        </div>

        {/* Subtotal */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600 dark:text-slate-400">
              {isRTL ? 'المجموع الفرعي' : 'Subtotal'}
            </span>
          </div>
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {formatAmount(financials.productSubtotal)} {isRTL ? 'ج.م' : 'EGP'}
          </span>
        </div>

        {/* Delivery Fee */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600 dark:text-slate-400">
              {isRTL ? 'رسوم التوصيل' : 'Delivery fee'}
            </span>
          </div>
          {onDeliveryFeeChange ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={deliveryFee}
                onChange={(e) => onDeliveryFeeChange(parseFloat(e.target.value) || 0)}
                className="w-20 text-end bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-sm font-medium"
                min="0"
                step="5"
              />
              <span className="text-sm text-slate-500">{isRTL ? 'ج.م' : 'EGP'}</span>
            </div>
          ) : (
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {deliveryFee === 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  {isRTL ? 'مجاني' : 'Free'}
                </span>
              ) : (
                `${formatAmount(deliveryFee)} ${isRTL ? 'ج.م' : 'EGP'}`
              )}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-slate-200 dark:border-slate-700" />

        {/* Customer Total */}
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {isRTL ? 'إجمالي العميل' : 'Customer Total'}
          </span>
          <span className="text-xl font-bold text-primary">
            {formatAmount(financials.customerTotal)} {isRTL ? 'ج.م' : 'EGP'}
          </span>
        </div>

        {/* Merchant Section */}
        {showMerchantPayout && (
          <>
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {isRTL ? 'حسابك' : 'Your Account'}
                </span>
              </div>

              {/* Commission */}
              <div className="flex items-center justify-between text-sm mb-2">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 dark:text-slate-400">
                    {isRTL ? 'عمولة المنصة' : 'Platform commission'}
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-medium">
                            {isRTL ? 'نظام العمولات المتدرجة' : 'Tiered Commission'}
                          </p>
                          {COMMISSION_TIERS.map((tier, i) => (
                            <p key={i} className="text-xs">
                              {tier.maxAmount === Infinity
                                ? `>${tier.minAmount}`
                                : `${tier.minAmount}-${tier.maxAmount}`}{' '}
                              {isRTL ? 'ج.م' : 'EGP'}: {(tier.rate * 100).toFixed(0)}%
                            </p>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
                    {(financials.commissionRate * 100).toFixed(0)}%
                  </span>
                  <span className="text-red-600 dark:text-red-400">
                    -{formatAmount(financials.platformCommission)} {isRTL ? 'ج.م' : 'EGP'}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-200 dark:border-slate-700 my-3" />

              {/* Net Payout */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {isRTL ? 'صافي ربحك' : 'Your Payout'}
                  </span>
                </div>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {formatAmount(financials.merchantPayout)} {isRTL ? 'ج.م' : 'EGP'}
                </span>
              </div>

              {/* Tier Badge */}
              <div className="mt-3 text-center">
                <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded-full">
                  {getCommissionTierDesc()} ({(financials.commissionRate * 100).toFixed(0)}%)
                </span>
              </div>
            </div>
          </>
        )}

        {/* Warnings */}
        {financials.unavailableItemsCount > 0 && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {isRTL
                ? `${financials.unavailableItemsCount} صنف غير متوفر وسيتم استبعاده من الفاتورة`
                : `${financials.unavailableItemsCount} item(s) unavailable and excluded from total`}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Live Summary Component (for bottom sticky bar)
// ═══════════════════════════════════════════════════════════════════════════════

interface LivePricingSummaryProps {
  subtotal: number;
  deliveryFee: number;
  itemsCount: number;
  className?: string;
}

export function LivePricingSummary({
  subtotal,
  deliveryFee,
  itemsCount,
  className,
}: LivePricingSummaryProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const total = subtotal + deliveryFee;

  return (
    <div
      className={cn(
        'fixed bottom-0 inset-x-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-lg z-40',
        className
      )}
    >
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isRTL ? 'أصناف' : 'Items'}
              </p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{itemsCount}</p>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isRTL ? 'المنتجات' : 'Subtotal'}
              </p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {subtotal.toFixed(2)}
              </p>
            </div>
            {deliveryFee > 0 && (
              <>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
                <div className="text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isRTL ? 'التوصيل' : 'Delivery'}
                  </p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {deliveryFee.toFixed(2)}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="text-end">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isRTL ? 'الإجمالي' : 'Total'}
            </p>
            <p className="text-xl font-bold text-primary">
              {total.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PricingSummary;

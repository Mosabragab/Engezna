'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { Clock, TrendingUp, TrendingDown, Minus, History, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import type { PriceHistoryItem } from '@/types/custom-order';
import { formatCurrency } from '@/hooks/useCustomOrderFinancials';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface PriceHistoryTooltipProps {
  itemName: string;
  customerId: string;
  providerId: string;
  currentPrice?: number;
  onPriceSelect?: (history: PriceHistoryItem) => void;
  className?: string;
  variant?: 'tooltip' | 'popover' | 'inline';
}

interface PriceHistoryListProps {
  history: PriceHistoryItem[];
  currentPrice?: number;
  onSelect?: (item: PriceHistoryItem) => void;
  loading?: boolean;
  error?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Components
// ═══════════════════════════════════════════════════════════════════════════════

function PriceChangeIndicator({
  currentPrice,
  historicalPrice,
}: {
  currentPrice: number;
  historicalPrice: number;
}) {
  const change = currentPrice - historicalPrice;
  const percentChange = historicalPrice > 0 ? (change / historicalPrice) * 100 : 0;

  if (Math.abs(change) < 0.01) {
    return (
      <span className="flex items-center text-slate-500 text-xs">
        <Minus className="w-3 h-3 me-1" />
        0%
      </span>
    );
  }

  if (change > 0) {
    return (
      <span className="flex items-center text-red-600 dark:text-red-400 text-xs">
        <TrendingUp className="w-3 h-3 me-1" />+{percentChange.toFixed(1)}%
      </span>
    );
  }

  return (
    <span className="flex items-center text-emerald-600 dark:text-emerald-400 text-xs">
      <TrendingDown className="w-3 h-3 me-1" />
      {percentChange.toFixed(1)}%
    </span>
  );
}

function PriceHistoryList({
  history,
  currentPrice,
  onSelect,
  loading,
  error,
}: PriceHistoryListProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-4 text-sm text-red-600 dark:text-red-400">{error}</div>;
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-slate-500 dark:text-slate-400">
        {isRTL ? 'لا يوجد سجل أسعار سابق' : 'No price history available'}
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {history.map((item, index) => (
        <motion.button
          key={item.id}
          initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          type="button"
          onClick={() => onSelect?.(item)}
          className={cn(
            'w-full p-3 rounded-lg text-start transition-all',
            'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700',
            'border border-transparent hover:border-primary/20',
            onSelect && 'cursor-pointer'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                {isRTL ? item.item_name_ar : item.item_name_en || item.item_name_ar}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {new Date(item.last_ordered_at).toLocaleDateString(locale, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>

            <div className="text-end shrink-0">
              <p className="font-semibold text-primary">
                {item.unit_price.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                / {item.unit_type || (isRTL ? 'قطعة' : 'piece')}
              </p>
              {currentPrice !== undefined && (
                <PriceChangeIndicator
                  currentPrice={currentPrice}
                  historicalPrice={item.unit_price}
                />
              )}
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export function PriceHistoryTooltip({
  itemName,
  customerId,
  providerId,
  currentPrice,
  onPriceSelect,
  className,
  variant = 'tooltip',
}: PriceHistoryTooltipProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const [history, setHistory] = useState<PriceHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch price history
  const fetchHistory = useCallback(async () => {
    if (!itemName || !customerId || !providerId) return;

    setLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      // For now, simulate API response
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Simulated data - in production, this would come from Supabase
      const mockHistory: PriceHistoryItem[] = [
        {
          id: '1',
          item_name_ar: itemName,
          item_name_en: null,
          unit_type: 'kg',
          unit_price: 45.0,
          last_ordered_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          item_name_ar: itemName,
          item_name_en: null,
          unit_type: 'kg',
          unit_price: 42.5,
          last_ordered_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      setHistory(mockHistory);
    } catch (err) {
      setError(isRTL ? 'فشل تحميل السجل' : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [itemName, customerId, providerId, isRTL]);

  // Fetch on open
  useEffect(() => {
    if (isOpen && history.length === 0) {
      fetchHistory();
    }
  }, [isOpen, history.length, fetchHistory]);

  // Handle selection
  const handleSelect = (item: PriceHistoryItem) => {
    onPriceSelect?.(item);
    setIsOpen(false);
  };

  // Render based on variant
  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4',
          className
        )}
      >
        <div className="flex items-center gap-2 mb-3">
          <History className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-slate-800 dark:text-slate-200">
            {isRTL ? 'سجل الأسعار' : 'Price History'}
          </h4>
        </div>
        <PriceHistoryList
          history={history}
          currentPrice={currentPrice}
          onSelect={onPriceSelect ? handleSelect : undefined}
          loading={loading}
          error={error}
        />
      </div>
    );
  }

  if (variant === 'popover') {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
              className
            )}
          >
            <Clock className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="p-3 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {isRTL ? 'تم شراؤه مسبقاً' : 'Previously Purchased'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isRTL ? 'اضغط لاستخدام السعر السابق' : 'Click to use previous price'}
            </p>
          </div>
          <div className="p-3">
            <PriceHistoryList
              history={history}
              currentPrice={currentPrice}
              onSelect={onPriceSelect ? handleSelect : undefined}
              loading={loading}
              error={error}
            />
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Default: tooltip
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => history.length > 0 && onPriceSelect?.(history[0])}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
              history.length === 0 && 'opacity-50 cursor-not-allowed',
              className
            )}
            disabled={history.length === 0}
          >
            <Clock className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {history.length > 0 ? (
            <div className="text-center">
              <p className="font-medium">{isRTL ? 'تم شراؤه مسبقاً' : 'Previously purchased'}</p>
              <p className="text-sm mt-1">
                <span className="font-semibold text-emerald-400">
                  {history[0].unit_price.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
                </span>
                {' / '}
                {history[0].unit_type || (isRTL ? 'قطعة' : 'piece')}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {new Date(history[0].last_ordered_at).toLocaleDateString(locale)}
              </p>
            </div>
          ) : (
            <p className="text-slate-400">{isRTL ? 'لا يوجد سجل أسعار' : 'No price history'}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook for fetching price history
// ═══════════════════════════════════════════════════════════════════════════════

export function usePriceHistory(providerId: string, customerId: string, itemNames: string[]) {
  const [historyMap, setHistoryMap] = useState<Map<string, PriceHistoryItem>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!providerId || !customerId || itemNames.length === 0) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        // TODO: Implement actual Supabase query
        // const { data } = await supabase
        //   .from('custom_order_price_history')
        //   .select('*')
        //   .eq('provider_id', providerId)
        //   .eq('customer_id', customerId)
        //   .in('item_name_normalized', itemNames.map(normalize))

        // Simulated response
        await new Promise((resolve) => setTimeout(resolve, 300));

        // In production, this would come from Supabase
        const mockMap = new Map<string, PriceHistoryItem>();
        setHistoryMap(mockMap);
      } catch (err) {
        console.error('Failed to fetch price history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [providerId, customerId, itemNames]);

  const getHistoryForItem = useCallback(
    (itemName: string): PriceHistoryItem | null => {
      // Normalize item name for lookup
      const normalized = itemName.toLowerCase().trim();
      return historyMap.get(normalized) || null;
    },
    [historyMap]
  );

  return {
    historyMap,
    loading,
    getHistoryForItem,
  };
}

export default PriceHistoryTooltip;

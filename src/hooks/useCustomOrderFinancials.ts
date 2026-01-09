/**
 * useCustomOrderFinancials Hook - هوك الحسابات المالية للطلب المفتوح
 *
 * Provides real-time financial calculations for custom orders:
 * - Product subtotal calculation
 * - Delivery fee handling
 * - Commission calculation (5-7% tiered)
 * - Merchant payout calculation
 *
 * @version 1.0
 * @date January 2026
 */

'use client';

import { useMemo, useCallback } from 'react';
import type {
  CustomOrderItem,
  CustomOrderFinancials,
  ItemAvailabilityStatus,
} from '@/types/custom-order';
import { calculateCustomOrderFinancials } from '@/types/custom-order';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseCustomOrderFinancialsOptions {
  items: CustomOrderItem[];
  deliveryFee: number;
  commissionRate?: number;  // Default: calculated based on subtotal
}

export interface ExtendedFinancials extends CustomOrderFinancials {
  itemsCount: number;
  availableItemsCount: number;
  unavailableItemsCount: number;
  substitutedItemsCount: number;
  formattedSubtotal: string;
  formattedDeliveryFee: string;
  formattedTotal: string;
  formattedCommission: string;
  formattedPayout: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Commission tiers (based on product subtotal)
 * نسب العمولة المتدرجة
 */
const COMMISSION_TIERS = [
  { minAmount: 0, maxAmount: 500, rate: 0.07 },      // 7% for orders up to 500 EGP
  { minAmount: 500, maxAmount: 1000, rate: 0.06 },   // 6% for orders 500-1000 EGP
  { minAmount: 1000, maxAmount: Infinity, rate: 0.05 }, // 5% for orders above 1000 EGP
];

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate commission rate based on subtotal
 * حساب نسبة العمولة بناءً على المجموع الفرعي
 */
function getCommissionRate(subtotal: number): number {
  for (const tier of COMMISSION_TIERS) {
    if (subtotal >= tier.minAmount && subtotal < tier.maxAmount) {
      return tier.rate;
    }
  }
  return COMMISSION_TIERS[COMMISSION_TIERS.length - 1].rate;
}

/**
 * Format currency in Egyptian Pounds
 * تنسيق العملة بالجنيه المصري
 */
function formatCurrency(amount: number, locale = 'ar-EG'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calculate item total price (considering availability and substitution)
 * حساب السعر الإجمالي للصنف
 */
function calculateItemPrice(item: CustomOrderItem): number {
  if (item.availability_status === 'unavailable') {
    return 0;
  }

  if (item.availability_status === 'substituted' && item.substitute_total_price) {
    return item.substitute_total_price;
  }

  return item.total_price;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════════════════════

export function useCustomOrderFinancials(
  options: UseCustomOrderFinancialsOptions
): ExtendedFinancials {
  const { items, deliveryFee, commissionRate: providedCommissionRate } = options;

  return useMemo(() => {
    // Calculate counts by status
    const itemsCount = items.length;
    const availableItemsCount = items.filter(
      (i) => i.availability_status === 'available'
    ).length;
    const unavailableItemsCount = items.filter(
      (i) => i.availability_status === 'unavailable'
    ).length;
    const substitutedItemsCount = items.filter(
      (i) => i.availability_status === 'substituted'
    ).length;

    // Calculate product subtotal
    const productSubtotal = items.reduce(
      (sum, item) => sum + calculateItemPrice(item),
      0
    );

    // Determine commission rate
    const commissionRate = providedCommissionRate ?? getCommissionRate(productSubtotal);

    // Use the shared calculation function
    const financials = calculateCustomOrderFinancials(
      items,
      deliveryFee,
      commissionRate
    );

    // Add formatted values and counts
    return {
      ...financials,
      itemsCount,
      availableItemsCount,
      unavailableItemsCount,
      substitutedItemsCount,
      formattedSubtotal: formatCurrency(financials.productSubtotal),
      formattedDeliveryFee: formatCurrency(financials.deliveryFee),
      formattedTotal: formatCurrency(financials.customerTotal),
      formattedCommission: formatCurrency(financials.platformCommission),
      formattedPayout: formatCurrency(financials.merchantPayout),
    };
  }, [items, deliveryFee, providedCommissionRate]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Merchant Pricing Calculator Hook
// ═══════════════════════════════════════════════════════════════════════════════

export interface PricingItem {
  id?: string;
  item_name_ar: string;
  quantity: number;
  unit_price: number;
  availability_status: ItemAvailabilityStatus;
  substitute_quantity?: number | null;
  substitute_unit_price?: number | null;
}

export interface UsePricingCalculatorOptions {
  defaultDeliveryFee?: number;
  commissionRate?: number;
}

export interface PricingCalculatorResult {
  items: PricingItem[];
  deliveryFee: number;
  subtotal: number;
  total: number;
  commission: number;
  merchantPayout: number;
  commissionRate: number;
  addItem: (item: PricingItem) => void;
  updateItem: (index: number, updates: Partial<PricingItem>) => void;
  removeItem: (index: number) => void;
  setDeliveryFee: (fee: number) => void;
  clearItems: () => void;
  getFormattedBreakdown: () => {
    subtotal: string;
    deliveryFee: string;
    total: string;
    commission: string;
    payout: string;
  };
}

import { useState, useCallback as useCallbackReact } from 'react';

export function usePricingCalculator(
  options?: UsePricingCalculatorOptions
): PricingCalculatorResult {
  const [items, setItems] = useState<PricingItem[]>([]);
  const [deliveryFee, setDeliveryFee] = useState(options?.defaultDeliveryFee ?? 0);

  // Calculate totals
  const calculated = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      if (item.availability_status === 'unavailable') {
        return sum;
      }

      if (
        item.availability_status === 'substituted' &&
        item.substitute_quantity &&
        item.substitute_unit_price
      ) {
        return sum + item.substitute_quantity * item.substitute_unit_price;
      }

      return sum + item.quantity * item.unit_price;
    }, 0);

    const commissionRate = options?.commissionRate ?? getCommissionRate(subtotal);
    const commission = subtotal * commissionRate;
    const total = subtotal + deliveryFee;
    const merchantPayout = subtotal - commission + deliveryFee;

    return {
      subtotal,
      total,
      commission,
      merchantPayout,
      commissionRate,
    };
  }, [items, deliveryFee, options?.commissionRate]);

  // Item management
  const addItem = useCallbackReact((item: PricingItem) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const updateItem = useCallbackReact(
    (index: number, updates: Partial<PricingItem>) => {
      setItems((prev) =>
        prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
      );
    },
    []
  );

  const removeItem = useCallbackReact((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearItems = useCallbackReact(() => {
    setItems([]);
  }, []);

  // Formatted breakdown
  const getFormattedBreakdown = useCallbackReact(() => {
    return {
      subtotal: formatCurrency(calculated.subtotal),
      deliveryFee: formatCurrency(deliveryFee),
      total: formatCurrency(calculated.total),
      commission: formatCurrency(calculated.commission),
      payout: formatCurrency(calculated.merchantPayout),
    };
  }, [calculated, deliveryFee]);

  return {
    items,
    deliveryFee,
    subtotal: calculated.subtotal,
    total: calculated.total,
    commission: calculated.commission,
    merchantPayout: calculated.merchantPayout,
    commissionRate: calculated.commissionRate,
    addItem,
    updateItem,
    removeItem,
    setDeliveryFee,
    clearItems,
    getFormattedBreakdown,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Price Comparison Hook
// ═══════════════════════════════════════════════════════════════════════════════

export interface PriceComparisonItem {
  providerId: string;
  providerName: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  itemsCount: number;
  availableCount: number;
  estimatedTime?: number;
  rating?: number;
}

export interface UsePriceComparisonOptions {
  items: PriceComparisonItem[];
}

export interface PriceComparisonResult {
  items: PriceComparisonItem[];
  cheapestByTotal: PriceComparisonItem | null;
  cheapestBySubtotal: PriceComparisonItem | null;
  mostComplete: PriceComparisonItem | null;
  highestRated: PriceComparisonItem | null;
  sortedByTotal: PriceComparisonItem[];
  sortedBySubtotal: PriceComparisonItem[];
  sortedByCompleteness: PriceComparisonItem[];
  savings: {
    maxSavings: number;
    percentageSavings: number;
  };
}

export function usePriceComparison(
  options: UsePriceComparisonOptions
): PriceComparisonResult {
  const { items } = options;

  return useMemo(() => {
    if (items.length === 0) {
      return {
        items: [],
        cheapestByTotal: null,
        cheapestBySubtotal: null,
        mostComplete: null,
        highestRated: null,
        sortedByTotal: [],
        sortedBySubtotal: [],
        sortedByCompleteness: [],
        savings: { maxSavings: 0, percentageSavings: 0 },
      };
    }

    // Sort by different criteria
    const sortedByTotal = [...items].sort((a, b) => a.total - b.total);
    const sortedBySubtotal = [...items].sort((a, b) => a.subtotal - b.subtotal);
    const sortedByCompleteness = [...items].sort(
      (a, b) => b.availableCount - a.availableCount
    );

    // Find best options
    const cheapestByTotal = sortedByTotal[0];
    const cheapestBySubtotal = sortedBySubtotal[0];
    const mostComplete = sortedByCompleteness[0];
    const highestRated = [...items].sort(
      (a, b) => (b.rating ?? 0) - (a.rating ?? 0)
    )[0];

    // Calculate savings
    const maxTotal = Math.max(...items.map((i) => i.total));
    const minTotal = Math.min(...items.map((i) => i.total));
    const maxSavings = maxTotal - minTotal;
    const percentageSavings = maxTotal > 0 ? (maxSavings / maxTotal) * 100 : 0;

    return {
      items,
      cheapestByTotal,
      cheapestBySubtotal,
      mostComplete,
      highestRated,
      sortedByTotal,
      sortedBySubtotal,
      sortedByCompleteness,
      savings: {
        maxSavings,
        percentageSavings,
      },
    };
  }, [items]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Utility Exports
// ═══════════════════════════════════════════════════════════════════════════════

export {
  getCommissionRate,
  formatCurrency,
  calculateItemPrice,
  COMMISSION_TIERS,
};

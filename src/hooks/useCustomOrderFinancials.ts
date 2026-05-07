/**
 * useCustomOrderFinancials Hook - هوك الحسابات المالية للطلب المفتوح
 *
 * Provides real-time financial calculations for custom orders:
 * - Product subtotal calculation
 * - Delivery fee handling
 * - Commission calculation (provider-specific, mirrors the DB trigger
 *   `calculate_order_commission` — see src/lib/commission/policy.ts)
 * - Merchant payout calculation
 *
 * @version 2.0
 * @date May 2026 — replaced subtotal-based tiers with the per-provider
 *   commission policy stored on `providers.commission_rate` /
 *   `custom_commission_rate` / `commission_status`.
 */

'use client';

import { useMemo, useCallback } from 'react';
import type {
  CustomOrderItem,
  CustomOrderFinancials,
  ItemAvailabilityStatus,
} from '@/types/custom-order';
import { calculateCustomOrderFinancials } from '@/types/custom-order';
import {
  COMMISSION_DEFAULT_PERCENT,
  computeCommission,
  type ProviderCommissionSettings,
  type CommissionSituation,
} from '@/lib/commission/policy';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseCustomOrderFinancialsOptions {
  items: CustomOrderItem[];
  deliveryFee: number;
  /**
   * Provider commission settings as stored on `providers`. When omitted the
   * hook falls back to the platform default rate (7%). Pass real settings
   * for any merchant-facing calculation so grace-period and exempt
   * statuses are reflected.
   */
  providerCommission?: ProviderCommissionSettings;
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
  /** Nominal rate in percent (e.g. 5, 6, 7) — what the merchant agreed to. */
  theoreticalRatePercent: number;
  /** Effective rate in percent — 0 during grace/exempt. */
  effectiveRatePercent: number;
  /** Drives the explainer banner in the UI. */
  commissionSituation: CommissionSituation;
  /** Grace-period end date when applicable. */
  graceEndDate: Date | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

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

const FALLBACK_PROVIDER_SETTINGS: ProviderCommissionSettings = {
  commission_rate: COMMISSION_DEFAULT_PERCENT,
  custom_commission_rate: null,
  commission_status: 'normal',
  grace_period_start: null,
  grace_period_end: null,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════════════════════

export function useCustomOrderFinancials(
  options: UseCustomOrderFinancialsOptions
): ExtendedFinancials {
  const { items, deliveryFee, providerCommission } = options;

  return useMemo(() => {
    // Calculate counts by status
    const itemsCount = items.length;
    const availableItemsCount = items.filter((i) => i.availability_status === 'available').length;
    const unavailableItemsCount = items.filter(
      (i) => i.availability_status === 'unavailable'
    ).length;
    const substitutedItemsCount = items.filter(
      (i) => i.availability_status === 'substituted'
    ).length;

    // Calculate product subtotal
    const productSubtotal = items.reduce((sum, item) => sum + calculateItemPrice(item), 0);

    // Resolve commission via the per-provider policy (mirrors the DB trigger).
    const settings = providerCommission ?? FALLBACK_PROVIDER_SETTINGS;
    const commission = computeCommission(settings, productSubtotal);

    // Use the shared calculation function with the effective rate as a decimal.
    const effectiveRateDecimal = commission.effectiveRate / 100;
    const financials = calculateCustomOrderFinancials(items, deliveryFee, effectiveRateDecimal);

    // Add formatted values, counts, and the policy details the UI needs.
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
      theoreticalRatePercent: commission.theoreticalRate,
      effectiveRatePercent: commission.effectiveRate,
      commissionSituation: commission.situation,
      graceEndDate: commission.graceEndDate,
    };
  }, [items, deliveryFee, providerCommission]);
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
  /** Provider commission settings — required for accurate previews. */
  providerCommission?: ProviderCommissionSettings;
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

    const settings = options?.providerCommission ?? FALLBACK_PROVIDER_SETTINGS;
    const policy = computeCommission(settings, subtotal);
    const commissionRate = policy.effectiveRate / 100;
    const commission = policy.effectiveAmount;
    const total = subtotal + deliveryFee;
    const merchantPayout = subtotal - commission + deliveryFee;

    return {
      subtotal,
      total,
      commission,
      merchantPayout,
      commissionRate,
    };
  }, [items, deliveryFee, options?.providerCommission]);

  // Item management
  const addItem = useCallbackReact((item: PricingItem) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const updateItem = useCallbackReact((index: number, updates: Partial<PricingItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  }, []);

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

export function usePriceComparison(options: UsePriceComparisonOptions): PriceComparisonResult {
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
    const sortedByCompleteness = [...items].sort((a, b) => b.availableCount - a.availableCount);

    // Find best options
    const cheapestByTotal = sortedByTotal[0];
    const cheapestBySubtotal = sortedBySubtotal[0];
    const mostComplete = sortedByCompleteness[0];
    const highestRated = [...items].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];

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

export { formatCurrency, calculateItemPrice };
// Re-export the policy helpers so existing import sites keep working.
export {
  computeCommission,
  COMMISSION_CAP_PERCENT,
  COMMISSION_DEFAULT_PERCENT,
} from '@/lib/commission/policy';
export type { ProviderCommissionSettings } from '@/lib/commission/policy';

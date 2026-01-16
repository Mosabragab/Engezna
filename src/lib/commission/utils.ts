/**
 * Commission Calculation Utility
 *
 * Business Model:
 * - 0% commission for first 3 months (grace period)
 * - Maximum 7% commission after grace period
 * - Governorate-specific rates may apply
 */

export const COMMISSION_CONFIG = {
  // Grace period duration in days
  GRACE_PERIOD_DAYS: 90, // 3 months

  // Default commission rate (percentage)
  DEFAULT_RATE: 7.0,

  // Maximum commission rate
  MAX_RATE: 7.0,

  // Minimum commission rate (for governorate overrides)
  MIN_RATE: 0.0,
};

export type CommissionStatus = 'in_grace_period' | 'active' | 'exempt';

export interface CommissionInfo {
  status: CommissionStatus;
  rate: number;
  gracePeriodEndDate: Date | null;
  daysRemaining: number | null;
  isInGracePeriod: boolean;
}

export interface Provider {
  id: string;
  grace_period_start?: string | null;
  grace_period_end?: string | null;
  commission_status?: CommissionStatus;
  custom_commission_rate?: number | null;
}

export interface Governorate {
  id: string;
  commission_override?: number | null;
}

/**
 * Calculate the commission rate for a provider
 * @param provider - The provider object
 * @param governorate - Optional governorate with potential commission override
 * @returns The commission rate as a percentage (0-100)
 */
export function calculateCommissionRate(
  provider: Provider,
  governorate?: Governorate | null
): number {
  // Check if provider has custom commission rate
  if (provider.custom_commission_rate !== null && provider.custom_commission_rate !== undefined) {
    return provider.custom_commission_rate;
  }

  // Check if exempt
  if (provider.commission_status === 'exempt') {
    return 0;
  }

  // Check grace period
  if (isInGracePeriod(provider)) {
    return 0;
  }

  // Check governorate override
  if (governorate?.commission_override !== null && governorate?.commission_override !== undefined) {
    return Math.min(governorate.commission_override, COMMISSION_CONFIG.MAX_RATE);
  }

  // Return default rate
  return COMMISSION_CONFIG.DEFAULT_RATE;
}

/**
 * Check if a provider is in their grace period
 * @param provider - The provider object
 * @returns true if in grace period
 */
export function isInGracePeriod(provider: Provider): boolean {
  if (provider.commission_status === 'in_grace_period') {
    return true;
  }

  if (!provider.grace_period_start) {
    return false;
  }

  const now = new Date();
  const gracePeriodEnd = provider.grace_period_end
    ? new Date(provider.grace_period_end)
    : calculateGracePeriodEnd(new Date(provider.grace_period_start));

  return now < gracePeriodEnd;
}

/**
 * Calculate grace period end date from start date
 * @param startDate - Grace period start date
 * @returns Grace period end date
 */
export function calculateGracePeriodEnd(startDate: Date): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + COMMISSION_CONFIG.GRACE_PERIOD_DAYS);
  return endDate;
}

/**
 * Get days remaining in grace period
 * @param provider - The provider object
 * @returns Number of days remaining, or null if not in grace period
 */
export function getGracePeriodDaysRemaining(provider: Provider): number | null {
  if (!isInGracePeriod(provider)) {
    return null;
  }

  const now = new Date();
  const gracePeriodEnd = provider.grace_period_end
    ? new Date(provider.grace_period_end)
    : calculateGracePeriodEnd(new Date(provider.grace_period_start!));

  const diffTime = gracePeriodEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Get full commission info for a provider
 * @param provider - The provider object
 * @param governorate - Optional governorate
 * @returns CommissionInfo object with all details
 */
export function getCommissionInfo(
  provider: Provider,
  governorate?: Governorate | null
): CommissionInfo {
  const inGracePeriod = isInGracePeriod(provider);
  const rate = calculateCommissionRate(provider, governorate);
  const daysRemaining = getGracePeriodDaysRemaining(provider);

  let gracePeriodEndDate: Date | null = null;
  if (provider.grace_period_start) {
    gracePeriodEndDate = provider.grace_period_end
      ? new Date(provider.grace_period_end)
      : calculateGracePeriodEnd(new Date(provider.grace_period_start));
  }

  return {
    status: provider.commission_status || (inGracePeriod ? 'in_grace_period' : 'active'),
    rate,
    gracePeriodEndDate,
    daysRemaining,
    isInGracePeriod: inGracePeriod,
  };
}

/**
 * Calculate commission amount for an order
 * @param orderTotal - Order subtotal (excluding delivery fee)
 * @param provider - The provider object
 * @param governorate - Optional governorate
 * @returns Commission amount in EGP
 */
export function calculateCommissionAmount(
  orderTotal: number,
  provider: Provider,
  governorate?: Governorate | null
): number {
  const rate = calculateCommissionRate(provider, governorate);
  return (orderTotal * rate) / 100;
}

/**
 * Format commission rate for display
 * @param rate - Commission rate percentage
 * @param locale - 'ar' or 'en'
 * @returns Formatted string
 */
export function formatCommissionRate(rate: number, locale: 'ar' | 'en' = 'ar'): string {
  if (rate === 0) {
    return locale === 'ar' ? '0% (فترة مجانية)' : '0% (Free Period)';
  }
  return `${rate}%`;
}

/**
 * Get commission status label for display
 * @param status - Commission status
 * @param locale - 'ar' or 'en'
 * @returns Localized status label
 */
export function getCommissionStatusLabel(
  status: CommissionStatus,
  locale: 'ar' | 'en' = 'ar'
): string {
  const labels = {
    in_grace_period: {
      ar: 'فترة مجانية',
      en: 'Free Period',
    },
    active: {
      ar: 'نشط',
      en: 'Active',
    },
    exempt: {
      ar: 'معفى',
      en: 'Exempt',
    },
  };

  return labels[status][locale];
}

export default {
  COMMISSION_CONFIG,
  calculateCommissionRate,
  isInGracePeriod,
  calculateGracePeriodEnd,
  getGracePeriodDaysRemaining,
  getCommissionInfo,
  calculateCommissionAmount,
  formatCommissionRate,
  getCommissionStatusLabel,
};

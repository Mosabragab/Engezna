/**
 * Money Class - معالجة المبالغ المالية بدقة
 *
 * This class handles financial calculations with precision by using piasters (قروش)
 * internally. This avoids floating-point errors common in JavaScript.
 *
 * Example of the problem this solves:
 * - JavaScript: 0.1 + 0.2 = 0.30000000000000004
 * - Money class: Money.fromPounds(0.1).add(Money.fromPounds(0.2)) = 0.30 exactly
 *
 * @example
 * // Creating money
 * const price = new Money(100.50);         // 100.50 EGP
 * const fromPiasters = Money.fromPiasters(10050); // 100.50 EGP
 *
 * // Arithmetic
 * const total = price.add(new Money(50));  // 150.50 EGP
 * const commission = total.multiply(0.07); // 10.54 EGP (rounded)
 *
 * // Display
 * commission.format('ar'); // "10.54 ج.م"
 * commission.format('en'); // "10.54 EGP"
 */

export class Money {
  private readonly piasters: number;

  /**
   * Create a Money instance from pounds (EGP)
   * @param amount - Amount in Egyptian Pounds
   */
  constructor(amount: number | string) {
    if (typeof amount === 'string') {
      const parsed = parseFloat(amount);
      if (isNaN(parsed)) {
        this.piasters = 0;
      } else {
        this.piasters = Math.round(parsed * 100);
      }
    } else if (isNaN(amount)) {
      this.piasters = 0;
    } else {
      this.piasters = Math.round(amount * 100);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Static Factory Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create Money from piasters (smallest unit)
   * @param piasters - Amount in piasters (100 piasters = 1 EGP)
   */
  static fromPiasters(piasters: number): Money {
    const m = new Money(0);
    (m as { piasters: number }).piasters = Math.round(piasters);
    return m;
  }

  /**
   * Create Money from pounds (alias for constructor)
   */
  static fromPounds(pounds: number): Money {
    return new Money(pounds);
  }

  /**
   * Create Money from a database decimal value
   */
  static fromDatabase(value: number | string | null | undefined): Money {
    if (value === null || value === undefined) {
      return new Money(0);
    }
    return new Money(value);
  }

  /**
   * Create a zero Money instance
   */
  static zero(): Money {
    return new Money(0);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Arithmetic Operations
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Add another Money amount
   */
  add(other: Money): Money {
    return Money.fromPiasters(this.piasters + other.piasters);
  }

  /**
   * Subtract another Money amount
   */
  subtract(other: Money): Money {
    return Money.fromPiasters(this.piasters - other.piasters);
  }

  /**
   * Multiply by a factor (e.g., for commission calculation)
   * Result is rounded to nearest piaster
   */
  multiply(factor: number): Money {
    return Money.fromPiasters(Math.round(this.piasters * factor));
  }

  /**
   * Divide by a factor
   * Result is rounded to nearest piaster
   */
  divide(divisor: number): Money {
    if (divisor === 0) {
      throw new Error('Cannot divide by zero');
    }
    return Money.fromPiasters(Math.round(this.piasters / divisor));
  }

  /**
   * Calculate percentage (e.g., 7% commission)
   * @param percent - The percentage (e.g., 7 for 7%)
   */
  percent(percent: number): Money {
    return this.multiply(percent / 100);
  }

  /**
   * Get the absolute value
   */
  abs(): Money {
    return Money.fromPiasters(Math.abs(this.piasters));
  }

  /**
   * Negate the amount
   */
  negate(): Money {
    return Money.fromPiasters(-this.piasters);
  }

  /**
   * Get the maximum of this and another Money
   */
  max(other: Money): Money {
    return this.piasters >= other.piasters ? this : other;
  }

  /**
   * Get the minimum of this and another Money
   */
  min(other: Money): Money {
    return this.piasters <= other.piasters ? this : other;
  }

  /**
   * Ensure the amount is not negative (return 0 if negative)
   */
  nonNegative(): Money {
    return this.piasters < 0 ? Money.zero() : this;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Comparison Operations
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check if equal to another Money
   */
  equals(other: Money): boolean {
    return this.piasters === other.piasters;
  }

  /**
   * Check if greater than another Money
   */
  greaterThan(other: Money): boolean {
    return this.piasters > other.piasters;
  }

  /**
   * Check if greater than or equal to another Money
   */
  greaterThanOrEqual(other: Money): boolean {
    return this.piasters >= other.piasters;
  }

  /**
   * Check if less than another Money
   */
  lessThan(other: Money): boolean {
    return this.piasters < other.piasters;
  }

  /**
   * Check if less than or equal to another Money
   */
  lessThanOrEqual(other: Money): boolean {
    return this.piasters <= other.piasters;
  }

  /**
   * Check if zero
   */
  isZero(): boolean {
    return this.piasters === 0;
  }

  /**
   * Check if positive (greater than zero)
   */
  isPositive(): boolean {
    return this.piasters > 0;
  }

  /**
   * Check if negative (less than zero)
   */
  isNegative(): boolean {
    return this.piasters < 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Conversion Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get the amount in pounds (EGP) as a number
   */
  toNumber(): number {
    return this.piasters / 100;
  }

  /**
   * Get the amount in piasters
   */
  toPiasters(): number {
    return this.piasters;
  }

  /**
   * Convert to a fixed-point string (for database storage)
   */
  toFixed(decimals: number = 2): string {
    return this.toNumber().toFixed(decimals);
  }

  /**
   * Convert to JSON-serializable format
   */
  toJSON(): number {
    return this.toNumber();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Formatting Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Format for display with currency
   * @param locale - 'ar' for Arabic, 'en' for English
   */
  format(locale: 'ar' | 'en' = 'ar'): string {
    const amount = this.toNumber().toFixed(2);

    if (locale === 'ar') {
      // Arabic numerals with right-to-left currency
      const arabicNumerals = amount.replace(/\d/g, (d) =>
        String.fromCharCode('٠'.charCodeAt(0) + parseInt(d))
      );
      return `${arabicNumerals} ج.م`;
    }

    return `${amount} EGP`;
  }

  /**
   * Format with Western numerals but localized currency
   */
  formatWestern(locale: 'ar' | 'en' = 'ar'): string {
    const amount = this.toNumber().toFixed(2);
    return locale === 'ar' ? `${amount} ج.م` : `${amount} EGP`;
  }

  /**
   * Format with thousand separators
   */
  formatWithSeparators(locale: 'ar' | 'en' = 'ar'): string {
    const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(this.toNumber());

    return locale === 'ar' ? `${formatted} ج.م` : `${formatted} EGP`;
  }

  /**
   * Format as short form (e.g., 1.5K, 2.3M)
   */
  formatShort(locale: 'ar' | 'en' = 'ar'): string {
    const amount = this.toNumber();
    let formatted: string;

    if (amount >= 1000000) {
      formatted = (amount / 1000000).toFixed(1) + (locale === 'ar' ? 'م' : 'M');
    } else if (amount >= 1000) {
      formatted = (amount / 1000).toFixed(1) + (locale === 'ar' ? 'ك' : 'K');
    } else {
      formatted = amount.toFixed(2);
    }

    return locale === 'ar' ? `${formatted} ج.م` : `${formatted} EGP`;
  }

  /**
   * String representation
   */
  toString(): string {
    return this.toFixed(2);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sum an array of Money values
 */
export function sumMoney(amounts: Money[]): Money {
  return amounts.reduce((acc, m) => acc.add(m), Money.zero());
}

/**
 * Calculate commission from subtotal
 * @param subtotal - The order subtotal (without delivery)
 * @param discount - Any discount applied
 * @param rate - Commission rate as percentage (e.g., 7 for 7%)
 */
export function calculateCommission(
  subtotal: Money,
  discount: Money,
  rate: number
): Money {
  const base = subtotal.subtract(discount).nonNegative();
  return base.percent(rate);
}

/**
 * Calculate refund impact on commission
 * Uses the formula: commission_reduction = refund_amount * commission_rate / order_base
 */
export function calculateRefundCommissionReduction(
  refundAmount: Money,
  orderBase: Money,
  originalCommission: Money
): Money {
  if (orderBase.isZero()) {
    return Money.zero();
  }
  const refundPercentage = refundAmount.toNumber() / orderBase.toNumber();
  return originalCommission.multiply(refundPercentage);
}

/**
 * Calculate net balance (determines who pays whom)
 * @param onlinePayoutOwed - What platform owes merchant for online orders
 * @param codCommissionOwed - What merchant owes platform for COD orders
 * @returns Positive = platform pays provider, Negative = provider pays platform
 */
export function calculateNetBalance(
  onlinePayoutOwed: Money,
  codCommissionOwed: Money
): Money {
  return onlinePayoutOwed.subtract(codCommissionOwed);
}

/**
 * Determine settlement direction from net balance
 */
export function getSettlementDirection(
  netBalance: Money
): 'platform_pays_provider' | 'provider_pays_platform' | 'balanced' {
  // Use 0.50 EGP as threshold to avoid tiny amounts
  const threshold = new Money(0.5);

  if (netBalance.greaterThan(threshold)) {
    return 'platform_pays_provider';
  } else if (netBalance.lessThan(threshold.negate())) {
    return 'provider_pays_platform';
  } else {
    return 'balanced';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Type Exports
// ═══════════════════════════════════════════════════════════════════════════════

export type SettlementDirection =
  | 'platform_pays_provider'
  | 'provider_pays_platform'
  | 'balanced';

export type MoneyInput = number | string | Money;

/**
 * Helper to convert various inputs to Money
 */
export function toMoney(value: MoneyInput): Money {
  if (value instanceof Money) {
    return value;
  }
  return new Money(value);
}

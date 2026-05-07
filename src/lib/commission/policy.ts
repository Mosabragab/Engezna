/**
 * Commission policy — single source of truth for the merchant commission
 * calculation, mirroring exactly what the DB trigger
 * `calculate_order_commission()` does (see migration
 * 20251224220000_fix_commission_excludes_delivery.sql).
 *
 * Rules, in order:
 *   1. The nominal rate is `custom_commission_rate` if set, otherwise
 *      `commission_rate`, otherwise the platform default of 7.0.
 *   2. The nominal rate is capped at 7.0 — admin policy: even if a higher
 *      rate is stored, the platform never charges above 7%.
 *   3. The effective rate is 0 when the provider is in an active grace
 *      period (`commission_status = 'in_grace_period'` AND either
 *      `grace_period_start IS NULL` OR `now < grace_period_end`), or when
 *      the provider is exempt (`commission_status = 'exempt'`).
 *   4. Otherwise the effective rate equals the nominal rate.
 *
 * The frontend NEVER computes commission from item subtotal tiers — that
 * was an old bug. Each provider has a fixed admin-negotiated rate stored
 * on `providers.commission_rate`; the merchant must see exactly the rate
 * that will actually be charged.
 */

export const COMMISSION_CAP_PERCENT = 7.0;
export const COMMISSION_DEFAULT_PERCENT = 7.0;

export type CommissionStatus = 'normal' | 'in_grace_period' | 'exempt' | string;

export type ProviderCommissionSettings = {
  commission_rate: number | null;
  custom_commission_rate: number | null;
  commission_status: CommissionStatus | null;
  grace_period_start: string | null;
  grace_period_end: string | null;
};

export type CommissionSituation = 'normal' | 'grace' | 'exempt';

export type CommissionResult = {
  /** Nominal rate after the 7% cap (e.g. 5, 6, 7). Always > 0. */
  theoreticalRate: number;
  /** Actual rate the merchant will be charged — 0 during grace/exempt. */
  effectiveRate: number;
  /** Nominal commission amount (mirrors `original_commission` in the DB). */
  theoreticalAmount: number;
  /** Actual commission charged (mirrors `platform_commission` in the DB). */
  effectiveAmount: number;
  /** Net the merchant keeps after the effective commission. */
  netAmount: number;
  /** What situation the provider is currently in — drives the UI banner. */
  situation: CommissionSituation;
  /** Grace period end as a Date, present only in 'grace' situation. */
  graceEndDate: Date | null;
};

function resolveNominalRate(settings: ProviderCommissionSettings): number {
  const raw =
    settings.custom_commission_rate ?? settings.commission_rate ?? COMMISSION_DEFAULT_PERCENT;
  return Math.min(raw, COMMISSION_CAP_PERCENT);
}

function isInGracePeriod(settings: ProviderCommissionSettings, orderDate: Date): boolean {
  if (settings.commission_status !== 'in_grace_period') return false;
  // Two valid grace cases (matches the trigger):
  //   a) grace started but hasn't expired yet (orderDate < grace_period_end)
  //   b) grace hasn't started yet (grace_period_start IS NULL)
  if (settings.grace_period_start === null) return true;
  if (settings.grace_period_end !== null) {
    return orderDate < new Date(settings.grace_period_end);
  }
  return false;
}

/**
 * Compute the commission for a base amount given the provider's
 * commission settings. `orderDate` defaults to now and is only used
 * to decide whether the grace period is still active.
 */
export function computeCommission(
  settings: ProviderCommissionSettings,
  baseAmount: number,
  orderDate: Date = new Date()
): CommissionResult {
  const theoreticalRate = resolveNominalRate(settings);
  const baseSafe = Math.max(baseAmount, 0);
  const theoreticalAmount = round2((baseSafe * theoreticalRate) / 100);

  const isGrace = isInGracePeriod(settings, orderDate);
  const isExempt = settings.commission_status === 'exempt';

  let situation: CommissionSituation = 'normal';
  let effectiveRate = theoreticalRate;
  let effectiveAmount = theoreticalAmount;
  let graceEndDate: Date | null = null;

  if (isGrace) {
    situation = 'grace';
    effectiveRate = 0;
    effectiveAmount = 0;
    graceEndDate = settings.grace_period_end ? new Date(settings.grace_period_end) : null;
  } else if (isExempt) {
    situation = 'exempt';
    effectiveRate = 0;
    effectiveAmount = 0;
  }

  return {
    theoreticalRate,
    effectiveRate,
    theoreticalAmount,
    effectiveAmount,
    netAmount: round2(baseSafe - effectiveAmount),
    situation,
    graceEndDate,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export { GiftEngine, createGiftEngine } from './engine';
export { RuleEngine, createRuleEngine, evaluateConditions, type Facts } from './rule-engine';
export {
  pickWeightedRandom,
  calculateExpectedCost,
  getDefaultPrizes,
  type MysteryBoxPrize,
} from './mystery-box';

export {
  getDefaultSettings,
  getTieredGiftCap,
  calculateMaxDiscount,
  clampGiftValue,
  getBucketLimit,
  getBucketLimitWithTolerance,
  checkBudgetAvailable,
  isOrderEligibleForStamp,
  isOrderEligibleForGift,
  isReferralEligible,
  calculateClawbackPoints,
  shouldClawback,
  calculateGiftExpiry,
  calculateLoyaltyPoints,
  pointsToDiscount,
} from './helpers';

export type {
  Gift,
  GiftBoxEntry,
  GiftStamp,
  RetentionSettings,
  GrantGiftParams,
  UseGiftParams,
  GiftFinancialLogEntry,
  GiftType,
  GiftSource,
  GiftEntryStatus,
  CustomerSegment,
  FinancialLogType,
  FunderType,
  FaultSource,
  BucketName,
  BudgetStatus,
  AnySupabaseClient,
} from './types';

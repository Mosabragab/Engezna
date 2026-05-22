/**
 * Tier Rewards Service (v2.5.2)
 *
 * Concrete tier benefits (delivery discounts, free deliveries, monthly
 * boxes). Replaces the old "probability +10%" rewards that were invisible
 * to users.
 *
 * Tier matrix:
 *   🥉 Bronze   (0-499)       → basics only
 *   🥈 Silver   (500-1,499)   → 20% off delivery (always)
 *   🥇 Gold     (1,500-4,999) → 30% off + 1 free delivery/month + priority
 *   💎 Platinum (5,000+)      → free delivery ≥400 EGP + monthly box + AM
 *
 * Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §2.5.2 (v2.5.2)
 */

import type {
  AnySupabaseClient,
  LoyaltyTier,
  TierBenefitsForCheckout,
  TierBenefitsUsage,
  TierConfig,
} from './types';

export class TierRewardsService {
  constructor(private supabase: AnySupabaseClient) {}

  /**
   * Computes the tier benefits applicable to a checkout. The SQL function
   * reads current tier, free delivery quota, and order subtotal to decide:
   *   - Can the user get free delivery?
   *   - If not, what's the discount %?
   */
  async getBenefitsForCheckout(
    userId: string,
    orderSubtotalPiasters: number
  ): Promise<TierBenefitsForCheckout> {
    const { data, error } = await this.supabase.rpc('get_tier_benefits_for_checkout', {
      p_user_id: userId,
      p_order_subtotal_piasters: orderSubtotalPiasters,
    });

    if (error) {
      throw new Error(`TierRewardsService.getBenefitsForCheckout failed: ${error.message}`);
    }

    const row = data as {
      tier: LoyaltyTier;
      badge_emoji: string;
      delivery_discount_percent: number;
      can_use_free_delivery: boolean;
      free_deliveries_remaining: number;
      priority_support: boolean;
    };

    return {
      tier: row.tier,
      badgeEmoji: row.badge_emoji,
      deliveryDiscountPercent: Number(row.delivery_discount_percent),
      canUseFreeDelivery: row.can_use_free_delivery,
      freeDeliveriesRemaining: row.free_deliveries_remaining,
      prioritySupport: row.priority_support,
    };
  }

  /**
   * Marks one free delivery as consumed for this user/month. Called after
   * the order is created and free delivery was actually applied.
   *
   * Platinum: unlimited (skip this call).
   * Gold: increments the monthly counter.
   */
  async consumeFreeDelivery(userId: string, orderId: string): Promise<void> {
    const { error } = await this.supabase.rpc('consume_tier_free_delivery', {
      p_user_id: userId,
      p_order_id: orderId,
    });

    if (error) {
      throw new Error(`TierRewardsService.consumeFreeDelivery failed: ${error.message}`);
    }
  }

  /**
   * Reads the current tier_rewards config (for admin UI).
   */
  async getAllConfig(): Promise<TierConfig[]> {
    const { data, error } = await this.supabase.from('tier_rewards').select('*').order('tier');

    if (error) {
      throw new Error(`TierRewardsService.getAllConfig failed: ${error.message}`);
    }

    return (data ?? []).map((row: Record<string, unknown>) => ({
      tier: row.tier as LoyaltyTier,
      deliveryDiscountPercent: Number(row.delivery_discount_percent),
      freeDeliveriesPerMonth: row.free_deliveries_per_month as number,
      freeDeliveryMinOrderPiasters: row.free_delivery_min_order_piasters as number | null,
      freeDeliveryUnlimited: Boolean(row.free_delivery_unlimited),
      monthlyBoxValuePiasters: row.monthly_box_value_piasters as number,
      prioritySupport: Boolean(row.priority_support),
      accountManager: Boolean(row.account_manager),
      badgeEmoji: (row.badge_emoji as string | null) ?? null,
      labelAr: (row.label_ar as string | null) ?? null,
      labelEn: (row.label_en as string | null) ?? null,
    }));
  }

  /**
   * Updates a tier's config (admin-only). Service-role caller required.
   */
  async updateConfig(tier: LoyaltyTier, patch: Partial<Omit<TierConfig, 'tier'>>): Promise<void> {
    const dbPatch: Record<string, unknown> = {};
    if (patch.deliveryDiscountPercent !== undefined)
      dbPatch.delivery_discount_percent = patch.deliveryDiscountPercent;
    if (patch.freeDeliveriesPerMonth !== undefined)
      dbPatch.free_deliveries_per_month = patch.freeDeliveriesPerMonth;
    if (patch.freeDeliveryMinOrderPiasters !== undefined)
      dbPatch.free_delivery_min_order_piasters = patch.freeDeliveryMinOrderPiasters;
    if (patch.freeDeliveryUnlimited !== undefined)
      dbPatch.free_delivery_unlimited = patch.freeDeliveryUnlimited;
    if (patch.monthlyBoxValuePiasters !== undefined)
      dbPatch.monthly_box_value_piasters = patch.monthlyBoxValuePiasters;
    if (patch.prioritySupport !== undefined) dbPatch.priority_support = patch.prioritySupport;
    if (patch.accountManager !== undefined) dbPatch.account_manager = patch.accountManager;
    dbPatch.updated_at = new Date().toISOString();

    const { error } = await this.supabase.from('tier_rewards').update(dbPatch).eq('tier', tier);

    if (error) {
      throw new Error(`TierRewardsService.updateConfig failed: ${error.message}`);
    }
  }

  /**
   * Reads the user's monthly usage (free deliveries used + monthly box state).
   */
  async getMonthlyUsage(userId: string, monthYear?: string): Promise<TierBenefitsUsage | null> {
    const ym = monthYear ?? new Date().toISOString().slice(0, 7);

    const { data, error } = await this.supabase
      .from('tier_benefits_usage')
      .select(
        'user_id, month_year, free_deliveries_used, monthly_box_granted_at, monthly_box_entry_id'
      )
      .eq('user_id', userId)
      .eq('month_year', ym)
      .maybeSingle();

    if (error) {
      throw new Error(`TierRewardsService.getMonthlyUsage failed: ${error.message}`);
    }

    if (!data) return null;

    return {
      userId: data.user_id,
      monthYear: data.month_year,
      freeDeliveriesUsed: data.free_deliveries_used,
      monthlyBoxGrantedAt: data.monthly_box_granted_at,
      monthlyBoxEntryId: data.monthly_box_entry_id,
    };
  }
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TierRewardsService } from '@/lib/tier-rewards';
import type { AnySupabaseClient, LoyaltyTier } from '@/lib/tier-rewards';

/**
 * v2.5.2 — TierRewardsService is the server-side wrapper used by the
 * checkout API + admin pages. The hook lives in use-tier-benefits.ts and
 * is tested separately (tier-rewards.test.ts).
 */

describe('TierRewardsService', () => {
  let rpc: ReturnType<typeof vi.fn>;
  let service: TierRewardsService;

  beforeEach(() => {
    rpc = vi.fn();
    service = new TierRewardsService({ rpc } as unknown as AnySupabaseClient);
  });

  describe('getBenefitsForCheckout', () => {
    it('maps the RPC snake_case response to camelCase', async () => {
      rpc.mockResolvedValueOnce({
        data: {
          tier: 'silver',
          badge_emoji: '🥈',
          delivery_discount_percent: 20,
          can_use_free_delivery: false,
          free_deliveries_remaining: 0,
          priority_support: false,
        },
        error: null,
      });

      const result = await service.getBenefitsForCheckout('user-1', 30_000);

      expect(rpc).toHaveBeenCalledWith('get_tier_benefits_for_checkout', {
        p_user_id: 'user-1',
        p_order_subtotal_piasters: 30_000,
      });
      expect(result.tier).toBe('silver');
      expect(result.badgeEmoji).toBe('🥈');
      expect(result.deliveryDiscountPercent).toBe(20);
      expect(result.canUseFreeDelivery).toBe(false);
      expect(result.freeDeliveriesRemaining).toBe(0);
    });

    it('marshals Platinum free-delivery (-1 = unlimited) correctly', async () => {
      rpc.mockResolvedValueOnce({
        data: {
          tier: 'platinum',
          badge_emoji: '💎',
          delivery_discount_percent: 0,
          can_use_free_delivery: true,
          free_deliveries_remaining: -1,
          priority_support: true,
        },
        error: null,
      });

      const result = await service.getBenefitsForCheckout('user-1', 50_000);
      expect(result.tier).toBe('platinum');
      expect(result.canUseFreeDelivery).toBe(true);
      expect(result.freeDeliveriesRemaining).toBe(-1);
      expect(result.prioritySupport).toBe(true);
    });

    it('throws on RPC error (e.g. auth.uid() mismatch from migration 009)', async () => {
      rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'unauthorized_user_mismatch' },
      });
      await expect(service.getBenefitsForCheckout('user-1', 30_000)).rejects.toThrow(
        'unauthorized_user_mismatch'
      );
    });
  });

  describe('consumeFreeDelivery', () => {
    it('calls the idempotent consumption RPC with user + order ids', async () => {
      rpc.mockResolvedValueOnce({ data: { consumed: true, month: '2026-05' }, error: null });
      await service.consumeFreeDelivery('user-1', 'order-1');
      expect(rpc).toHaveBeenCalledWith('consume_tier_free_delivery', {
        p_user_id: 'user-1',
        p_order_id: 'order-1',
      });
    });

    it('throws on RPC error', async () => {
      rpc.mockResolvedValueOnce({ data: null, error: { message: 'consumption_failed' } });
      await expect(service.consumeFreeDelivery('user-1', 'order-1')).rejects.toThrow(
        'consumption_failed'
      );
    });
  });

  describe('updateConfig (admin)', () => {
    it('translates camelCase fields to snake_case before update', async () => {
      // Mock the .from().update().eq() chain
      const eq = vi.fn().mockResolvedValueOnce({ data: null, error: null });
      const update = vi.fn(() => ({ eq }));
      const from = vi.fn(() => ({ update }));
      const client = { rpc, from } as unknown as AnySupabaseClient;
      const s = new TierRewardsService(client);

      await s.updateConfig('silver' as LoyaltyTier, {
        deliveryDiscountPercent: 25,
        prioritySupport: true,
      });

      expect(from).toHaveBeenCalledWith('tier_rewards');
      const firstCall = update.mock.calls[0] as unknown[] | undefined;
      const passedPatch = (firstCall?.[0] ?? {}) as Record<string, unknown>;
      expect(passedPatch.delivery_discount_percent).toBe(25);
      expect(passedPatch.priority_support).toBe(true);
      expect(passedPatch.updated_at).toBeDefined();
      expect(eq).toHaveBeenCalledWith('tier', 'silver');
    });
  });
});

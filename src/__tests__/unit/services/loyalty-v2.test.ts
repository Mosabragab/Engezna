import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoyaltyService } from '@/lib/loyalty';

/**
 * v2.5.2 — LoyaltyService now routes through the new `award_order_loyalty_points`
 * RPC that:
 *   • blocks all earnings when discount > 0
 *   • applies loyalty_multiplier (Mega Referrer 1.25×) × streak (Platinum 1.10×)
 *   • returns `{ points, base_points, multiplier, reason, new_balance, new_lifetime, new_tier }`
 *
 * The TS wrapper must:
 *   1. Pass both subtotal AND discount piasters
 *   2. Surface skipReason when points === 0 (so callers can show the
 *      "no points on discounted orders" message)
 *   3. Map snake_case → camelCase
 *   4. Provide a separate awardRatingBonus method routing to the
 *      `award_rating_bonus` RPC (5★ = 20 points in v2.5.2)
 */

function makeClient() {
  const rpc = vi.fn();
  return { rpc, client: { rpc } as unknown as ConstructorParameters<typeof LoyaltyService>[0] };
}

describe('LoyaltyService (v2.5.2)', () => {
  let rpc: ReturnType<typeof vi.fn>;
  let service: LoyaltyService;

  beforeEach(() => {
    const m = makeClient();
    rpc = m.rpc;
    service = new LoyaltyService(m.client);
  });

  describe('awardOrderPoints', () => {
    it('passes subtotal AND discount to the v2.5.2 RPC', async () => {
      rpc.mockResolvedValueOnce({
        data: {
          points: 30,
          base_points: 30,
          multiplier: 1,
          new_balance: 130,
          new_lifetime: 530,
          new_tier: 'silver',
        },
        error: null,
      });

      const result = await service.awardOrderPoints('user-1', 'order-1', 30_000, 0);

      expect(rpc).toHaveBeenCalledWith('award_order_loyalty_points', {
        p_user_id: 'user-1',
        p_order_id: 'order-1',
        p_subtotal_piasters: 30_000,
        p_discount_piasters: 0,
      });
      expect(result.success).toBe(true);
      expect(result.pointsAwarded).toBe(30);
      expect(result.newTier).toBe('silver');
    });

    it('defaults discount to 0 when not passed', async () => {
      rpc.mockResolvedValueOnce({
        data: { points: 30, base_points: 30, multiplier: 1, new_balance: 30, new_tier: 'bronze' },
        error: null,
      });
      await service.awardOrderPoints('user-1', 'order-1', 30_000);
      expect(rpc.mock.calls[0][1].p_discount_piasters).toBe(0);
    });

    it('surfaces skipReason "discount_applied" when discount > 0', async () => {
      rpc.mockResolvedValueOnce({
        data: { points: 0, reason: 'discount_applied' },
        error: null,
      });

      const result = await service.awardOrderPoints('user-1', 'order-1', 30_000, 1_000);
      expect(result.pointsAwarded).toBe(0);
      expect(result.skipReason).toBe('discount_applied');
    });

    it('surfaces skipReason "already_awarded" on duplicate calls', async () => {
      rpc.mockResolvedValueOnce({
        data: { points: 0, reason: 'already_awarded' },
        error: null,
      });

      const result = await service.awardOrderPoints('user-1', 'order-1', 30_000, 0);
      expect(result.skipReason).toBe('already_awarded');
    });

    it('reports the combined multiplier from Mega Referrer × Streak', async () => {
      // Mega Referrer 1.25× × Streak Platinum 1.10× = 1.375
      rpc.mockResolvedValueOnce({
        data: {
          points: 41,
          base_points: 30,
          multiplier: 1.375,
          new_balance: 41,
          new_tier: 'bronze',
        },
        error: null,
      });

      const result = await service.awardOrderPoints('user-1', 'order-1', 30_000, 0);
      expect(result.multiplier).toBeCloseTo(1.375);
      expect(result.basePoints).toBe(30);
      expect(result.pointsAwarded).toBe(41);
    });

    it('throws when the RPC errors', async () => {
      rpc.mockResolvedValueOnce({ data: null, error: { message: 'rls_violation' } });
      await expect(service.awardOrderPoints('user-1', 'order-1', 30_000, 0)).rejects.toThrow(
        'rls_violation'
      );
    });
  });

  describe('awardRatingBonus', () => {
    it('routes to the award_rating_bonus RPC and maps new_balance → newBalance', async () => {
      // RPC returns snake_case (matches migration 010 contract).
      rpc.mockResolvedValueOnce({
        data: { points: 20, new_balance: 50 },
        error: null,
      });

      const result = await service.awardRatingBonus('user-1', 'order-1', 5);

      expect(rpc).toHaveBeenCalledWith('award_rating_bonus', {
        p_user_id: 'user-1',
        p_order_id: 'order-1',
        p_stars: 5,
      });
      // Critical v2.5.2 fix from PR review: do not return raw snake_case.
      expect(result.newBalance).toBe(50);
      expect(result.points).toBe(20);
    });

    it('surfaces "below_5_stars" reason for 4★ ratings', async () => {
      rpc.mockResolvedValueOnce({
        data: { points: 0, reason: 'below_5_stars' },
        error: null,
      });
      const result = await service.awardRatingBonus('user-1', 'order-1', 4);
      expect(result.points).toBe(0);
      expect(result.reason).toBe('below_5_stars');
    });

    it('surfaces "ownership_mismatch" (migration 010 hardening)', async () => {
      rpc.mockResolvedValueOnce({
        data: { points: 0, reason: 'ownership_mismatch' },
        error: null,
      });
      const result = await service.awardRatingBonus('user-1', 'other-users-order', 5);
      expect(result.reason).toBe('ownership_mismatch');
    });
  });
});

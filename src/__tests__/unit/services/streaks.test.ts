import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StreakService, QUALIFYING_ORDER_THRESHOLD_PIASTERS } from '@/lib/streaks';
import type { AnySupabaseClient } from '@/lib/streaks';

/**
 * v2.5.2 — StreakService wraps the SQL RPCs `update_customer_streak`,
 * `reset_inactive_streaks`, and the `customer_streaks` select. These tests
 * mock the Supabase client and verify call contracts + return-value shape.
 */

function makeMockClient() {
  const rpc = vi.fn();
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return {
    rpc,
    from,
    maybeSingle,
    client: { rpc, from } as unknown as AnySupabaseClient,
  };
}

describe('StreakService', () => {
  let rpc: ReturnType<typeof vi.fn>;
  let service: StreakService;

  beforeEach(() => {
    const m = makeMockClient();
    rpc = m.rpc;
    service = new StreakService(m.client);
  });

  describe('isQualifyingOrder', () => {
    it('rejects orders below the 200 EGP threshold', () => {
      expect(service.isQualifyingOrder(0)).toBe(false);
      expect(service.isQualifyingOrder(QUALIFYING_ORDER_THRESHOLD_PIASTERS - 1)).toBe(false);
    });

    it('accepts orders at or above the threshold', () => {
      expect(service.isQualifyingOrder(QUALIFYING_ORDER_THRESHOLD_PIASTERS)).toBe(true);
      expect(service.isQualifyingOrder(50_000)).toBe(true);
    });
  });

  describe('update', () => {
    it('calls the RPC with correct params and forwards the result', async () => {
      rpc.mockResolvedValueOnce({
        data: { updated: true, streak: 5, tier: 'none', milestone_points: 0, multiplier: 1 },
        error: null,
      });

      const result = await service.update('user-1', 25_000);

      expect(rpc).toHaveBeenCalledWith('update_customer_streak', {
        p_user_id: 'user-1',
        p_order_value_piasters: 25_000,
      });
      // RPC returns snake_case; service passes through unchanged
      // (the page consumer reads `updated` + `streak` directly).
      expect(result.updated).toBe(true);
    });

    it('throws when the RPC returns an error', async () => {
      rpc.mockResolvedValueOnce({ data: null, error: { message: 'rpc_failed' } });
      await expect(service.update('user-1', 25_000)).rejects.toThrow('rpc_failed');
    });

    it('forwards "below_threshold" reason from the RPC without erroring', async () => {
      rpc.mockResolvedValueOnce({
        data: { updated: false, reason: 'below_threshold', threshold_piasters: 20_000 },
        error: null,
      });

      const result = await service.update('user-1', 5_000);
      expect(result.updated).toBe(false);
      expect(result.reason).toBe('below_threshold');
    });
  });

  describe('resetInactive', () => {
    it('returns the numeric count from the RPC', async () => {
      rpc.mockResolvedValueOnce({ data: 7, error: null });
      const count = await service.resetInactive();
      expect(count).toBe(7);
      expect(rpc).toHaveBeenCalledWith('reset_inactive_streaks');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MegaReferrerService,
  MEGA_REFERRER_THRESHOLD,
  MEGA_REFERRER_MULTIPLIER,
} from '@/lib/mega-referrer';
import type { AnySupabaseClient } from '@/lib/mega-referrer';

/**
 * v2.5.2 — MegaReferrerService wraps the SQL RPC
 * `check_and_grant_mega_referrer` + the leaderboard RPC. The race-safe
 * slot-claim logic lives in SQL (FOR UPDATE SKIP LOCKED) — these tests
 * verify the TypeScript wrapper preserves the contract.
 */

describe('MegaReferrerService', () => {
  let rpc: ReturnType<typeof vi.fn>;
  let service: MegaReferrerService;

  beforeEach(() => {
    rpc = vi.fn();
    service = new MegaReferrerService({ rpc } as unknown as AnySupabaseClient);
  });

  describe('constants', () => {
    it('exposes the 10-referral threshold', () => {
      expect(MEGA_REFERRER_THRESHOLD).toBe(10);
    });
    it('exposes the permanent 1.25× multiplier', () => {
      expect(MEGA_REFERRER_MULTIPLIER).toBe(1.25);
    });
  });

  describe('checkAndGrant', () => {
    it('returns granted=true with rank + multiplier on successful claim', async () => {
      rpc.mockResolvedValueOnce({
        data: { granted: true, rank: 3, multiplier: 1.25, count: 10 },
        error: null,
      });

      const result = await service.checkAndGrant('user-1');

      expect(rpc).toHaveBeenCalledWith('check_and_grant_mega_referrer', { p_user_id: 'user-1' });
      expect(result.granted).toBe(true);
      expect(result.rank).toBe(3);
      expect(result.multiplier).toBe(1.25);
    });

    it('returns granted=false with reason "below_threshold" when count < 10', async () => {
      rpc.mockResolvedValueOnce({
        data: { granted: false, reason: 'below_threshold', count: 7, remaining: 3 },
        error: null,
      });

      const result = await service.checkAndGrant('user-1');
      expect(result.granted).toBe(false);
      expect(result.reason).toBe('below_threshold');
      expect(result.count).toBe(7);
      expect(result.remaining).toBe(3);
    });

    it('returns granted=false with reason "all_slots_taken" when slots full', async () => {
      rpc.mockResolvedValueOnce({
        data: { granted: false, reason: 'all_slots_taken', count: 12 },
        error: null,
      });

      const result = await service.checkAndGrant('user-1');
      expect(result.granted).toBe(false);
      expect(result.reason).toBe('all_slots_taken');
    });

    it('throws when the RPC returns an error', async () => {
      rpc.mockResolvedValueOnce({ data: null, error: { message: 'db_locked' } });
      await expect(service.checkAndGrant('user-1')).rejects.toThrow('db_locked');
    });
  });

  describe('getLeaderboard', () => {
    it('maps snake_case rows from the RPC to camelCase entries', async () => {
      rpc.mockResolvedValueOnce({
        data: [
          {
            rank: 1,
            display_name: 'Ali',
            qualified_at: '2026-05-15T10:00:00Z',
            referrals_count: 25,
            is_filled: true,
          },
          {
            rank: 2,
            display_name: null,
            qualified_at: null,
            referrals_count: null,
            is_filled: false,
          },
        ],
        error: null,
      });

      const result = await service.getLeaderboard();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        rank: 1,
        displayName: 'Ali',
        qualifiedAt: '2026-05-15T10:00:00Z',
        referralsCount: 25,
        isFilled: true,
      });
      expect(result[1].isFilled).toBe(false);
      expect(result[1].displayName).toBeNull();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WelcomeBoxService } from '@/lib/welcome-box';
import type { AnySupabaseClient } from '@/lib/welcome-box';

/**
 * v2.5.2 — WelcomeBoxService wraps the SQL RPC `grant_welcome_box_atomic`
 * (idempotent grant) and the profile-based state reads.
 */

function makeClient() {
  const rpc = vi.fn();
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  // For `.in(...)` chained after `.eq(...)`, we re-use the same maybeSingle.
  const inFn = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq, in: inFn }));
  const from = vi.fn(() => ({ select }));
  return {
    rpc,
    maybeSingle,
    client: { rpc, from } as unknown as AnySupabaseClient,
  };
}

describe('WelcomeBoxService', () => {
  let rpc: ReturnType<typeof vi.fn>;
  let maybeSingle: ReturnType<typeof vi.fn>;
  let service: WelcomeBoxService;

  beforeEach(() => {
    const m = makeClient();
    rpc = m.rpc;
    maybeSingle = m.maybeSingle;
    service = new WelcomeBoxService(m.client);
  });

  describe('grant', () => {
    it('returns granted=true with entry id on first call', async () => {
      rpc.mockResolvedValueOnce({
        data: {
          granted: true,
          entry_id: 'entry-uuid-1',
          expires_at: '2026-05-29T00:00:00Z',
          gift_type: 'free_delivery',
        },
        error: null,
      });

      const result = await service.grant('user-1');
      expect(rpc).toHaveBeenCalledWith('grant_welcome_box_atomic', { p_user_id: 'user-1' });
      expect(result.granted).toBe(true);
    });

    it('returns granted=false with reason already_granted on repeat calls (idempotent)', async () => {
      rpc.mockResolvedValueOnce({
        data: {
          granted: false,
          reason: 'already_granted',
          granted_at: '2026-05-20T00:00:00Z',
        },
        error: null,
      });

      const result = await service.grant('user-1');
      expect(result.granted).toBe(false);
      expect(result.reason).toBe('already_granted');
    });

    it('throws when the RPC returns an error', async () => {
      rpc.mockResolvedValueOnce({ data: null, error: { message: 'rls_violation' } });
      await expect(service.grant('user-1')).rejects.toThrow('rls_violation');
    });
  });

  describe('getState', () => {
    it('returns a "not granted" snapshot for a fresh user', async () => {
      maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const state = await service.getState('user-1');
      expect(state).toEqual({
        granted: false,
        grantedAt: null,
        usedAt: null,
        entryId: null,
      });
    });

    it('returns a fully populated snapshot when the welcome was used', async () => {
      maybeSingle.mockResolvedValueOnce({
        data: {
          welcome_box_granted_at: '2026-05-20T10:00:00Z',
          welcome_box_used_at: '2026-05-21T12:00:00Z',
          welcome_box_entry_id: 'entry-uuid-1',
        },
        error: null,
      });

      const state = await service.getState('user-1');
      expect(state).toEqual({
        granted: true,
        grantedAt: '2026-05-20T10:00:00Z',
        usedAt: '2026-05-21T12:00:00Z',
        entryId: 'entry-uuid-1',
      });
    });

    it('throws when the underlying query errors', async () => {
      maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'permission_denied' } });
      await expect(service.getState('user-1')).rejects.toThrow('permission_denied');
    });
  });
});

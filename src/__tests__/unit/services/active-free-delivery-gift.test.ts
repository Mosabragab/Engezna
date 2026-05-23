/**
 * v2.5.2 — useActiveFreeDeliveryGift hook test
 *
 * The hook talks to /api/rewards. We mock global fetch and verify it
 * picks the right entry (first granted/opened free_delivery) and
 * gracefully handles all the non-happy paths (401, 5xx, network, no
 * matching entry).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useActiveFreeDeliveryGift } from '@/lib/gifts/use-active-free-delivery-gift';

function mockFetchOnce(response: { ok: boolean; status?: number; json?: () => Promise<unknown> }) {
  globalThis.fetch = vi.fn().mockResolvedValueOnce({
    ok: response.ok,
    status: response.status ?? 200,
    json: response.json ?? (() => Promise.resolve({})),
  } as Response);
}

describe('useActiveFreeDeliveryGift', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
  });

  it('returns the first granted free_delivery entry', async () => {
    mockFetchOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          gifts: [
            // Wrong type — should be skipped
            {
              id: 'g1',
              status: 'granted',
              expires_at: '2026-06-01T00:00:00Z',
              cost_piasters: 1000,
              gift: { type: 'discount_code', title_ar: 'كود خصم', title_en: 'Discount code' },
            },
            // Right type, granted — should be picked
            {
              id: 'g2',
              status: 'granted',
              expires_at: '2026-06-01T00:00:00Z',
              cost_piasters: 2250,
              gift: {
                type: 'free_delivery',
                title_ar: 'هدية الترحيب',
                title_en: 'Welcome gift',
              },
            },
            // Second free_delivery — should NOT win (first match takes it)
            {
              id: 'g3',
              status: 'granted',
              expires_at: '2026-06-15T00:00:00Z',
              cost_piasters: 1800,
              gift: { type: 'free_delivery', title_ar: 'مفاجأة', title_en: 'Surprise' },
            },
          ],
        }),
    });

    const { result } = renderHook(() => useActiveFreeDeliveryGift());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.gift).not.toBeNull();
    expect(result.current.gift?.entryId).toBe('g2');
    expect(result.current.gift?.titleAr).toBe('هدية الترحيب');
    expect(result.current.gift?.costPiasters).toBe(2250);
  });

  it('accepts opened status too (welcome box auto-opens)', async () => {
    mockFetchOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          gifts: [
            {
              id: 'g1',
              status: 'opened',
              expires_at: '2026-06-01T00:00:00Z',
              cost_piasters: 2250,
              gift: { type: 'free_delivery', title_ar: 'X', title_en: 'X' },
            },
          ],
        }),
    });

    const { result } = renderHook(() => useActiveFreeDeliveryGift());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.gift?.entryId).toBe('g1');
  });

  it('returns null when no free_delivery entries exist', async () => {
    mockFetchOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          gifts: [
            {
              id: 'g1',
              status: 'granted',
              expires_at: '2026-06-01T00:00:00Z',
              cost_piasters: 1000,
              gift: { type: 'discount_code', title_ar: 'X', title_en: 'X' },
            },
          ],
        }),
    });

    const { result } = renderHook(() => useActiveFreeDeliveryGift());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.gift).toBeNull();
  });

  it('skips used / expired entries even if free_delivery', async () => {
    mockFetchOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          gifts: [
            {
              id: 'g1',
              status: 'used',
              expires_at: '2026-06-01T00:00:00Z',
              cost_piasters: 2250,
              gift: { type: 'free_delivery', title_ar: 'X', title_en: 'X' },
            },
            {
              id: 'g2',
              status: 'expired',
              expires_at: '2026-01-01T00:00:00Z',
              cost_piasters: 2250,
              gift: { type: 'free_delivery', title_ar: 'Y', title_en: 'Y' },
            },
          ],
        }),
    });

    const { result } = renderHook(() => useActiveFreeDeliveryGift());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.gift).toBeNull();
  });

  it('skips granted free_delivery entries that are already past expires_at', async () => {
    // v2.5.2 nitpick: defend-in-depth against a stale list returning a
    // server-side-expired entry that hasn't been swept yet.
    const pastIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    mockFetchOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          gifts: [
            {
              id: 'g1',
              status: 'granted',
              expires_at: pastIso, // yesterday — should be excluded
              cost_piasters: 2250,
              gift: { type: 'free_delivery', title_ar: 'X', title_en: 'X' },
            },
          ],
        }),
    });

    const { result } = renderHook(() => useActiveFreeDeliveryGift());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.gift).toBeNull();
  });

  it('returns null on 401 unauthenticated', async () => {
    mockFetchOnce({ ok: false, status: 401 });
    const { result } = renderHook(() => useActiveFreeDeliveryGift());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.gift).toBeNull();
  });

  it('returns null on network failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useActiveFreeDeliveryGift());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.gift).toBeNull();
  });
});

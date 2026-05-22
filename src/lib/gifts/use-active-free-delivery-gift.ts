'use client';

import { useEffect, useState } from 'react';

/**
 * useActiveFreeDeliveryGift (v2.5.2)
 *
 * Fetches the authenticated user's gift box from /api/rewards and returns
 * the first GRANTED `free_delivery` entry (typically the Welcome Box).
 *
 * Used by the checkout page to auto-apply the gift's delivery waiver
 * without making the user remember to "redeem" anything — clicking
 * "Use Now" on the rewards page just redirects to /providers; the actual
 * redemption happens here at checkout.
 *
 * Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §2.1.5 (v2.5.2)
 */

export interface ActiveFreeDeliveryGift {
  entryId: string;
  /** Display title in the user's locale */
  titleAr: string;
  titleEn: string;
  /** Cost to Engezna in piasters (informational — used as the discount amount) */
  costPiasters: number;
  expiresAt: string;
}

interface UseActiveFreeDeliveryGiftResult {
  gift: ActiveFreeDeliveryGift | null;
  loading: boolean;
  /** Re-fetch on demand (e.g. after the user uses the gift on another tab) */
  refresh: () => void;
}

export function useActiveFreeDeliveryGift(): UseActiveFreeDeliveryGiftResult {
  const [gift, setGift] = useState<ActiveFreeDeliveryGift | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch('/api/rewards');
        if (cancelled) return;
        if (res.status === 401) {
          setGift(null);
          return;
        }
        if (!res.ok) {
          setGift(null);
          return;
        }

        const data = (await res.json()) as {
          gifts?: Array<{
            id: string;
            status: string;
            expires_at: string;
            cost_piasters: number;
            gift?: { type?: string; title_ar?: string; title_en?: string };
          }>;
        };

        // First granted free_delivery entry. Granted = not yet used / opened
        // (Welcome Box is granted+pre-revealed since the modal handles reveal).
        const candidate = (data.gifts ?? []).find(
          (g) =>
            (g.status === 'granted' || g.status === 'opened') && g.gift?.type === 'free_delivery'
        );

        if (cancelled) return;

        if (!candidate) {
          setGift(null);
          return;
        }

        setGift({
          entryId: candidate.id,
          titleAr: candidate.gift?.title_ar ?? 'هدية ترحيب',
          titleEn: candidate.gift?.title_en ?? 'Welcome gift',
          costPiasters: candidate.cost_piasters,
          expiresAt: candidate.expires_at,
        });
      } catch {
        if (!cancelled) setGift(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  return {
    gift,
    loading,
    refresh: () => setRefreshTick((n) => n + 1),
  };
}

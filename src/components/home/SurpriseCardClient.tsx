'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { SurpriseCard } from './SurpriseCard';

interface PendingGiftEntry {
  id: string;
  expires_at: string;
}

/**
 * SurpriseCardClient (v2.5.2)
 *
 * Auto-fetching wrapper around the pure <SurpriseCard /> component.
 * Used on the home page to show the first unopened gift box (Welcome or
 * Daily Surprise) without revealing its value.
 *
 * Behaviour:
 *   - Fetches /api/rewards (existing endpoint) and picks the first entry
 *     in status 'granted' (= unopened, not yet expired)
 *   - Returns null when unauthenticated, no pending gift, or fetch fails
 *   - Never logs the gift's value to the console (preserves the surprise)
 */
export function SurpriseCardClient() {
  const locale = useLocale() as 'ar' | 'en';
  const [pending, setPending] = useState<PendingGiftEntry | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/rewards');
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as {
          giftBox?: { entries?: Array<{ id: string; status: string; expires_at: string }> };
        };
        const granted = data.giftBox?.entries?.find((e) => e.status === 'granted');
        if (!cancelled && granted) {
          setPending({ id: granted.id, expires_at: granted.expires_at });
        }
      } catch {
        // Silent — homepage should never block on this fetch
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!pending) return null;
  return <SurpriseCard entryId={pending.id} expiresAt={pending.expires_at} locale={locale} />;
}

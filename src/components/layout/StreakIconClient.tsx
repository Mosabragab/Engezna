'use client';

import { useEffect, useState } from 'react';
import { StreakIcon } from './StreakIcon';

type StreakTier = 'none' | 'silver' | 'gold' | 'platinum';

/**
 * StreakIconClient (v2.5.2)
 *
 * Auto-fetching wrapper around the pure <StreakIcon /> presentation
 * component. Used by CustomerHeader to render the Header streak badge.
 *
 * Behaviour:
 *   - Fetches /api/streaks/current once on mount
 *   - Returns null while loading or when user is unauthenticated (401)
 *   - StreakIcon itself returns null when current_streak_weeks < 2,
 *     so a 1-week streak still doesn't render the badge (the icon
 *     enforces the "don't distract new users" rule, not this wrapper).
 */
export function StreakIconClient() {
  const [streak, setStreak] = useState<number>(0);
  const [tier, setTier] = useState<StreakTier>('none');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/streaks/current');
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as {
          currentStreakWeeks?: number;
          streakTier?: StreakTier;
        };
        if (cancelled) return;
        setStreak(Number(data.currentStreakWeeks ?? 0));
        setTier((data.streakTier as StreakTier) ?? 'none');
      } catch {
        // Silent fail — header should never block on streak fetch
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <StreakIcon streak={streak} tier={tier} />;
}

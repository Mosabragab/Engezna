'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * useVisibilityPolling - Smart polling that pauses when tab is hidden
 *
 * Eliminates wasted queries when users leave the tab in the background.
 * At 10K users with 30% background tabs, this saves ~30-50% of polling queries.
 *
 * Features:
 * - Pauses polling when document is hidden (tab in background)
 * - Resumes and immediately fetches when tab becomes visible
 * - Cleans up on unmount
 *
 * @param callback - Async function to call on each poll
 * @param intervalMs - Polling interval in milliseconds
 * @param enabled - Whether polling is active (default: true)
 */
export function useVisibilityPolling(
  callback: () => Promise<void> | void,
  intervalMs: number,
  enabled: boolean = true
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      callbackRef.current();
    }, intervalMs);
  }, [intervalMs]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopPolling();
      return;
    }

    // Initial fetch
    callbackRef.current();

    // Start polling
    startPolling();

    // Visibility change handler
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // Tab became visible — fetch immediately then resume polling
        callbackRef.current();
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, startPolling, stopPolling]);
}

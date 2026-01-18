'use client';

/**
 * useRealtimeStatus Hook
 *
 * Provides React integration for Realtime connection status.
 * Can be used to show connection indicators in the UI.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ConnectionStatus,
  onConnectionStatusChange,
  hasConnectionIssues,
  getAllSubscriptionStatuses,
} from '@/lib/supabase/realtime-manager';

interface RealtimeStatusResult {
  /**
   * Overall connection status (worst status across all subscriptions)
   */
  status: ConnectionStatus;

  /**
   * True if any subscription has connection issues
   */
  hasIssues: boolean;

  /**
   * Status per channel name
   */
  channelStatuses: Record<string, ConnectionStatus>;

  /**
   * True if currently in a degraded state (using polling fallback)
   */
  isUsingFallback: boolean;

  /**
   * Last error message if any
   */
  lastError: string | null;
}

/**
 * Hook to monitor Realtime connection status
 *
 * @example
 * ```tsx
 * function ConnectionIndicator() {
 *   const { status, hasIssues } = useRealtimeStatus();
 *
 *   if (hasIssues) {
 *     return <span className="text-yellow-500">Using backup connection</span>;
 *   }
 *
 *   return <span className="text-green-500">Live updates active</span>;
 * }
 * ```
 */
export function useRealtimeStatus(): RealtimeStatusResult {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [hasIssues, setHasIssues] = useState(false);
  const [channelStatuses, setChannelStatuses] = useState<Record<string, ConnectionStatus>>({});
  const [lastError, setLastError] = useState<string | null>(null);

  // Update status from all channels
  const updateStatuses = useCallback(() => {
    const statuses = getAllSubscriptionStatuses();
    setChannelStatuses(statuses);

    // Determine worst status
    const statusValues = Object.values(statuses);
    if (statusValues.includes('error')) {
      setStatus('error');
    } else if (statusValues.includes('disconnected')) {
      setStatus('disconnected');
    } else if (statusValues.includes('connecting')) {
      setStatus('connecting');
    } else if (statusValues.length > 0) {
      setStatus('connected');
    }

    setHasIssues(hasConnectionIssues());
  }, []);

  useEffect(() => {
    // Initial status check
    updateStatuses();

    // Subscribe to status changes
    const unsubscribe = onConnectionStatusChange((newStatus, error) => {
      if (error) {
        setLastError(error.message);
      }
      updateStatuses();
    });

    // Periodic status check (every 5 seconds)
    const interval = setInterval(updateStatuses, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [updateStatuses]);

  return {
    status,
    hasIssues,
    channelStatuses,
    isUsingFallback: hasIssues,
    lastError,
  };
}

/**
 * Hook to get status of a specific channel
 *
 * @param channelName - Name of the channel to monitor
 */
export function useChannelStatus(channelName: string): ConnectionStatus {
  const { channelStatuses } = useRealtimeStatus();
  return channelStatuses[channelName] ?? 'disconnected';
}

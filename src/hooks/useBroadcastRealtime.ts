/**
 * useBroadcastRealtime Hook - هوك الاشتراك في تحديثات البث
 *
 * Provides real-time updates for custom order broadcasts:
 * - Subscribe to broadcast status changes
 * - Subscribe to request pricing updates
 * - Auto-reconnect on connection loss
 *
 * Used on the price comparison page to show live pricing updates
 *
 * @version 1.0
 * @date January 2026
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type {
  CustomOrderBroadcast,
  CustomOrderRequest,
  BroadcastStatus,
  CustomRequestStatus,
} from '@/types/custom-order';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface BroadcastRealtimeState {
  broadcast: CustomOrderBroadcast | null;
  requests: CustomOrderRequest[];
  isConnected: boolean;
  lastUpdate: Date | null;
  error: string | null;
}

export interface BroadcastRealtimeCallbacks {
  onBroadcastUpdate?: (broadcast: CustomOrderBroadcast) => void;
  onRequestUpdate?: (request: CustomOrderRequest) => void;
  onPricingReceived?: (request: CustomOrderRequest) => void;
  onBroadcastCompleted?: (broadcast: CustomOrderBroadcast) => void;
  onBroadcastExpired?: (broadcast: CustomOrderBroadcast) => void;
  onError?: (error: string) => void;
}

export interface UseBroadcastRealtimeOptions {
  broadcastId: string;
  enabled?: boolean;
  callbacks?: BroadcastRealtimeCallbacks;
}

export interface UseBroadcastRealtimeReturn extends BroadcastRealtimeState {
  refresh: () => Promise<void>;
  unsubscribe: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════════════════════

export function useBroadcastRealtime(
  options: UseBroadcastRealtimeOptions
): UseBroadcastRealtimeReturn {
  const { broadcastId, enabled = true, callbacks } = options;

  const [state, setState] = useState<BroadcastRealtimeState>({
    broadcast: null,
    requests: [],
    isConnected: false,
    lastUpdate: null,
    error: null,
  });

  const supabaseRef = useRef(createClient());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbacksRef = useRef(callbacks);

  // Update callbacks ref
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Data Fetching
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fetch initial data
   */
  const fetchData = useCallback(async () => {
    const supabase = supabaseRef.current;

    try {
      // Fetch broadcast
      const { data: broadcast, error: broadcastError } = await supabase
        .from('custom_order_broadcasts')
        .select('*')
        .eq('id', broadcastId)
        .single();

      if (broadcastError) {
        throw new Error(`Failed to fetch broadcast: ${broadcastError.message}`);
      }

      // Fetch requests with provider info
      const { data: requests, error: requestsError } = await supabase
        .from('custom_order_requests')
        .select(`
          *,
          provider:providers(
            id,
            name_ar,
            name_en,
            logo_url,
            rating,
            delivery_fee
          )
        `)
        .eq('broadcast_id', broadcastId)
        .order('created_at', { ascending: true });

      if (requestsError) {
        throw new Error(`Failed to fetch requests: ${requestsError.message}`);
      }

      setState((prev) => ({
        ...prev,
        broadcast: broadcast as CustomOrderBroadcast,
        requests: (requests || []) as CustomOrderRequest[],
        lastUpdate: new Date(),
        error: null,
      }));
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState((prev) => ({
        ...prev,
        error: errorMessage,
      }));
      callbacksRef.current?.onError?.(errorMessage);
    }
  }, [broadcastId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Realtime Subscription
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Subscribe to realtime updates
   */
  const subscribe = useCallback(() => {
    const supabase = supabaseRef.current;

    // Create channel
    const channel = supabase.channel(`broadcast_${broadcastId}`);

    // Subscribe to broadcast changes
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'custom_order_broadcasts',
        filter: `id=eq.${broadcastId}`,
      },
      (payload) => {
        const newBroadcast = payload.new as CustomOrderBroadcast;

        setState((prev) => ({
          ...prev,
          broadcast: newBroadcast,
          lastUpdate: new Date(),
        }));

        callbacksRef.current?.onBroadcastUpdate?.(newBroadcast);

        // Check for specific status changes
        if (newBroadcast.status === 'completed') {
          callbacksRef.current?.onBroadcastCompleted?.(newBroadcast);
        } else if (newBroadcast.status === 'expired') {
          callbacksRef.current?.onBroadcastExpired?.(newBroadcast);
        }
      }
    );

    // Subscribe to request changes
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'custom_order_requests',
        filter: `broadcast_id=eq.${broadcastId}`,
      },
      async (payload) => {
        const newRequest = payload.new as CustomOrderRequest;
        const oldRequest = payload.old as CustomOrderRequest | undefined;

        // Fetch full request with provider info
        const { data: fullRequest } = await supabase
          .from('custom_order_requests')
          .select(`
            *,
            provider:providers(
              id,
              name_ar,
              name_en,
              logo_url,
              rating,
              delivery_fee
            )
          `)
          .eq('id', newRequest.id)
          .single();

        if (fullRequest) {
          setState((prev) => ({
            ...prev,
            requests: prev.requests.map((r) =>
              r.id === fullRequest.id ? fullRequest : r
            ),
            lastUpdate: new Date(),
          }));

          callbacksRef.current?.onRequestUpdate?.(fullRequest as CustomOrderRequest);

          // Check if pricing was just submitted
          if (
            fullRequest.status === 'priced' &&
            oldRequest?.status === 'pending'
          ) {
            callbacksRef.current?.onPricingReceived?.(fullRequest as CustomOrderRequest);
          }
        }
      }
    );

    // Subscribe to channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setState((prev) => ({
          ...prev,
          isConnected: true,
          error: null,
        }));
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setState((prev) => ({
          ...prev,
          isConnected: false,
        }));
      }
    });

    channelRef.current = channel;
  }, [broadcastId]);

  /**
   * Unsubscribe from realtime updates
   */
  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabaseRef.current.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isConnected: false,
    }));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // Effects
  // ═══════════════════════════════════════════════════════════════════════════

  // Initialize and subscribe
  useEffect(() => {
    if (!enabled || !broadcastId) {
      return;
    }

    // Fetch initial data
    fetchData();

    // Subscribe to realtime updates
    subscribe();

    // Cleanup
    return () => {
      unsubscribe();
    };
  }, [broadcastId, enabled, fetchData, subscribe, unsubscribe]);

  return {
    ...state,
    refresh: fetchData,
    unsubscribe,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Provider-Side Hook
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseProviderPricingRealtimeOptions {
  providerId: string;
  enabled?: boolean;
  onNewRequest?: (request: CustomOrderRequest) => void;
}

/**
 * Hook for provider to receive new pricing requests
 */
export function useProviderPricingRealtime(
  options: UseProviderPricingRealtimeOptions
) {
  const { providerId, enabled = true, onNewRequest } = options;

  const [pendingCount, setPendingCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const supabaseRef = useRef(createClient());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onNewRequestRef = useRef(onNewRequest);

  useEffect(() => {
    onNewRequestRef.current = onNewRequest;
  }, [onNewRequest]);

  // Fetch initial count
  const fetchPendingCount = useCallback(async () => {
    const supabase = supabaseRef.current;

    const { count } = await supabase
      .from('custom_order_requests')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', providerId)
      .eq('status', 'pending');

    setPendingCount(count || 0);
  }, [providerId]);

  useEffect(() => {
    if (!enabled || !providerId) {
      return;
    }

    const supabase = supabaseRef.current;

    // Fetch initial count
    fetchPendingCount();

    // Subscribe to new requests
    const channel = supabase.channel(`provider_requests_${providerId}`);

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'custom_order_requests',
        filter: `provider_id=eq.${providerId}`,
      },
      (payload) => {
        const newRequest = payload.new as CustomOrderRequest;
        setPendingCount((prev) => prev + 1);
        onNewRequestRef.current?.(newRequest);
      }
    );

    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'custom_order_requests',
        filter: `provider_id=eq.${providerId}`,
      },
      (payload) => {
        const newRequest = payload.new as CustomOrderRequest;
        const oldRequest = payload.old as CustomOrderRequest;

        // If status changed from pending to something else, decrease count
        if (oldRequest.status === 'pending' && newRequest.status !== 'pending') {
          setPendingCount((prev) => Math.max(0, prev - 1));
        }
      }
    );

    channel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED');
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [providerId, enabled, fetchPendingCount]);

  return {
    pendingCount,
    isConnected,
    refresh: fetchPendingCount,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Customer Active Broadcasts Hook
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseCustomerBroadcastsOptions {
  customerId: string;
  enabled?: boolean;
}

/**
 * Hook for customer to track all active broadcasts
 */
export function useCustomerActiveBroadcasts(
  options: UseCustomerBroadcastsOptions
) {
  const { customerId, enabled = true } = options;

  const [broadcasts, setBroadcasts] = useState<CustomOrderBroadcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const supabaseRef = useRef(createClient());
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch active broadcasts
  const fetchBroadcasts = useCallback(async () => {
    const supabase = supabaseRef.current;

    setIsLoading(true);

    const { data, error } = await supabase
      .from('custom_order_broadcasts')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (!error) {
      setBroadcasts((data || []) as CustomOrderBroadcast[]);
    }

    setIsLoading(false);
  }, [customerId]);

  useEffect(() => {
    if (!enabled || !customerId) {
      return;
    }

    const supabase = supabaseRef.current;

    // Fetch initial data
    fetchBroadcasts();

    // Subscribe to changes
    const channel = supabase.channel(`customer_broadcasts_${customerId}`);

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'custom_order_broadcasts',
        filter: `customer_id=eq.${customerId}`,
      },
      (payload) => {
        const newBroadcast = payload.new as CustomOrderBroadcast;

        setBroadcasts((prev) => {
          // If status is no longer active, remove from list
          if (newBroadcast.status !== 'active') {
            return prev.filter((b) => b.id !== newBroadcast.id);
          }

          // Check if exists
          const exists = prev.some((b) => b.id === newBroadcast.id);
          if (exists) {
            return prev.map((b) =>
              b.id === newBroadcast.id ? newBroadcast : b
            );
          }

          // Add new broadcast
          return [newBroadcast, ...prev];
        });
      }
    );

    channel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED');
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [customerId, enabled, fetchBroadcasts]);

  return {
    broadcasts,
    isLoading,
    isConnected,
    refresh: fetchBroadcasts,
    activeCount: broadcasts.length,
  };
}

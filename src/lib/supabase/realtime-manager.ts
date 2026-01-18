/**
 * Realtime Subscription Manager
 *
 * Provides centralized error handling and polling fallback for Supabase Realtime subscriptions.
 * Phase 3.3: Error Handling في Realtime
 *
 * Features:
 * - Automatic error handling for CHANNEL_ERROR and TIMED_OUT states
 * - Polling fallback for critical channels when Realtime fails
 * - Connection status tracking
 * - Exponential backoff for reconnection
 */

import { RealtimeChannel, SupabaseClient, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';

// Connection status types
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

// Subscription status callback
export type StatusCallback = (status: ConnectionStatus, error?: Error) => void;

// Polling callback for fallback
export type PollingCallback = () => Promise<void>;

// Configuration for a managed subscription
interface SubscriptionConfig {
  channelName: string;
  onStatusChange?: StatusCallback;
  pollingFallback?: {
    callback: PollingCallback;
    intervalMs: number; // Polling interval in milliseconds (default: 15000)
  };
  maxRetries?: number; // Max reconnection attempts (default: 3)
  retryDelayMs?: number; // Initial retry delay (default: 2000)
}

// Subscription state tracking
interface SubscriptionState {
  channel: RealtimeChannel;
  status: ConnectionStatus;
  retryCount: number;
  pollingTimer?: NodeJS.Timeout;
  isPollingActive: boolean;
  config: SubscriptionConfig;
}

// Global subscription registry
const subscriptions = new Map<string, SubscriptionState>();

// Global connection status listeners
const statusListeners = new Set<StatusCallback>();

/**
 * Subscribe to global connection status changes
 */
export function onConnectionStatusChange(callback: StatusCallback): () => void {
  statusListeners.add(callback);
  return () => statusListeners.delete(callback);
}

/**
 * Notify all status listeners
 */
function notifyStatusChange(status: ConnectionStatus, error?: Error): void {
  statusListeners.forEach((listener) => {
    try {
      listener(status, error);
    } catch {
      // Ignore listener errors
    }
  });
}

/**
 * Start polling fallback for a subscription
 */
function startPollingFallback(channelName: string): void {
  const state = subscriptions.get(channelName);
  if (!state || !state.config.pollingFallback || state.isPollingActive) {
    return;
  }

  const { callback, intervalMs } = state.config.pollingFallback;

  console.warn(
    `[Realtime] Starting polling fallback for ${channelName} (interval: ${intervalMs}ms)`
  );

  state.isPollingActive = true;

  // Execute immediately
  callback().catch((err) => {
    console.error(`[Realtime] Polling error for ${channelName}:`, err);
  });

  // Set up interval
  state.pollingTimer = setInterval(() => {
    callback().catch((err) => {
      console.error(`[Realtime] Polling error for ${channelName}:`, err);
    });
  }, intervalMs);
}

/**
 * Stop polling fallback for a subscription
 */
function stopPollingFallback(channelName: string): void {
  const state = subscriptions.get(channelName);
  if (!state || !state.isPollingActive) {
    return;
  }

  // Stopping polling - realtime reconnected

  if (state.pollingTimer) {
    clearInterval(state.pollingTimer);
    state.pollingTimer = undefined;
  }
  state.isPollingActive = false;
}

/**
 * Handle subscription status changes with error recovery
 */
function handleSubscriptionStatus(
  channelName: string,
  supabase: SupabaseClient,
  status: `${REALTIME_SUBSCRIBE_STATES}`,
  err?: Error
): void {
  const state = subscriptions.get(channelName);
  if (!state) return;

  const { config, channel } = state;
  const maxRetries = config.maxRetries ?? 3;
  const retryDelayMs = config.retryDelayMs ?? 2000;

  switch (status) {
    case 'SUBSCRIBED':
      // Connected successfully to realtime channel
      state.status = 'connected';
      state.retryCount = 0;
      stopPollingFallback(channelName);
      config.onStatusChange?.('connected');
      notifyStatusChange('connected');
      break;

    case 'CHANNEL_ERROR':
      console.error(`[Realtime] Channel error on ${channelName}:`, err);
      state.status = 'error';
      config.onStatusChange?.('error', err);
      notifyStatusChange('error', err);

      // Start polling fallback
      startPollingFallback(channelName);

      // Attempt reconnection with exponential backoff
      if (state.retryCount < maxRetries) {
        const delay = retryDelayMs * Math.pow(2, state.retryCount);
        state.retryCount++;
        console.warn(
          `[Realtime] Retrying ${channelName} in ${delay}ms (attempt ${state.retryCount}/${maxRetries})`
        );

        setTimeout(() => {
          if (subscriptions.has(channelName)) {
            channel.subscribe((retryStatus, retryErr) => {
              handleSubscriptionStatus(channelName, supabase, retryStatus, retryErr);
            });
          }
        }, delay);
      } else {
        console.error(`[Realtime] Max retries reached for ${channelName}, using polling only`);
      }
      break;

    case 'TIMED_OUT':
      console.warn(`[Realtime] Subscription timed out on ${channelName}`);
      state.status = 'disconnected';
      config.onStatusChange?.('disconnected');
      notifyStatusChange('disconnected');

      // Start polling fallback
      startPollingFallback(channelName);

      // Attempt reconnection
      if (state.retryCount < maxRetries) {
        state.retryCount++;
        console.warn(`[Realtime] Retrying ${channelName} after timeout`);
        channel.subscribe((retryStatus, retryErr) => {
          handleSubscriptionStatus(channelName, supabase, retryStatus, retryErr);
        });
      }
      break;

    case 'CLOSED':
      // Channel closed normally
      state.status = 'disconnected';
      config.onStatusChange?.('disconnected');
      break;
  }
}

/**
 * Create a managed Realtime subscription with error handling
 *
 * @param supabase - Supabase client instance
 * @param channel - Pre-configured RealtimeChannel with event listeners
 * @param config - Subscription configuration
 * @returns Cleanup function to unsubscribe
 *
 * @example
 * ```typescript
 * const channel = supabase
 *   .channel('orders')
 *   .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, handler);
 *
 * const unsubscribe = subscribeWithErrorHandling(supabase, channel, {
 *   channelName: 'provider-orders',
 *   onStatusChange: (status) => setConnectionStatus(status),
 *   pollingFallback: {
 *     callback: loadOrders,
 *     intervalMs: 15000,
 *   },
 * });
 *
 * // Later: cleanup
 * unsubscribe();
 * ```
 */
export function subscribeWithErrorHandling(
  supabase: SupabaseClient,
  channel: RealtimeChannel,
  config: SubscriptionConfig
): () => void {
  const { channelName } = config;

  // Clean up existing subscription with same name
  if (subscriptions.has(channelName)) {
    unsubscribe(supabase, channelName);
  }

  // Create subscription state
  const state: SubscriptionState = {
    channel,
    status: 'connecting',
    retryCount: 0,
    isPollingActive: false,
    config,
  };

  subscriptions.set(channelName, state);
  config.onStatusChange?.('connecting');

  // Subscribe with error handling callback
  channel.subscribe((status, err) => {
    handleSubscriptionStatus(channelName, supabase, status, err);
  });

  // Return cleanup function
  return () => unsubscribe(supabase, channelName);
}

/**
 * Unsubscribe and cleanup a managed subscription
 */
export function unsubscribe(supabase: SupabaseClient, channelName: string): void {
  const state = subscriptions.get(channelName);
  if (!state) return;

  // Stop polling
  stopPollingFallback(channelName);

  // Remove channel
  supabase.removeChannel(state.channel);

  // Remove from registry
  subscriptions.delete(channelName);

  // Unsubscribed from channel
}

/**
 * Unsubscribe from all managed subscriptions
 */
export function unsubscribeAll(supabase: SupabaseClient): void {
  subscriptions.forEach((_, channelName) => {
    unsubscribe(supabase, channelName);
  });
}

/**
 * Get current status of a subscription
 */
export function getSubscriptionStatus(channelName: string): ConnectionStatus | null {
  return subscriptions.get(channelName)?.status ?? null;
}

/**
 * Check if any subscription is currently in error or disconnected state
 */
export function hasConnectionIssues(): boolean {
  for (const state of subscriptions.values()) {
    if (state.status === 'error' || state.status === 'disconnected') {
      return true;
    }
  }
  return false;
}

/**
 * Get all subscription statuses
 */
export function getAllSubscriptionStatuses(): Record<string, ConnectionStatus> {
  const statuses: Record<string, ConnectionStatus> = {};
  subscriptions.forEach((state, name) => {
    statuses[name] = state.status;
  });
  return statuses;
}

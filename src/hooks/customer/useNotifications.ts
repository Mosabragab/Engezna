'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { subscribeWithErrorHandling } from '@/lib/supabase/realtime-manager';
import { setAppBadge, clearAppBadge } from '@/hooks/useBadge';
import { getAudioManager, type SoundType } from '@/lib/audio/audio-manager';
import type { User, RealtimeChannel } from '@supabase/supabase-js';

/**
 * Determine the appropriate sound to play based on notification type.
 * Order status changes get 'order-update' sound, custom orders get 'custom-order',
 * and everything else gets the default 'notification' sound.
 */
function getSoundForNotificationType(type: string): SoundType {
  // Order status change notifications (from DB trigger: 'order_' + status)
  if (
    type === 'order_accepted' ||
    type === 'order_preparing' ||
    type === 'order_ready' ||
    type === 'order_out_for_delivery' ||
    type === 'order_delivered'
  ) {
    return 'order-update';
  }

  // Custom order notifications
  if (type === 'CUSTOM_ORDER_PRICED' || type === 'custom_order_priced') {
    return 'custom-order';
  }

  // Default notification sound for everything else
  return 'notification';
}

const playNotificationSound = (type: SoundType = 'notification') => {
  getAudioManager().play(type);
};

interface Notification {
  id: string;
  customer_id: string;
  type: string; // 'order_*', 'promo', 'system', 'CUSTOM_ORDER_PRICED' (UPPERCASE!)
  title_ar: string;
  title_en: string;
  body_ar: string | null;
  body_en: string | null;
  related_order_id: string | null; // For standard orders
  related_provider_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  data: {
    broadcast_id?: string;
    request_id?: string;
    provider_id?: string;
    total?: number;
    is_custom_order?: boolean;
    // Support ticket fields
    ticket_id?: string;
    ticket_number?: string;
    subject?: string;
    full_message?: string;
  } | null; // Extra data for custom orders and support tickets
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Use refs to avoid stale closures and memory leaks
  const channelRef = useRef<RealtimeChannel | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  // Track the latest notification ID to detect new ones during polling
  const latestNotificationIdRef = useRef<string | null>(null);
  // Track if initial load is done (don't play sound on first load)
  const initialLoadDoneRef = useRef(false);

  /**
   * Load notifications from the database.
   * If detectNew is true, compares with current latest ID and plays sound for new notifications.
   */
  const loadNotifications = useCallback(async (userId: string, detectNew = false) => {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('customer_notifications')
        .select('*')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[Notifications] Error loading:', error);
        return;
      }

      const newData = data || [];

      // Detect new notifications during polling and play sound
      if (detectNew && initialLoadDoneRef.current && newData.length > 0) {
        const latestFromServer = newData[0];
        if (
          latestNotificationIdRef.current &&
          latestFromServer.id !== latestNotificationIdRef.current
        ) {
          // Find all new notifications that arrived since last poll
          const newNotifications = newData.filter(
            (n) => !n.is_read && new Date(n.created_at) > new Date(
              newData.find((x) => x.id === latestNotificationIdRef.current)?.created_at || 0
            )
          );

          if (newNotifications.length > 0) {
            // Play the most appropriate sound for the newest notification
            const soundType = getSoundForNotificationType(newNotifications[0].type);
            playNotificationSound(soundType);
          }
        }
      }

      // Update the latest notification ID reference
      if (newData.length > 0) {
        latestNotificationIdRef.current = newData[0].id;
      }

      setNotifications(newData);
      setUnreadCount(newData.filter((n) => !n.is_read).length);
    } catch (error) {
      console.error('[Notifications] Error:', error);
    }
  }, []);

  // Subscribe to real-time notifications with error handling
  const subscribeToNotifications = useCallback(
    (userId: string) => {
      const supabase = createClient();

      // Clean up existing subscription
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // Create new subscription channel
      const newChannel = supabase
        .channel(`customer_notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'customer_notifications',
            filter: `customer_id=eq.${userId}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);

            // Update latest notification ID
            latestNotificationIdRef.current = newNotification.id;

            // Play the appropriate sound based on notification type
            const soundType = getSoundForNotificationType(newNotification.type);
            playNotificationSound(soundType);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'customer_notifications',
            filter: `customer_id=eq.${userId}`,
          },
          (payload) => {
            const updatedNotification = payload.new as Notification;
            setNotifications((prev) => {
              const updated = prev.map((n) =>
                n.id === updatedNotification.id ? updatedNotification : n
              );
              setUnreadCount(updated.filter((n) => !n.is_read).length);
              return updated;
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'customer_notifications',
            filter: `customer_id=eq.${userId}`,
          },
          (payload) => {
            const deletedId = (payload.old as { id: string }).id;
            setNotifications((prev) => {
              const filtered = prev.filter((n) => n.id !== deletedId);
              setUnreadCount(filtered.filter((n) => !n.is_read).length);
              return filtered;
            });
          }
        );

      // Subscribe with error handling and polling fallback
      // The polling fallback uses detectNew=true to play sounds for new notifications
      const unsubscribe = subscribeWithErrorHandling(supabase, newChannel, {
        channelName: `customer-notifications-${userId}`,
        onStatusChange: (status) => {
          if (status === 'error' || status === 'disconnected') {
            console.warn('[Notifications] Realtime connection issue, using polling fallback');
          }
        },
        pollingFallback: {
          callback: async () => {
            await loadNotifications(userId, true);
          },
          intervalMs: 10000, // Poll every 10 seconds when realtime fails
        },
        maxRetries: 3,
        retryDelayMs: 2000,
      });

      channelRef.current = newChannel;
      unsubscribeRef.current = unsubscribe;
    },
    [loadNotifications]
  );

  // Initialize - NO double polling, rely on realtime + subscribeWithErrorHandling fallback
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUser(user);
        // Initial load (no sound detection on first load)
        await loadNotifications(user.id, false);
        initialLoadDoneRef.current = true;
        subscribeToNotifications(user.id);
      }

      setIsLoading(false);
    };

    init();

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (channelRef.current) {
        const supabase = createClient();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    const supabase = createClient();

    try {
      await supabase
        .from('customer_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('customer_id', user.id);

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user) return;

    const supabase = createClient();

    try {
      await supabase
        .from('customer_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('customer_id', user.id)
        .eq('is_read', false);

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    if (!user) return;

    const supabase = createClient();

    try {
      const notification = notifications.find((n) => n.id === notificationId);

      await supabase
        .from('customer_notifications')
        .delete()
        .eq('id', notificationId)
        .eq('customer_id', user.id);

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (notification && !notification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Refresh notifications
  const refresh = async () => {
    if (user) {
      await loadNotifications(user.id, false);
    }
  };

  // Update app badge when unread count changes
  useEffect(() => {
    if (unreadCount > 0) {
      setAppBadge(unreadCount);
    } else {
      clearAppBadge();
    }
  }, [unreadCount]);

  return {
    notifications,
    unreadCount,
    isLoading,
    isAuthenticated: !!user,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  };
}

// Provider-specific hook for order notifications
export function useProviderOrderNotifications(providerId: string | null) {
  const [newOrderCount, setNewOrderCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  // Load initial pending orders count
  const loadPendingCount = useCallback(async () => {
    if (!providerId) return;

    const supabase = createClient();

    try {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', providerId)
        .eq('status', 'pending');

      setNewOrderCount(count || 0);
    } catch (error) {
      console.error('Error loading pending count:', error);
    }
  }, [providerId]);

  // Ref to store unsubscribe function
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Subscribe to real-time order updates with error handling
  useEffect(() => {
    if (!providerId) {
      // Clean up if providerId becomes null
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (channelRef.current) {
        const supabase = createClient();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const supabase = createClient();

    // Load initial count
    loadPendingCount();

    // Clean up existing subscription before creating new one
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Create new subscription for orders
    const newChannel = supabase
      .channel(`provider_orders:${providerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          const newOrder = payload.new as { id: string; status: string };
          if (newOrder.status === 'pending') {
            setNewOrderCount((prev) => prev + 1);
            setLastOrderId(newOrder.id);

            // Play notification sound
            playNotificationSound('new-order');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          const oldOrder = payload.old as { status: string };
          const newOrder = payload.new as { status: string };

          // Decrement count if order was pending and is now something else
          if (oldOrder.status === 'pending' && newOrder.status !== 'pending') {
            setNewOrderCount((prev) => Math.max(0, prev - 1));
          }
          // Increment if order became pending (unlikely but handle it)
          if (oldOrder.status !== 'pending' && newOrder.status === 'pending') {
            setNewOrderCount((prev) => prev + 1);
          }
        }
      );

    // Subscribe with error handling and polling fallback
    const unsubscribe = subscribeWithErrorHandling(supabase, newChannel, {
      channelName: `provider-order-notifications-${providerId}`,
      onStatusChange: (status) => {
        if (status === 'error' || status === 'disconnected') {
          console.warn('[ProviderOrders] Realtime connection issue, using polling fallback');
        }
      },
      pollingFallback: {
        callback: loadPendingCount,
        intervalMs: 15000, // Poll every 15 seconds when realtime fails
      },
      maxRetries: 3,
      retryDelayMs: 2000,
    });

    channelRef.current = newChannel;
    unsubscribeRef.current = unsubscribe;

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      channelRef.current = null;
    };
  }, [providerId, loadPendingCount]);

  // Clear the new order indicator
  const clearNewOrderIndicator = () => {
    setLastOrderId(null);
  };

  return {
    newOrderCount,
    hasNewOrder: !!lastOrderId,
    lastOrderId,
    clearNewOrderIndicator,
    refresh: loadPendingCount,
  };
}

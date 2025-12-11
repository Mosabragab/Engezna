'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, RealtimeChannel } from '@supabase/supabase-js'

// Shared audio instance to prevent memory leaks
let notificationAudio: HTMLAudioElement | null = null
let newOrderAudio: HTMLAudioElement | null = null

const playNotificationSound = (type: 'notification' | 'new-order' = 'notification') => {
  try {
    if (type === 'new-order') {
      if (!newOrderAudio) {
        newOrderAudio = new Audio('/sounds/new-order.mp3')
        newOrderAudio.volume = 0.7
      }
      newOrderAudio.currentTime = 0
      newOrderAudio.play().catch(() => {})
    } else {
      if (!notificationAudio) {
        notificationAudio = new Audio('/sounds/notification.mp3')
        notificationAudio.volume = 0.5
      }
      notificationAudio.currentTime = 0
      notificationAudio.play().catch(() => {})
    }
  } catch {
    // Sound not available
  }
}

interface Notification {
  id: string
  customer_id: string
  type: string // 'order_accepted', 'order_preparing', 'order_ready', 'order_delivered', 'order_cancelled', 'promo', 'system'
  title_ar: string
  title_en: string
  body_ar: string | null
  body_en: string | null
  related_order_id: string | null
  related_provider_id: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  // Load initial notifications
  const loadNotifications = useCallback(async (userId: string) => {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('customer_notifications')
        .select('*')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error loading notifications:', error)
        return
      }

      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.is_read).length || 0)
    } catch (error) {
      console.error('Error:', error)
    }
  }, [])

  // Subscribe to real-time notifications
  const subscribeToNotifications = useCallback(async (userId: string) => {
    const supabase = createClient()

    // Clean up existing subscription
    if (channel) {
      supabase.removeChannel(channel)
    }

    // Create new subscription
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
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])
          setUnreadCount(prev => prev + 1)

          // Play notification sound
          playNotificationSound('notification')
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
          const updatedNotification = payload.new as Notification
          setNotifications(prev =>
            prev.map(n =>
              n.id === updatedNotification.id ? updatedNotification : n
            )
          )
          // Recalculate unread count
          setNotifications(current => {
            setUnreadCount(current.filter(n => !n.is_read).length)
            return current
          })
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
          const deletedId = (payload.old as { id: string }).id
          setNotifications(prev => prev.filter(n => n.id !== deletedId))
          setNotifications(current => {
            setUnreadCount(current.filter(n => !n.is_read).length)
            return current
          })
        }
      )
      .subscribe()

    setChannel(newChannel)

    return () => {
      supabase.removeChannel(newChannel)
    }
  }, [channel])

  // Initialize
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null
    let currentUserId: string | null = null

    const init = async () => {
      setIsLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setUser(user)
        currentUserId = user.id
        await loadNotifications(user.id)
        subscribeToNotifications(user.id)

        // Add polling fallback every 10 seconds for realtime reliability
        pollingInterval = setInterval(() => {
          if (currentUserId) {
            loadNotifications(currentUserId)
          }
        }, 10000)
      }

      setIsLoading(false)
    }

    init()

    // Cleanup on unmount
    return () => {
      if (channel) {
        const supabase = createClient()
        supabase.removeChannel(channel)
      }
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    if (!user) return

    const supabase = createClient()

    try {
      await supabase
        .from('customer_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('customer_id', user.id)

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user) return

    const supabase = createClient()

    try {
      await supabase
        .from('customer_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('customer_id', user.id)
        .eq('is_read', false)

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    if (!user) return

    const supabase = createClient()

    try {
      const notification = notifications.find(n => n.id === notificationId)

      await supabase
        .from('customer_notifications')
        .delete()
        .eq('id', notificationId)
        .eq('customer_id', user.id)

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  // Refresh notifications
  const refresh = async () => {
    if (user) {
      await loadNotifications(user.id)
    }
  }

  return {
    notifications,
    unreadCount,
    isLoading,
    isAuthenticated: !!user,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  }
}

// Provider-specific hook for order notifications
export function useProviderOrderNotifications(providerId: string | null) {
  const [newOrderCount, setNewOrderCount] = useState(0)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [lastOrderId, setLastOrderId] = useState<string | null>(null)

  // Load initial pending orders count
  const loadPendingCount = useCallback(async () => {
    if (!providerId) return

    const supabase = createClient()

    try {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', providerId)
        .eq('status', 'pending')

      setNewOrderCount(count || 0)
    } catch (error) {
      console.error('Error loading pending count:', error)
    }
  }, [providerId])

  // Subscribe to real-time order updates
  useEffect(() => {
    if (!providerId) {
      // Clean up if providerId becomes null
      if (channelRef.current) {
        const supabase = createClient()
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      return
    }

    const supabase = createClient()

    // Load initial count
    loadPendingCount()

    // Clean up existing subscription before creating new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
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
          const newOrder = payload.new as { id: string; status: string }
          if (newOrder.status === 'pending') {
            setNewOrderCount(prev => prev + 1)
            setLastOrderId(newOrder.id)

            // Play notification sound
            playNotificationSound('new-order')
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
          const oldOrder = payload.old as { status: string }
          const newOrder = payload.new as { status: string }

          // Decrement count if order was pending and is now something else
          if (oldOrder.status === 'pending' && newOrder.status !== 'pending') {
            setNewOrderCount(prev => Math.max(0, prev - 1))
          }
          // Increment if order became pending (unlikely but handle it)
          if (oldOrder.status !== 'pending' && newOrder.status === 'pending') {
            setNewOrderCount(prev => prev + 1)
          }
        }
      )
      .subscribe()

    channelRef.current = newChannel

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [providerId, loadPendingCount])

  // Clear the new order indicator
  const clearNewOrderIndicator = () => {
    setLastOrderId(null)
  }

  return {
    newOrderCount,
    hasNewOrder: !!lastOrderId,
    lastOrderId,
    clearNewOrderIndicator,
    refresh: loadPendingCount,
  }
}

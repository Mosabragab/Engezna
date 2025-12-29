'use client'

import { useState, useEffect, useCallback } from 'react'
import { getToken, onMessage, MessagePayload } from 'firebase/messaging'
import { getFirebaseMessaging } from '@/lib/firebase/config'
import { createClient } from '@/utils/supabase/client'

// VAPID key for Firebase Cloud Messaging
// This is the public key used for web push
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || ''

export type NotificationPermission = 'default' | 'granted' | 'denied' | 'unsupported'

export interface PushNotificationState {
  permission: NotificationPermission
  token: string | null
  isLoading: boolean
  error: string | null
  isSupported: boolean
}

export interface NotificationPayload {
  title: string
  body: string
  data?: Record<string, string>
  icon?: string
}

interface UsePushNotificationsReturn extends PushNotificationState {
  requestPermission: () => Promise<boolean>
  unsubscribe: () => Promise<void>
  onForegroundMessage: (callback: (payload: NotificationPayload) => void) => () => void
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [state, setState] = useState<PushNotificationState>({
    permission: 'default',
    token: null,
    isLoading: true,
    error: null,
    isSupported: false,
  })

  const supabase = createClient()

  // Check if push notifications are supported
  const checkSupport = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false
    if (!('Notification' in window)) return false
    if (!('serviceWorker' in navigator)) return false
    if (!('PushManager' in window)) return false

    return true
  }, [])

  // Get current permission status
  const getCurrentPermission = useCallback((): NotificationPermission => {
    if (typeof window === 'undefined') return 'unsupported'
    if (!('Notification' in window)) return 'unsupported'
    return Notification.permission as NotificationPermission
  }, [])

  // Register service worker
  const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
      })
      console.log('Service Worker registered:', registration)
      return registration
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      return null
    }
  }, [])

  // Save FCM token to database
  const saveTokenToDatabase = useCallback(
    async (token: string): Promise<void> => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) {
          console.warn('User not authenticated, cannot save FCM token')
          return
        }

        const { error } = await supabase.rpc('upsert_fcm_token', {
          p_token: token,
          p_device_type: 'web',
          p_device_name: getBrowserName(),
          p_user_agent: navigator.userAgent,
        })

        if (error) {
          console.error('Error saving FCM token:', error)
          throw error
        }

        console.log('FCM token saved to database')
      } catch (error) {
        console.error('Failed to save FCM token:', error)
        throw error
      }
    },
    [supabase]
  )

  // Remove FCM token from database
  const removeTokenFromDatabase = useCallback(
    async (token: string): Promise<void> => {
      try {
        const { error } = await supabase
          .from('fcm_tokens')
          .delete()
          .eq('token', token)

        if (error) {
          console.error('Error removing FCM token:', error)
          throw error
        }

        console.log('FCM token removed from database')
      } catch (error) {
        console.error('Failed to remove FCM token:', error)
      }
    },
    [supabase]
  )

  // Get FCM token
  const getFcmToken = useCallback(async (): Promise<string | null> => {
    try {
      const messaging = await getFirebaseMessaging()
      if (!messaging) {
        console.warn('Firebase Messaging not available')
        return null
      }

      // Ensure service worker is registered
      const swRegistration = await registerServiceWorker()
      if (!swRegistration) {
        console.warn('Service Worker not registered')
        return null
      }

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swRegistration,
      })

      if (token) {
        console.log('FCM token obtained:', token.substring(0, 20) + '...')
        return token
      }

      console.warn('No FCM token available')
      return null
    } catch (error) {
      console.error('Error getting FCM token:', error)
      throw error
    }
  }, [registerServiceWorker])

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const isSupported = await checkSupport()
      if (!isSupported) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isSupported: false,
          error: 'Push notifications are not supported in this browser',
        }))
        return false
      }

      // Request permission
      const permission = await Notification.requestPermission()

      if (permission !== 'granted') {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          permission: permission as NotificationPermission,
          error: permission === 'denied' ? 'Notification permission denied' : null,
        }))
        return false
      }

      // Get FCM token
      const token = await getFcmToken()
      if (!token) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          permission: 'granted',
          error: 'Failed to get notification token',
        }))
        return false
      }

      // Save token to database
      await saveTokenToDatabase(token)

      setState((prev) => ({
        ...prev,
        isLoading: false,
        permission: 'granted',
        token,
        isSupported: true,
        error: null,
      }))

      return true
    } catch (error) {
      console.error('Error requesting permission:', error)
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to enable notifications',
      }))
      return false
    }
  }, [checkSupport, getFcmToken, saveTokenToDatabase])

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true }))

    try {
      if (state.token) {
        await removeTokenFromDatabase(state.token)
      }

      // Unregister service worker
      const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
      if (registration) {
        await registration.unregister()
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        token: null,
      }))
    } catch (error) {
      console.error('Error unsubscribing:', error)
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to unsubscribe',
      }))
    }
  }, [state.token, removeTokenFromDatabase])

  // Listen for foreground messages
  const onForegroundMessage = useCallback(
    (callback: (payload: NotificationPayload) => void): (() => void) => {
      let unsubscribe: (() => void) | null = null

      getFirebaseMessaging().then((messaging) => {
        if (messaging) {
          unsubscribe = onMessage(messaging, (payload: MessagePayload) => {
            console.log('Foreground message received:', payload)

            const notificationPayload: NotificationPayload = {
              title: payload.notification?.title || payload.data?.title || 'Engezna',
              body: payload.notification?.body || payload.data?.body || '',
              data: payload.data as Record<string, string>,
              icon: payload.notification?.icon,
            }

            callback(notificationPayload)
          })
        }
      })

      return () => {
        if (unsubscribe) {
          unsubscribe()
        }
      }
    },
    []
  )

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      const isSupported = await checkSupport()
      const permission = getCurrentPermission()

      if (!isSupported) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isSupported: false,
          permission: 'unsupported',
        }))
        return
      }

      setState((prev) => ({
        ...prev,
        isSupported: true,
        permission,
      }))

      // If already granted, get token
      if (permission === 'granted') {
        try {
          const token = await getFcmToken()
          if (token) {
            await saveTokenToDatabase(token)
            setState((prev) => ({
              ...prev,
              isLoading: false,
              token,
            }))
            return
          }
        } catch (error) {
          console.error('Error initializing FCM token:', error)
        }
      }

      setState((prev) => ({ ...prev, isLoading: false }))
    }

    initialize()
  }, [checkSupport, getCurrentPermission, getFcmToken, saveTokenToDatabase])

  // Listen for token refresh
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Listen for service worker messages (token refresh)
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'FCM_TOKEN_REFRESH') {
        const newToken = event.data.token
        if (newToken && newToken !== state.token) {
          saveTokenToDatabase(newToken).then(() => {
            setState((prev) => ({ ...prev, token: newToken }))
          })
        }
      }
    }

    navigator.serviceWorker?.addEventListener('message', handleMessage)

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage)
    }
  }, [state.token, saveTokenToDatabase])

  return {
    ...state,
    requestPermission,
    unsubscribe,
    onForegroundMessage,
  }
}

// Helper function to get browser name
function getBrowserName(): string {
  const userAgent = navigator.userAgent.toLowerCase()

  if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
    return 'Chrome'
  } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    return 'Safari'
  } else if (userAgent.includes('firefox')) {
    return 'Firefox'
  } else if (userAgent.includes('edg')) {
    return 'Edge'
  } else if (userAgent.includes('opera') || userAgent.includes('opr')) {
    return 'Opera'
  }

  return 'Unknown Browser'
}

export default usePushNotifications

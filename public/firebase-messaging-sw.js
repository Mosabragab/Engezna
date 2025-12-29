// Firebase Messaging Service Worker
// This service worker handles background push notifications

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyAMUPCzi2GacDUFIwFLZA11vpFI-bhAAmg',
  authDomain: 'engezna-6edd0.firebaseapp.com',
  projectId: 'engezna-6edd0',
  storageBucket: 'engezna-6edd0.firebasestorage.app',
  messagingSenderId: '937850460252',
  appId: '1:937850460252:web:a736c7a313307da7eaae99',
  measurementId: 'G-1YF8CT5QB6',
}

// Initialize Firebase
firebase.initializeApp(firebaseConfig)

// Get messaging instance
const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload)

  const notificationTitle = payload.notification?.title || payload.data?.title || 'Engezna'
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: payload.data?.tag || 'default',
    data: payload.data || {},
    // Vibration pattern: vibrate 200ms, pause 100ms, vibrate 200ms
    vibrate: [200, 100, 200],
    // Actions for interactive notifications
    actions: getNotificationActions(payload.data?.type),
    // Require interaction for important notifications
    requireInteraction: isImportantNotification(payload.data?.type),
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

// Get notification actions based on type
function getNotificationActions(type) {
  switch (type) {
    case 'new_order':
      return [
        { action: 'view', title: 'عرض الطلب', icon: '/icons/view-icon.png' },
        { action: 'accept', title: 'قبول', icon: '/icons/accept-icon.png' },
      ]
    case 'order_update':
      return [
        { action: 'view', title: 'عرض التفاصيل', icon: '/icons/view-icon.png' },
      ]
    case 'chat_message':
      return [
        { action: 'reply', title: 'رد', icon: '/icons/reply-icon.png' },
        { action: 'view', title: 'فتح المحادثة', icon: '/icons/view-icon.png' },
      ]
    default:
      return []
  }
}

// Check if notification requires user interaction
function isImportantNotification(type) {
  const importantTypes = ['new_order', 'order_cancelled', 'low_stock', 'complaint']
  return importantTypes.includes(type)
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click:', event)

  event.notification.close()

  const data = event.notification.data || {}
  let targetUrl = '/'

  // Determine URL based on notification type and action
  if (event.action === 'view' || !event.action) {
    switch (data.type) {
      case 'new_order':
      case 'order_update':
      case 'order_cancelled':
        targetUrl = data.order_id
          ? `/ar/provider/orders/${data.order_id}`
          : '/ar/provider/orders'
        break
      case 'chat_message':
        targetUrl = data.chat_id
          ? `/ar/provider/chat/${data.chat_id}`
          : '/ar/provider/chat'
        break
      case 'new_review':
        targetUrl = '/ar/provider/reviews'
        break
      case 'low_stock':
        targetUrl = '/ar/provider/menu'
        break
      case 'complaint':
        targetUrl = data.complaint_id
          ? `/ar/admin/complaints/${data.complaint_id}`
          : '/ar/admin/complaints'
        break
      case 'new_provider':
        targetUrl = '/ar/admin/providers'
        break
      default:
        // For customers
        if (data.order_id) {
          targetUrl = `/ar/orders/${data.order_id}`
        }
    }
  }

  // Handle specific actions
  if (event.action === 'accept' && data.order_id) {
    // Could trigger order acceptance via API
    targetUrl = `/ar/provider/orders/${data.order_id}?action=accept`
  }

  if (event.action === 'reply' && data.chat_id) {
    targetUrl = `/ar/provider/chat/${data.chat_id}?focus=input`
  }

  // Open or focus the window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            data: data,
            targetUrl: targetUrl,
          })
          return client.focus()
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[firebase-messaging-sw.js] Notification closed:', event)
  // Could track dismissed notifications for analytics
})

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  console.log('[firebase-messaging-sw.js] Message from app:', event.data)

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Service worker lifecycle events
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker installed')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activated')
  event.waitUntil(clients.claim())
})

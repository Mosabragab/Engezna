/**
 * Generate firebase-messaging-sw.js at build time
 *
 * This script creates the Firebase Messaging Service Worker with
 * configuration injected from environment variables, avoiding
 * hardcoded credentials in the public directory.
 *
 * Called from next.config.ts during build.
 */

import * as fs from 'fs';
import * as path from 'path';

export function generateFirebaseMessagingSW(): void {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
  };

  // Skip generation if no Firebase config is set
  if (!config.apiKey || !config.projectId) {
    console.warn(
      '[Firebase SW] Skipping generation: NEXT_PUBLIC_FIREBASE_API_KEY or NEXT_PUBLIC_FIREBASE_PROJECT_ID not set'
    );
    return;
  }

  const swContent = `// Auto-generated Firebase Messaging Service Worker
// Generated at build time from environment variables - DO NOT EDIT MANUALLY

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration (injected at build time)
const firebaseConfig = ${JSON.stringify(config, null, 2)};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Engezna';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.svg',
    tag: payload.data?.tag || 'default',
    data: payload.data || {},
    vibrate: [200, 100, 200],
    actions: getNotificationActions(payload.data?.type),
    requireInteraction: isImportantNotification(payload.data?.type),
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Get notification actions based on type
function getNotificationActions(type) {
  switch (type) {
    case 'new_order':
      return [
        { action: 'view', title: '\\u0639\\u0631\\u0636 \\u0627\\u0644\\u0637\\u0644\\u0628', icon: '/icons/view-icon.svg' },
        { action: 'accept', title: '\\u0642\\u0628\\u0648\\u0644', icon: '/icons/accept-icon.svg' },
      ];
    case 'order_update':
      return [{ action: 'view', title: '\\u0639\\u0631\\u0636 \\u0627\\u0644\\u062a\\u0641\\u0627\\u0635\\u064a\\u0644', icon: '/icons/view-icon.svg' }];
    case 'chat_message':
      return [
        { action: 'reply', title: '\\u0631\\u062f', icon: '/icons/reply-icon.svg' },
        { action: 'view', title: '\\u0641\\u062a\\u062d \\u0627\\u0644\\u0645\\u062d\\u0627\\u062f\\u062b\\u0629', icon: '/icons/view-icon.svg' },
      ];
    default:
      return [];
  }
}

// Check if notification requires user interaction
function isImportantNotification(type) {
  const importantTypes = ['new_order', 'order_cancelled', 'low_stock', 'complaint'];
  return importantTypes.includes(type);
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/';

  if (event.action === 'view' || !event.action) {
    switch (data.type) {
      case 'new_order':
      case 'order_update':
      case 'order_cancelled':
        targetUrl = data.order_id ? '/ar/provider/orders/' + data.order_id : '/ar/provider/orders';
        break;
      case 'chat_message':
        targetUrl = data.chat_id ? '/ar/provider/chat/' + data.chat_id : '/ar/provider/chat';
        break;
      case 'new_review':
        targetUrl = '/ar/provider/reviews';
        break;
      case 'low_stock':
        targetUrl = '/ar/provider/menu';
        break;
      case 'complaint':
        targetUrl = data.complaint_id
          ? '/ar/admin/complaints/' + data.complaint_id
          : '/ar/admin/complaints';
        break;
      case 'new_provider':
        targetUrl = '/ar/admin/providers';
        break;
      default:
        if (data.order_id) {
          targetUrl = '/ar/orders/' + data.order_id;
        }
    }
  }

  if (event.action === 'accept' && data.order_id) {
    targetUrl = '/ar/provider/orders/' + data.order_id + '?action=accept';
  }

  if (event.action === 'reply' && data.chat_id) {
    targetUrl = '/ar/provider/chat/' + data.chat_id + '?focus=input';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            data: data,
            targetUrl: targetUrl,
          });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Service worker lifecycle events
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
`;

  const outputPath = path.join(process.cwd(), 'public', 'firebase-messaging-sw.js');
  fs.writeFileSync(outputPath, swContent, 'utf-8');
  console.log('[Firebase SW] Generated firebase-messaging-sw.js successfully');
}

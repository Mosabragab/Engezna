import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, StaleWhileRevalidate, CacheFirst } from "serwist";

// This declares the value of `injectionPoint` to TypeScript
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Initialize Serwist with custom caching strategies for Engezna food delivery app
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Network-First for prices and order status (sensitive data that must be fresh)
    {
      matcher: ({ url }) => {
        return url.pathname.includes('/api/') &&
               (url.pathname.includes('/orders') ||
                url.pathname.includes('/prices') ||
                url.pathname.includes('/cart'));
      },
      handler: new NetworkFirst({
        cacheName: "api-critical-cache",
        networkTimeoutSeconds: 10,
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              // Only cache successful responses
              return response?.status === 200 ? response : null;
            },
          },
        ],
      }),
    },
    // Stale-While-Revalidate for restaurants and products (can show cached, update in background)
    {
      matcher: ({ url }) => {
        return url.pathname.includes('/api/') &&
               (url.pathname.includes('/providers') ||
                url.pathname.includes('/products') ||
                url.pathname.includes('/categories') ||
                url.pathname.includes('/restaurants'));
      },
      handler: new StaleWhileRevalidate({
        cacheName: "api-restaurants-cache",
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              return response?.status === 200 ? response : null;
            },
          },
        ],
      }),
    },
    // Cache-First for images (they don't change often)
    {
      matcher: ({ request, url }) => {
        return request.destination === "image" ||
               url.pathname.includes('/storage/') ||
               url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i);
      },
      handler: new CacheFirst({
        cacheName: "images-cache",
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              return response?.status === 200 ? response : null;
            },
          },
        ],
      }),
    },
    // Stale-While-Revalidate for fonts
    {
      matcher: ({ request }) => request.destination === "font",
      handler: new StaleWhileRevalidate({
        cacheName: "fonts-cache",
      }),
    },
    // Stale-While-Revalidate for static assets (JS/CSS)
    {
      matcher: ({ request }) =>
        request.destination === "script" ||
        request.destination === "style",
      handler: new StaleWhileRevalidate({
        cacheName: "static-assets-cache",
      }),
    },
    // Default cache for other requests
    ...defaultCache,
  ],
  // Offline fallback
  fallbacks: {
    entries: [
      {
        url: "/ar/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

// Listen for push notifications (FCM ready)
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || "لديك إشعار جديد من إنجزنا",
      icon: "/icons/icon-512x512.png",
      badge: "/icons/favicon-64-dark.png",
      vibrate: [100, 50, 100] as number[],
      data: {
        url: data.url || "/ar",
      },
      dir: "rtl" as const,
      lang: "ar",
      tag: data.tag || "engezna-notification",
      renotify: true,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "إنجزنا", options)
    );
  }
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/ar";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      // Open new window if none found
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background Sync for offline requests (e.g., ratings, complaints)
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-offline-requests") {
    event.waitUntil(syncOfflineRequests());
  }
});

async function syncOfflineRequests() {
  // This will be implemented to sync any offline requests when connection returns
  console.log("[SW] Background sync triggered for offline requests");
}

serwist.addEventListeners();

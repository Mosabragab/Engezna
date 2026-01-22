'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ServiceWorkerUpdateState {
  isUpdateAvailable: boolean;
  isUpdating: boolean;
  registration: ServiceWorkerRegistration | null;
  error: string | null;
}

interface UseServiceWorkerUpdateReturn extends ServiceWorkerUpdateState {
  updateServiceWorker: () => Promise<void>;
  dismissUpdate: () => void;
}

/**
 * Hook to detect and handle Service Worker updates
 * Provides a user-friendly way to notify users about new versions
 * and allow them to update the PWA
 */
export function useServiceWorkerUpdate(): UseServiceWorkerUpdateReturn {
  const [state, setState] = useState<ServiceWorkerUpdateState>({
    isUpdateAvailable: false,
    isUpdating: false,
    registration: null,
    error: null,
  });

  // Check for service worker updates
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;

    const handleStateChange = () => {
      if (registration?.waiting) {
        setState((prev) => ({
          ...prev,
          isUpdateAvailable: true,
          registration,
        }));
      }
    };

    const registerAndCheckUpdates = async () => {
      try {
        // Get or wait for existing registration
        registration = await navigator.serviceWorker.ready;

        // Check if there's already a waiting service worker
        if (registration.waiting) {
          setState((prev) => ({
            ...prev,
            isUpdateAvailable: true,
            registration,
          }));
        }

        // Listen for new service workers
        registration.addEventListener('updatefound', () => {
          const newWorker = registration?.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is ready, but waiting
                setState((prev) => ({
                  ...prev,
                  isUpdateAvailable: true,
                  registration,
                }));
              }
            });
          }
        });

        // Check for updates periodically (every 60 minutes)
        const updateInterval = setInterval(
          () => {
            registration?.update().catch(console.error);
          },
          60 * 60 * 1000
        );

        // Also check on visibility change (when user returns to app)
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            registration?.update().catch(console.error);
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
          clearInterval(updateInterval);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
      } catch (error) {
        console.error('[SW Update] Registration failed:', error);
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to register service worker',
        }));
      }
    };

    registerAndCheckUpdates();

    // Listen for controller change (when new SW takes over)
    const handleControllerChange = () => {
      // Reload to get the new version
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  // Force update the service worker
  const updateServiceWorker = useCallback(async () => {
    if (!state.registration?.waiting) {
      console.warn('[SW Update] No waiting service worker to activate');
      return;
    }

    setState((prev) => ({ ...prev, isUpdating: true }));

    try {
      // Tell the waiting service worker to skip waiting and become active
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      // The page will reload automatically when controllerchange fires
    } catch (error) {
      console.error('[SW Update] Failed to update:', error);
      setState((prev) => ({
        ...prev,
        isUpdating: false,
        error: error instanceof Error ? error.message : 'Failed to update',
      }));
    }
  }, [state.registration]);

  // Dismiss the update notification (user can update later)
  const dismissUpdate = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isUpdateAvailable: false,
    }));
  }, []);

  return {
    ...state,
    updateServiceWorker,
    dismissUpdate,
  };
}

export default useServiceWorkerUpdate;

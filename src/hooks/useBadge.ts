'use client'

import { useCallback } from 'react'

/**
 * useBadge Hook - App Icon Badge Management
 *
 * Works on:
 * - Android PWA (Chrome) ✅
 * - Desktop PWA (Chrome/Edge) ✅
 * - iOS App Store (via Capacitor) ✅
 * - iOS Safari PWA ❌ (not supported)
 *
 * Usage:
 * const { setBadge, clearBadge, isSupported } = useBadge()
 * setBadge(5) // Show "5" on app icon
 * clearBadge() // Remove badge
 */

interface BadgeAPI {
  setBadge: (count: number) => Promise<void>
  clearBadge: () => Promise<void>
  isSupported: boolean
}

// Check if running in Capacitor
const isCapacitor = (): boolean => {
  return typeof window !== 'undefined' &&
         !!(window as any).Capacitor?.isNativePlatform?.()
}

// Check if Badge API is supported (PWA)
const isBadgeSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 'setAppBadge' in navigator
}

// Lazy load Capacitor Badge (won't fail if not installed)
async function loadCapacitorBadge(): Promise<any | null> {
  try {
    // @ts-ignore - Dynamic import, module may not exist
    const module = await import('@capacitor/badge')
    return module.Badge
  } catch {
    return null
  }
}

export function useBadge(): BadgeAPI {
  const isSupported = isBadgeSupported() || isCapacitor()

  /**
   * Set badge count on app icon
   * @param count - Number to display (0 to clear)
   */
  const setBadge = useCallback(async (count: number): Promise<void> => {
    try {
      // If count is 0 or negative, clear the badge
      if (count <= 0) {
        await clearBadgeInternal()
        return
      }

      // Try Capacitor first (for iOS App Store)
      // Note: @capacitor/badge will be available after Phase 8 (iOS deployment)
      if (isCapacitor()) {
        try {
          // Dynamic import - will fail gracefully if not installed
          const Badge = await loadCapacitorBadge()
          if (Badge) {
            await Badge.set({ count })
            console.log(`[Badge] Set to ${count} via Capacitor`)
            return
          }
        } catch (e) {
          console.warn('[Badge] Capacitor Badge plugin not available')
        }
      }

      // Fallback to PWA Badge API (Android/Desktop)
      if (isBadgeSupported()) {
        await (navigator as any).setAppBadge(count)
        console.log(`[Badge] Set to ${count} via PWA API`)
        return
      }

      console.warn('[Badge] Badge API not supported on this platform')
    } catch (error) {
      console.error('[Badge] Error setting badge:', error)
    }
  }, [])

  /**
   * Clear badge from app icon
   */
  const clearBadge = useCallback(async (): Promise<void> => {
    await clearBadgeInternal()
  }, [])

  return {
    setBadge,
    clearBadge,
    isSupported,
  }
}

// Internal function to clear badge
async function clearBadgeInternal(): Promise<void> {
  try {
    // Try Capacitor first
    if (isCapacitor()) {
      const Badge = await loadCapacitorBadge()
      if (Badge) {
        await Badge.clear()
        console.log('[Badge] Cleared via Capacitor')
        return
      }
    }

    // Fallback to PWA Badge API
    if (isBadgeSupported()) {
      await (navigator as any).clearAppBadge()
      console.log('[Badge] Cleared via PWA API')
      return
    }
  } catch (error) {
    console.error('[Badge] Error clearing badge:', error)
  }
}

// Utility function to set badge from anywhere (non-hook usage)
export async function setAppBadge(count: number): Promise<void> {
  try {
    if (count <= 0) {
      await clearAppBadge()
      return
    }

    if (isCapacitor()) {
      const Badge = await loadCapacitorBadge()
      if (Badge) {
        await Badge.set({ count })
        return
      }
    }

    if (isBadgeSupported()) {
      await (navigator as any).setAppBadge(count)
    }
  } catch (error) {
    console.error('[Badge] Error:', error)
  }
}

// Utility function to clear badge from anywhere
export async function clearAppBadge(): Promise<void> {
  try {
    if (isCapacitor()) {
      const Badge = await loadCapacitorBadge()
      if (Badge) {
        await Badge.clear()
        return
      }
    }

    if (isBadgeSupported()) {
      await (navigator as any).clearAppBadge()
    }
  } catch (error) {
    console.error('[Badge] Error:', error)
  }
}

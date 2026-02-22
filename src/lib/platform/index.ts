/**
 * Platform Detection Utilities
 *
 * Detects whether the app is running as a native Capacitor app (Android/iOS)
 * or as a web app (PWA/browser). Used to conditionally enable native features
 * like push notifications, camera, geolocation via native plugins.
 *
 * Usage:
 *   import { isNativePlatform, isAndroid, isIOS, isWeb, getPlatform } from '@/lib/platform';
 *
 *   if (isNativePlatform()) {
 *     // Use Capacitor native plugin
 *   } else {
 *     // Use web API fallback
 *   }
 */

type Platform = 'android' | 'ios' | 'web';

/**
 * Check if Capacitor is available and running as a native app
 */
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  return !!cap?.isNativePlatform?.();
}

/**
 * Check if running on Android (native Capacitor)
 */
export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  return cap?.getPlatform?.() === 'android';
}

/**
 * Check if running on iOS (native Capacitor)
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  return cap?.getPlatform?.() === 'ios';
}

/**
 * Check if running as a web app (browser or PWA)
 */
export function isWeb(): boolean {
  return !isNativePlatform();
}

/**
 * Get the current platform
 */
export function getPlatform(): Platform {
  if (isAndroid()) return 'android';
  if (isIOS()) return 'ios';
  return 'web';
}

/**
 * Check if running as an installed PWA (not in browser tab)
 */
export function isPWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

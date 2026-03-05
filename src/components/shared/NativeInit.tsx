'use client';

import { useEffect } from 'react';
import { isNativePlatform, isAndroid, isIOS } from '@/lib/platform';

/**
 * NativeInit - Configures native platform UI for a modern, edge-to-edge feel.
 *
 * On native platforms (Android/iOS via Capacitor):
 * - Sets StatusBar to overlay mode with transparent background (modern look)
 * - Calculates actual safe area insets and injects them as CSS variables
 * - Ensures header/bottom-nav can use --safe-area-top / --safe-area-bottom
 *
 * On web/PWA:
 * - Does nothing; CSS env(safe-area-inset-*) handles it via viewport-fit=cover
 */
export function NativeInit() {
  useEffect(() => {
    if (!isNativePlatform()) return;

    async function initNative() {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');

        // Enable overlay mode - WebView draws behind the status bar (edge-to-edge)
        await StatusBar.setOverlaysWebView({ overlay: true });

        // Transparent background so the app header color shows through seamlessly
        await StatusBar.setBackgroundColor({ color: '#00000000' });

        // Light style = dark icons on light backgrounds (matches our white header)
        await StatusBar.setStyle({ style: Style.Light });
      } catch {
        // StatusBar plugin not available - graceful fallback
      }

      // Inject safe area CSS variables for native platforms
      // On Android, env(safe-area-inset-*) returns 0 in WebView even with overlay,
      // so we must calculate the actual inset values and set them as CSS variables.
      const root = document.documentElement;

      if (isAndroid()) {
        // Android status bar: measure the gap between screen and viewport
        // screen.height = full display, innerHeight = WebView visible area
        const statusBarHeight = Math.round(
          window.screen.height - window.innerHeight > 100
            ? 28 // Fallback: typical Android status bar height in CSS px
            : window.screen.height - window.innerHeight > 24
              ? 28
              : 24
        );

        // Use a more reliable calculation via devicePixelRatio
        // Android status bar is typically 24dp; navigation bar is 48dp
        const dpr = window.devicePixelRatio || 1;
        const statusBarDp = 24;
        const navBarDp = isGestureNavigation() ? 16 : 48;

        const safeTop = Math.round(statusBarDp * (dpr / dpr)); // 24px CSS
        const safeBottom = Math.round(navBarDp * (dpr / dpr)); // 16-48px CSS

        root.style.setProperty('--safe-area-top', `${safeTop}px`);
        root.style.setProperty('--safe-area-bottom', `${safeBottom}px`);
      } else if (isIOS()) {
        // iOS: env(safe-area-inset-*) works correctly in WKWebView with viewport-fit=cover
        // Just ensure the CSS variables fall back to env() values (already set in globals.css)
        // No extra JS needed for iOS.
      }
    }

    initNative();
  }, []);

  return null;
}

/**
 * Detect Android gesture navigation vs 3-button navigation.
 * Gesture nav has a smaller bottom bar (~16dp) vs 3-button (~48dp).
 */
function isGestureNavigation(): boolean {
  if (typeof window === 'undefined') return true;
  // Heuristic: gesture nav has a thin bottom bar
  // screen.height - screen.availHeight gives system chrome height
  const systemChrome = window.screen.height - window.screen.availHeight;
  // If system chrome is small (< 80px), likely gesture navigation
  return systemChrome < 80;
}

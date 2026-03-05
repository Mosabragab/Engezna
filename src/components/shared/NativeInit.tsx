'use client';

import { useEffect } from 'react';
import { isNativePlatform, isAndroid } from '@/lib/platform';

/**
 * NativeInit - Configures native platform UI for a modern, edge-to-edge feel.
 *
 * On native platforms (Android/iOS via Capacitor):
 * - Sets StatusBar to overlay mode with transparent background (modern look)
 * - Uses @capacitor-community/safe-area to enable env(safe-area-inset-*) on Android
 *   (Android WebView normally returns 0 for these values)
 * - Sets --safe-area-* CSS variables as a secondary channel for components
 *
 * On web/PWA:
 * - Does nothing; CSS env(safe-area-inset-*) handles it via viewport-fit=cover
 */
export function NativeInit() {
  useEffect(() => {
    if (!isNativePlatform()) return;

    async function initNative() {
      // 1. Configure StatusBar for edge-to-edge
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

      // 2. Enable accurate safe area insets on Android
      // Android WebView returns 0 for env(safe-area-inset-*) even with overlay mode,
      // so we always set CSS variables manually as a reliable fallback.
      if (isAndroid()) {
        const root = document.documentElement;
        // Always set CSS variable defaults for Android status bar
        root.style.setProperty('--safe-area-top', '28px');
        root.style.setProperty('--safe-area-bottom', '16px');
        try {
          const { SafeArea, SystemBarsStyle } = await import(
            '@capacitor-community/safe-area'
          );
          // Plugin also injects env(safe-area-inset-*) values in the WebView
          await SafeArea.setSystemBarsStyle({
            style: SystemBarsStyle.Light,
          });
        } catch {
          // Plugin not available - CSS variables above still provide correct spacing
        }
      }
      // iOS: env(safe-area-inset-*) works natively in WKWebView - no extra setup needed
    }

    initNative();
  }, []);

  return null;
}

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
      // @capacitor-community/safe-area makes env(safe-area-inset-*) work correctly
      // in Android WebView (which normally returns 0 even with overlay mode).
      // The plugin automatically injects correct values once imported and configured.
      if (isAndroid()) {
        try {
          const { SafeArea, SystemBarsStyle } = await import(
            '@capacitor-community/safe-area'
          );
          // Set light style (dark icons) to match our UI
          await SafeArea.setSystemBarsStyle({
            style: SystemBarsStyle.Light,
          });
        } catch {
          // Plugin not available - fall back to manual CSS variable injection
          // env(safe-area-inset-*) won't work, so set reasonable defaults
          const root = document.documentElement;
          root.style.setProperty('--safe-area-top', '24px');
          root.style.setProperty('--safe-area-bottom', '16px');
        }
      }
      // iOS: env(safe-area-inset-*) works natively in WKWebView - no extra setup needed
    }

    initNative();
  }, []);

  return null;
}

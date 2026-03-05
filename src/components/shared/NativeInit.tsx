'use client';

import { useEffect } from 'react';
import { isNativePlatform, isAndroid, isIOS } from '@/lib/platform';

/**
 * NativeInit - Configures native platform UI for a modern, edge-to-edge feel.
 *
 * On native platforms (Android/iOS via Capacitor):
 * - Sets StatusBar to overlay mode with transparent background (modern look)
 * - Uses @capacitor-community/safe-area plugin for accurate inset values
 * - Injects --safe-area-top / --safe-area-bottom as CSS variables
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

      // 2. Get accurate safe area insets from native plugin
      // On Android, env(safe-area-inset-*) returns 0 in WebView even with overlay,
      // so we use @capacitor-community/safe-area for real values from the OS.
      const root = document.documentElement;

      try {
        const { SafeArea } = await import('@capacitor-community/safe-area');
        const { insets } = await SafeArea.getSafeAreaInsets();

        // insets.top/bottom are in CSS px (already density-independent)
        root.style.setProperty('--safe-area-top', `${insets.top}px`);
        root.style.setProperty('--safe-area-bottom', `${insets.bottom}px`);
        root.style.setProperty('--safe-area-left', `${insets.left}px`);
        root.style.setProperty('--safe-area-right', `${insets.right}px`);
      } catch {
        // Plugin not available - fall back to platform-specific estimates
        if (isAndroid()) {
          // Reasonable Android defaults (status bar ~24dp, gesture nav ~16dp)
          root.style.setProperty('--safe-area-top', '24px');
          root.style.setProperty('--safe-area-bottom', '16px');
        }
        // iOS: env(safe-area-inset-*) works correctly in WKWebView,
        // so CSS fallback values in globals.css handle it.
      }
    }

    initNative();
  }, []);

  return null;
}

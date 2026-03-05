'use client';

import { useEffect } from 'react';
import { isNativePlatform } from '@/lib/platform';

/**
 * Initializes native platform settings:
 * - StatusBar: non-overlay mode so content doesn't go behind it
 * - Sets CSS custom property for bottom nav safe area on Android
 */
export function NativeInit() {
  useEffect(() => {
    if (!isNativePlatform()) return;

    async function initNative() {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        // Don't overlay the WebView - status bar stays above content
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
      } catch {
        // StatusBar plugin not available
      }

      // Set CSS variable for Android navigation bar padding
      // Android gesture nav bar is ~48px, button nav is ~48px
      const isAndroid = /Android/.test(navigator.userAgent);
      if (isAndroid) {
        document.documentElement.style.setProperty('--native-bottom-inset', '16px');
      }
    }
    initNative();
  }, []);

  return null;
}

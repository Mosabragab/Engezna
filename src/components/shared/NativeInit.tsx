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
/** Read env(safe-area-inset-*) values via a temporary probe element */
function readSafeAreaEnv() {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)';
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const top = style.paddingTop;
  const bottom = style.paddingBottom;
  document.body.removeChild(probe);
  // If env() returned 0px, use generous defaults for devices with notches
  return {
    top: top && top !== '0px' ? top : '48px',
    bottom: bottom && bottom !== '0px' ? bottom : '32px',
  };
}

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
      // so we use the @capacitor-community/safe-area plugin to inject real values,
      // then read them via a probe element and set CSS variables as a reliable channel.
      if (isAndroid()) {
        const root = document.documentElement;
        try {
          const { SafeArea, SystemBarsStyle } = await import(
            '@capacitor-community/safe-area'
          );
          // Plugin injects env(safe-area-inset-*) values in the WebView
          await SafeArea.setSystemBarsStyle({
            style: SystemBarsStyle.Light,
          });
          // Read the actual env() values via a probe element
          await new Promise((r) => setTimeout(r, 50));
          const insets = readSafeAreaEnv();
          root.style.setProperty('--safe-area-top', insets.top);
          root.style.setProperty('--safe-area-bottom', insets.bottom);
        } catch {
          // Plugin not available - use generous defaults that work on most devices
          root.style.setProperty('--safe-area-top', '48px');
          root.style.setProperty('--safe-area-bottom', '32px');
        }
      }
      // iOS: env(safe-area-inset-*) works natively in WKWebView - no extra setup needed
    }

    initNative();
  }, []);

  return null;
}

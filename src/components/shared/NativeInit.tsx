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
      // Use @capacitor-community/safe-area for both system bar styling AND safe area insets.
      // NOTE: Do NOT use @capacitor/status-bar alongside this plugin - they conflict.
      // The safe-area plugin handles env(safe-area-inset-*) injection on Android automatically.
      try {
        const { SafeArea, SystemBarsStyle } = await import(
          '@capacitor-community/safe-area'
        );
        // Light style = dark icons on light backgrounds (matches our white header)
        await SafeArea.setSystemBarsStyle({
          style: SystemBarsStyle.Light,
        });
      } catch {
        // Plugin not available - graceful fallback
      }

      // Set CSS custom properties as a secondary channel for components.
      // On Android, env(safe-area-inset-*) is handled by the plugin + EdgeToEdge.
      // These CSS vars serve as fallback when env() isn't available.
      if (isAndroid()) {
        const root = document.documentElement;
        // Wait for plugin to inject env() values, then read them
        await new Promise((r) => setTimeout(r, 100));
        const insets = readSafeAreaEnv();
        root.style.setProperty('--safe-area-top', insets.top);
        root.style.setProperty('--safe-area-bottom', insets.bottom);
      }
      // iOS: env(safe-area-inset-*) works natively in WKWebView - no extra setup needed
    }

    initNative();
  }, []);

  return null;
}

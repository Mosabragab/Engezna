'use client';

import { useEffect } from 'react';
import { isNativePlatform, isAndroid } from '@/lib/platform';

/**
 * NativeInit - Configures native platform UI for a modern, edge-to-edge feel.
 *
 * On native platforms (Android/iOS via Capacitor):
 * - Uses @capacitor-community/safe-area plugin for system bar styling
 *   and env(safe-area-inset-*) injection on Android
 * - Sets --safe-area-* CSS variables as a reliable fallback (min 48px top, 32px bottom)
 * - NOTE: Do NOT use @capacitor/status-bar alongside safe-area plugin - they conflict
 *
 * On web/PWA:
 * - Does nothing; CSS env(safe-area-inset-*) handles it via viewport-fit=cover
 */

/** Minimum safe area values for Android (covers devices with notches/punch-holes) */
const ANDROID_MIN_SAFE_TOP = 48;
const ANDROID_MIN_SAFE_BOTTOM = 32;

/** Read env(safe-area-inset-*) values via a temporary probe element */
function readSafeAreaEnv(): { top: string; bottom: string } {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;' +
    'padding-top:env(safe-area-inset-top,0px);' +
    'padding-bottom:env(safe-area-inset-bottom,0px)';
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe);
  const topPx = parseFloat(computed.paddingTop) || 0;
  const bottomPx = parseFloat(computed.paddingBottom) || 0;
  document.body.removeChild(probe);
  // Use the larger of env() value or our minimum defaults
  return {
    top: `${Math.max(topPx, ANDROID_MIN_SAFE_TOP)}px`,
    bottom: `${Math.max(bottomPx, ANDROID_MIN_SAFE_BOTTOM)}px`,
  };
}

export function NativeInit() {
  useEffect(() => {
    if (!isNativePlatform()) return;

    async function initNative() {
      // Use @capacitor-community/safe-area for both system bar styling AND inset injection.
      // NOTE: Do NOT use @capacitor/status-bar alongside this plugin - they conflict.
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

      // Set CSS custom properties with guaranteed minimum values on all native platforms.
      // This ensures header icons are pushed below the status bar and bottom
      // nav is above the gesture bar, even if env() returns 0.
      const root = document.documentElement;
      // Wait for plugin to inject env() values into the WebView
      await new Promise((r) => setTimeout(r, 150));
      const insets = readSafeAreaEnv();
      root.style.setProperty('--safe-area-top', insets.top);
      root.style.setProperty('--safe-area-bottom', insets.bottom);
    }

    initNative();
  }, []);

  return null;
}

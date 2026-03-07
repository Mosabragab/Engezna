'use client';

import { useEffect } from 'react';
import { isNativePlatform } from '@/lib/platform';

/**
 * NativeInit - Configures native platform UI for a modern, edge-to-edge feel.
 *
 * On native platforms (Android/iOS via Capacitor):
 * - Uses @capacitor-community/safe-area plugin for system bar styling
 *   and getSafeAreaInsets() API for accurate values
 * - Falls back to env() probe + generous minimums if plugin unavailable
 * - NOTE: Do NOT use @capacitor/status-bar alongside safe-area plugin - they conflict
 *
 * On web/PWA:
 * - Does nothing; CSS env(safe-area-inset-*) handles it via viewport-fit=cover
 */

/**
 * Minimum safe area values (CSS px) for Android devices.
 * Standard status bar is 24dp, notch/punch-hole devices can be 28-48dp.
 * We add extra buffer (8px) so interactive elements aren't right at the edge
 * of the status bar's touch-capture zone.
 */
const ANDROID_MIN_SAFE_TOP = 56;
const ANDROID_MIN_SAFE_BOTTOM = 32;

/** Read env(safe-area-inset-*) values via a temporary probe element */
function readSafeAreaEnv(): { top: number; bottom: number } {
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
  return { top: topPx, bottom: bottomPx };
}

/** Try to get safe area insets from the native plugin API directly */
async function getPluginInsets(): Promise<{ top: number; bottom: number } | null> {
  try {
    const { SafeArea } = await import('@capacitor-community/safe-area');
    const result = await SafeArea.getSafeAreaInsets();
    if (result?.insets) {
      return { top: result.insets.top, bottom: result.insets.bottom };
    }
  } catch {
    // Plugin not available
  }
  return null;
}

export function NativeInit() {
  useEffect(() => {
    if (!isNativePlatform()) return;

    async function initNative() {
      // Use @capacitor-community/safe-area for system bar styling.
      // NOTE: Do NOT use @capacitor/status-bar alongside this plugin - they conflict.
      try {
        const { SafeArea, SystemBarsStyle } = await import('@capacitor-community/safe-area');
        // Light style = dark icons on light backgrounds (matches our white header)
        await SafeArea.setSystemBarsStyle({
          style: SystemBarsStyle.Light,
        });
      } catch {
        // Plugin not available - graceful fallback
      }

      // Strategy: Try plugin API first (most accurate), then env() probe, then minimums.
      const root = document.documentElement;

      // 1. Try the native plugin API for exact inset values
      const pluginInsets = await getPluginInsets();

      let topPx: number;
      let bottomPx: number;

      if (pluginInsets && pluginInsets.top > 0) {
        // Plugin gave us real values - add 8px touch buffer above interactive elements
        topPx = pluginInsets.top + 8;
        bottomPx = pluginInsets.bottom;
      } else {
        // 2. Fallback: read env() values (may be 0 if plugin not synced to native project)
        await new Promise((r) => setTimeout(r, 150));
        const envInsets = readSafeAreaEnv();
        topPx = envInsets.top;
        bottomPx = envInsets.bottom;
      }

      // 3. Enforce minimums so header icons are never behind the status bar
      topPx = Math.max(topPx, ANDROID_MIN_SAFE_TOP);
      bottomPx = Math.max(bottomPx, ANDROID_MIN_SAFE_BOTTOM);

      root.style.setProperty('--safe-area-top', `${topPx}px`);
      root.style.setProperty('--safe-area-bottom', `${bottomPx}px`);
    }

    initNative();
  }, []);

  return null;
}

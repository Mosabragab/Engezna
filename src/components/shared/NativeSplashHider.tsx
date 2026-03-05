'use client';

import { useEffect } from 'react';

/**
 * Hides the native Capacitor splash screen once the web content has loaded.
 * The splash screen is configured with launchAutoHide: false in capacitor.config.ts,
 * so it must be hidden programmatically.
 */
export function NativeSplashHider() {
  useEffect(() => {
    async function hideSplash() {
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide({ fadeOutDuration: 300 });
      } catch {
        // Not running in Capacitor native context - ignore
      }
    }
    hideSplash();
  }, []);

  return null;
}

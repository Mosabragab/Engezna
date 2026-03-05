'use client';

import { useEffect, useState } from 'react';
import { EngeznaLogo } from '@/components/ui/EngeznaLogo';
import { isNativePlatform } from '@/lib/platform';

/**
 * Handles the app splash screen flow:
 * 1. Hides the native Capacitor splash screen
 * 2. Shows an animated web splash with the EngeznaLogo
 * 3. Fades out to reveal the actual content
 *
 * On native: replaces the static native splash with a polished animated one.
 * On web: shows on first visit per session only.
 */
export function NativeSplashHider() {
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === 'undefined') return false;
    // On native, always show the web splash (app opens fresh each time)
    if (isNativePlatform()) return true;
    // On web, show only once per session
    if (sessionStorage.getItem('splash_shown')) return false;
    return true;
  });
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Hide the native Capacitor splash screen
    async function hideSplash() {
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide({ fadeOutDuration: 200 });
      } catch {
        // Not running in Capacitor native context - ignore
      }
    }
    hideSplash();
  }, []);

  useEffect(() => {
    if (!showSplash) return;

    // Mark as shown for web sessions
    sessionStorage.setItem('splash_shown', '1');

    // Start fade out after the logo animation completes (~2s)
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2000);

    // Remove splash after fade animation
    const removeTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [showSplash]);

  if (!showSplash) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <EngeznaLogo size="2xl" showPen={true} bgColor="white" />
      <p
        className="mt-6 text-slate-400 text-sm font-medium animate-pulse"
        style={{ fontFamily: "var(--font-noto-sans-arabic), 'Noto Sans Arabic', sans-serif" }}
      >
        احتياجات بيتك اليومية
      </p>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { EngeznaLogo } from '@/components/ui/EngeznaLogo';
import { isNativePlatform } from '@/lib/platform';

/**
 * Web-based splash overlay:
 * - On native: shows a polished animated splash while the web content loads
 * - On web: DISABLED. The fixed `inset-0` overlay co-existed in the page
 *   tree during Lighthouse's CLS measurement window — artifact #18
 *   (PR #387) showed thumb 2 at 3599ms = splash logo only, thumb 3 at
 *   4799ms = real home with offers banner. The lab assertion-results
 *   pinned a 0.239 CLS to the OffersCarousel section.children[1] (banner
 *   container) that matched the geometry of the splash unmount + lazy
 *   sections settling together. Web users get the SSR'd home directly,
 *   which is the audited path; no need for a session-shown splash to
 *   "soften" the load.
 * - The native Capacitor splash auto-hides via launchAutoHide: true
 */
export function NativeSplashHider() {
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Web: no splash. Lab measures the SSR home immediately.
    if (!isNativePlatform()) return false;
    if (sessionStorage.getItem('splash_shown')) return false;
    return true;
  });
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!showSplash) return;

    sessionStorage.setItem('splash_shown', '1');

    const fadeTimer = setTimeout(() => setFadeOut(true), 2000);
    const removeTimer = setTimeout(() => setShowSplash(false), 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [showSplash]);

  if (!showSplash) return null;

  return (
    <div
      className={`fixed inset-0 z-[var(--z-splash,9999)] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ${
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

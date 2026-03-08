'use client';

import { useEffect, useState } from 'react';
import { EngeznaLogo } from '@/components/ui/EngeznaLogo';
import { isNativePlatform } from '@/lib/platform';

/**
 * Web-based splash overlay:
 * - On native: shows a polished animated splash while the web content loads
 * - On web: shows once per session
 * - The native Capacitor splash auto-hides via launchAutoHide: true
 */
export function NativeSplashHider() {
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (isNativePlatform()) return true;
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

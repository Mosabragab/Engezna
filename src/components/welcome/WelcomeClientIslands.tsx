'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Lazy load client-only components as islands within the server-rendered welcome page.
// Footer drags in Supabase + cached-queries + next-intl; InstallPrompt drags in PWA
// listeners and next-intl. Neither is needed at first paint, so we defer both to
// browser idle time to keep TBT down on /welcome (cold guest entry point).
const Footer = dynamic(() => import('@/components/shared/Footer').then((mod) => mod.Footer));
const InstallPrompt = dynamic(
  () => import('@/components/pwa/InstallPrompt').then((mod) => mod.InstallPrompt),
  { ssr: false }
);

export function WelcomeClientIslands() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const mount = () => {
      if (!cancelled) setReady(true);
    };
    // requestIdleCallback yields the main thread until after FCP/LCP, so the
    // Footer + InstallPrompt chunks don't compete for the TBT window.
    const ric = (window as Window & typeof globalThis).requestIdleCallback;
    if (typeof ric === 'function') {
      const id = ric(mount, { timeout: 4000 });
      return () => {
        cancelled = true;
        (window as Window & typeof globalThis).cancelIdleCallback?.(id);
      };
    }
    const t = setTimeout(mount, 1500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  if (!ready) return null;

  return (
    <>
      <Footer />
      <InstallPrompt />
    </>
  );
}

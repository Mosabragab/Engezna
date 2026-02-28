'use client';

import dynamic from 'next/dynamic';

// Lazy load client-only components as islands within the server-rendered welcome page
const Footer = dynamic(() => import('@/components/shared/Footer').then((mod) => mod.Footer));
const InstallPrompt = dynamic(
  () => import('@/components/pwa/InstallPrompt').then((mod) => mod.InstallPrompt),
  { ssr: false }
);

/**
 * Client component islands for the Welcome page.
 * Footer and InstallPrompt require client-side hooks (useLocale, useEffect, etc.)
 * so they must be rendered in a 'use client' boundary.
 */
export function WelcomeClientIslands() {
  return (
    <>
      <Footer />
      <InstallPrompt />
    </>
  );
}

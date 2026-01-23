import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: 'noindex, nofollow',
};

interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * Auth Layout
 *
 * Wraps all authentication pages with proper semantic structure.
 * Provides the <main> landmark required for accessibility.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main id="main-content" role="main">
      {children}
    </main>
  );
}

import type { Metadata } from 'next';
import { GoogleOAuthProvider } from '@/components/providers/GoogleOAuthProvider';

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
 * GoogleOAuthProvider is here (not in root layout) for better performance -
 * it only initializes on auth pages where Google login is actually used.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <GoogleOAuthProvider>
      <main id="main-content" role="main">
        {children}
      </main>
    </GoogleOAuthProvider>
  );
}

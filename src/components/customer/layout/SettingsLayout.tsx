'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { User } from 'lucide-react';
import { BottomNavigation } from './BottomNavigation';

interface SettingsLayoutProps {
  children: ReactNode;
  title?: string;
}

export function SettingsLayout({ children, title }: SettingsLayoutProps) {
  const locale = useLocale();

  return (
    <div className="min-h-screen bg-muted pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Right - Profile Icon */}
            <Link
              href={`/${locale}/profile`}
              className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
            >
              <User className="w-5 h-5" />
            </Link>

            {/* Center - Logo */}
            <Link href={`/${locale}`} className="text-xl font-bold text-primary">
              {locale === 'ar' ? 'إنجزنا' : 'Engezna'}
            </Link>

            {/* Left - Empty space for balance */}
            <div className="w-9" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}

'use client';

import { ReactNode } from 'react';
import { CustomerHeader } from './CustomerHeader';
import { BottomNavigation } from './BottomNavigation';
import { Footer } from '@/components/shared/Footer';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';

interface CustomerLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showBottomNav?: boolean;
  showFooter?: boolean;
  headerTitle?: string;
  showBackButton?: boolean;
  transparentHeader?: boolean;
  headerRightAction?: React.ReactNode;
}

export function CustomerLayout({
  children,
  showHeader = true,
  showBottomNav = true,
  showFooter = true,
  headerTitle,
  showBackButton = false,
  transparentHeader = false,
  headerRightAction,
}: CustomerLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      {showHeader && (
        <CustomerHeader
          title={headerTitle}
          showBackButton={showBackButton}
          transparent={transparentHeader}
          rightAction={headerRightAction}
        />
      )}

      {/* Main Content */}
      <main className={`flex-1 ${showBottomNav ? 'pb-20' : ''}`}>{children}</main>

      {/* Footer - Hidden on mobile when bottom nav is shown */}
      {showFooter && (
        <div className={showBottomNav ? 'hidden md:block' : ''}>
          <Footer />
        </div>
      )}

      {/* Bottom Navigation - Mobile only */}
      {showBottomNav && <BottomNavigation />}

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </div>
  );
}

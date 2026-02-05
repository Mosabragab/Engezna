'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { PermissionsProvider } from '@/lib/permissions/use-permissions';
import { AdminSidebarProvider, useAdminSidebar } from '@/components/admin/AdminSidebarContext';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminRegionProvider, useAdminRegion } from '@/lib/contexts/AdminRegionContext';
import { createClient } from '@/lib/supabase/client';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('AdminLayout');

interface AdminLayoutInnerProps {
  children: React.ReactNode;
}

function AdminLayoutInner({ children }: AdminLayoutInnerProps) {
  const pathname = usePathname();
  const { isOpen, close, hasMounted } = useAdminSidebar();
  const {
    hasRegionFilter,
    allowedGovernorateIds,
    regionProviderIds,
    loading: regionLoading,
  } = useAdminRegion();

  const [pendingProviders, setPendingProviders] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [pendingBannerApprovals, setPendingBannerApprovals] = useState(0);
  const [pendingRefunds, setPendingRefunds] = useState(0);
  const [contactFormMessages, setContactFormMessages] = useState(0);

  // Check if current page is login page - don't show sidebar
  const isLoginPage = pathname?.includes('/admin/login');

  const loadBadgeCounts = useCallback(async () => {
    try {
      const supabase = createClient();

      // Get pending providers count (filtered by region)
      let providersQuery = supabase
        .from('providers')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending_approval', 'incomplete']);

      if (hasRegionFilter) {
        providersQuery = providersQuery.in('governorate_id', allowedGovernorateIds);
      }

      const { count: providersCount, error: providersError } = await providersQuery;

      if (!providersError) {
        setPendingProviders(providersCount || 0);
      }

      // Get open tickets count (filtered by provider's region)
      // Note: This counts only provider-related tickets (with provider_id)
      // Contact form tickets are counted separately in contactFormMessages
      // If regional admin has no providers in their region, show 0
      if (hasRegionFilter && regionProviderIds.length === 0) {
        setOpenTickets(0);
      } else {
        let ticketsQuery = supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open')
          .not('provider_id', 'is', null); // Only count provider-related tickets

        if (hasRegionFilter && regionProviderIds.length > 0) {
          ticketsQuery = ticketsQuery.in('provider_id', regionProviderIds);
        }

        const { count: ticketsCount, error: ticketsError } = await ticketsQuery;

        if (!ticketsError) {
          setOpenTickets(ticketsCount || 0);
        }
      }

      // Get pending banner approvals count (filtered by provider's region)
      // If regional admin has no providers in their region, show 0
      if (hasRegionFilter && regionProviderIds.length === 0) {
        setPendingBannerApprovals(0);
      } else {
        let bannersQuery = supabase
          .from('homepage_banners')
          .select('*', { count: 'exact', head: true })
          .not('provider_id', 'is', null)
          .eq('approval_status', 'pending');

        if (hasRegionFilter && regionProviderIds.length > 0) {
          bannersQuery = bannersQuery.in('provider_id', regionProviderIds);
        }

        const { count: bannerApprovalsCount, error: bannerApprovalsError } = await bannersQuery;

        if (!bannerApprovalsError) {
          setPendingBannerApprovals(bannerApprovalsCount || 0);
        }
      }

      // Get pending refunds count (filtered by provider's region)
      // If regional admin has no providers in their region, show 0
      if (hasRegionFilter && regionProviderIds.length === 0) {
        setPendingRefunds(0);
      } else {
        let refundsQuery = supabase
          .from('refunds')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        if (hasRegionFilter && regionProviderIds.length > 0) {
          refundsQuery = refundsQuery.in('provider_id', regionProviderIds);
        }

        const { count: refundsCount, error: refundsError } = await refundsQuery;

        if (!refundsError) {
          setPendingRefunds(refundsCount || 0);
        }
      }

      // Get contact form messages count (new/open from contact form)
      const { count: contactFormCount, error: contactFormError } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('source', 'contact_form')
        .eq('status', 'open');

      if (!contactFormError) {
        setContactFormMessages(contactFormCount || 0);
      }
    } catch (error) {
      // Log error for debugging - badge counts are not critical for UI
      logger.warn('Failed to load badge counts', {
        error: error instanceof Error ? error.message : String(error),
        hasRegionFilter,
        regionProviderCount: regionProviderIds.length,
      });
    }
  }, [hasRegionFilter, regionProviderIds, allowedGovernorateIds]);

  // ═══════════════════════════════════════════════════════════════════════════
  // OPTIMIZED: Polling only - removed Realtime channels for admin badges
  // Admin badges don't need instant updates - 30s polling is sufficient
  // This reduces 3 Realtime channels per admin session
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    // Don't load badge counts on login page or while region data is loading
    if (isLoginPage || regionLoading) return;

    // Load badge counts using cached region data
    loadBadgeCounts();

    // Poll every 30 seconds for admin badge updates
    const pollingInterval = setInterval(loadBadgeCounts, 30000);

    return () => clearInterval(pollingInterval);
  }, [isLoginPage, regionLoading, loadBadgeCounts]);

  // Always render sidebar to prevent mounting issues on navigation
  // Hide via CSS on login page for smooth transitions
  return (
    <div className={`min-h-screen bg-slate-50 ${isLoginPage ? '' : 'flex'}`}>
      {/* Sidebar - always rendered but hidden on login page */}
      {/* This prevents remounting issues when navigating from login to dashboard */}
      <div className={isLoginPage ? 'hidden' : ''}>
        <AdminSidebar
          isOpen={isOpen}
          onClose={close}
          pendingProviders={pendingProviders}
          openTickets={openTickets}
          pendingBannerApprovals={pendingBannerApprovals}
          pendingRefunds={pendingRefunds}
          contactFormMessages={contactFormMessages}
          hasMounted={hasMounted}
        />
      </div>

      {/* Main content area - pages render here */}
      <div className={`flex-1 flex flex-col min-h-screen ${isLoginPage ? '' : 'overflow-hidden'}`}>
        {children}
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionsProvider>
      <AdminRegionProvider>
        <AdminSidebarProvider>
          <AdminLayoutInner>{children}</AdminLayoutInner>
        </AdminSidebarProvider>
      </AdminRegionProvider>
    </PermissionsProvider>
  );
}

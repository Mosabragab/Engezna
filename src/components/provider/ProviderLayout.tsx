'use client';

import { ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { subscribeWithErrorHandling } from '@/lib/supabase/realtime-manager';
import { setAppBadge, clearAppBadge } from '@/hooks/useBadge';
import { getAudioManager } from '@/lib/audio/audio-manager';
import { Button } from '@/components/ui/button';
import { EngeznaLogo } from '@/components/ui/EngeznaLogo';
import { ProviderSidebar } from './ProviderSidebar';
import { ProviderHeader } from './ProviderHeader';
import { ProviderBottomNav } from './ProviderBottomNav';
import type { User } from '@supabase/supabase-js';

interface Provider {
  id: string;
  name_ar: string;
  name_en: string;
  logo_url: string | null;
  status: string;
  category: string;
  operation_mode: 'standard' | 'custom' | 'hybrid';
}

// Staff permissions interface
interface StaffPermissions {
  isOwner: boolean;
  canManageOrders: boolean;
  canManageMenu: boolean;
  canManageCustomers: boolean;
  canViewAnalytics: boolean;
  canManageOffers: boolean;
  canManageTeam: boolean;
}

const defaultPermissions: StaffPermissions = {
  isOwner: false,
  canManageOrders: false,
  canManageMenu: false,
  canManageCustomers: false,
  canViewAnalytics: false,
  canManageOffers: false,
  canManageTeam: false,
};

interface ProviderLayoutProps {
  children: ReactNode;
  pageTitle?: { ar: string; en: string };
  pageSubtitle?: { ar: string; en: string };
}

export function ProviderLayout({ children, pageTitle, pageSubtitle }: ProviderLayoutProps) {
  const locale = useLocale();
  const [user, setUser] = useState<User | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [pendingCustomOrders, setPendingCustomOrders] = useState(0); // الطلبات المفتوحة المعلقة
  const [pendingRefunds, setPendingRefunds] = useState(0);
  const [pendingComplaints, setPendingComplaints] = useState(0);
  const [onHoldOrders, setOnHoldOrders] = useState(0); // الطلبات المعلقة - on_hold في المحرك المالي
  const [permissions, setPermissions] = useState<StaffPermissions>(defaultPermissions);

  // Badge counts are loaded by the unified polling effect (runs on mount + every 60s)
  // No separate loadUnreadCount needed - the polling effect handles initial + periodic fetches

  const checkAuth = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      // First, check if user is a provider owner
      const { data: providerData } = await supabase
        .from('providers')
        .select('id, name_ar, name_en, logo_url, status, category, operation_mode')
        .eq('owner_id', user.id)
        .limit(1);

      if (providerData && providerData.length > 0) {
        // User is a provider owner - has all permissions
        setProvider(providerData[0]);
        setPermissions({
          isOwner: true,
          canManageOrders: true,
          canManageMenu: true,
          canManageCustomers: true,
          canViewAnalytics: true,
          canManageOffers: true,
          canManageTeam: true,
        });
        // Badge counts loaded by unified polling effect when provider.id is set
      } else {
        // Check if user is a staff member
        const { data: staffData } = await supabase
          .from('provider_staff')
          .select(
            `
            id,
            is_active,
            can_manage_orders,
            can_manage_menu,
            can_manage_customers,
            can_view_analytics,
            can_manage_offers,
            providers (
              id,
              name_ar,
              name_en,
              logo_url,
              status,
              category,
              operation_mode
            )
          `
          )
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (staffData && staffData.providers) {
          // Type assertion for the joined provider data
          const providerInfo = staffData.providers as unknown as Provider;
          setProvider(providerInfo);
          setPermissions({
            isOwner: false,
            canManageOrders: staffData.can_manage_orders ?? false,
            canManageMenu: staffData.can_manage_menu ?? false,
            canManageCustomers: staffData.can_manage_customers ?? false,
            canViewAnalytics: staffData.can_view_analytics ?? false,
            canManageOffers: staffData.can_manage_offers ?? false,
            canManageTeam: false, // Staff cannot manage team
          });
          // Badge counts loaded by unified polling effect when provider.id is set
        }
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Listen for auth state changes to re-check authentication
  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // Re-check authentication when user signs in
        // This ensures provider data is loaded after login navigation
        checkAuth();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProvider(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkAuth]);

  // Debounced sync of unread notification count from DB
  // Corrects any drift caused by missed Realtime events
  const syncUnreadCount = useCallback(async (providerId: string) => {
    const supabase = createClient();
    const { count } = await supabase
      .from('provider_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', providerId)
      .eq('is_read', false);
    setUnreadCount(count || 0);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // OPTIMIZED: Single unified Realtime channel with error recovery
  // Uses subscribeWithErrorHandling for:
  // - Automatic exponential backoff on CHANNEL_ERROR / TIMED_OUT
  // - Polling fallback when Realtime fails completely
  // - Connection status tracking
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!provider?.id) return;

    const supabase = createClient();
    const providerId = provider.id;

    // Build the unified channel with all event listeners
    const unifiedChannel = supabase
      .channel(`provider-unified-${providerId}`)
      // NOTIFICATIONS
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'provider_notifications',
          filter: `provider_id=eq.${providerId}`,
        },
        () => {
          setUnreadCount((prev) => prev + 1);
          getAudioManager().play('notification');
          setTimeout(() => syncUnreadCount(providerId), 500);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'provider_notifications',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          const oldNotif = payload.old as { is_read: boolean };
          const newNotif = payload.new as { is_read: boolean };
          if (!oldNotif.is_read && newNotif.is_read) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
          if (oldNotif.is_read && !newNotif.is_read) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'provider_notifications',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          const deleted = payload.old as { is_read: boolean };
          if (!deleted.is_read) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      // ORDERS
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          const newOrder = payload.new as {
            status: string;
            payment_method: string;
            payment_status: string;
            order_flow?: string;
          };
          const isVisible =
            newOrder.payment_method === 'cash' ||
            newOrder.payment_status === 'paid' ||
            newOrder.payment_status === 'completed';
          const isStandardFlow = !newOrder.order_flow || newOrder.order_flow === 'standard';
          if (newOrder.status === 'pending' && isVisible && isStandardFlow) {
            setPendingOrders((prev) => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          const oldOrder = payload.old as {
            status: string;
            payment_method: string;
            payment_status: string;
            order_flow?: string;
          };
          const newOrder = payload.new as {
            status: string;
            payment_method: string;
            payment_status: string;
            order_flow?: string;
          };

          const wasVisible =
            oldOrder.payment_method === 'cash' ||
            oldOrder.payment_status === 'paid' ||
            oldOrder.payment_status === 'completed';
          const isVisible =
            newOrder.payment_method === 'cash' ||
            newOrder.payment_status === 'paid' ||
            newOrder.payment_status === 'completed';
          const isStandardFlow = !newOrder.order_flow || newOrder.order_flow === 'standard';

          if (
            oldOrder.status === 'pending' &&
            wasVisible &&
            (newOrder.status !== 'pending' || !isVisible)
          ) {
            setPendingOrders((prev) => Math.max(0, prev - 1));
          }
          if (
            newOrder.status === 'pending' &&
            isVisible &&
            isStandardFlow &&
            (oldOrder.status !== 'pending' || !wasVisible)
          ) {
            setPendingOrders((prev) => prev + 1);
          }
        }
      )
      // CUSTOM ORDERS
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'custom_order_requests',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          const newRequest = payload.new as { status: string };
          if (newRequest.status === 'pending' || newRequest.status === 'priced') {
            setPendingCustomOrders((prev) => prev + 1);
            getAudioManager().play('custom-order');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'custom_order_requests',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          const oldRequest = payload.old as { status: string };
          const newRequest = payload.new as { status: string };

          const wasActive = oldRequest.status === 'pending' || oldRequest.status === 'priced';
          const isActive = newRequest.status === 'pending' || newRequest.status === 'priced';

          if (wasActive && !isActive) {
            setPendingCustomOrders((prev) => Math.max(0, prev - 1));
          }
          if (!wasActive && isActive) {
            setPendingCustomOrders((prev) => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'custom_order_requests',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          const deleted = payload.old as { status: string };
          if (deleted.status === 'pending' || deleted.status === 'priced') {
            setPendingCustomOrders((prev) => Math.max(0, prev - 1));
          }
        }
      );

    // Subscribe with error handling: auto-retry with exponential backoff,
    // polling fallback if Realtime fails completely
    const cleanup = subscribeWithErrorHandling(supabase, unifiedChannel, {
      channelName: `provider-unified-${providerId}`,
      maxRetries: 3,
      retryDelayMs: 2000,
    });

    return cleanup;
  }, [provider?.id, syncUnreadCount]);

  // ═══════════════════════════════════════════════════════════════════════════
  // POLLING: All badge counts updated every 60 seconds (unified poll)
  // Includes: notifications, pending orders, refunds, complaints, on_hold
  // Realtime handles immediate updates; polling is a drift-correction fallback
  //
  // OPTIMIZATIONS:
  // - Visibility guard: pauses when tab is in background
  // - Pending orders uses COUNT instead of fetching rows (90% less data transfer)
  // - All queries use { count: 'exact', head: true } for minimal payload
  // ═══════════════════════════════════════════════════════════════════════════
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!provider?.id) return;

    const supabase = createClient();
    const providerId = provider.id;

    // Unified function to fetch ALL badge counts in parallel
    const fetchAllBadgeCounts = async () => {
      try {
        const [
          pendingCashResult,
          pendingPaidResult,
          customOrdersResult,
          refundsResult,
          complaintsResult,
          onHoldResult,
          notifResult,
        ] = await Promise.all([
          // Pending cash orders (COUNT instead of fetching rows)
          supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('provider_id', providerId)
            .eq('status', 'pending')
            .eq('payment_method', 'cash')
            .or('order_flow.is.null,order_flow.eq.standard'),
          // Pending paid online orders (COUNT)
          supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('provider_id', providerId)
            .eq('status', 'pending')
            .neq('payment_method', 'cash')
            .in('payment_status', ['paid', 'completed'])
            .or('order_flow.is.null,order_flow.eq.standard'),
          // Custom orders
          supabase
            .from('custom_order_requests_live')
            .select('*', { count: 'exact', head: true })
            .eq('provider_id', providerId)
            .in('live_status', ['pending', 'priced']),
          // Refunds
          supabase
            .from('refunds')
            .select('*', { count: 'exact', head: true })
            .eq('provider_id', providerId)
            .eq('status', 'pending')
            .eq('provider_action', 'pending'),
          // Complaints
          supabase
            .from('support_tickets')
            .select('*', { count: 'exact', head: true })
            .eq('provider_id', providerId)
            .in('status', ['open', 'in_progress']),
          // On-hold orders
          supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('provider_id', providerId)
            .eq('settlement_status', 'on_hold'),
          // Notification count
          supabase
            .from('provider_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('provider_id', providerId)
            .eq('is_read', false),
        ]);

        setPendingOrders((pendingCashResult.count || 0) + (pendingPaidResult.count || 0));
        setPendingCustomOrders(customOrdersResult.count || 0);
        setPendingRefunds(refundsResult.count || 0);
        setPendingComplaints(complaintsResult.count || 0);
        setOnHoldOrders(onHoldResult.count || 0);
        setUnreadCount(notifResult.count || 0);
      } catch {
        // Silently ignore polling errors - realtime is the primary source
      }
    };

    const startPolling = () => {
      if (pollingIntervalRef.current) return;
      pollingIntervalRef.current = setInterval(fetchAllBadgeCounts, 60000);
    };

    const stopPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    // Visibility guard: pause polling when tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchAllBadgeCounts();
        startPolling();
      }
    };

    // Initial fetch + start polling
    fetchAllBadgeCounts();
    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [provider?.id]);

  // Update app badge when notification counts change
  useEffect(() => {
    const totalBadge =
      unreadCount +
      pendingOrders +
      pendingCustomOrders +
      pendingRefunds +
      pendingComplaints +
      onHoldOrders;
    if (totalBadge > 0) {
      setAppBadge(totalBadge);
    } else {
      clearAppBadge();
    }
  }, [
    unreadCount,
    pendingOrders,
    pendingCustomOrders,
    pendingRefunds,
    pendingComplaints,
    onHoldOrders,
  ]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearAppBadge(); // Clear badge on sign out
    window.location.href = `/${locale}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
          <div className="flex justify-center mb-4">
            <EngeznaLogo size="lg" static showPen={false} />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-slate-900">
            {locale === 'ar' ? 'لوحة مقدم الخدمة' : 'Provider Dashboard'}
          </h1>
          <p className="text-slate-600 mb-6">
            {locale === 'ar'
              ? 'يجب تسجيل الدخول للوصول إلى لوحة التحكم'
              : 'Please login to access your dashboard'}
          </p>
          <Link href={`/${locale}/auth/login`}>
            <Button size="lg">{locale === 'ar' ? 'تسجيل الدخول' : 'Login'}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar */}
      <ProviderSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        provider={provider}
        pendingOrders={pendingOrders}
        pendingCustomOrders={pendingCustomOrders}
        unreadNotifications={unreadCount}
        pendingRefunds={pendingRefunds}
        onHoldOrders={onHoldOrders}
        pendingComplaints={pendingComplaints}
        permissions={permissions}
        operationMode={provider?.operation_mode || 'standard'}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <ProviderHeader
          user={user}
          onMenuClick={() => setSidebarOpen(true)}
          onSignOut={handleSignOut}
          pendingOrders={pendingOrders}
          totalNotifications={unreadCount}
          providerId={provider?.id}
          pageTitle={pageTitle}
          pageSubtitle={pageSubtitle}
        />

        {/* Page Content - with bottom padding for mobile nav */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto pb-20 lg:pb-6">{children}</main>

        {/* Bottom Navigation - Mobile Only */}
        <ProviderBottomNav pendingOrders={pendingOrders} pendingRefunds={pendingRefunds} />
      </div>
    </div>
  );
}

'use client';

import { ReactNode, useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
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

  // Load unread notifications count from provider_notifications table
  const loadUnreadCount = useCallback(async (providerId: string) => {
    const supabase = createClient();

    // Get unread notifications count
    const { count } = await supabase
      .from('provider_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', providerId)
      .eq('is_read', false);

    setUnreadCount(count || 0);

    // Also get pending orders for sidebar badge
    // IMPORTANT: Match the same filter as orders page - exclude unpaid online payment orders
    // Cash orders (payment_method = 'cash') are always visible
    // Online payment orders only visible when payment_status = 'paid' or 'completed'
    const { data: pendingOrdersData } = await supabase
      .from('orders')
      .select('id, payment_method, payment_status')
      .eq('provider_id', providerId)
      .eq('status', 'pending')
      .or('order_flow.is.null,order_flow.eq.standard'); // Exclude custom orders

    // Filter to match page logic
    const visiblePendingOrders = (pendingOrdersData || []).filter((order) => {
      if (order.payment_method === 'cash') return true;
      return order.payment_status === 'paid' || order.payment_status === 'completed';
    });

    setPendingOrders(visiblePendingOrders.length);

    // Get pending refunds count (refunds awaiting provider response)
    const { count: refundsCount } = await supabase
      .from('refunds')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', providerId)
      .eq('status', 'pending')
      .eq('provider_action', 'pending');

    setPendingRefunds(refundsCount || 0);

    // Get pending complaints count (open or in_progress support tickets)
    const { count: complaintsCount } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', providerId)
      .in('status', ['open', 'in_progress']);

    setPendingComplaints(complaintsCount || 0);

    // Get on_hold orders count (orders with settlement_status = 'on_hold')
    // مرتبط بالمحرك المالي - الطلبات المعلقة بسبب نزاعات أو استردادات
    const { count: onHoldCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', providerId)
      .eq('settlement_status', 'on_hold');

    setOnHoldOrders(onHoldCount || 0);

    // Get active custom orders count using live view (طلبات تحتاج متابعة)
    // Uses custom_order_requests_live view to exclude expired-but-not-yet-updated requests
    // - 'pending' = بانتظار التسعير (يحتاج التاجر يسعّر)
    // - 'priced' = بانتظار موافقة العميل (يحتاج متابعة) - NOT expired per live_status
    const { count: customOrdersCount } = await supabase
      .from('custom_order_requests_live')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', providerId)
      .in('live_status', ['pending', 'priced']);

    setPendingCustomOrders(customOrdersCount || 0);
  }, []);

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
        await loadUnreadCount(providerData[0].id);
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
          await loadUnreadCount(providerInfo.id);
        }
      }
    }

    setLoading(false);
  }, [loadUnreadCount]);

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
  // OPTIMIZED: Single unified Realtime channel for critical updates
  // Merged: notifications + orders + custom_orders (3 tables, 1 channel)
  // This reduces Realtime connections by 80%
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!provider?.id) return;

    const supabase = createClient();
    const providerId = provider.id;

    // Single unified channel for all critical realtime updates
    const unifiedChannel = supabase
      .channel(`provider-unified-${providerId}`)
      // ─────────────────────────────────────────────────────────────────────────
      // NOTIFICATIONS: Real-time updates for notification bell
      // After INSERT, re-fetch actual count from DB to correct drift
      // (Supabase Realtime can miss events when multiple INSERTs happen rapidly)
      // ─────────────────────────────────────────────────────────────────────────
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'provider_notifications',
          filter: `provider_id=eq.${providerId}`,
        },
        () => {
          // Optimistic increment for instant UI feedback
          setUnreadCount((prev) => prev + 1);
          // Play notification sound via AudioManager
          getAudioManager().play('notification');
          // Re-fetch actual count from DB after a short delay to correct drift
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
      // ─────────────────────────────────────────────────────────────────────────
      // ORDERS: Real-time updates for pending orders badge (critical)
      // IMPORTANT: Only count visible orders (cash or paid online payments)
      // ─────────────────────────────────────────────────────────────────────────
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
          // Only count if: pending AND (cash OR paid online) AND standard flow
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

          // Check visibility for old and new states
          const wasVisible =
            oldOrder.payment_method === 'cash' ||
            oldOrder.payment_status === 'paid' ||
            oldOrder.payment_status === 'completed';
          const isVisible =
            newOrder.payment_method === 'cash' ||
            newOrder.payment_status === 'paid' ||
            newOrder.payment_status === 'completed';
          const isStandardFlow = !newOrder.order_flow || newOrder.order_flow === 'standard';

          // Decrement if was visible pending and now not
          if (
            oldOrder.status === 'pending' &&
            wasVisible &&
            (newOrder.status !== 'pending' || !isVisible)
          ) {
            setPendingOrders((prev) => Math.max(0, prev - 1));
          }
          // Increment if becomes visible pending
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
      // ─────────────────────────────────────────────────────────────────────────
      // CUSTOM ORDERS: Real-time updates for custom order requests (critical)
      // Track both 'pending' (needs pricing) and 'priced' (awaiting customer approval)
      // ─────────────────────────────────────────────────────────────────────────
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
            // Play DISTINCT notification sound for custom orders via AudioManager
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

          // Decrement if was active and now not
          if (wasActive && !isActive) {
            setPendingCustomOrders((prev) => Math.max(0, prev - 1));
          }
          // Increment if becomes active
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
      )
      .subscribe();

    return () => {
      supabase.removeChannel(unifiedChannel);
    };
  }, [provider?.id]);

  // ═══════════════════════════════════════════════════════════════════════════
  // POLLING: Non-critical badges updated every 30 seconds
  // refunds, complaints, on_hold orders - less time-sensitive
  // This reduces Realtime load significantly while keeping UI updated
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!provider?.id) return;

    const supabase = createClient();
    const providerId = provider.id;

    // Function to fetch badge counts (including pending orders as realtime fallback)
    const fetchBadgeCounts = async () => {
      // Fetch pending orders count (fallback for realtime)
      // IMPORTANT: Match the same filter as orders page
      const { data: pendingOrdersData } = await supabase
        .from('orders')
        .select('id, payment_method, payment_status')
        .eq('provider_id', providerId)
        .eq('status', 'pending')
        .or('order_flow.is.null,order_flow.eq.standard');

      const visiblePendingOrders = (pendingOrdersData || []).filter((order) => {
        if (order.payment_method === 'cash') return true;
        return order.payment_status === 'paid' || order.payment_status === 'completed';
      });
      setPendingOrders(visiblePendingOrders.length);

      // Fetch pending custom orders count using live view (excludes expired-but-not-updated)
      const { count: customOrdersCount } = await supabase
        .from('custom_order_requests_live')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', providerId)
        .in('live_status', ['pending', 'priced']);
      setPendingCustomOrders(customOrdersCount || 0);

      // Fetch pending refunds count
      const { count: refundsCount } = await supabase
        .from('refunds')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', providerId)
        .eq('status', 'pending')
        .eq('provider_action', 'pending');
      setPendingRefunds(refundsCount || 0);

      // Fetch pending complaints count
      const { count: complaintsCount } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', providerId)
        .in('status', ['open', 'in_progress']);
      setPendingComplaints(complaintsCount || 0);

      // Fetch on_hold orders count
      const { count: onHoldCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', providerId)
        .eq('settlement_status', 'on_hold');
      setOnHoldOrders(onHoldCount || 0);
    };

    // Initial fetch
    fetchBadgeCounts();

    // Poll every 30 seconds for non-critical updates
    const pollingInterval = setInterval(fetchBadgeCounts, 30000);

    // Fast notification count sync every 5 seconds
    // Catches missed Realtime events (Supabase can miss rapid INSERTs)
    const notifSyncInterval = setInterval(async () => {
      const { count } = await supabase
        .from('provider_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', providerId)
        .eq('is_read', false);
      setUnreadCount(count || 0);
    }, 5000);

    return () => {
      clearInterval(pollingInterval);
      clearInterval(notifSyncInterval);
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

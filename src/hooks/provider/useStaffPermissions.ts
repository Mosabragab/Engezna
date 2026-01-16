'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface StaffPermissions {
  // Role Information
  isOwner: boolean;
  isStaff: boolean;
  userRole: 'owner' | 'staff' | null;

  // Provider Information
  providerId: string | null;
  providerName: { ar: string; en: string } | null;
  providerStatus: string | null;

  // User Information
  userId: string | null;
  userName: string | null;
  userEmail: string | null;

  // Permissions - All permissions (owners always have all)
  canManageOrders: boolean; // Orders + Refunds
  canManageMenu: boolean; // Products
  canManageCustomers: boolean; // Customer data
  canViewAnalytics: boolean; // Analytics & Reports
  canManageOffers: boolean; // Promotions & Banners
  canManageTeam: boolean; // Team management (owner only)

  // Staff record ID (for updates)
  staffRecordId: string | null;
}

export interface UseStaffPermissionsReturn extends StaffPermissions {
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// Default Permissions (no access)
// ============================================================================

const defaultPermissions: StaffPermissions = {
  isOwner: false,
  isStaff: false,
  userRole: null,
  providerId: null,
  providerName: null,
  providerStatus: null,
  userId: null,
  userName: null,
  userEmail: null,
  canManageOrders: false,
  canManageMenu: false,
  canManageCustomers: false,
  canViewAnalytics: false,
  canManageOffers: false,
  canManageTeam: false,
  staffRecordId: null,
};

// ============================================================================
// Hook
// ============================================================================

export function useStaffPermissions(): UseStaffPermissionsReturn {
  const [permissions, setPermissions] = useState<StaffPermissions>(defaultPermissions);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPermissions(defaultPermissions);
        setLoading(false);
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('id', user.id)
        .single();

      if (!profile) {
        setPermissions(defaultPermissions);
        setLoading(false);
        return;
      }

      // Check if user is a provider owner
      if (profile.role === 'provider_owner') {
        const { data: provider } = await supabase
          .from('providers')
          .select('id, name_ar, name_en, status')
          .eq('owner_id', user.id)
          .limit(1)
          .single();

        if (provider) {
          // Get staff record (owner should have one)
          const { data: staffRecord } = await supabase
            .from('provider_staff')
            .select('id')
            .eq('provider_id', provider.id)
            .eq('user_id', user.id)
            .single();

          setPermissions({
            isOwner: true,
            isStaff: false,
            userRole: 'owner',
            providerId: provider.id,
            providerName: { ar: provider.name_ar, en: provider.name_en },
            providerStatus: provider.status,
            userId: user.id,
            userName: profile.full_name,
            userEmail: profile.email,
            // Owner has ALL permissions
            canManageOrders: true,
            canManageMenu: true,
            canManageCustomers: true,
            canViewAnalytics: true,
            canManageOffers: true,
            canManageTeam: true,
            staffRecordId: staffRecord?.id || null,
          });
        } else {
          // Owner without provider (incomplete registration)
          setPermissions({
            ...defaultPermissions,
            isOwner: true,
            userRole: 'owner',
            userId: user.id,
            userName: profile.full_name,
            userEmail: profile.email,
          });
        }
      }
      // Check if user is a staff member
      else if (profile.role === 'provider_staff') {
        const { data: staffData } = await supabase
          .from('provider_staff')
          .select(
            `
            id,
            role,
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
              status
            )
          `
          )
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (staffData && staffData.providers) {
          // Type assertion for joined provider data (Supabase types this as array)
          const provider = staffData.providers as unknown as {
            id: string;
            name_ar: string;
            name_en: string;
            status: string;
          };

          setPermissions({
            isOwner: false,
            isStaff: true,
            userRole: 'staff',
            providerId: provider.id,
            providerName: { ar: provider.name_ar, en: provider.name_en },
            providerStatus: provider.status,
            userId: user.id,
            userName: profile.full_name,
            userEmail: profile.email,
            // Staff has specific permissions
            canManageOrders: staffData.can_manage_orders ?? false,
            canManageMenu: staffData.can_manage_menu ?? false,
            canManageCustomers: staffData.can_manage_customers ?? false,
            canViewAnalytics: staffData.can_view_analytics ?? false,
            canManageOffers: staffData.can_manage_offers ?? false,
            canManageTeam: false, // Staff can never manage team
            staffRecordId: staffData.id,
          });
        } else {
          // Staff without active assignment
          setPermissions({
            ...defaultPermissions,
            isStaff: true,
            userRole: 'staff',
            userId: user.id,
            userName: profile.full_name,
            userEmail: profile.email,
          });
          setError('لا يوجد لديك صلاحية نشطة على أي متجر');
        }
      } else {
        // Not a provider owner or staff
        setPermissions(defaultPermissions);
      }
    } catch (err) {
      console.error('Error fetching staff permissions:', err);
      setError('حدث خطأ في جلب الصلاحيات');
      setPermissions(defaultPermissions);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Subscribe to realtime changes in provider_staff
  useEffect(() => {
    if (!permissions.userId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`staff-permissions-${permissions.userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'provider_staff',
          filter: `user_id=eq.${permissions.userId}`,
        },
        (payload) => {
          // If staff record was updated or deleted, refetch permissions
          if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            fetchPermissions();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [permissions.userId, fetchPermissions]);

  return {
    ...permissions,
    loading,
    error,
    refetch: fetchPermissions,
  };
}

// ============================================================================
// Helper: Check specific permission
// ============================================================================

export function hasPermission(
  permissions: StaffPermissions,
  permissionName: 'orders' | 'menu' | 'customers' | 'analytics' | 'offers' | 'team'
): boolean {
  switch (permissionName) {
    case 'orders':
      return permissions.canManageOrders;
    case 'menu':
      return permissions.canManageMenu;
    case 'customers':
      return permissions.canManageCustomers;
    case 'analytics':
      return permissions.canViewAnalytics;
    case 'offers':
      return permissions.canManageOffers;
    case 'team':
      return permissions.canManageTeam;
    default:
      return false;
  }
}

// ============================================================================
// Helper: Get permission label
// ============================================================================

export function getPermissionLabel(
  permissionName: 'orders' | 'menu' | 'customers' | 'analytics' | 'offers',
  locale: 'ar' | 'en'
): string {
  const labels = {
    orders: { ar: 'الطلبات والمرتجعات', en: 'Orders & Refunds' },
    menu: { ar: 'المنتجات', en: 'Products' },
    customers: { ar: 'العملاء', en: 'Customers' },
    analytics: { ar: 'التحليلات', en: 'Analytics' },
    offers: { ar: 'العروض والبانرات', en: 'Offers & Banners' },
  };
  return labels[permissionName][locale];
}

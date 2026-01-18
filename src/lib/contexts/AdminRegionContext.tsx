'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';

// ═══════════════════════════════════════════════════════════════════════════════
// AdminRegionContext - Caches admin region data to reduce database queries
// يخزن بيانات منطقة المشرف لتقليل استعلامات قاعدة البيانات
// ═══════════════════════════════════════════════════════════════════════════════

interface Governorate {
  id: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
}

interface City {
  id: string;
  governorate_id: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
}

interface AdminRegionData {
  adminId: string | null;
  userId: string | null;
  role: string | null;
  assignedRegions: Array<{ governorate_id?: string; city_id?: string }>;
  isSuperAdmin: boolean;
  isRegionalAdmin: boolean;
  allowedGovernorateIds: string[];
  regionProviderIds: string[];
  governorates: Governorate[];
  cities: City[];
}

interface AdminRegionContextType extends AdminRegionData {
  loading: boolean;
  refresh: () => Promise<void>;
  hasRegionFilter: boolean;
}

const CACHE_KEY = 'admin_region_cache';
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

interface CacheData extends AdminRegionData {
  timestamp: number;
  authUserId: string;
}

const defaultData: AdminRegionData = {
  adminId: null,
  userId: null,
  role: null,
  assignedRegions: [],
  isSuperAdmin: false,
  isRegionalAdmin: false,
  allowedGovernorateIds: [],
  regionProviderIds: [],
  governorates: [],
  cities: [],
};

const AdminRegionContext = createContext<AdminRegionContextType>({
  ...defaultData,
  loading: true,
  refresh: async () => {},
  hasRegionFilter: false,
});

// ═══════════════════════════════════════════════════════════════════════════════
// Helper functions for cache management
// ═══════════════════════════════════════════════════════════════════════════════

function getCache(): CacheData | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CacheData = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid (within TTL)
    if (now - data.timestamp > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data;
  } catch {
    sessionStorage.removeItem(CACHE_KEY);
    return null;
  }
}

function setCache(data: AdminRegionData, authUserId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const cacheData: CacheData = {
      ...data,
      timestamp: Date.now(),
      authUserId,
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch {
    // Silently fail if sessionStorage is full
  }
}

function clearCache(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(CACHE_KEY);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Provider Component
// ═══════════════════════════════════════════════════════════════════════════════

export function AdminRegionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AdminRegionData>(defaultData);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (forceRefresh = false) => {
    const supabase = createClient();

    // Get current auth user
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      setData(defaultData);
      setLoading(false);
      clearCache();
      return;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCache();
      if (cached && cached.authUserId === authUser.id) {
        setData(cached);
        setLoading(false);
        return;
      }
    }

    // Load fresh data from database
    try {
      // Parallel queries for better performance
      const [adminResult, govResult, citiesResult] = await Promise.all([
        supabase
          .from('admin_users')
          .select('id, role, assigned_regions')
          .eq('user_id', authUser.id)
          .single(),
        supabase
          .from('governorates')
          .select('id, name_ar, name_en, is_active')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .order('name_ar'),
        supabase
          .from('cities')
          .select('id, governorate_id, name_ar, name_en, is_active')
          .eq('is_active', true)
          .order('name_ar'),
      ]);

      const adminUser = adminResult.data;
      const governorates = govResult.data || [];
      const cities = citiesResult.data || [];

      if (!adminUser) {
        setData({ ...defaultData, governorates, cities });
        setLoading(false);
        return;
      }

      const role = adminUser.role || null;
      const assignedRegions = adminUser.assigned_regions || [];
      const isSuperAdmin = role === 'super_admin';
      const allowedGovernorateIds = assignedRegions
        .map((r: { governorate_id?: string }) => r.governorate_id)
        .filter(Boolean) as string[];
      const isRegionalAdmin = !isSuperAdmin && allowedGovernorateIds.length > 0;

      // Get provider IDs for regional admins
      let regionProviderIds: string[] = [];
      if (isRegionalAdmin && allowedGovernorateIds.length > 0) {
        const { data: providers } = await supabase
          .from('providers')
          .select('id')
          .in('governorate_id', allowedGovernorateIds);

        regionProviderIds = (providers || []).map((p) => p.id);
      }

      const newData: AdminRegionData = {
        adminId: adminUser.id,
        userId: authUser.id,
        role,
        assignedRegions,
        isSuperAdmin,
        isRegionalAdmin,
        allowedGovernorateIds,
        regionProviderIds,
        governorates,
        cities,
      };

      setData(newData);
      setCache(newData, authUser.id);
    } catch (error) {
      console.error('Error loading admin region data:', error);
      setData(defaultData);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    clearCache();
    await loadData(true);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for auth state changes
  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clearCache();
        setData(defaultData);
      } else if (event === 'SIGNED_IN') {
        loadData(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadData]);

  const hasRegionFilter = data.isRegionalAdmin && data.allowedGovernorateIds.length > 0;

  // ✅ useMemo: Prevent unnecessary re-renders of consumers
  const value = useMemo(
    () => ({
      ...data,
      loading,
      refresh,
      hasRegionFilter,
    }),
    [data, loading, refresh, hasRegionFilter]
  );

  return <AdminRegionContext.Provider value={value}>{children}</AdminRegionContext.Provider>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook to use the context
// ═══════════════════════════════════════════════════════════════════════════════

export function useAdminRegion() {
  const context = useContext(AdminRegionContext);
  if (!context) {
    throw new Error('useAdminRegion must be used within AdminRegionProvider');
  }
  return context;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Utility hook for filtering queries
// ═══════════════════════════════════════════════════════════════════════════════

export function useRegionFilter() {
  const {
    isSuperAdmin,
    isRegionalAdmin,
    allowedGovernorateIds,
    regionProviderIds,
    hasRegionFilter,
    loading,
  } = useAdminRegion();

  // Helper to apply region filter to a Supabase query
  const applyProviderFilter = useCallback(
    <
      T extends {
        in: (column: string, values: string[]) => T;
        eq: (column: string, value: string) => T;
      },
    >(
      query: T,
      column = 'provider_id'
    ): T => {
      if (!hasRegionFilter) return query;

      if (regionProviderIds.length > 0) {
        return query.in(column, regionProviderIds);
      } else {
        // No providers in region - return impossible filter
        return query.eq(column, 'no-providers-in-region');
      }
    },
    [hasRegionFilter, regionProviderIds]
  );

  const applyGovernorateFilter = useCallback(
    <
      T extends {
        in: (column: string, values: string[]) => T;
        eq: (column: string, value: string) => T;
      },
    >(
      query: T,
      column = 'governorate_id'
    ): T => {
      if (!hasRegionFilter) return query;

      if (allowedGovernorateIds.length > 0) {
        return query.in(column, allowedGovernorateIds);
      } else {
        return query.eq(column, 'no-governorate');
      }
    },
    [hasRegionFilter, allowedGovernorateIds]
  );

  return {
    isSuperAdmin,
    isRegionalAdmin,
    hasRegionFilter,
    allowedGovernorateIds,
    regionProviderIds,
    loading,
    applyProviderFilter,
    applyGovernorateFilter,
  };
}

export default AdminRegionContext;

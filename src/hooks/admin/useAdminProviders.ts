'use client';

// ═══════════════════════════════════════════════════════════════════════
// هوك إدارة مقدمي الخدمة - Admin Providers Hook
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useTransition } from 'react';
import { csrfHeaders } from '@/lib/security/csrf-client';
import type {
  AdminProvider,
  ProviderFilters,
  PaginatedResult,
  ProviderStatus,
} from '@/lib/admin/types';

// ═══════════════════════════════════════════════════════════════════════
// Server Actions (to be called from client)
// ═══════════════════════════════════════════════════════════════════════

async function fetchProviders(filters: ProviderFilters) {
  const response = await fetch('/api/admin/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: JSON.stringify({ action: 'list', filters }),
  });
  return response.json();
}

async function approveProviderAction(providerId: string, commissionRate?: number) {
  const response = await fetch('/api/admin/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: JSON.stringify({ action: 'approve', providerId, commissionRate }),
  });
  return response.json();
}

async function rejectProviderAction(providerId: string, reason: string) {
  const response = await fetch('/api/admin/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: JSON.stringify({ action: 'reject', providerId, reason }),
  });
  return response.json();
}

async function suspendProviderAction(providerId: string, reason: string) {
  const response = await fetch('/api/admin/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: JSON.stringify({ action: 'suspend', providerId, reason }),
  });
  return response.json();
}

async function updateCommissionAction(providerId: string, commissionRate: number) {
  const response = await fetch('/api/admin/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: JSON.stringify({ action: 'updateCommission', providerId, commissionRate }),
  });
  return response.json();
}

async function toggleFeaturedAction(providerId: string, isFeatured: boolean) {
  const response = await fetch('/api/admin/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: JSON.stringify({ action: 'toggleFeatured', providerId, isFeatured }),
  });
  return response.json();
}

// ═══════════════════════════════════════════════════════════════════════
// Hook Types
// ═══════════════════════════════════════════════════════════════════════

interface UseAdminProvidersOptions {
  initialFilters?: ProviderFilters;
  autoFetch?: boolean;
}

interface UseAdminProvidersReturn {
  // Data
  providers: AdminProvider[];
  total: number;
  totalPages: number;
  currentPage: number;
  hasMore: boolean;

  // State
  isLoading: boolean;
  isPending: boolean;
  error: string | null;

  // Filters
  filters: ProviderFilters;
  setFilters: (filters: ProviderFilters) => void;
  updateFilter: <K extends keyof ProviderFilters>(key: K, value: ProviderFilters[K]) => void;
  resetFilters: () => void;

  // Pagination
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;

  // Actions
  refetch: () => Promise<void>;
  approveProvider: (providerId: string, commissionRate?: number) => Promise<boolean>;
  rejectProvider: (providerId: string, reason: string) => Promise<boolean>;
  suspendProvider: (providerId: string, reason: string) => Promise<boolean>;
  updateCommission: (providerId: string, commissionRate: number) => Promise<boolean>;
  toggleFeatured: (providerId: string, isFeatured: boolean) => Promise<boolean>;
}

// ═══════════════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════════════

const defaultFilters: ProviderFilters = {
  page: 1,
  limit: 20,
  sortBy: 'created_at',
  sortOrder: 'desc',
};

export function useAdminProviders(options: UseAdminProvidersOptions = {}): UseAdminProvidersReturn {
  const { initialFilters = {}, autoFetch = true } = options;

  // State
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<ProviderFilters>({
    ...defaultFilters,
    ...initialFilters,
  });
  const [isPending, startTransition] = useTransition();

  // Fetch providers
  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchProviders(filters);

      if (result.success) {
        setProviders(result.data.data);
        setTotal(result.data.total);
        setTotalPages(result.data.totalPages);
      } else {
        setError(result.error || 'Failed to fetch providers');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Auto fetch on mount and filter changes
  useEffect(() => {
    if (autoFetch) {
      fetch();
    }
  }, [fetch, autoFetch]);

  // Filter setters
  const setFilters = useCallback((newFilters: ProviderFilters) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const updateFilter = useCallback(
    <K extends keyof ProviderFilters>(key: K, value: ProviderFilters[K]) => {
      setFiltersState((prev) => ({ ...prev, [key]: value, page: 1 }));
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
  }, []);

  // Pagination
  const goToPage = useCallback((page: number) => {
    setFiltersState((prev) => ({ ...prev, page }));
  }, []);

  const nextPage = useCallback(() => {
    setFiltersState((prev) => ({
      ...prev,
      page: Math.min((prev.page || 1) + 1, totalPages),
    }));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setFiltersState((prev) => ({
      ...prev,
      page: Math.max((prev.page || 1) - 1, 1),
    }));
  }, []);

  // Actions
  const approveProvider = useCallback(
    async (providerId: string, commissionRate?: number): Promise<boolean> => {
      setError(null);
      try {
        const result = await approveProviderAction(providerId, commissionRate);
        if (result.success) {
          // Update local state
          startTransition(() => {
            setProviders((prev) =>
              prev.map((p) =>
                p.id === providerId
                  ? { ...p, status: 'open' as ProviderStatus, rejection_reason: null }
                  : p
              )
            );
          });
          return true;
        } else {
          setError(result.error);
          return false;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return false;
      }
    },
    []
  );

  const rejectProvider = useCallback(
    async (providerId: string, reason: string): Promise<boolean> => {
      setError(null);
      try {
        const result = await rejectProviderAction(providerId, reason);
        if (result.success) {
          startTransition(() => {
            setProviders((prev) =>
              prev.map((p) =>
                p.id === providerId
                  ? { ...p, status: 'rejected' as ProviderStatus, rejection_reason: reason }
                  : p
              )
            );
          });
          return true;
        } else {
          setError(result.error);
          return false;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return false;
      }
    },
    []
  );

  const suspendProvider = useCallback(
    async (providerId: string, reason: string): Promise<boolean> => {
      setError(null);
      try {
        const result = await suspendProviderAction(providerId, reason);
        if (result.success) {
          startTransition(() => {
            setProviders((prev) =>
              prev.map((p) =>
                p.id === providerId
                  ? {
                      ...p,
                      status: 'temporarily_paused' as ProviderStatus,
                      rejection_reason: reason,
                    }
                  : p
              )
            );
          });
          return true;
        } else {
          setError(result.error);
          return false;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return false;
      }
    },
    []
  );

  const updateCommission = useCallback(
    async (providerId: string, commissionRate: number): Promise<boolean> => {
      setError(null);
      try {
        const result = await updateCommissionAction(providerId, commissionRate);
        if (result.success) {
          startTransition(() => {
            setProviders((prev) =>
              prev.map((p) => (p.id === providerId ? { ...p, commission_rate: commissionRate } : p))
            );
          });
          return true;
        } else {
          setError(result.error);
          return false;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return false;
      }
    },
    []
  );

  const toggleFeatured = useCallback(
    async (providerId: string, isFeatured: boolean): Promise<boolean> => {
      setError(null);
      try {
        const result = await toggleFeaturedAction(providerId, isFeatured);
        if (result.success) {
          startTransition(() => {
            setProviders((prev) =>
              prev.map((p) => (p.id === providerId ? { ...p, is_featured: isFeatured } : p))
            );
          });
          return true;
        } else {
          setError(result.error);
          return false;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return false;
      }
    },
    []
  );

  return {
    // Data
    providers,
    total,
    totalPages,
    currentPage: filters.page || 1,
    hasMore: (filters.page || 1) < totalPages,

    // State
    isLoading,
    isPending,
    error,

    // Filters
    filters,
    setFilters,
    updateFilter,
    resetFilters,

    // Pagination
    goToPage,
    nextPage,
    prevPage,

    // Actions
    refetch: fetch,
    approveProvider,
    rejectProvider,
    suspendProvider,
    updateCommission,
    toggleFeatured,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Hook للمعلقين - Pending Providers Hook
// ═══════════════════════════════════════════════════════════════════════

export function usePendingProviders() {
  return useAdminProviders({
    initialFilters: {
      status: ['pending_approval', 'incomplete'],
      sortBy: 'created_at',
      sortOrder: 'asc',
    },
  });
}

export default useAdminProviders;

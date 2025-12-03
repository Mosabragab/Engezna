'use client';

// ═══════════════════════════════════════════════════════════════════════
// هوك إحصائيات لوحة التحكم - Admin Stats Hook
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import type {
  DashboardStats,
  StatsFilters,
  TimeSeriesData,
  CategoryStats,
  RegionalStats,
} from '@/lib/admin/types';

// ═══════════════════════════════════════════════════════════════════════
// API Calls
// ═══════════════════════════════════════════════════════════════════════

async function fetchDashboardStats(filters: StatsFilters = {}) {
  const response = await fetch('/api/admin/stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'dashboard', filters }),
  });
  return response.json();
}

async function fetchOrdersTimeSeries(filters: StatsFilters = {}) {
  const response = await fetch('/api/admin/stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'ordersTimeSeries', filters }),
  });
  return response.json();
}

async function fetchRevenueTimeSeries(filters: StatsFilters = {}) {
  const response = await fetch('/api/admin/stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'revenueTimeSeries', filters }),
  });
  return response.json();
}

async function fetchOrdersByCategory(filters: StatsFilters = {}) {
  const response = await fetch('/api/admin/stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'ordersByCategory', filters }),
  });
  return response.json();
}

async function fetchStatsByGovernorate() {
  const response = await fetch('/api/admin/stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'byGovernorate' }),
  });
  return response.json();
}

// ═══════════════════════════════════════════════════════════════════════
// Hook Types
// ═══════════════════════════════════════════════════════════════════════

interface UseAdminStatsOptions {
  autoFetch?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface UseAdminStatsReturn {
  // Main Dashboard Stats
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;

  // Filters
  filters: StatsFilters;
  setFilters: (filters: StatsFilters) => void;
  setDateRange: (from: string, to: string) => void;

  // Actions
  refetch: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════
// Main Hook - Dashboard Stats
// ═══════════════════════════════════════════════════════════════════════

export function useAdminStats(options: UseAdminStatsOptions = {}): UseAdminStatsReturn {
  const { autoFetch = true, refreshInterval } = options;

  // State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<StatsFilters>({});

  // Fetch stats
  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchDashboardStats(filters);

      if (result.success) {
        setStats(result.data);
      } else {
        setError(result.error || 'Failed to fetch stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Auto fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetch();
    }
  }, [fetch, autoFetch]);

  // Auto refresh
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const intervalId = setInterval(fetch, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [fetch, refreshInterval]);

  // Filter setters
  const setFilters = useCallback((newFilters: StatsFilters) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const setDateRange = useCallback((from: string, to: string) => {
    setFiltersState((prev) => ({ ...prev, dateFrom: from, dateTo: to }));
  }, []);

  return {
    stats,
    isLoading,
    error,
    filters,
    setFilters,
    setDateRange,
    refetch: fetch,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Hook للسلاسل الزمنية - Time Series Hook
// ═══════════════════════════════════════════════════════════════════════

interface UseTimeSeriesOptions {
  type: 'orders' | 'revenue';
  filters?: StatsFilters;
  autoFetch?: boolean;
}

interface UseTimeSeriesReturn {
  data: TimeSeriesData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTimeSeries(options: UseTimeSeriesOptions): UseTimeSeriesReturn {
  const { type, filters = {}, autoFetch = true } = options;

  const [data, setData] = useState<TimeSeriesData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchFn = type === 'orders' ? fetchOrdersTimeSeries : fetchRevenueTimeSeries;
      const result = await fetchFn(filters);

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch time series');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [type, filters]);

  useEffect(() => {
    if (autoFetch) {
      fetch();
    }
  }, [fetch, autoFetch]);

  return { data, isLoading, error, refetch: fetch };
}

// ═══════════════════════════════════════════════════════════════════════
// Hook للإحصائيات حسب الفئة - Category Stats Hook
// ═══════════════════════════════════════════════════════════════════════

interface UseCategoryStatsOptions {
  filters?: StatsFilters;
  autoFetch?: boolean;
}

interface UseCategoryStatsReturn {
  data: CategoryStats[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCategoryStats(options: UseCategoryStatsOptions = {}): UseCategoryStatsReturn {
  const { filters = {}, autoFetch = true } = options;

  const [data, setData] = useState<CategoryStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchOrdersByCategory(filters);

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch category stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (autoFetch) {
      fetch();
    }
  }, [fetch, autoFetch]);

  return { data, isLoading, error, refetch: fetch };
}

// ═══════════════════════════════════════════════════════════════════════
// Hook للإحصائيات حسب المنطقة - Regional Stats Hook
// ═══════════════════════════════════════════════════════════════════════

interface UseRegionalStatsOptions {
  autoFetch?: boolean;
}

interface UseRegionalStatsReturn {
  data: RegionalStats[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRegionalStats(options: UseRegionalStatsOptions = {}): UseRegionalStatsReturn {
  const { autoFetch = true } = options;

  const [data, setData] = useState<RegionalStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchStatsByGovernorate();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch regional stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetch();
    }
  }, [fetch, autoFetch]);

  return { data, isLoading, error, refetch: fetch };
}

// ═══════════════════════════════════════════════════════════════════════
// Quick Stats Hook - للكروت السريعة
// ═══════════════════════════════════════════════════════════════════════

interface QuickStats {
  pendingProviders: number;
  todayOrders: number;
  todayRevenue: number;
}

interface UseQuickStatsReturn {
  stats: QuickStats;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useQuickStats(refreshInterval = 60000): UseQuickStatsReturn {
  const [stats, setStats] = useState<QuickStats>({
    pendingProviders: 0,
    todayOrders: 0,
    todayRevenue: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchQuickStats = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await window.fetch('/api/admin/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'quick' }),
      });
      const result = await response.json();

      if (result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch quick stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuickStats();
    if (refreshInterval > 0) {
      const intervalId = setInterval(fetchQuickStats, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [fetchQuickStats, refreshInterval]);

  return { stats, isLoading, refetch: fetchQuickStats };
}

export default useAdminStats;

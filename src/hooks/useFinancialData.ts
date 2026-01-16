'use client';

/**
 * useFinancialData Hook - هوك للبيانات المالية
 *
 * Provides unified financial data access for both Admin and Provider dashboards.
 * Uses the financial_settlement_engine SQL View as the Single Source of Truth.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  FinancialService,
  createAdminFinancialService,
  createProviderFinancialService,
  Money,
} from '@/lib/finance';
import type {
  AdminFinancialSummary,
  ProviderFinancialSummary,
  RegionalFinancialSummary,
  Settlement,
  SettlementAuditLog,
  FinancialFilters,
  SettlementPayment,
} from '@/types/finance';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface UseFinancialDataOptions {
  // For admin dashboard
  isAdmin?: boolean;
  isRegionalAdmin?: boolean;
  governorateIds?: string[];

  // For provider dashboard
  providerId?: string;

  // Filters
  filters?: FinancialFilters;

  // Auto-refresh interval in milliseconds (optional)
  refreshInterval?: number;
}

interface UseFinancialDataReturn {
  // Data
  adminSummary: AdminFinancialSummary | null;
  providerSummary: ProviderFinancialSummary | null;
  regionalSummary: RegionalFinancialSummary[];
  settlements: Settlement[];
  auditLog: SettlementAuditLog[];

  // Loading states
  isLoading: boolean;
  isLoadingSummary: boolean;
  isLoadingSettlements: boolean;
  isLoadingAuditLog: boolean;

  // Errors
  error: Error | null;

  // Actions
  refresh: () => Promise<void>;
  loadSettlements: (filters?: FinancialFilters) => Promise<void>;
  loadAuditLog: (settlementId: string) => Promise<void>;
  recordPayment: (payment: SettlementPayment) => Promise<boolean>;

  // Money helpers
  formatMoney: (amount: number, locale?: 'ar' | 'en') => string;
  toMoney: (amount: number) => Money;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════════════════════

export function useFinancialData(options: UseFinancialDataOptions = {}): UseFinancialDataReturn {
  const {
    isAdmin = false,
    isRegionalAdmin = false,
    governorateIds,
    providerId,
    filters,
    refreshInterval,
  } = options;

  // ═══════════════════════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════════════════════

  const [adminSummary, setAdminSummary] = useState<AdminFinancialSummary | null>(null);
  const [providerSummary, setProviderSummary] = useState<ProviderFinancialSummary | null>(null);
  const [regionalSummary, setRegionalSummary] = useState<RegionalFinancialSummary[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [auditLog, setAuditLog] = useState<SettlementAuditLog[]>([]);

  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingSettlements, setIsLoadingSettlements] = useState(false);
  const [isLoadingAuditLog, setIsLoadingAuditLog] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // Memoized Service
  // ═══════════════════════════════════════════════════════════════════════════

  const service = useMemo(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    if (providerId) {
      return createProviderFinancialService(supabase, providerId);
    }

    return createAdminFinancialService(supabase, {
      governorateIds,
      isRegionalAdmin,
    });
  }, [providerId, governorateIds, isRegionalAdmin]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Load Summary Data
  // ═══════════════════════════════════════════════════════════════════════════

  const loadSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    setError(null);

    try {
      if (providerId) {
        // Provider view
        const summary = await service.getProviderSummary();
        setProviderSummary(summary);
      } else if (isAdmin || isRegionalAdmin) {
        // Admin view
        const [summary, regional] = await Promise.all([
          service.getAdminSummary(filters),
          service.getRegionalSummary(filters),
        ]);
        setAdminSummary(summary);
        setRegionalSummary(regional);
      }
    } catch (err) {
      console.error('Error loading financial summary:', err);
      setError(err instanceof Error ? err : new Error('Failed to load financial data'));
    } finally {
      setIsLoadingSummary(false);
    }
  }, [service, providerId, isAdmin, isRegionalAdmin, filters]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Load Settlements
  // ═══════════════════════════════════════════════════════════════════════════

  const loadSettlements = useCallback(
    async (customFilters?: FinancialFilters) => {
      setIsLoadingSettlements(true);

      try {
        const data = await service.getSettlements(customFilters || filters);
        setSettlements(data);
      } catch (err) {
        console.error('Error loading settlements:', err);
        setError(err instanceof Error ? err : new Error('Failed to load settlements'));
      } finally {
        setIsLoadingSettlements(false);
      }
    },
    [service, filters]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // Load Audit Log
  // ═══════════════════════════════════════════════════════════════════════════

  const loadAuditLog = useCallback(
    async (settlementId: string) => {
      setIsLoadingAuditLog(true);

      try {
        const data = await service.getSettlementAuditLog(settlementId);
        setAuditLog(data);
      } catch (err) {
        console.error('Error loading audit log:', err);
        setError(err instanceof Error ? err : new Error('Failed to load audit log'));
      } finally {
        setIsLoadingAuditLog(false);
      }
    },
    [service]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // Record Payment
  // ═══════════════════════════════════════════════════════════════════════════

  const recordPayment = useCallback(
    async (payment: SettlementPayment): Promise<boolean> => {
      try {
        const success = await service.recordPayment(payment);
        if (success) {
          // Refresh data after successful payment
          await Promise.all([loadSummary(), loadSettlements()]);
        }
        return success;
      } catch (err) {
        console.error('Error recording payment:', err);
        setError(err instanceof Error ? err : new Error('Failed to record payment'));
        return false;
      }
    },
    [service, loadSummary, loadSettlements]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // Refresh All Data
  // ═══════════════════════════════════════════════════════════════════════════

  const refresh = useCallback(async () => {
    await Promise.all([loadSummary(), loadSettlements()]);
  }, [loadSummary, loadSettlements]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Initial Load
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Auto-refresh
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!refreshInterval) return;

    const intervalId = setInterval(refresh, refreshInterval);
    return () => clearInterval(intervalId);
  }, [refresh, refreshInterval]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Money Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  const formatMoney = useCallback((amount: number, locale: 'ar' | 'en' = 'ar') => {
    return new Money(amount).formatWestern(locale);
  }, []);

  const toMoney = useCallback((amount: number) => {
    return new Money(amount);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // Return
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // Data
    adminSummary,
    providerSummary,
    regionalSummary,
    settlements,
    auditLog,

    // Loading states
    isLoading: isLoadingSummary,
    isLoadingSummary,
    isLoadingSettlements,
    isLoadingAuditLog,

    // Errors
    error,

    // Actions
    refresh,
    loadSettlements,
    loadAuditLog,
    recordPayment,

    // Money helpers
    formatMoney,
    toMoney,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Specialized Hooks
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook for Admin Finance Dashboard
 */
export function useAdminFinancialData(options?: {
  isRegionalAdmin?: boolean;
  governorateIds?: string[];
  filters?: FinancialFilters;
  refreshInterval?: number;
}) {
  return useFinancialData({
    isAdmin: true,
    ...options,
  });
}

/**
 * Hook for Provider Finance Dashboard
 */
export function useProviderFinancialData(
  providerId: string,
  options?: {
    filters?: FinancialFilters;
    refreshInterval?: number;
  }
) {
  return useFinancialData({
    providerId,
    ...options,
  });
}

/**
 * Hook for Settlement Details Page
 */
export function useSettlementDetails(settlementId: string) {
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [auditLog, setAuditLog] = useState<SettlementAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const service = useMemo(() => createAdminFinancialService(supabase), [supabase]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [settlementData, auditData] = await Promise.all([
        service.getSettlementById(settlementId),
        service.getSettlementAuditLog(settlementId),
      ]);

      setSettlement(settlementData);
      setAuditLog(auditData);
    } catch (err) {
      console.error('Error loading settlement details:', err);
      setError(err instanceof Error ? err : new Error('Failed to load settlement'));
    } finally {
      setIsLoading(false);
    }
  }, [service, settlementId]);

  useEffect(() => {
    if (settlementId) {
      load();
    }
  }, [settlementId, load]);

  return {
    settlement,
    auditLog,
    isLoading,
    error,
    refresh: load,
  };
}

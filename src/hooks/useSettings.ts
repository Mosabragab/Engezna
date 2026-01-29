/**
 * Settings Hooks
 *
 * Provides cached access to application settings using useState/useEffect pattern.
 *
 * Features:
 * - Local state caching per hook instance
 * - Type-safe access with Zod validation
 * - Loading and error states
 * - Mutation functions with refetch
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { z } from 'zod';
import {
  // Service functions
  fetchCommissionSettings,
  updateCommissionSettings,
  fetchCommissionChangelog,
  fetchAllAppSettings,
  fetchAppSetting,
  updateAppSetting,
  fetchAppSettingsChangelog,
  fetchSecurityDeposit,
  fetchPlatformInfo,
  fetchPaymentMethods,
  fetchDeliveryDefaults,
  fetchNotificationDefaults,
  fetchNotificationPreferences,
  upsertNotificationPreferences,
  fetchUserLanguage,
  updateUserLanguage,
  // Schemas
  SecurityDepositSchema,
  PlatformInfoSchema,
  PaymentMethodsSchema,
  DeliveryDefaultsSchema,
  NotificationDefaultsSchema,
  validateSetting,
  // Defaults
  DEFAULT_SECURITY_DEPOSIT,
  DEFAULT_PLATFORM_INFO,
  DEFAULT_PAYMENT_METHODS,
  DEFAULT_DELIVERY_DEFAULTS,
  DEFAULT_NOTIFICATION_DEFAULTS,
  DEFAULT_NOTIFICATION_PREFERENCES,
  SETTING_KEYS,
  // Types
  type CommissionSettings,
  type SecurityDeposit,
  type PlatformInfo,
  type PaymentMethods,
  type DeliveryDefaults,
  type NotificationDefaults,
  type NotificationPreferences,
  type SettingsChangelog,
} from '@/lib/settings';

// ============================================================================
// TYPES
// ============================================================================

interface QueryState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface MutationState<TVariables, TResult = void> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TResult>;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

// ============================================================================
// GENERIC QUERY HOOK
// ============================================================================

function useQuery<T>(
  queryFn: () => Promise<T>,
  options?: { enabled?: boolean; initialData?: T }
): QueryState<T> {
  const { enabled = true, initialData = null } = options || {};
  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await queryFn();
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch data'));
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [queryFn, enabled]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

// ============================================================================
// GENERIC MUTATION HOOK
// ============================================================================

function useMutation<TVariables, TResult = void>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
  options?: { onSuccess?: (result: TResult, variables: TVariables) => void }
): MutationState<TVariables, TResult> {
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setIsPending(false);
    setIsSuccess(false);
    setIsError(false);
    setError(null);
  }, []);

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TResult> => {
      setIsPending(true);
      setIsSuccess(false);
      setIsError(false);
      setError(null);

      try {
        const result = await mutationFn(variables);
        setIsSuccess(true);
        options?.onSuccess?.(result, variables);
        return result;
      } catch (err) {
        setIsError(true);
        const errorObj = err instanceof Error ? err : new Error('Mutation failed');
        setError(errorObj);
        throw errorObj;
      } finally {
        setIsPending(false);
      }
    },
    [mutationFn, options]
  );

  const mutate = useCallback(
    (variables: TVariables) => {
      mutateAsync(variables).catch(() => {
        // Error already handled in mutateAsync
      });
    },
    [mutateAsync]
  );

  return { mutate, mutateAsync, isPending, isSuccess, isError, error, reset };
}

// ============================================================================
// COMMISSION SETTINGS HOOKS
// ============================================================================

/**
 * Hook to fetch commission settings
 */
export function useCommissionSettings(): QueryState<CommissionSettings> {
  const queryFn = useCallback(() => fetchCommissionSettings(), []);
  return useQuery(queryFn);
}

/**
 * Hook to update commission settings
 */
export function useUpdateCommissionSettings() {
  const mutationFn = useCallback(
    async ({
      settings,
      userId,
    }: {
      settings: Partial<Omit<CommissionSettings, 'id' | 'updated_at'>>;
      userId?: string;
    }) => updateCommissionSettings(settings, userId),
    []
  );

  return useMutation(mutationFn);
}

/**
 * Hook to fetch commission settings changelog
 */
export function useCommissionChangelog(limit = 50): QueryState<SettingsChangelog[]> {
  const queryFn = useCallback(() => fetchCommissionChangelog(limit), [limit]);
  return useQuery(queryFn);
}

// ============================================================================
// APP SETTINGS HOOKS
// ============================================================================

/**
 * Hook to fetch all app settings
 */
export function useAppSettings(): QueryState<Record<string, unknown>> {
  const queryFn = useCallback(() => fetchAllAppSettings(), []);
  return useQuery(queryFn);
}

/**
 * Hook to get a specific setting with type safety
 */
export function useSetting<T>(
  key: string,
  schema: z.ZodSchema<T>,
  fallback: T
): { value: T; isLoading: boolean; error: Error | null; refetch: () => Promise<void> } {
  const { data: settings, isLoading, error, refetch } = useAppSettings();

  const value = useMemo(() => {
    if (!settings?.[key]) return fallback;
    return validateSetting(schema, settings[key], fallback);
  }, [settings, key, schema, fallback]);

  return { value, isLoading, error, refetch };
}

/**
 * Hook to update an app setting
 */
export function useUpdateAppSetting() {
  const mutationFn = useCallback(
    async ({ key, value, reason }: { key: string; value: unknown; reason?: string }) =>
      updateAppSetting(key, value, reason),
    []
  );

  return useMutation(mutationFn);
}

/**
 * Hook to fetch app settings changelog
 */
export function useAppSettingsChangelog(key?: string, limit = 50): QueryState<SettingsChangelog[]> {
  const queryFn = useCallback(() => fetchAppSettingsChangelog(key, limit), [key, limit]);
  return useQuery(queryFn);
}

// ============================================================================
// TYPED SETTING HOOKS
// ============================================================================

/**
 * Hook to fetch security deposit settings
 */
export function useSecurityDeposit(): QueryState<SecurityDeposit> {
  const queryFn = useCallback(() => fetchSecurityDeposit(), []);
  return useQuery(queryFn);
}

/**
 * Hook to fetch platform info
 */
export function usePlatformInfo(): QueryState<PlatformInfo> {
  const queryFn = useCallback(() => fetchPlatformInfo(), []);
  return useQuery(queryFn);
}

/**
 * Hook to fetch payment methods
 */
export function usePaymentMethods(): QueryState<PaymentMethods> {
  const queryFn = useCallback(() => fetchPaymentMethods(), []);
  return useQuery(queryFn);
}

/**
 * Hook to fetch delivery defaults
 */
export function useDeliveryDefaults(): QueryState<DeliveryDefaults> {
  const queryFn = useCallback(() => fetchDeliveryDefaults(), []);
  return useQuery(queryFn);
}

/**
 * Hook to fetch notification defaults
 */
export function useNotificationDefaults(): QueryState<NotificationDefaults> {
  const queryFn = useCallback(() => fetchNotificationDefaults(), []);
  return useQuery(queryFn);
}

// ============================================================================
// NOTIFICATION PREFERENCES HOOKS
// ============================================================================

/**
 * Hook to fetch user's notification preferences
 */
export function useNotificationPreferences(
  userId: string | null | undefined
): QueryState<NotificationPreferences | null> {
  const queryFn = useCallback(
    () => (userId ? fetchNotificationPreferences(userId) : Promise.resolve(null)),
    [userId]
  );
  return useQuery(queryFn, { enabled: !!userId });
}

/**
 * Hook to update notification preferences
 */
export function useUpdateNotificationPreferences() {
  const mutationFn = useCallback(
    async ({
      userId,
      preferences,
    }: {
      userId: string;
      preferences: Partial<
        Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>
      >;
    }) => upsertNotificationPreferences(userId, preferences),
    []
  );

  return useMutation(mutationFn);
}

// ============================================================================
// USER LANGUAGE HOOKS
// ============================================================================

/**
 * Hook to fetch user's preferred language
 */
export function useUserLanguage(userId: string | null | undefined): QueryState<'ar' | 'en'> {
  const queryFn = useCallback(async (): Promise<'ar' | 'en'> => {
    if (!userId) return 'ar';
    const result = await fetchUserLanguage(userId);
    return result as 'ar' | 'en';
  }, [userId]);
  return useQuery<'ar' | 'en'>(queryFn, { enabled: !!userId });
}

/**
 * Hook to update user's preferred language
 */
export function useUpdateUserLanguage() {
  const mutationFn = useCallback(
    async ({ userId, language }: { userId: string; language: 'ar' | 'en' }) =>
      updateUserLanguage(userId, language),
    []
  );

  return useMutation(mutationFn);
}

// ============================================================================
// REFRESH HELPER (Compatibility - individual hooks handle their own refetch)
// ============================================================================

/**
 * Hook to get a refresh function (for compatibility)
 * Note: With useState pattern, each hook manages its own state.
 * Call refetch() on individual hooks to refresh data.
 */
export function useRefreshSettings() {
  return useCallback(() => {
    // No-op - individual hooks should call their own refetch
    console.warn('useRefreshSettings is deprecated. Use refetch() on individual hooks instead.');
    return Promise.resolve();
  }, []);
}

// Re-export SETTING_KEYS for convenience
export { SETTING_KEYS };

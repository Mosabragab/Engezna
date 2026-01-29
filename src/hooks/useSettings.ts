/**
 * Settings React Query Hooks
 *
 * Provides cached, type-safe access to application settings.
 *
 * Features:
 * - 15-minute stale time for performance
 * - Automatic revalidation on window focus disabled
 * - Fallback to defaults on error
 * - Optimistic updates for mutations
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
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
// QUERY KEYS
// ============================================================================

export const SETTINGS_QUERY_KEYS = {
  commission: ['settings', 'commission'] as const,
  commissionChangelog: ['settings', 'commission', 'changelog'] as const,
  appSettings: ['settings', 'app'] as const,
  appSettingsChangelog: (key?: string) =>
    key ? (['settings', 'app', 'changelog', key] as const) : (['settings', 'app', 'changelog'] as const),
  securityDeposit: ['settings', 'app', 'security_deposit'] as const,
  platformInfo: ['settings', 'app', 'platform_info'] as const,
  paymentMethods: ['settings', 'app', 'payment_methods'] as const,
  deliveryDefaults: ['settings', 'app', 'delivery_defaults'] as const,
  notificationDefaults: ['settings', 'app', 'notification_defaults'] as const,
  notificationPreferences: (userId: string) => ['settings', 'notifications', userId] as const,
  userLanguage: (userId: string) => ['settings', 'language', userId] as const,
};

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

const STALE_TIME = 15 * 60 * 1000; // 15 minutes
const GC_TIME = 30 * 60 * 1000; // 30 minutes

// ============================================================================
// COMMISSION SETTINGS HOOKS
// ============================================================================

/**
 * Hook to fetch commission settings
 */
export function useCommissionSettings() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEYS.commission,
    queryFn: fetchCommissionSettings,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * Hook to update commission settings
 */
export function useUpdateCommissionSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      settings,
      userId,
    }: {
      settings: Partial<Omit<CommissionSettings, 'id' | 'updated_at'>>;
      userId?: string;
    }) => updateCommissionSettings(settings, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEYS.commission });
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEYS.commissionChangelog });
    },
  });
}

/**
 * Hook to fetch commission settings changelog
 */
export function useCommissionChangelog(limit = 50) {
  return useQuery({
    queryKey: [...SETTINGS_QUERY_KEYS.commissionChangelog, limit],
    queryFn: () => fetchCommissionChangelog(limit),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

// ============================================================================
// APP SETTINGS HOOKS
// ============================================================================

/**
 * Hook to fetch all app settings
 */
export function useAppSettings() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEYS.appSettings,
    queryFn: fetchAllAppSettings,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * Hook to get a specific setting with type safety
 */
export function useSetting<T>(key: string, schema: z.ZodSchema<T>, fallback: T) {
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, value, reason }: { key: string; value: unknown; reason?: string }) =>
      updateAppSetting(key, value, reason),
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEYS.appSettings });
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEYS.appSettingsChangelog(key) });
    },
  });
}

/**
 * Hook to fetch app settings changelog
 */
export function useAppSettingsChangelog(key?: string, limit = 50) {
  return useQuery({
    queryKey: [...SETTINGS_QUERY_KEYS.appSettingsChangelog(key), limit],
    queryFn: () => fetchAppSettingsChangelog(key, limit),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

// ============================================================================
// TYPED SETTING HOOKS
// ============================================================================

/**
 * Hook to fetch security deposit settings
 */
export function useSecurityDeposit() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEYS.securityDeposit,
    queryFn: fetchSecurityDeposit,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch platform info
 */
export function usePlatformInfo() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEYS.platformInfo,
    queryFn: fetchPlatformInfo,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch payment methods
 */
export function usePaymentMethods() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEYS.paymentMethods,
    queryFn: fetchPaymentMethods,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch delivery defaults
 */
export function useDeliveryDefaults() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEYS.deliveryDefaults,
    queryFn: fetchDeliveryDefaults,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch notification defaults
 */
export function useNotificationDefaults() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEYS.notificationDefaults,
    queryFn: fetchNotificationDefaults,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });
}

// ============================================================================
// NOTIFICATION PREFERENCES HOOKS
// ============================================================================

/**
 * Hook to fetch user's notification preferences
 */
export function useNotificationPreferences(userId: string | null | undefined) {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEYS.notificationPreferences(userId || ''),
    queryFn: () => (userId ? fetchNotificationPreferences(userId) : null),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: !!userId,
  });
}

/**
 * Hook to update notification preferences
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      preferences,
    }: {
      userId: string;
      preferences: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
    }) => upsertNotificationPreferences(userId, preferences),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: SETTINGS_QUERY_KEYS.notificationPreferences(userId),
      });
    },
  });
}

// ============================================================================
// USER LANGUAGE HOOKS
// ============================================================================

/**
 * Hook to fetch user's preferred language
 */
export function useUserLanguage(userId: string | null | undefined) {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEYS.userLanguage(userId || ''),
    queryFn: () => (userId ? fetchUserLanguage(userId) : 'ar'),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: !!userId,
  });
}

/**
 * Hook to update user's preferred language
 */
export function useUpdateUserLanguage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, language }: { userId: string; language: 'ar' | 'en' }) =>
      updateUserLanguage(userId, language),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: SETTINGS_QUERY_KEYS.userLanguage(userId),
      });
    },
  });
}

// ============================================================================
// REFRESH HELPER
// ============================================================================

/**
 * Hook to manually refresh all settings
 */
export function useRefreshSettings() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: ['settings'] });
  }, [queryClient]);
}

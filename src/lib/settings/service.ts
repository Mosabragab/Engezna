/**
 * Settings Service
 *
 * Supabase queries for settings management.
 * Handles both commission_settings (singleton) and app_settings (key-value).
 */

import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import {
  CommissionSettingsSchema,
  SecurityDepositSchema,
  PlatformInfoSchema,
  PaymentMethodsSchema,
  DeliveryDefaultsSchema,
  NotificationDefaultsSchema,
  NotificationPreferencesSchema,
  SettingsChangelogSchema,
  validateSetting,
  type CommissionSettings,
  type SecurityDeposit,
  type PlatformInfo,
  type PaymentMethods,
  type DeliveryDefaults,
  type NotificationDefaults,
  type NotificationPreferences,
  type SettingsChangelog,
} from './schemas';
import {
  DEFAULT_COMMISSION_SETTINGS,
  DEFAULT_SECURITY_DEPOSIT,
  DEFAULT_PLATFORM_INFO,
  DEFAULT_PAYMENT_METHODS,
  DEFAULT_DELIVERY_DEFAULTS,
  DEFAULT_NOTIFICATION_DEFAULTS,
  DEFAULT_NOTIFICATION_PREFERENCES,
  SETTING_KEYS,
} from './defaults';

// ============================================================================
// COMMISSION SETTINGS SERVICE
// ============================================================================

/**
 * Fetch commission settings (singleton table)
 */
export async function fetchCommissionSettings(): Promise<CommissionSettings> {
  const supabase = createClient();

  const { data, error } = await supabase.from('commission_settings').select('*').single();

  if (error) {
    console.error('[Settings] Failed to fetch commission settings:', error);
    // Return default with a generated ID
    return {
      id: 'default',
      ...DEFAULT_COMMISSION_SETTINGS,
    } as CommissionSettings;
  }

  return validateSetting(CommissionSettingsSchema, data, {
    id: data.id,
    ...DEFAULT_COMMISSION_SETTINGS,
  } as CommissionSettings);
}

/**
 * Update commission settings
 */
export async function updateCommissionSettings(
  settings: Partial<Omit<CommissionSettings, 'id' | 'updated_at'>>,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('commission_settings')
    .update({
      ...settings,
      updated_by: userId,
    })
    .eq('id', (await fetchCommissionSettings()).id);

  if (error) {
    console.error('[Settings] Failed to update commission settings:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Fetch commission settings changelog
 */
export async function fetchCommissionChangelog(limit = 50): Promise<SettingsChangelog[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('commission_settings_changelog')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Settings] Failed to fetch commission changelog:', error);
    return [];
  }

  return data.map((row) => validateSetting(SettingsChangelogSchema, row, row as SettingsChangelog));
}

// ============================================================================
// APP SETTINGS SERVICE
// ============================================================================

/**
 * Fetch all app settings as a key-value map
 */
export async function fetchAllAppSettings(): Promise<Record<string, unknown>> {
  const supabase = createClient();

  const { data, error } = await supabase.from('app_settings').select('setting_key, setting_value');

  if (error) {
    console.error('[Settings] Failed to fetch app settings:', error);
    return {};
  }

  return data.reduce(
    (acc, row) => {
      acc[row.setting_key] = row.setting_value;
      return acc;
    },
    {} as Record<string, unknown>
  );
}

/**
 * Fetch a single app setting by key
 */
export async function fetchAppSetting<T>(
  key: string,
  schema: z.ZodSchema<T>,
  fallback: T
): Promise<T> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', key)
    .single();

  if (error) {
    console.error(`[Settings] Failed to fetch ${key}:`, error);
    return fallback;
  }

  return validateSetting(schema, data.setting_value, fallback);
}

/**
 * Update an app setting
 */
export async function updateAppSetting(
  key: string,
  value: unknown,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  // Set change reason for trigger to pick up
  if (reason) {
    await supabase.rpc('set_config', {
      setting: 'app.change_reason',
      value: reason,
      is_local: true,
    });
  }

  const { error } = await supabase
    .from('app_settings')
    .update({ setting_value: value })
    .eq('setting_key', key);

  if (error) {
    console.error(`[Settings] Failed to update ${key}:`, error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Fetch app settings changelog
 */
export async function fetchAppSettingsChangelog(
  key?: string,
  limit = 50
): Promise<SettingsChangelog[]> {
  const supabase = createClient();

  let query = supabase
    .from('settings_changelog')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(limit);

  if (key) {
    query = query.eq('setting_key', key);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Settings] Failed to fetch settings changelog:', error);
    return [];
  }

  return data.map((row) => validateSetting(SettingsChangelogSchema, row, row as SettingsChangelog));
}

// ============================================================================
// TYPED SETTING FETCHERS
// ============================================================================

export async function fetchSecurityDeposit(): Promise<SecurityDeposit> {
  return fetchAppSetting(
    SETTING_KEYS.SECURITY_DEPOSIT,
    SecurityDepositSchema,
    DEFAULT_SECURITY_DEPOSIT
  );
}

export async function fetchPlatformInfo(): Promise<PlatformInfo> {
  return fetchAppSetting(SETTING_KEYS.PLATFORM_INFO, PlatformInfoSchema, DEFAULT_PLATFORM_INFO);
}

export async function fetchPaymentMethods(): Promise<PaymentMethods> {
  return fetchAppSetting(
    SETTING_KEYS.PAYMENT_METHODS,
    PaymentMethodsSchema,
    DEFAULT_PAYMENT_METHODS
  );
}

export async function fetchDeliveryDefaults(): Promise<DeliveryDefaults> {
  return fetchAppSetting(
    SETTING_KEYS.DELIVERY_DEFAULTS,
    DeliveryDefaultsSchema,
    DEFAULT_DELIVERY_DEFAULTS
  );
}

export async function fetchNotificationDefaults(): Promise<NotificationDefaults> {
  return fetchAppSetting(
    SETTING_KEYS.NOTIFICATION_DEFAULTS,
    NotificationDefaultsSchema,
    DEFAULT_NOTIFICATION_DEFAULTS
  );
}

// ============================================================================
// NOTIFICATION PREFERENCES SERVICE
// ============================================================================

/**
 * Fetch notification preferences for a user
 */
export async function fetchNotificationPreferences(
  userId: string
): Promise<NotificationPreferences | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No row found - return null (user hasn't set preferences yet)
      return null;
    }
    console.error('[Settings] Failed to fetch notification preferences:', error);
    return null;
  }

  return validateSetting(NotificationPreferencesSchema, data, {
    user_id: userId,
    ...DEFAULT_NOTIFICATION_PREFERENCES,
  } as NotificationPreferences);
}

/**
 * Create or update notification preferences for a user
 */
export async function upsertNotificationPreferences(
  userId: string,
  preferences: Partial<
    Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  >
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { error } = await supabase.from('notification_preferences').upsert(
    {
      user_id: userId,
      ...preferences,
    },
    {
      onConflict: 'user_id',
    }
  );

  if (error) {
    console.error('[Settings] Failed to upsert notification preferences:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// PROFILE LANGUAGE PREFERENCE
// ============================================================================

/**
 * Fetch user's preferred language from profile
 */
export async function fetchUserLanguage(userId: string): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('preferred_language')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('[Settings] Failed to fetch user language:', error);
    return 'ar'; // Default to Arabic
  }

  return data.preferred_language || 'ar';
}

/**
 * Update user's preferred language
 */
export async function updateUserLanguage(
  userId: string,
  language: 'ar' | 'en'
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ preferred_language: language })
    .eq('id', userId);

  if (error) {
    console.error('[Settings] Failed to update user language:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

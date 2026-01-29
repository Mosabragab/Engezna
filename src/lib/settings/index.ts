/**
 * Settings Module
 *
 * Central module for managing application settings.
 * Provides type-safe access to:
 * - Commission settings (singleton table)
 * - App settings (key-value store)
 * - Notification preferences (per-user)
 * - User language preference
 */

// Export schemas and types
export {
  // Schemas
  CommissionSettingsSchema,
  SecurityDepositSchema,
  SecurityDepositRefundRulesSchema,
  PlatformInfoSchema,
  PaymentMethodsSchema,
  DeliveryDefaultsSchema,
  NotificationDefaultsSchema,
  NotificationPreferencesSchema,
  AppSettingRowSchema,
  SettingsChangelogSchema,
  // Types
  type CommissionSettings,
  type SecurityDeposit,
  type PlatformInfo,
  type PaymentMethods,
  type DeliveryDefaults,
  type NotificationDefaults,
  type NotificationPreferences,
  type AppSettingRow,
  type SettingsChangelog,
  // Validation helpers
  validateSetting,
  parseSetting,
  isValidSetting,
} from './schemas';

// Export defaults
export {
  DEFAULT_COMMISSION_SETTINGS,
  DEFAULT_SECURITY_DEPOSIT,
  DEFAULT_PLATFORM_INFO,
  DEFAULT_PAYMENT_METHODS,
  DEFAULT_DELIVERY_DEFAULTS,
  DEFAULT_NOTIFICATION_DEFAULTS,
  DEFAULT_NOTIFICATION_PREFERENCES,
  SETTING_KEYS,
  SETTING_DEFAULTS,
  type SettingKey,
} from './defaults';

// Export service functions
export {
  // Commission settings
  fetchCommissionSettings,
  updateCommissionSettings,
  fetchCommissionChangelog,
  // App settings
  fetchAllAppSettings,
  fetchAppSetting,
  updateAppSetting,
  fetchAppSettingsChangelog,
  // Typed setting fetchers
  fetchSecurityDeposit,
  fetchPlatformInfo,
  fetchPaymentMethods,
  fetchDeliveryDefaults,
  fetchNotificationDefaults,
  // Notification preferences
  fetchNotificationPreferences,
  upsertNotificationPreferences,
  // User language
  fetchUserLanguage,
  updateUserLanguage,
} from './service';

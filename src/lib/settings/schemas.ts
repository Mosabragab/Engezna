/**
 * Settings Zod Schemas
 *
 * Validation schemas for all application settings.
 * These schemas are used for:
 * - Runtime validation of settings from database
 * - Type inference for TypeScript
 * - Form validation in admin UI
 */

import { z } from 'zod';

// ============================================================================
// COMMISSION SETTINGS (existing table: commission_settings)
// ============================================================================

export const CommissionSettingsSchema = z.object({
  id: z.string().uuid(),
  commission_enabled: z.boolean().default(false),
  default_commission_rate: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === 'string' ? parseFloat(val) : val))
    .pipe(z.number().min(0).max(100))
    .default(0),
  default_grace_period_days: z.number().int().min(0).max(365).default(180),
  max_commission_rate: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === 'string' ? parseFloat(val) : val))
    .pipe(z.number().min(0).max(100))
    .default(7),
  service_fee_enabled: z.boolean().default(false),
  service_fee_amount: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === 'string' ? parseFloat(val) : val))
    .pipe(z.number().min(0))
    .default(0),
  updated_at: z.string().datetime().optional(),
  updated_by: z.string().uuid().nullable().optional(),
});

export type CommissionSettings = z.infer<typeof CommissionSettingsSchema>;

// ============================================================================
// SECURITY DEPOSIT SETTINGS (app_settings key: security_deposit)
// ============================================================================

export const SecurityDepositRefundRulesSchema = z.object({
  full_refund_after_days: z.number().int().min(0).default(180),
  partial_refund_percentage: z.number().min(0).max(100).default(50),
  conditions: z.array(z.string()).default([]),
});

export const SecurityDepositSchema = z.object({
  enabled: z.boolean().default(false),
  amount: z.number().min(0).default(0),
  currency: z.enum(['EGP', 'USD']).default('EGP'),
  is_required_for_new_providers: z.boolean().default(false),
  refund_rules: SecurityDepositRefundRulesSchema.optional(),
  terms_ar: z.string().optional(),
  terms_en: z.string().optional(),
});

export type SecurityDeposit = z.infer<typeof SecurityDepositSchema>;

// ============================================================================
// PLATFORM INFO SETTINGS (app_settings key: platform_info)
// ============================================================================

export const PlatformInfoSchema = z.object({
  app_name_ar: z.string().default('إنجزنا'),
  app_name_en: z.string().default('Engezna'),
  support_email: z.string().email().default('support@engezna.com'),
  support_phone: z.string().default('+201000000000'),
  support_whatsapp: z.string().optional(),
  default_currency: z.enum(['EGP', 'USD']).default('EGP'),
  default_language: z.enum(['ar', 'en']).default('ar'),
  timezone: z.string().default('Africa/Cairo'),
});

export type PlatformInfo = z.infer<typeof PlatformInfoSchema>;

// ============================================================================
// PAYMENT METHODS SETTINGS (app_settings key: payment_methods)
// ============================================================================

export const PaymentMethodsSchema = z.object({
  cod_enabled: z.boolean().default(true),
  cod_label_ar: z.string().default('الدفع عند الاستلام'),
  cod_label_en: z.string().default('Cash on Delivery'),
  online_payment_enabled: z.boolean().default(false),
  wallet_payment_enabled: z.boolean().default(true),
  min_order_for_online_payment: z.number().min(0).default(0),
});

export type PaymentMethods = z.infer<typeof PaymentMethodsSchema>;

// ============================================================================
// DELIVERY DEFAULTS SETTINGS (app_settings key: delivery_defaults)
// ============================================================================

export const DeliveryDefaultsSchema = z.object({
  default_delivery_fee: z.number().min(0).default(15),
  default_delivery_time_min: z.number().int().min(0).default(30),
  default_delivery_radius_km: z.number().min(0).default(5),
  free_delivery_threshold: z.number().min(0).default(200),
  max_delivery_radius_km: z.number().min(0).default(50),
});

export type DeliveryDefaults = z.infer<typeof DeliveryDefaultsSchema>;

// ============================================================================
// NOTIFICATION DEFAULTS SETTINGS (app_settings key: notification_defaults)
// ============================================================================

export const NotificationDefaultsSchema = z.object({
  order_reminder_minutes: z.number().int().min(0).default(15),
  review_request_delay_hours: z.number().int().min(0).default(24),
  abandoned_cart_reminder_hours: z.number().int().min(0).default(2),
  promotion_frequency_days: z.number().int().min(0).default(7),
});

export type NotificationDefaults = z.infer<typeof NotificationDefaultsSchema>;

// ============================================================================
// NOTIFICATION PREFERENCES (existing table: notification_preferences)
// ============================================================================

export const NotificationPreferencesSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),

  // Notification types (existing columns)
  order_updates: z.boolean().default(true),
  promotions: z.boolean().default(true),
  chat_messages: z.boolean().default(true),
  new_orders: z.boolean().default(true),
  order_cancellations: z.boolean().default(true),
  low_stock_alerts: z.boolean().default(true),
  new_reviews: z.boolean().default(true),
  new_providers: z.boolean().default(true),
  complaints: z.boolean().default(true),
  system_alerts: z.boolean().default(true),

  // Sound and quiet hours (existing columns)
  sound_enabled: z.boolean().default(true),
  quiet_hours_enabled: z.boolean().default(false),
  quiet_hours_start: z.string().nullable().optional(),
  quiet_hours_end: z.string().nullable().optional(),

  // Notification channels (NEW columns from migration)
  push_enabled: z.boolean().default(true),
  email_enabled: z.boolean().default(true),
  sms_enabled: z.boolean().default(false),
  whatsapp_enabled: z.boolean().default(false),

  // Timestamps
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

// ============================================================================
// APP SETTINGS ROW (for app_settings table)
// ============================================================================

export const AppSettingRowSchema = z.object({
  id: z.string().uuid(),
  setting_key: z.string(),
  category: z.enum(['security', 'general', 'payment', 'delivery', 'notifications']),
  setting_value: z.unknown(),
  description: z.string().nullable().optional(),
  description_ar: z.string().nullable().optional(),
  is_sensitive: z.boolean().default(false),
  is_readonly: z.boolean().default(false),
  validation_schema: z.unknown().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type AppSettingRow = z.infer<typeof AppSettingRowSchema>;

// ============================================================================
// SETTINGS CHANGELOG (for audit trail)
// ============================================================================

export const SettingsChangelogSchema = z.object({
  id: z.string().uuid(),
  setting_key: z.string().optional(), // Only for app_settings changelog
  old_value: z.unknown().nullable(),
  new_value: z.unknown(),
  changed_by: z.string().uuid().nullable(),
  changed_by_email: z.string().nullable(),
  changed_at: z.string().datetime(),
  change_reason: z.string().nullable().optional(),
});

export type SettingsChangelog = z.infer<typeof SettingsChangelogSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Safely parse and validate a setting value
 * Returns the validated value or fallback if validation fails
 */
export function validateSetting<T>(schema: z.ZodSchema<T>, value: unknown, fallback: T): T {
  const result = schema.safeParse(value);
  if (result.success) {
    return result.data;
  }
  console.error('[Settings] Validation failed:', result.error.flatten());
  return fallback;
}

/**
 * Parse setting value with detailed error
 * Throws if validation fails
 */
export function parseSetting<T>(schema: z.ZodSchema<T>, value: unknown): T {
  return schema.parse(value);
}

/**
 * Check if a value matches a schema
 */
export function isValidSetting<T>(schema: z.ZodSchema<T>, value: unknown): value is T {
  return schema.safeParse(value).success;
}

/**
 * Settings Default Values
 *
 * Fallback values used when:
 * - Database is unavailable
 * - Setting doesn't exist yet
 * - Validation fails
 *
 * These values should match the seed data in the migration.
 */

import type {
  CommissionSettings,
  SecurityDeposit,
  PlatformInfo,
  PaymentMethods,
  DeliveryDefaults,
  NotificationDefaults,
  NotificationPreferences,
} from './schemas';

// ============================================================================
// COMMISSION SETTINGS DEFAULTS
// ============================================================================

export const DEFAULT_COMMISSION_SETTINGS: Omit<CommissionSettings, 'id'> = {
  commission_enabled: false,
  default_commission_rate: 0,
  default_grace_period_days: 90,
  max_commission_rate: 7,
  service_fee_enabled: false,
  service_fee_amount: 0,
};

// ============================================================================
// SECURITY DEPOSIT DEFAULTS
// ============================================================================

export const DEFAULT_SECURITY_DEPOSIT: SecurityDeposit = {
  enabled: false,
  amount: 0,
  currency: 'EGP',
  is_required_for_new_providers: false,
  refund_rules: {
    full_refund_after_days: 180,
    partial_refund_percentage: 50,
    conditions: ['no_outstanding_debt', 'no_active_disputes'],
  },
  terms_ar:
    'يتم استرداد مبلغ التأمين بالكامل بعد 180 يوماً من إنهاء الخدمة في حال عدم وجود مستحقات',
  terms_en:
    'Security deposit is fully refundable after 180 days of service termination with no outstanding dues',
};

// ============================================================================
// PLATFORM INFO DEFAULTS
// ============================================================================

export const DEFAULT_PLATFORM_INFO: PlatformInfo = {
  app_name_ar: 'إنجزنا',
  app_name_en: 'Engezna',
  support_email: 'support@engezna.com',
  support_phone: '+201000000000',
  support_whatsapp: '+201000000000',
  default_currency: 'EGP',
  default_language: 'ar',
  timezone: 'Africa/Cairo',
  // Platform bank details (admin fills these)
  platform_bank_name: '',
  platform_account_holder: '',
  platform_account_number: '',
  platform_iban: '',
  platform_instapay: '',
  platform_vodafone_cash: '',
};

// ============================================================================
// PAYMENT METHODS DEFAULTS
// ============================================================================

export const DEFAULT_PAYMENT_METHODS: PaymentMethods = {
  cod_enabled: true,
  cod_label_ar: 'الدفع عند الاستلام',
  cod_label_en: 'Cash on Delivery',
  online_payment_enabled: false,
  wallet_payment_enabled: true,
  min_order_for_online_payment: 0,
};

// ============================================================================
// DELIVERY DEFAULTS
// ============================================================================

export const DEFAULT_DELIVERY_DEFAULTS: DeliveryDefaults = {
  default_delivery_fee: 15,
  default_delivery_time_min: 30,
  default_delivery_radius_km: 5,
  free_delivery_threshold: 200,
  max_delivery_radius_km: 50,
};

// ============================================================================
// NOTIFICATION DEFAULTS
// ============================================================================

export const DEFAULT_NOTIFICATION_DEFAULTS: NotificationDefaults = {
  order_reminder_minutes: 15,
  review_request_delay_hours: 24,
  abandoned_cart_reminder_hours: 2,
  promotion_frequency_days: 7,
};

// ============================================================================
// NOTIFICATION PREFERENCES DEFAULTS (for new users)
// ============================================================================

export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<
  NotificationPreferences,
  'id' | 'user_id' | 'created_at' | 'updated_at'
> = {
  // Notification types
  order_updates: true,
  promotions: true,
  chat_messages: true,
  new_orders: true,
  order_cancellations: true,
  low_stock_alerts: true,
  new_reviews: true,
  new_providers: true,
  complaints: true,
  system_alerts: true,

  // Sound and quiet hours
  sound_enabled: true,
  quiet_hours_enabled: false,
  quiet_hours_start: null,
  quiet_hours_end: null,

  // Notification channels
  push_enabled: true,
  email_enabled: true,
  sms_enabled: false,
  whatsapp_enabled: false,
};

// ============================================================================
// SETTING KEYS (for app_settings table)
// ============================================================================

export const SETTING_KEYS = {
  SECURITY_DEPOSIT: 'security_deposit',
  PLATFORM_INFO: 'platform_info',
  PAYMENT_METHODS: 'payment_methods',
  DELIVERY_DEFAULTS: 'delivery_defaults',
  NOTIFICATION_DEFAULTS: 'notification_defaults',
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

// ============================================================================
// ALL DEFAULTS MAP (for easy lookup)
// ============================================================================

export const SETTING_DEFAULTS: Record<SettingKey, unknown> = {
  [SETTING_KEYS.SECURITY_DEPOSIT]: DEFAULT_SECURITY_DEPOSIT,
  [SETTING_KEYS.PLATFORM_INFO]: DEFAULT_PLATFORM_INFO,
  [SETTING_KEYS.PAYMENT_METHODS]: DEFAULT_PAYMENT_METHODS,
  [SETTING_KEYS.DELIVERY_DEFAULTS]: DEFAULT_DELIVERY_DEFAULTS,
  [SETTING_KEYS.NOTIFICATION_DEFAULTS]: DEFAULT_NOTIFICATION_DEFAULTS,
};

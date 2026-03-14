# Database-Driven Settings Implementation Plan

## Overview

This document outlines the comprehensive plan for managing application settings using a database-driven approach with Supabase JSONB columns, full type safety, and audit trails.

---

## Current Database State Analysis

Before implementing new features, we analyzed the existing database structure to avoid duplication:

### Existing Tables (DO NOT DUPLICATE)

| Table                             | Purpose                        | Status    |
| --------------------------------- | ------------------------------ | --------- |
| `commission_settings`             | Commission rates, grace period | ✅ Exists |
| `notification_preferences`        | User notification settings     | ✅ Exists |
| `provider_notifications`          | Notification log for providers | ✅ Exists |
| `customer_notifications`          | Notification log for customers | ✅ Exists |
| `providers.business_hours`        | Provider working hours (JSONB) | ✅ Exists |
| `providers.custom_order_settings` | Custom order config (JSONB)    | ✅ Exists |

### New Tables (Created by this plan)

| Table                           | Purpose                             | Status |
| ------------------------------- | ----------------------------------- | ------ |
| `app_settings`                  | Non-commission platform settings    | 🆕 New |
| `settings_changelog`            | Audit trail for app_settings        | 🆕 New |
| `commission_settings_changelog` | Audit trail for commission_settings | 🆕 New |

### Enhanced Columns

| Table                      | Column               | Purpose                    | Status   |
| -------------------------- | -------------------- | -------------------------- | -------- |
| `profiles`                 | `preferred_language` | User language preference   | 🆕 Added |
| `notification_preferences` | `push_enabled`       | Push notification channel  | 🆕 Added |
| `notification_preferences` | `email_enabled`      | Email notification channel | 🆕 Added |
| `notification_preferences` | `sms_enabled`        | SMS notification channel   | 🆕 Added |
| `notification_preferences` | `whatsapp_enabled`   | WhatsApp channel           | 🆕 Added |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SETTINGS ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────┐    ┌──────────────────────┐                       │
│  │  commission_settings │    │    app_settings      │                       │
│  │  (Singleton Table)   │    │  (Key-Value Store)   │                       │
│  ├──────────────────────┤    ├──────────────────────┤                       │
│  │ • commission_enabled │    │ • security_deposit   │                       │
│  │ • default_rate       │    │ • platform_info      │                       │
│  │ • grace_period_days  │    │ • payment_methods    │                       │
│  │ • max_rate           │    │ • delivery_defaults  │                       │
│  │ • service_fee        │    │ • notification_defaults│                     │
│  └──────────┬───────────┘    └──────────┬───────────┘                       │
│             │                           │                                    │
│             ▼                           ▼                                    │
│  ┌──────────────────────┐    ┌──────────────────────┐                       │
│  │ commission_settings_ │    │  settings_changelog  │                       │
│  │     changelog        │    │                      │                       │
│  └──────────────────────┘    └──────────────────────┘                       │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │                  notification_preferences                         │       │
│  │  (Per-User Settings - linked to profiles.id)                      │       │
│  ├──────────────────────────────────────────────────────────────────┤       │
│  │  Notification Types:        │  Notification Channels:            │       │
│  │  • order_updates            │  • push_enabled                    │       │
│  │  • promotions               │  • email_enabled                   │       │
│  │  • chat_messages            │  • sms_enabled                     │       │
│  │  • new_orders               │  • whatsapp_enabled                │       │
│  │  • new_reviews              │                                    │       │
│  │  • system_alerts            │  Quiet Hours:                      │       │
│  │  • etc.                     │  • quiet_hours_enabled/start/end   │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Requirements Checklist

| Requirement              | Implementation                                | Status      |
| ------------------------ | --------------------------------------------- | ----------- |
| Caching Strategy         | React Query with 15-minute stale time         | ⏳ Pending  |
| Type Safety              | Zod schemas for all JSONB validation          | ⏳ Pending  |
| Audit Trail (Commission) | `commission_settings_changelog` table         | ✅ Complete |
| Audit Trail (App)        | `settings_changelog` table with full tracking | ✅ Complete |
| Commission Settings      | Uses existing `commission_settings` table     | ✅ Exists   |
| Security Deposit         | `app_settings` with key `security_deposit`    | ✅ Complete |
| Platform Info            | `app_settings` with key `platform_info`       | ✅ Complete |
| Payment Methods          | `app_settings` with key `payment_methods`     | ✅ Complete |
| Delivery Defaults        | `app_settings` with key `delivery_defaults`   | ✅ Complete |
| User Language            | `profiles.preferred_language` column          | ✅ Complete |
| Notification Channels    | `notification_preferences` enhanced columns   | ✅ Complete |

---

## Phase 1: Database Schema

### 1.1 Commission Settings (EXISTING - DO NOT MODIFY STRUCTURE)

```sql
-- This table already exists! Structure:
-- commission_settings (singleton table)
--   id UUID
--   commission_enabled BOOLEAN
--   default_commission_rate NUMERIC
--   default_grace_period_days INTEGER
--   max_commission_rate NUMERIC
--   service_fee_enabled BOOLEAN
--   service_fee_amount NUMERIC
--   updated_at TIMESTAMPTZ
--   updated_by UUID
```

### 1.2 App Settings Table (NEW - for non-commission settings)

```sql
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  category settings_category NOT NULL DEFAULT 'general',
  setting_value JSONB NOT NULL,
  description TEXT,
  description_ar TEXT,
  is_sensitive BOOLEAN DEFAULT FALSE,
  is_readonly BOOLEAN DEFAULT FALSE,
  validation_schema JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.3 Settings Categories

| Category      | Settings                                            |
| ------------- | --------------------------------------------------- |
| security      | security_deposit                                    |
| general       | platform_info (app_name, support_email, etc.)       |
| payment       | payment_methods (cod_enabled, online_enabled, etc.) |
| delivery      | delivery_defaults (default_fee, radius, time, etc.) |
| notifications | notification_defaults (timing settings)             |

### 1.4 Notification Preferences (EXISTING - ENHANCED)

```sql
-- Existing columns (DO NOT REMOVE):
-- order_updates, promotions, chat_messages, new_orders,
-- order_cancellations, low_stock_alerts, new_reviews,
-- new_providers, complaints, system_alerts,
-- sound_enabled, quiet_hours_enabled/start/end

-- NEW columns added:
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT false;
```

---

## Phase 2: Zod Validation Schemas

### 2.1 Commission Settings Schema (for existing table)

```typescript
import { z } from 'zod';

// Schema matches commission_settings table structure
export const CommissionSettingsSchema = z.object({
  id: z.string().uuid(),
  commission_enabled: z.boolean().default(false),
  default_commission_rate: z.number().min(0).max(100).default(0),
  default_grace_period_days: z.number().int().min(0).max(365).default(180),
  max_commission_rate: z.number().min(0).max(100).default(7),
  service_fee_enabled: z.boolean().default(false),
  service_fee_amount: z.number().min(0).default(0),
  updated_at: z.string().datetime().optional(),
  updated_by: z.string().uuid().nullable().optional(),
});

export type CommissionSettings = z.infer<typeof CommissionSettingsSchema>;
```

### 2.2 Security Deposit Schema

```typescript
export const SecurityDepositSchema = z.object({
  enabled: z.boolean().default(false),
  amount: z.number().min(0).default(0),
  currency: z.enum(['EGP', 'USD']).default('EGP'),
  is_required_for_new_providers: z.boolean().default(false),
  refund_rules: z
    .object({
      full_refund_after_days: z.number().int().min(0).default(180),
      partial_refund_percentage: z.number().min(0).max(100).default(50),
      conditions: z.array(z.string()).default([]),
    })
    .optional(),
  terms_ar: z.string().optional(),
  terms_en: z.string().optional(),
});

export type SecurityDeposit = z.infer<typeof SecurityDepositSchema>;
```

### 2.3 Platform Info Schema

```typescript
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
```

### 2.4 Payment Methods Schema

```typescript
export const PaymentMethodsSchema = z.object({
  cod_enabled: z.boolean().default(true),
  cod_label_ar: z.string().default('الدفع عند الاستلام'),
  cod_label_en: z.string().default('Cash on Delivery'),
  online_payment_enabled: z.boolean().default(false),
  wallet_payment_enabled: z.boolean().default(true),
  min_order_for_online_payment: z.number().min(0).default(0),
});

export type PaymentMethods = z.infer<typeof PaymentMethodsSchema>;
```

### 2.5 Notification Preferences Schema (for existing table)

```typescript
export const NotificationPreferencesSchema = z.object({
  // Notification types (existing)
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

  // Sound and quiet hours (existing)
  sound_enabled: z.boolean().default(true),
  quiet_hours_enabled: z.boolean().default(false),
  quiet_hours_start: z.string().nullable().optional(),
  quiet_hours_end: z.string().nullable().optional(),

  // Notification channels (NEW)
  push_enabled: z.boolean().default(true),
  email_enabled: z.boolean().default(true),
  sms_enabled: z.boolean().default(false),
  whatsapp_enabled: z.boolean().default(false),
});

export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;
```

### 2.6 Validation Helper

```typescript
export function validateSetting<T>(schema: z.ZodSchema<T>, value: unknown, fallback: T): T {
  const result = schema.safeParse(value);
  if (result.success) {
    return result.data;
  }
  console.error('Setting validation failed:', result.error);
  return fallback;
}
```

---

## Phase 3: React Query Caching Strategy

### 3.1 Commission Settings Hook (for existing table)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

const COMMISSION_QUERY_KEY = ['commission-settings'];
const STALE_TIME = 15 * 60 * 1000; // 15 minutes

export function useCommissionSettings() {
  return useQuery({
    queryKey: COMMISSION_QUERY_KEY,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from('commission_settings').select('*').single();

      if (error) throw error;
      return CommissionSettingsSchema.parse(data);
    },
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
  });
}
```

### 3.2 App Settings Hook (for new table)

```typescript
const APP_SETTINGS_QUERY_KEY = ['app-settings'];

export function useAppSettings() {
  return useQuery({
    queryKey: APP_SETTINGS_QUERY_KEY,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      // Transform to key-value map
      return data.reduce(
        (acc, row) => {
          acc[row.setting_key] = row.setting_value;
          return acc;
        },
        {} as Record<string, unknown>
      );
    },
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
  });
}

export function useSetting<T>(key: string, schema: z.ZodSchema<T>, fallback: T) {
  const { data: settings, isLoading, error } = useAppSettings();

  const value = useMemo(() => {
    if (!settings?.[key]) return fallback;
    return validateSetting(schema, settings[key], fallback);
  }, [settings, key]);

  return { value, isLoading, error };
}
```

### 3.3 Notification Preferences Hook (for existing table)

```typescript
const NOTIFICATION_PREFS_KEY = ['notification-preferences'];

export function useNotificationPreferences(userId: string) {
  return useQuery({
    queryKey: [...NOTIFICATION_PREFS_KEY, userId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data ? NotificationPreferencesSchema.parse(data) : null;
    },
    staleTime: STALE_TIME,
    enabled: !!userId,
  });
}
```

---

## Phase 4: Implementation Steps

### Step 1: Database Migration ✅

- [x] Analyze existing database structure
- [x] Create enhanced migration file
- [x] Add `preferred_language` to profiles
- [x] Add notification channels to notification_preferences
- [x] Create `commission_settings_changelog` table
- [x] Create `app_settings` table
- [x] Create `settings_changelog` table
- [x] Add RLS policies
- [x] Seed initial settings

### Step 2: Zod Schemas

- [ ] Create `/src/lib/settings/schemas.ts`
- [ ] Define all setting schemas with validation
- [ ] Export type definitions
- [ ] Add validation helpers

### Step 3: React Query Integration

- [ ] Create `/src/hooks/useCommissionSettings.ts`
- [ ] Create `/src/hooks/useAppSettings.ts`
- [ ] Create `/src/hooks/useNotificationPreferences.ts`
- [ ] Implement caching strategy (15-min stale time)
- [ ] Add manual refresh capability
- [ ] Create admin mutation hooks

### Step 4: Admin UI

- [ ] Add settings management to `/admin/settings`
- [ ] Create settings editor components
- [ ] Show changelog history
- [ ] Add commission settings changelog viewer

### Step 5: Migration of Existing Code

- [ ] Update commission utils to use `useCommissionSettings`
- [ ] Update notification components to use enhanced preferences
- [ ] Update language switcher to use `preferred_language`

---

## File Structure

```
src/
├── lib/
│   └── settings/
│       ├── index.ts                    # Exports
│       ├── schemas.ts                  # Zod validation schemas
│       ├── defaults.ts                 # Fallback default values
│       ├── commission-service.ts       # commission_settings queries
│       ├── app-settings-service.ts     # app_settings queries
│       └── types.ts                    # TypeScript types
├── hooks/
│   ├── useCommissionSettings.ts        # Hook for commission_settings
│   ├── useAppSettings.ts               # Hook for app_settings
│   └── useNotificationPreferences.ts   # Hook for notification_preferences
└── components/
    └── admin/
        ├── CommissionSettingsEditor.tsx
        ├── AppSettingsEditor.tsx
        └── SettingsChangelog.tsx

supabase/migrations/
└── 20260128000013_settings_enhancements.sql
```

---

## Security Considerations

1. **RLS Policies**: Only admins can modify settings
2. **Sensitive Settings**: Mark `is_sensitive = true` for credentials
3. **Audit Trail**: All changes logged with user ID and timestamp
4. **Validation**: All values validated before storage and after retrieval

---

## Rollback Strategy

If issues occur:

1. **Immediate**: Use changelog tables to restore previous values
2. **Code Fallback**: All hooks have hardcoded fallback values
3. **Database Rollback**: Migration uses IF NOT EXISTS/IF EXISTS for safety

---

## Migration Safety Notes

The migration file (`20260128000013_settings_enhancements.sql`) is designed to be **safe for existing data**:

| Operation                | Safety Mechanism                            |
| ------------------------ | ------------------------------------------- |
| `ALTER TABLE ADD COLUMN` | Uses `IF NOT EXISTS`                        |
| New columns              | All have `DEFAULT` values                   |
| New tables               | Uses `CREATE TABLE IF NOT EXISTS`           |
| Triggers                 | Uses `DROP TRIGGER IF EXISTS` before create |
| Seed data                | Uses `ON CONFLICT DO NOTHING`               |

---

## Success Metrics

| Metric                   | Target  | Notes                        |
| ------------------------ | ------- | ---------------------------- |
| Settings update time     | < 5 min | No code deployment needed    |
| Cache hit rate           | > 95%   | 15-minute stale time         |
| Type validation errors   | 0       | Zod catches all invalid data |
| Audit trail completeness | 100%    | Every change logged          |

---

## Notes

- All code must pass Prettier formatting checks
- TypeScript strict mode enabled
- No `any` types allowed - full type safety required
- All JSONB values must be validated with Zod before use
- Commission settings remain in `commission_settings` table (not duplicated)
- Notification preferences enhanced with channels (not replaced)

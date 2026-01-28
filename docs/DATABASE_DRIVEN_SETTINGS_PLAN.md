# Database-Driven Settings Implementation Plan

## Overview

This document outlines the comprehensive plan for migrating application settings from hardcoded
constants to a database-driven approach using Supabase JSONB columns with full type safety.

---

## Requirements Checklist

| Requirement         | Implementation                                | Status  |
| ------------------- | --------------------------------------------- | ------- |
| Caching Strategy    | React Query with 15-minute stale time         | Pending |
| Type Safety         | Zod schemas for all JSONB validation          | Pending |
| Audit Trail         | `settings_changelog` table with full tracking | Pending |
| Commission Settings | Database table with JSONB config              | Pending |
| Security Deposit    | Database table with JSONB config              | Pending |

---

## Phase 1: Database Schema

### 1.1 Main Settings Table (`app_settings`)

```sql
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  is_sensitive BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.2 Audit Trail Table (`settings_changelog`)

```sql
CREATE TABLE settings_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB NOT NULL,
  changed_by UUID REFERENCES admin_users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_reason TEXT
);
```

### 1.3 Initial Settings Categories

| Category   | Settings                                    |
| ---------- | ------------------------------------------- |
| commission | grace_period_days, default_rate, max_rate   |
| security   | deposit_amount, deposit_terms, refund_rules |
| general    | app_name, support_email, support_phone      |
| payment    | cod_enabled, online_enabled, min_order      |

---

## Phase 2: Zod Validation Schemas

### 2.1 Commission Settings Schema

```typescript
import { z } from 'zod';

export const CommissionSettingsSchema = z.object({
  grace_period_days: z.number().int().min(0).max(365).default(90),
  default_rate: z.number().min(0).max(100).default(7),
  max_rate: z.number().min(0).max(100).default(7),
  min_rate: z.number().min(0).max(100).default(0),
  enabled: z.boolean().default(true),
});

export type CommissionSettings = z.infer<typeof CommissionSettingsSchema>;
```

### 2.2 Security Deposit Schema

```typescript
export const SecurityDepositSchema = z.object({
  amount: z.number().min(0).default(0),
  currency: z.enum(['EGP', 'USD']).default('EGP'),
  is_required: z.boolean().default(false),
  refund_rules: z
    .object({
      full_refund_after_days: z.number().int().min(0).default(180),
      partial_refund_percentage: z.number().min(0).max(100).default(50),
    })
    .optional(),
  terms_ar: z.string().optional(),
  terms_en: z.string().optional(),
});

export type SecurityDeposit = z.infer<typeof SecurityDepositSchema>;
```

### 2.3 Validation Helper

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

### 3.1 Settings Hook with Caching

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const SETTINGS_QUERY_KEY = ['app-settings'];
const STALE_TIME = 15 * 60 * 1000; // 15 minutes
const CACHE_TIME = 30 * 60 * 1000; // 30 minutes

export function useAppSettings() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: fetchAllSettings,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useSetting<T>(key: string, schema: z.ZodSchema<T>, fallback: T) {
  const { data: settings, isLoading, error } = useAppSettings();

  const value = useMemo(() => {
    if (!settings?.[key]) return fallback;
    return validateSetting(schema, settings[key], fallback);
  }, [settings, key, schema, fallback]);

  return { value, isLoading, error };
}
```

### 3.2 Manual Refresh Support

```typescript
export function useRefreshSettings() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
  }, [queryClient]);
}
```

### 3.3 Admin Mutation with Audit

```typescript
export function useUpdateSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      key,
      value,
      reason,
    }: {
      key: string;
      value: unknown;
      reason?: string;
    }) => {
      return updateSettingWithAudit(key, value, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
    },
  });
}
```

---

## Phase 4: Implementation Steps

### Step 1: Database Migration (Current Phase)

- [x] Plan document created
- [ ] Create `app_settings` table migration
- [ ] Create `settings_changelog` table migration
- [ ] Add RLS policies for admin access
- [ ] Seed initial commission and security deposit settings

### Step 2: Zod Schemas

- [ ] Create `/src/lib/settings/schemas.ts`
- [ ] Define all setting schemas with validation
- [ ] Export type definitions

### Step 3: React Query Integration

- [ ] Create `/src/hooks/useAppSettings.ts`
- [ ] Implement caching strategy (15-min stale time)
- [ ] Add manual refresh capability
- [ ] Create admin mutation hooks

### Step 4: Admin UI

- [ ] Add settings management to `/admin/app-layout`
- [ ] Create settings editor components
- [ ] Show changelog history

### Step 5: Migration of Existing Code

- [ ] Replace `COMMISSION_CONFIG` with database values
- [ ] Update `src/lib/commission/utils.ts` to use new hook
- [ ] Update all components using hardcoded values

---

## File Structure

```
src/
├── lib/
│   └── settings/
│       ├── index.ts           # Exports
│       ├── schemas.ts         # Zod validation schemas
│       ├── defaults.ts        # Fallback default values
│       ├── service.ts         # Supabase queries
│       └── types.ts           # TypeScript types
├── hooks/
│   └── useAppSettings.ts      # React Query hooks
└── components/
    └── admin/
        └── SettingsManager.tsx # Admin UI component

supabase/migrations/
└── 20260128000010_database_driven_settings.sql
```

---

## Security Considerations

1. **RLS Policies**: Only admins can modify settings
2. **Sensitive Settings**: Mark `is_sensitive = true` for credentials
3. **Audit Trail**: All changes logged with user ID
4. **Validation**: All values validated before storage and after retrieval

---

## Rollback Strategy

If issues occur:

1. **Immediate**: Use `settings_changelog` to restore previous values
2. **Code Fallback**: All hooks have hardcoded fallback values
3. **Database Rollback**: Migration includes `DOWN` script

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

# Realtime Optimization - Baseline & Comparison Plan

## Overview
This document tracks the Supabase Realtime optimization implemented on **2026-01-21**.

### Optimization Summary
| Before | After |
|--------|-------|
| 5 separate Realtime channels per provider | 1 unified channel |
| All badges via Realtime | Non-critical badges via 30s polling |
| ~10.5M realtime queries | Expected: ~2-3M queries |

---

## Baseline Data (BEFORE Optimization)

**Captured at:** `2026-01-21 20:45:33 UTC`

### Connection Statistics
```
Total Connections:        21
Active Connections:       3
Idle Connections:         16
Realtime Connections:     8
Active Subscriptions:     0 (no active users at time of capture)
```

### Realtime Query Statistics
```
realtime_list_changes_calls: 10,506,181
Total Realtime Queries:      10,564,759
```

### Top Realtime Queries by Time
| Query | Calls | Total Time (ms) | % of Total |
|-------|-------|-----------------|------------|
| `SELECT wal->>$5 as type... (COALESCE)` | 8,365,145 | 49,548,451 | 77.30% |
| `SELECT wal->>$5 as type... (columns)` | 2,141,851 | 11,121,378 | 17.35% |
| `with sub_tables as...` | 52,479 | 69,908 | 0.11% |

### Realtime Infrastructure Connections
```
realtime_connect:                    2
realtime_replication_connection:     1
realtime_rls:                        1
realtime_subscription_checker:       1
realtime_subscription_manager:       1
realtime_subscription_manager_pub:   2
```

---

## Changes Implemented

### 1. ProviderLayout.tsx - Channel Consolidation (5 → 1 channel)
**File:** `src/components/provider/ProviderLayout.tsx`

**Before (5 channels):**
```typescript
channel(`provider-notifications-${providerId}`)  // Channel 1
channel(`layout-orders-${providerId}`)           // Channel 2
channel(`layout-refunds-${providerId}`)          // Channel 3
channel(`layout-complaints-${providerId}`)       // Channel 4
channel(`layout-custom-orders-${providerId}`)    // Channel 5
```

**After (1 channel + polling):**
```typescript
// Critical updates - Single unified Realtime channel
channel(`provider-unified-${providerId}`)
  .on('postgres_changes', { table: 'provider_notifications', filter: `provider_id=eq.${providerId}` })
  .on('postgres_changes', { table: 'orders', filter: `provider_id=eq.${providerId}` })
  .on('postgres_changes', { table: 'custom_order_requests', filter: `provider_id=eq.${providerId}` })

// Non-critical updates - 30 second polling
setInterval(fetchBadgeCounts, 30000);  // refunds, complaints, on_hold
```

### 2. Data Isolation
All Realtime subscriptions now use proper filters:
```typescript
filter: `provider_id=eq.${providerId}`
```

### 3. BottomNavigation.tsx - Removed Realtime (2 → 0 channels)
**File:** `src/components/customer/layout/BottomNavigation.tsx`

**Before (2 channels):**
```typescript
channel('customer-pending-quotes-requests')   // Channel 1
channel('customer-pending-quotes-broadcasts') // Channel 2
```

**After (polling only):**
```typescript
// Non-critical badge - 30 second polling
setInterval(loadPendingQuotes, 30000);
```

### 4. Admin Layout - Removed Realtime (3 → 0 channels)
**File:** `src/app/[locale]/admin/layout.tsx`

**Before (3 channels):**
```typescript
channel('admin-refunds-badges')    // Channel 1
channel('admin-tickets-badges')    // Channel 2
channel('admin-providers-badges')  // Channel 3
```

**After (polling only):**
```typescript
// Admin badges - 30 second polling (was 60s)
setInterval(loadBadgeCounts, 30000);
```

---

## Comparison Plan (After 24-48 Hours)

### SQL Query to Run After Deployment

```sql
-- Run this query 24-48 hours after deployment
SELECT
  NOW() as check_time,
  'AFTER_OPTIMIZATION' as type,
  (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as total_connections,
  (SELECT count(*) FROM pg_stat_activity WHERE application_name LIKE '%realtime%') as realtime_connections,
  (SELECT COALESCE(SUM(calls), 0) FROM pg_stat_statements WHERE query LIKE '%list_changes%') as realtime_list_changes_calls,

  -- Calculate increase from baseline (10,506,181)
  (SELECT COALESCE(SUM(calls), 0) FROM pg_stat_statements WHERE query LIKE '%list_changes%') - 10506181 as new_calls_since_baseline,

  (SELECT count(DISTINCT subscription_id) FROM realtime.subscription) as active_subscriptions;
```

### Detailed Query Performance Check

```sql
SELECT
  LEFT(query, 100) as query_preview,
  calls,
  total_exec_time as total_time,
  ROUND((total_exec_time / (SELECT sum(total_exec_time) FROM pg_stat_statements))::numeric * 100, 2) as pct_total_time
FROM pg_stat_statements
WHERE query LIKE '%realtime%'
ORDER BY total_exec_time DESC
LIMIT 10;
```

---

## Expected Results

| Component | Before | After | Channels Removed |
|-----------|--------|-------|------------------|
| ProviderLayout | 5 channels | 1 channel | **-4** |
| BottomNavigation | 2 channels | 0 (polling) | **-2** |
| Admin Layout | 3 channels | 0 (polling) | **-3** |
| **Total** | **10 channels** | **1 channel** | **-9** |

| Metric | Baseline (BEFORE) | Target (AFTER) | Improvement |
|--------|-------------------|----------------|-------------|
| Realtime Channels Total | 10 | 1 | **-90%** |
| Realtime Query Growth Rate | ~10M/period | ~1-2M/period | **-80%** |
| Non-critical Badge Latency | 0ms | 30s max | Acceptable |

---

## AFTER Optimization Results

**To be filled after 24-48 hours:**

```
Captured at: ________________

Total Connections:           ____
Realtime Connections:        ____
realtime_list_changes_calls: ____
new_calls_since_baseline:    ____
Active Subscriptions:        ____
```

### Comparison

| Metric | BEFORE | AFTER | Change |
|--------|--------|-------|--------|
| `realtime_list_changes_calls` | 10,506,181 | ____ | ____% |
| `realtime_connections` | 8 | ____ | ____% |
| `total_connections` | 21 | ____ | ____% |

### Success Criteria
- [ ] `new_calls_since_baseline` growth rate reduced by 60%+
- [ ] No functional regressions in badge updates
- [ ] Notification sounds still working
- [ ] Orders badge updates in real-time

---

## Rollback Plan

If issues occur, revert commit `c87281a` and restore the 5-channel approach:

```bash
git revert c87281a
```

---

## Related Files

- `src/components/provider/ProviderLayout.tsx` - Provider channels optimization (5→1)
- `src/components/customer/layout/BottomNavigation.tsx` - Customer channels removed (2→0)
- `src/app/[locale]/admin/layout.tsx` - Admin channels removed (3→0)
- `src/lib/store/cart.ts` - Added `logo_url` to Provider type
- `src/app/[locale]/cart/page.tsx` - Store logo display
- `src/app/[locale]/providers/[id]/ProviderDetailClient.tsx` - Pass logo_url to cart

---

## Commit History

| Commit | Description |
|--------|-------------|
| `b785f2a` | perf: optimize customer & admin realtime - convert to polling |
| `d7b02fb` | docs: add Realtime optimization baseline and comparison plan |
| `c87281a` | perf: optimize ProviderLayout realtime - merge 5 channels into 1 |
| `2e01f5f` | style: fix Prettier formatting in provider settings page |
| `5765999` | feat: display store logo instead of generic icon in cart header |

---

*Document created: 2026-01-21*
*Last updated: 2026-01-21*

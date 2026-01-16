# Custom Order Expiration Edge Function

## Overview | نظرة عامة

This Edge Function automatically handles expiration of custom order broadcasts and requests.

هذه الـ Edge Function تعالج انتهاء صلاحية البث والطلبات تلقائياً.

## Functionality | الوظائف

1. **Expire Active Broadcasts** - Broadcasts past their pricing deadline
2. **Expire Pending Requests** - Individual requests that haven't been priced
3. **Expire Approval Windows** - Customer approval windows (2 hours after pricing)
4. **Cleanup Completed** - Mark completed broadcasts as finalized

## Deployment | النشر

### Prerequisites | المتطلبات

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login
```

### Deploy the Function | نشر الـ Function

```bash
# Navigate to project root
cd /path/to/Engezna

# Deploy the function
supabase functions deploy custom-order-expiration --project-ref YOUR_PROJECT_REF

# Or deploy all functions
supabase functions deploy --project-ref YOUR_PROJECT_REF
```

### Set up Scheduled Trigger | إعداد الـ Trigger المجدول

The function should run every 5 minutes. Set this up in Supabase Dashboard:

1. Go to **Database** → **Extensions** → Enable `pg_cron`
2. Go to **SQL Editor** and run:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run every 5 minutes
SELECT cron.schedule(
  'custom-order-expiration',  -- job name
  '*/5 * * * *',              -- every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/custom-order-expiration',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Verify the job is scheduled
SELECT * FROM cron.job;
```

### Alternative: Use Supabase Scheduled Functions

If using Supabase's built-in scheduled functions:

```sql
-- In supabase/config.toml add:
[functions.custom-order-expiration]
schedule = "*/5 * * * *"
```

## Testing | الاختبار

### Manual Trigger | تشغيل يدوي

```bash
# Using curl
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/custom-order-expiration' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'

# Using Supabase CLI
supabase functions invoke custom-order-expiration --project-ref YOUR_PROJECT_REF
```

### Check Logs | فحص السجلات

```bash
supabase functions logs custom-order-expiration --project-ref YOUR_PROJECT_REF
```

## Environment Variables | متغيرات البيئة

The function uses these environment variables (automatically set by Supabase):

| Variable                    | Description                          |
| --------------------------- | ------------------------------------ |
| `SUPABASE_URL`              | Your Supabase project URL            |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for database access |

## Database Tables Affected | الجداول المتأثرة

- `custom_order_broadcasts` - Status updated to 'expired'
- `custom_order_requests` - Status updated to 'expired'
- `notifications` - Expiration notifications sent

## Monitoring | المراقبة

### Check Expired Broadcasts

```sql
SELECT
  id,
  status,
  pricing_deadline,
  expires_at,
  created_at
FROM custom_order_broadcasts
WHERE status = 'expired'
ORDER BY created_at DESC
LIMIT 20;
```

### Check Function Execution History

```sql
-- If using pg_cron
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'custom-order-expiration')
ORDER BY start_time DESC
LIMIT 10;
```

## Troubleshooting | استكشاف الأخطاء

### Function Not Running

1. Check if pg_cron extension is enabled
2. Verify the scheduled job exists: `SELECT * FROM cron.job;`
3. Check function logs for errors

### Broadcasts Not Expiring

1. Verify `pricing_deadline` column has correct values
2. Check that broadcasts have status = 'active'
3. Run function manually to test

### Notifications Not Sending

1. Check `notifications` table for new entries
2. Verify customer notification preferences
3. Check Supabase Realtime is enabled for notifications table

## Related Files | الملفات ذات الصلة

- `index.ts` - Main function code
- `../migrations/20260110000001_custom_order_notifications.sql` - Database triggers
- `../migrations/20260109000001_custom_order_system.sql` - Schema definitions

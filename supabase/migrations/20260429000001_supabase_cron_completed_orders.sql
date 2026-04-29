-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Move process-completed-orders cron from Vercel to Supabase pg_cron
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-04-29
--
-- Background: Vercel Hobby plan limits cron to once-per-day. The order
-- completion hook needs to run every 15 minutes for instant gratification.
-- We already have Supabase Pro + pg_cron + pg_net available, so we move this
-- specific cron there. The HTTP endpoint stays in Next.js (no logic change),
-- pg_cron just dispatches the trigger.
--
-- Note: managed Supabase does NOT allow ALTER DATABASE postgres SET ...
-- (requires superuser), so we use Supabase Vault to store secrets.
--
-- ═══════════════════════════════════════════════════════════════════════════════
-- ⚠️  ONE-TIME SETUP REQUIRED  (run in Supabase SQL Editor as project owner)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- BEFORE running this migration, store two secrets in Supabase Vault:
--
--   SELECT vault.create_secret(
--     'https://YOUR-VERCEL-URL',     -- secret value (no trailing slash)
--     'engezna_app_url',              -- secret name
--     'Production base URL for cron HTTP dispatch'
--   );
--
--   SELECT vault.create_secret(
--     'YOUR-CRON-SECRET',             -- same value as Vercel CRON_SECRET env var
--     'engezna_cron_secret',
--     'Bearer token validated by /api/cron/* routes'
--   );
--
-- To rotate later:
--   UPDATE vault.secrets
--   SET secret = 'new_value'
--   WHERE name = 'engezna_cron_secret';
--
-- To list:
--   SELECT name, description, created_at FROM vault.secrets;
-- ═══════════════════════════════════════════════════════════════════════════════


-- Ensure required extensions are present (no-ops if already installed)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ Wrapper function — pulls Vault secrets, dispatches the HTTP request          ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.trigger_process_completed_orders()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
  v_url      TEXT;
  v_secret   TEXT;
  v_endpoint TEXT;
  v_req_id   BIGINT;
BEGIN
  -- Read both secrets from Vault. vault.decrypted_secrets is a view that
  -- decrypts on read; access is restricted by Vault's own RLS.
  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets
  WHERE name = 'engezna_app_url'
  LIMIT 1;

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'engezna_cron_secret'
  LIMIT 1;

  IF v_url IS NULL OR v_url = '' THEN
    RAISE WARNING '[trigger_process_completed_orders] vault secret engezna_app_url not found; skipping run';
    RETURN NULL;
  END IF;

  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE WARNING '[trigger_process_completed_orders] vault secret engezna_cron_secret not found; skipping run';
    RETURN NULL;
  END IF;

  v_endpoint := v_url || '/api/cron/process-completed-orders';

  SELECT net.http_post(
    url := v_endpoint,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) INTO v_req_id;

  RAISE LOG '[trigger_process_completed_orders] queued request_id=%', v_req_id;
  RETURN v_req_id;
END;
$$;

REVOKE ALL ON FUNCTION public.trigger_process_completed_orders() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trigger_process_completed_orders() FROM anon;
REVOKE ALL ON FUNCTION public.trigger_process_completed_orders() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_process_completed_orders() TO postgres;
GRANT EXECUTE ON FUNCTION public.trigger_process_completed_orders() TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ Schedule the cron job (idempotent — unschedules existing first if present)  ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron extension not available; skipping schedule';
    RETURN;
  END IF;

  -- Drop any existing schedule with the same name (idempotent)
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-completed-orders') THEN
    PERFORM cron.unschedule('process-completed-orders');
  END IF;

  -- Schedule for every 15 minutes
  PERFORM cron.schedule(
    'process-completed-orders',
    '*/15 * * * *',
    $cron$SELECT public.trigger_process_completed_orders();$cron$
  );

  RAISE NOTICE 'Scheduled process-completed-orders cron every 15 minutes';
END;
$$;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ Verification queries (uncomment in SQL Editor if you want to confirm)        ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
--
-- -- Confirm Vault secrets exist
-- SELECT name, description, created_at FROM vault.secrets
-- WHERE name IN ('engezna_app_url', 'engezna_cron_secret');
--
-- -- Sanity-test the wrapper manually (returns the pg_net request id)
-- SELECT public.trigger_process_completed_orders();
--
-- -- List the scheduled job
-- SELECT jobid, jobname, schedule, active, command
-- FROM cron.job WHERE jobname = 'process-completed-orders';
--
-- -- Check recent runs (after 15+ minutes)
-- SELECT runid, jobid, status, return_message, start_time, end_time
-- FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-completed-orders')
-- ORDER BY start_time DESC
-- LIMIT 10;
--
-- -- Inspect pg_net responses
-- SELECT id, status, status_code, content_type
-- FROM net._http_response
-- ORDER BY id DESC LIMIT 10;

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
-- ═══════════════════════════════════════════════════════════════════════════════
-- ⚠️  ONE-TIME SETUP REQUIRED  (run in Supabase SQL Editor as superuser)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- BEFORE running this migration, configure two database-level settings:
--
--   ALTER DATABASE postgres SET app.settings.app_url TO 'https://YOUR-VERCEL-URL';
--   ALTER DATABASE postgres SET app.settings.cron_secret TO 'YOUR-CRON-SECRET';
--
-- - `app_url` should match the production URL of the Next.js app
--   (no trailing slash). Example: https://engezna.vercel.app
-- - `cron_secret` must be the SAME value as the CRON_SECRET env var on Vercel
--   so the endpoint will accept the request.
--
-- After ALTER DATABASE you may need a brief connection cycle for pg_cron's
-- worker to pick up the new settings.
-- ═══════════════════════════════════════════════════════════════════════════════


-- Ensure required extensions are present (no-ops if already installed)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ Wrapper function — keeps the cron schedule readable + central error handling ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Reads URL + secret from current_setting() (set via ALTER DATABASE above).
-- Returns the pg_net request id so cron.job_run_details captures it on failure.

CREATE OR REPLACE FUNCTION public.trigger_process_completed_orders()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url      TEXT;
  v_secret   TEXT;
  v_endpoint TEXT;
  v_req_id   BIGINT;
BEGIN
  v_url := current_setting('app.settings.app_url', true);
  v_secret := current_setting('app.settings.cron_secret', true);

  IF v_url IS NULL OR v_url = '' THEN
    RAISE WARNING '[trigger_process_completed_orders] app.settings.app_url not configured; skipping run';
    RETURN NULL;
  END IF;

  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE WARNING '[trigger_process_completed_orders] app.settings.cron_secret not configured; skipping run';
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
-- -- Inspect pg_net requests that were dispatched
-- SELECT id, status, status_code, content_type
-- FROM net._http_response
-- ORDER BY id DESC LIMIT 10;

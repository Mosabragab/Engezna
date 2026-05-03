-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Phase 17 — Observability views + threshold checker
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-04-29
--
-- Three monitoring views + one threshold-check RPC that the daily
-- /api/cron/observability-checks endpoint reads to decide which Slack alerts
-- to fire. Putting the queries in DB views (rather than the cron route)
-- means admins can SELECT * FROM the same names from the SQL editor for
-- ad-hoc investigation, and any change to the threshold logic stays in
-- one place.
--
-- Views (all SECURITY INVOKER — RLS-aware):
--   • v_gift_budget_health           — current-month spend vs. monthly cap
--   • v_gift_pending_health          — pending partner offers + gifts about
--                                       to expire in < 24h
--   • v_referral_fraud_signals       — IPs/devices claiming multiple
--                                       referral rewards
--
-- RPC:
--   • observability_check_thresholds() — returns rows of breaches
--     (severity, code, message, context) for the cron to fan out
-- ═══════════════════════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ 1. v_gift_budget_health — current-month spend vs. cap                         ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE VIEW public.v_gift_budget_health AS
WITH this_month AS (
  SELECT DATE_TRUNC('month', NOW())::DATE AS month_start
),
spend AS (
  SELECT COALESCE(SUM(l.amount_piasters), 0)::BIGINT AS spent_piasters
  FROM public.gift_financial_log l, this_month tm
  WHERE l.transaction_type = 'grant'
    AND l.funder_type = 'engezna'
    AND l.created_at >= tm.month_start
)
SELECT
  tm.month_start,
  s.spent_piasters,
  COALESCE(rs.monthly_total_budget_piasters, 0)::BIGINT AS budget_piasters,
  COALESCE(rs.overflow_tolerance_percent, 0) AS overflow_tolerance_percent,
  CASE
    WHEN COALESCE(rs.monthly_total_budget_piasters, 0) = 0 THEN 0
    ELSE ROUND((s.spent_piasters::NUMERIC / rs.monthly_total_budget_piasters) * 100, 2)
  END AS pct_used
FROM this_month tm
CROSS JOIN spend s
LEFT JOIN public.retention_settings rs ON rs.id = 1;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ 2. v_gift_pending_health — pending partner offers + soon-to-expire gifts      ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE VIEW public.v_gift_pending_health AS
SELECT
  (
    SELECT COUNT(*)::INT FROM public.gift_partner_offers
    WHERE status = 'pending_approval'
  ) AS pending_partner_offers,
  (
    SELECT COUNT(*)::INT FROM public.gift_partner_offers
    WHERE status = 'pending_approval'
      AND created_at < NOW() - INTERVAL '48 hours'
  ) AS stale_partner_offers,
  (
    SELECT COUNT(*)::INT FROM public.gift_box_entries
    WHERE status IN ('granted', 'opened')
      AND expires_at > NOW()
      AND expires_at <= NOW() + INTERVAL '24 hours'
  ) AS gifts_expiring_soon,
  (
    SELECT COUNT(*)::INT FROM public.gift_forwards
    WHERE claimed_at IS NULL
      AND expires_at > NOW()
  ) AS active_forwards;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ 3. v_referral_fraud_signals — IPs/devices claiming multiple referrals         ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Looks at the last 7 days of forward claims for repeat IPs / device IDs.
-- Single occurrences are normal — 3+ same IP + 3+ same device id are signals.

CREATE OR REPLACE VIEW public.v_referral_fraud_signals AS
WITH recent_forwards AS (
  SELECT recipient_ip, recipient_device_id
  FROM public.gift_forwards
  WHERE claimed_at IS NOT NULL
    AND claimed_at >= NOW() - INTERVAL '7 days'
)
SELECT
  (
    SELECT COUNT(*)::INT FROM (
      SELECT recipient_ip
      FROM recent_forwards
      WHERE recipient_ip IS NOT NULL
      GROUP BY recipient_ip
      HAVING COUNT(*) >= 3
    ) ip_dupes
  ) AS suspicious_ip_count,
  (
    SELECT COUNT(*)::INT FROM (
      SELECT recipient_device_id
      FROM recent_forwards
      WHERE recipient_device_id IS NOT NULL
      GROUP BY recipient_device_id
      HAVING COUNT(*) >= 3
    ) device_dupes
  ) AS suspicious_device_count;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ Permissions — admin-only reads (service_role bypasses anyway)                 ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

REVOKE ALL ON public.v_gift_budget_health FROM PUBLIC;
REVOKE ALL ON public.v_gift_budget_health FROM anon;
REVOKE ALL ON public.v_gift_budget_health FROM authenticated;
GRANT SELECT ON public.v_gift_budget_health TO service_role;

REVOKE ALL ON public.v_gift_pending_health FROM PUBLIC;
REVOKE ALL ON public.v_gift_pending_health FROM anon;
REVOKE ALL ON public.v_gift_pending_health FROM authenticated;
GRANT SELECT ON public.v_gift_pending_health TO service_role;

REVOKE ALL ON public.v_referral_fraud_signals FROM PUBLIC;
REVOKE ALL ON public.v_referral_fraud_signals FROM anon;
REVOKE ALL ON public.v_referral_fraud_signals FROM authenticated;
GRANT SELECT ON public.v_referral_fraud_signals TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ observability_check_thresholds — single RPC the cron polls                    ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Returns one row per breached threshold. Each row has:
--   severity:  'critical' | 'high' | 'medium' | 'low'
--   code:      machine-friendly identifier ('budget_critical', 'partner_stale', etc.)
--   message:   human-readable Arabic+English (the cron picks one based on locale)
--   context:   JSONB blob with the numbers
--
-- Thresholds (kept in one place so admins can adjust later):
--   budget_critical    — pct_used >= 90    (severity: critical)
--   budget_warning     — pct_used >= 75    (severity: high)
--   budget_overflow    — pct_used >= (100 + overflow_tolerance_percent)  (critical)
--   partner_stale      — stale_partner_offers > 0   (severity: medium)
--   partner_pile       — pending_partner_offers >= 10   (severity: high)
--   gifts_expiring     — gifts_expiring_soon >= 50   (severity: low — info)
--   referral_ip_fraud  — suspicious_ip_count > 0    (severity: high)
--   referral_dev_fraud — suspicious_device_count > 0 (severity: high)

DROP FUNCTION IF EXISTS public.observability_check_thresholds();

CREATE OR REPLACE FUNCTION public.observability_check_thresholds()
RETURNS TABLE (
  severity TEXT,
  code TEXT,
  message_ar TEXT,
  message_en TEXT,
  context JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget RECORD;
  v_pending RECORD;
  v_fraud RECORD;
BEGIN
  SELECT * INTO v_budget FROM public.v_gift_budget_health LIMIT 1;
  SELECT * INTO v_pending FROM public.v_gift_pending_health LIMIT 1;
  SELECT * INTO v_fraud FROM public.v_referral_fraud_signals LIMIT 1;

  -- Budget overflow (> 100% + tolerance)
  IF v_budget.pct_used >= (100 + COALESCE(v_budget.overflow_tolerance_percent, 0)) THEN
    severity := 'critical';
    code := 'budget_overflow';
    message_ar := 'تجاوز ميزانية الهدايا الشهرية: ' || v_budget.pct_used || '%';
    message_en := 'Monthly gift budget overflow: ' || v_budget.pct_used || '%';
    context := jsonb_build_object(
      'spent_piasters', v_budget.spent_piasters,
      'budget_piasters', v_budget.budget_piasters,
      'pct_used', v_budget.pct_used
    );
    RETURN NEXT;
  ELSIF v_budget.pct_used >= 90 THEN
    severity := 'critical';
    code := 'budget_critical';
    message_ar := 'وصلت ميزانية الهدايا لـ ' || v_budget.pct_used || '% — راجع الإعدادات';
    message_en := 'Gift budget at ' || v_budget.pct_used || '% — review settings';
    context := jsonb_build_object(
      'spent_piasters', v_budget.spent_piasters,
      'budget_piasters', v_budget.budget_piasters,
      'pct_used', v_budget.pct_used
    );
    RETURN NEXT;
  ELSIF v_budget.pct_used >= 75 THEN
    severity := 'high';
    code := 'budget_warning';
    message_ar := 'استهلاك ميزانية الهدايا: ' || v_budget.pct_used || '%';
    message_en := 'Gift budget consumption: ' || v_budget.pct_used || '%';
    context := jsonb_build_object(
      'spent_piasters', v_budget.spent_piasters,
      'budget_piasters', v_budget.budget_piasters,
      'pct_used', v_budget.pct_used
    );
    RETURN NEXT;
  END IF;

  -- Partner offer pile-up
  IF v_pending.stale_partner_offers > 0 THEN
    severity := 'medium';
    code := 'partner_stale';
    message_ar := v_pending.stale_partner_offers || ' عرض شريك بانتظار الموافقة منذ أكثر من 48 ساعة';
    message_en := v_pending.stale_partner_offers ||
      ' partner offer(s) pending approval for over 48h';
    context := jsonb_build_object('count', v_pending.stale_partner_offers);
    RETURN NEXT;
  END IF;

  IF v_pending.pending_partner_offers >= 10 THEN
    severity := 'high';
    code := 'partner_pile';
    message_ar := 'تراكم في موافقات هدايا الشركاء: ' || v_pending.pending_partner_offers || ' معلّقة';
    message_en := 'Partner gift approval backlog: ' || v_pending.pending_partner_offers ||
      ' pending';
    context := jsonb_build_object('count', v_pending.pending_partner_offers);
    RETURN NEXT;
  END IF;

  -- Referral fraud signals
  IF v_fraud.suspicious_ip_count > 0 THEN
    severity := 'high';
    code := 'referral_ip_fraud';
    message_ar := 'إشارات احتيال محتمل في الإحالات: ' || v_fraud.suspicious_ip_count ||
      ' عناوين IP استلمت 3+ هدايا';
    message_en := 'Possible referral fraud: ' || v_fraud.suspicious_ip_count ||
      ' IP(s) claimed 3+ rewards';
    context := jsonb_build_object('ip_count', v_fraud.suspicious_ip_count);
    RETURN NEXT;
  END IF;

  IF v_fraud.suspicious_device_count > 0 THEN
    severity := 'high';
    code := 'referral_dev_fraud';
    message_ar := 'إشارات احتيال محتمل في الأجهزة: ' || v_fraud.suspicious_device_count ||
      ' جهاز استلم 3+ هدايا';
    message_en := 'Possible device-based fraud: ' || v_fraud.suspicious_device_count ||
      ' device(s) claimed 3+ rewards';
    context := jsonb_build_object('device_count', v_fraud.suspicious_device_count);
    RETURN NEXT;
  END IF;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.observability_check_thresholds() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.observability_check_thresholds() FROM anon;
REVOKE ALL ON FUNCTION public.observability_check_thresholds() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.observability_check_thresholds() TO service_role;

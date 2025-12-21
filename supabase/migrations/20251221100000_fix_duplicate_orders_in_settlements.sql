-- ============================================================================
-- Fix: Remove duplicate orders from settlements and recalculate totals
-- إصلاح: إزالة الطلبات المكررة من التسويات وإعادة حساب الإجماليات
-- ============================================================================
-- Date: 2025-12-21
-- Issue: Some orders are included in multiple settlements due to a bug
--        that was fixed in the frontend code. This migration cleans up
--        existing duplicate data.
-- ============================================================================

-- IMPORTANT: This migration handles a data integrity issue where orders
-- were incorrectly added to multiple settlements.

-- Step 1: Create a temporary table to identify the first settlement for each order
CREATE TEMP TABLE first_settlement_per_order AS
WITH ordered_settlements AS (
  SELECT
    s.id as settlement_id,
    s.provider_id,
    s.created_at,
    unnest(s.orders_included) as order_id,
    ROW_NUMBER() OVER (
      PARTITION BY unnest(s.orders_included)
      ORDER BY s.created_at ASC
    ) as rn
  FROM settlements s
  WHERE s.orders_included IS NOT NULL
)
SELECT settlement_id, order_id
FROM ordered_settlements
WHERE rn = 1;

-- Step 2: Create a temporary table with correct orders_included for each settlement
CREATE TEMP TABLE corrected_settlements AS
SELECT
  s.id as settlement_id,
  s.provider_id,
  ARRAY_AGG(DISTINCT fso.order_id) as correct_orders_included
FROM settlements s
JOIN first_settlement_per_order fso ON fso.settlement_id = s.id
GROUP BY s.id, s.provider_id;

-- Step 3: Log settlements that will be updated (for audit purposes)
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO affected_count
  FROM settlements s
  JOIN corrected_settlements cs ON s.id = cs.settlement_id
  WHERE s.orders_included != cs.correct_orders_included
     OR array_length(s.orders_included, 1) != array_length(cs.correct_orders_included, 1);

  RAISE NOTICE 'Settlements that will be updated: %', affected_count;
END $$;

-- Step 4: Update settlements with corrected orders_included and recalculate totals
UPDATE settlements s
SET
  orders_included = cs.correct_orders_included,
  total_orders = array_length(cs.correct_orders_included, 1),
  -- Recalculate gross_revenue from orders
  gross_revenue = (
    SELECT COALESCE(SUM(o.total), 0)
    FROM orders o
    WHERE o.id = ANY(cs.correct_orders_included)
  ),
  -- Recalculate platform_commission based on provider's rate
  platform_commission = (
    SELECT COALESCE(SUM(o.total), 0) * COALESCE(p.commission_rate / 100, 0.07)
    FROM orders o, providers p
    WHERE o.id = ANY(cs.correct_orders_included)
    AND p.id = s.provider_id
  ),
  updated_at = NOW()
FROM corrected_settlements cs
WHERE s.id = cs.settlement_id
AND (
  s.orders_included != cs.correct_orders_included
  OR array_length(s.orders_included, 1) != array_length(cs.correct_orders_included, 1)
);

-- Step 5: Delete settlements that now have empty orders_included
-- (all their orders were duplicates that belong to earlier settlements)
DELETE FROM settlements
WHERE orders_included IS NULL
   OR array_length(orders_included, 1) = 0
   OR orders_included = '{}';

-- Step 6: Recalculate net_payout for all affected settlements
UPDATE settlements s
SET
  net_payout = gross_revenue - platform_commission,
  updated_at = NOW()
WHERE updated_at > NOW() - INTERVAL '1 minute';

-- Clean up temporary tables
DROP TABLE IF EXISTS first_settlement_per_order;
DROP TABLE IF EXISTS corrected_settlements;

-- Step 7: Verify fix - show any remaining duplicates
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  WITH order_counts AS (
    SELECT
      unnest(orders_included) as order_id,
      COUNT(*) as times_included
    FROM settlements
    GROUP BY 1
  )
  SELECT COUNT(*) INTO duplicate_count
  FROM order_counts
  WHERE times_included > 1;

  IF duplicate_count > 0 THEN
    RAISE WARNING 'Warning: Still % orders in multiple settlements after fix', duplicate_count;
  ELSE
    RAISE NOTICE 'Success: No duplicate orders in settlements';
  END IF;
END $$;

-- ============================================================================
-- Summary of changes:
-- 1. Identified orders that appear in multiple settlements
-- 2. Kept each order only in its FIRST settlement (by created_at)
-- 3. Recalculated gross_revenue and platform_commission for affected settlements
-- 4. Deleted any settlements that became empty after removing duplicates
-- ============================================================================

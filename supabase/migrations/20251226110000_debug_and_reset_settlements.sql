-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Debug and Reset Settlements
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2025-12-26
-- Purpose: Debug settlements data and provide reset functionality
-- ═══════════════════════════════════════════════════════════════════════════════

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ DEBUG QUERIES (Run these manually to diagnose)                                ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- View all settlements with provider info
-- SELECT
--   s.id,
--   s.provider_id,
--   p.name_ar AS provider_name,
--   s.status,
--   s.total_orders,
--   s.gross_revenue,
--   s.platform_commission,
--   s.orders_included,
--   s.created_at
-- FROM settlements s
-- LEFT JOIN providers p ON s.provider_id = p.id
-- ORDER BY s.created_at DESC;

-- Check orders and their settlement status
-- SELECT
--   o.id,
--   o.order_number,
--   o.provider_id,
--   p.name_ar AS provider_name,
--   o.status,
--   o.settlement_status,
--   o.total,
--   o.platform_commission,
--   o.created_at
-- FROM orders o
-- LEFT JOIN providers p ON o.provider_id = p.id
-- WHERE o.status = 'delivered'
-- ORDER BY o.created_at DESC;

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ RESET FUNCTION: Call this to reset all settlements                            ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION reset_all_settlements()
RETURNS TEXT AS $$
DECLARE
  v_settlements_deleted INTEGER;
  v_orders_reset INTEGER;
BEGIN
  -- Disable triggers temporarily
  ALTER TABLE settlements DISABLE TRIGGER ALL;

  -- Count and delete all settlements
  SELECT COUNT(*) INTO v_settlements_deleted FROM settlements;
  DELETE FROM settlements;

  -- Re-enable triggers
  ALTER TABLE settlements ENABLE TRIGGER ALL;

  -- Reset all delivered orders to eligible
  UPDATE orders
  SET settlement_status = 'eligible'
  WHERE status = 'delivered';

  GET DIAGNOSTICS v_orders_reset = ROW_COUNT;

  RETURN format('Deleted %s settlements, Reset %s orders to eligible',
                v_settlements_deleted, v_orders_reset);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION reset_all_settlements() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_all_settlements() TO service_role;

COMMENT ON FUNCTION reset_all_settlements IS
'Resets all settlements by deleting them and marking orders as eligible for settlement.
Use with caution - this is for development/testing only!';

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ VERIFY RLS POLICIES                                                           ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- Make sure settlements can be read by admins
DO $$
BEGIN
  -- Drop existing policies if any
  DROP POLICY IF EXISTS "Admin can view all settlements" ON settlements;
  DROP POLICY IF EXISTS "Admin can manage settlements" ON settlements;
  DROP POLICY IF EXISTS "Providers can view own settlements" ON settlements;

  -- Create policies
  CREATE POLICY "Admin can view all settlements" ON settlements
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );

  CREATE POLICY "Admin can manage settlements" ON settlements
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );

  CREATE POLICY "Providers can view own settlements" ON settlements
    FOR SELECT
    TO authenticated
    USING (
      provider_id IN (
        SELECT id FROM providers
        WHERE owner_id = auth.uid()
      )
    );

EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Policies already exist
END $$;

-- Enable RLS on settlements if not already
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- Allow direct pending → preparing transition
-- ═══════════════════════════════════════════════════════════════════════════
-- The order tracker UX was simplified to merge "Accepted" + "Preparing" into
-- a single step. The provider's "Accept Order" button now writes
-- status='preparing' directly, stamping both accepted_at and preparing_at in
-- the same atomic UPDATE so the audit trail is preserved.
--
-- The status-transition guard installed by 20260226000001_create_order_atomic
-- explicitly disallowed that jump (pending was only allowed to move to
-- accepted/cancelled/rejected). It has to be relaxed for the merged flow,
-- otherwise every "Accept" click fails with HTTP 400 from the trigger:
--
--   ERROR: Invalid status transition: pending → preparing
--
-- Backwards compatibility:
--   - 'pending → accepted' stays valid (legacy code paths and any orders
--     already sitting in 'accepted' must still be advanceable).
--   - All other transitions are unchanged.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.guard_order_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Skip if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Valid transitions (using actual DB enum values)
  -- pending → accepted, preparing, cancelled, rejected   ← preparing added
  -- pending_payment → pending, cancelled
  -- accepted → preparing, cancelled
  -- preparing → ready, cancelled
  -- ready → out_for_delivery, delivered, cancelled       (delivered for pickup)
  -- out_for_delivery → delivered, cancelled
  -- delivered → refunded
  -- cancelled → refunded
  -- refunded → (terminal state)
  -- rejected → (terminal state)

  IF NOT (
    (OLD.status = 'pending' AND NEW.status IN ('accepted', 'preparing', 'cancelled', 'rejected')) OR
    (OLD.status = 'pending_payment' AND NEW.status IN ('pending', 'cancelled')) OR
    (OLD.status = 'accepted' AND NEW.status IN ('preparing', 'cancelled')) OR
    (OLD.status = 'preparing' AND NEW.status IN ('ready', 'cancelled')) OR
    (OLD.status = 'ready' AND NEW.status IN ('out_for_delivery', 'delivered', 'cancelled')) OR
    (OLD.status = 'out_for_delivery' AND NEW.status IN ('delivered', 'cancelled')) OR
    (OLD.status = 'delivered' AND NEW.status IN ('refunded')) OR
    (OLD.status = 'cancelled' AND NEW.status IN ('refunded'))
  ) THEN
    RAISE EXCEPTION 'Invalid status transition: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_order_status_transition() IS
'Enforces the order status transition graph. Includes the merged accept+
preparing path (pending → preparing) introduced when the provider tracker
collapsed those two visible steps into one button.';

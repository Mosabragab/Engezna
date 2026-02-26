-- ============================================================================
-- Atomic Order Creation RPC
-- ============================================================================
-- Solves: Non-atomic checkout where order, items, and promo operations
-- are separate DB calls that can partially fail, creating orphan orders.
--
-- This function wraps order + items + promo in a single PostgreSQL transaction.
-- If any step fails, the entire operation rolls back automatically.
--
-- Also adds:
-- 1. Server-side price validation (prevents client-side price manipulation)
-- 2. Idempotency key (prevents double-submit creating duplicate orders)
-- 3. Status transition guard on order updates
-- ============================================================================

-- 1. Idempotency key column
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key UUID;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
  ON public.orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 2. Atomic order creation RPC
CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_idempotency_key UUID,
  p_customer_id UUID,
  p_provider_id UUID,
  p_subtotal DECIMAL(10,2),
  p_delivery_fee DECIMAL(10,2),
  p_discount DECIMAL(10,2),
  p_total DECIMAL(10,2),
  p_payment_method TEXT,
  p_payment_status TEXT DEFAULT 'pending',
  p_order_type TEXT DEFAULT 'delivery',
  p_delivery_timing TEXT DEFAULT 'asap',
  p_scheduled_time TIMESTAMPTZ DEFAULT NULL,
  p_delivery_address JSONB DEFAULT NULL,
  p_customer_notes TEXT DEFAULT NULL,
  p_estimated_delivery_time TIMESTAMPTZ DEFAULT NULL,
  p_promo_code TEXT DEFAULT NULL,
  p_promo_code_id UUID DEFAULT NULL,
  p_promo_usage_count INT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_promo_usage_id UUID;
  v_item JSONB;
  v_computed_subtotal DECIMAL(10,2) := 0;
  v_item_price DECIMAL(10,2);
  v_item_total DECIMAL(10,2);
  v_menu_item RECORD;
  v_existing_order_id UUID;
BEGIN
  -- ======================================================================
  -- STEP 0: Idempotency check — return existing order if key already used
  -- ======================================================================
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_order_id
    FROM orders
    WHERE idempotency_key = p_idempotency_key;

    IF v_existing_order_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'order_id', v_existing_order_id,
        'idempotent', true
      );
    END IF;
  END IF;

  -- ======================================================================
  -- STEP 1: Server-side price validation
  -- Verify each item's price matches the current DB price
  -- ======================================================================
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Look up the actual price from menu_items (or product_variants if variant)
    IF (v_item->>'variant_id') IS NOT NULL AND (v_item->>'variant_id') != '' THEN
      SELECT pv.price INTO v_item_price
      FROM product_variants pv
      WHERE pv.id = (v_item->>'variant_id')::UUID;
    ELSE
      SELECT mi.price INTO v_item_price
      FROM menu_items mi
      WHERE mi.id = (v_item->>'item_id')::UUID;
    END IF;

    IF v_item_price IS NULL THEN
      RAISE EXCEPTION 'Menu item not found: %', v_item->>'item_id';
    END IF;

    -- Verify the client-submitted price matches (allow 0.01 tolerance for rounding)
    IF ABS(v_item_price - (v_item->>'unit_price')::DECIMAL) > 0.01 THEN
      RAISE EXCEPTION 'Price mismatch for item %: expected %, got %',
        v_item->>'item_id', v_item_price, v_item->>'unit_price';
    END IF;

    v_item_total := v_item_price * (v_item->>'quantity')::INT;
    v_computed_subtotal := v_computed_subtotal + v_item_total;
  END LOOP;

  -- Verify computed subtotal matches client subtotal (allow 0.01 tolerance)
  IF ABS(v_computed_subtotal - p_subtotal) > 0.01 THEN
    RAISE EXCEPTION 'Subtotal mismatch: computed %, submitted %',
      v_computed_subtotal, p_subtotal;
  END IF;

  -- ======================================================================
  -- STEP 2: Promo code — atomically increment usage with optimistic lock
  -- ======================================================================
  IF p_promo_code_id IS NOT NULL AND p_promo_usage_count IS NOT NULL THEN
    UPDATE promo_codes
    SET usage_count = usage_count + 1
    WHERE id = p_promo_code_id
      AND usage_count = p_promo_usage_count;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Promo code was just used by someone else. Please try again.';
    END IF;
  END IF;

  -- ======================================================================
  -- STEP 3: Create the order
  -- ======================================================================
  INSERT INTO orders (
    idempotency_key,
    customer_id,
    provider_id,
    status,
    subtotal,
    delivery_fee,
    discount,
    total,
    payment_method,
    payment_status,
    order_type,
    delivery_timing,
    scheduled_time,
    delivery_address,
    customer_notes,
    estimated_delivery_time,
    promo_code
  )
  VALUES (
    p_idempotency_key,
    p_customer_id,
    p_provider_id,
    CASE WHEN p_payment_method = 'cash' THEN 'pending' ELSE 'pending_payment' END,
    v_computed_subtotal,  -- Use server-validated subtotal
    p_delivery_fee,
    p_discount,
    v_computed_subtotal + p_delivery_fee - p_discount,  -- Server-computed total
    p_payment_method::payment_method,
    p_payment_status::payment_status,
    p_order_type::order_type,
    p_delivery_timing::delivery_timing,
    p_scheduled_time,
    p_delivery_address,
    p_customer_notes,
    p_estimated_delivery_time,
    p_promo_code
  )
  RETURNING id INTO v_order_id;

  -- ======================================================================
  -- STEP 4: Create order items with server-validated prices
  -- ======================================================================
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Re-fetch the actual price for the insert
    IF (v_item->>'variant_id') IS NOT NULL AND (v_item->>'variant_id') != '' THEN
      SELECT pv.price INTO v_item_price
      FROM product_variants pv
      WHERE pv.id = (v_item->>'variant_id')::UUID;
    ELSE
      SELECT mi.price INTO v_item_price
      FROM menu_items mi
      WHERE mi.id = (v_item->>'item_id')::UUID;
    END IF;

    v_item_total := v_item_price * (v_item->>'quantity')::INT;

    INSERT INTO order_items (
      order_id,
      menu_item_id,
      item_name_ar,
      item_name_en,
      item_price,
      quantity,
      unit_price,
      total_price,
      variant_id,
      variant_name_ar,
      variant_name_en
    )
    VALUES (
      v_order_id,
      (v_item->>'item_id')::UUID,
      v_item->>'item_name_ar',
      v_item->>'item_name_en',
      v_item_price,
      (v_item->>'quantity')::INT,
      v_item_price,
      v_item_total,
      NULLIF(v_item->>'variant_id', '')::UUID,
      v_item->>'variant_name_ar',
      v_item->>'variant_name_en'
    );
  END LOOP;

  -- ======================================================================
  -- STEP 5: Record promo code usage (linked to the order)
  -- ======================================================================
  IF p_promo_code_id IS NOT NULL THEN
    INSERT INTO promo_code_usage (
      promo_code_id,
      user_id,
      order_id,
      discount_amount
    )
    VALUES (
      p_promo_code_id,
      p_customer_id,
      v_order_id,
      p_discount
    );
  END IF;

  -- ======================================================================
  -- All steps succeeded — transaction commits automatically
  -- ======================================================================
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'idempotent', false,
    'validated_subtotal', v_computed_subtotal,
    'validated_total', v_computed_subtotal + p_delivery_fee - p_discount
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Transaction automatically rolls back all changes
    RAISE;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_order_atomic TO authenticated;

-- ============================================================================
-- 3. Status Transition Guard
-- ============================================================================
-- Prevents invalid status transitions (e.g., delivered → pending)
-- Valid transitions defined in the trigger function

CREATE OR REPLACE FUNCTION public.guard_order_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Skip if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  -- pending → confirmed, cancelled
  -- pending_payment → pending, cancelled
  -- confirmed → preparing, cancelled
  -- preparing → ready, cancelled
  -- ready → delivering, delivered, cancelled (delivered for pickup)
  -- delivering → delivered, cancelled
  -- delivered → refunded
  -- cancelled → (terminal state, no transitions)
  -- refunded → (terminal state, no transitions)

  IF NOT (
    (OLD.status = 'pending' AND NEW.status IN ('confirmed', 'cancelled')) OR
    (OLD.status = 'pending_payment' AND NEW.status IN ('pending', 'cancelled')) OR
    (OLD.status = 'confirmed' AND NEW.status IN ('preparing', 'cancelled')) OR
    (OLD.status = 'preparing' AND NEW.status IN ('ready', 'cancelled')) OR
    (OLD.status = 'ready' AND NEW.status IN ('delivering', 'delivered', 'cancelled')) OR
    (OLD.status = 'delivering' AND NEW.status IN ('delivered', 'cancelled')) OR
    (OLD.status = 'delivered' AND NEW.status IN ('refunded'))
  ) THEN
    RAISE EXCEPTION 'Invalid status transition: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger (drop first if exists)
DROP TRIGGER IF EXISTS trg_guard_order_status_transition ON public.orders;
CREATE TRIGGER trg_guard_order_status_transition
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_order_status_transition();

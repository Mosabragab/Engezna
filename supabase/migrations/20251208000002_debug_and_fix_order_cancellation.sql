-- ============================================================================
-- Debug and Fix Order Cancellation Function
-- ============================================================================

-- First, let's create a debug function to see what's happening
CREATE OR REPLACE FUNCTION public.debug_customer_orders(p_customer_id UUID)
RETURNS TABLE (
  order_id UUID,
  order_number TEXT,
  order_status TEXT,
  order_customer_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT id, order_number, status, customer_id
  FROM orders
  WHERE customer_id = p_customer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_customer_orders(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_customer_orders(UUID) TO service_role;

-- Now let's recreate the cancel function with better logging
DROP FUNCTION IF EXISTS public.cancel_orders_for_banned_customer(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.cancel_orders_for_banned_customer(
  p_customer_id UUID,
  p_reason TEXT DEFAULT 'تم إلغاء الطلب بسبب حظر العميل'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_cancelled_count INTEGER := 0;
  v_total_orders INTEGER := 0;
  v_active_orders INTEGER := 0;
BEGIN
  -- Count total orders for this customer
  SELECT COUNT(*) INTO v_total_orders FROM orders WHERE customer_id = p_customer_id;

  -- Count active orders
  SELECT COUNT(*) INTO v_active_orders
  FROM orders
  WHERE customer_id = p_customer_id
  AND status IN ('pending', 'confirmed', 'accepted', 'preparing', 'ready');

  -- Loop through active orders and cancel them
  FOR v_order IN
    SELECT id, order_number, provider_id, total
    FROM orders
    WHERE customer_id = p_customer_id
    AND status IN ('pending', 'confirmed', 'accepted', 'preparing', 'ready')
  LOOP
    -- Cancel the order
    UPDATE orders
    SET
      status = 'cancelled',
      cancelled_at = NOW(),
      cancellation_reason = p_reason,
      updated_at = NOW()
    WHERE id = v_order.id;

    -- Create notification for provider
    INSERT INTO provider_notifications (
      provider_id,
      type,
      title_ar,
      title_en,
      body_ar,
      body_en,
      related_order_id,
      related_customer_id
    ) VALUES (
      v_order.provider_id,
      'order_cancelled',
      'تم إلغاء طلب بسبب حظر العميل',
      'Order Cancelled - Customer Banned',
      'تم إلغاء الطلب #' || v_order.order_number || ' بقيمة ' || v_order.total || ' ج.م بسبب حظر العميل. للاستفسار، تواصل مع إدارة إنجزنا.',
      'Order #' || v_order.order_number || ' (' || v_order.total || ' EGP) cancelled due to customer ban.',
      v_order.id,
      p_customer_id
    );

    v_cancelled_count := v_cancelled_count + 1;
  END LOOP;

  -- Return detailed result
  RETURN json_build_object(
    'success', true,
    'customer_id', p_customer_id,
    'total_orders_found', v_total_orders,
    'active_orders_found', v_active_orders,
    'cancelled_count', v_cancelled_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_orders_for_banned_customer(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_orders_for_banned_customer(UUID, TEXT) TO service_role;

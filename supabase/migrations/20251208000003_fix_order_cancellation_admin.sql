-- ============================================================================
-- Migration: Add Admin Update Policy and Fix Order Cancellation
-- إصلاح: إضافة صلاحية تحديث الطلبات للأدمن وإصلاح إلغاء الطلبات
-- ============================================================================
-- Date: 2025-12-08
-- Problem: Orders are not being cancelled when customer is banned
-- Root cause: No admin UPDATE policy exists for orders table
-- Fixed: Using correct order_status enum values (no 'confirmed' value)
-- ============================================================================

-- Step 1: Add admin UPDATE policy for orders
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;

CREATE POLICY "Admins can update all orders"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Step 2: Add admin DELETE policy for orders (for future use)
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;

CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Step 3: Grant service_role full access
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_items TO service_role;
GRANT ALL ON public.provider_notifications TO service_role;
GRANT ALL ON public.customer_notifications TO service_role;

-- Step 4: Create improved cancel function with SECURITY DEFINER
-- Using correct order_status enum values: pending, accepted, preparing, ready, out_for_delivery, delivered, cancelled, rejected
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
  SELECT COUNT(*) INTO v_total_orders
  FROM orders
  WHERE customer_id = p_customer_id;

  -- Count active orders that will be cancelled
  -- Note: Using correct enum values (no 'confirmed' in this enum)
  SELECT COUNT(*) INTO v_active_orders
  FROM orders
  WHERE customer_id = p_customer_id
  AND status IN ('pending', 'accepted', 'preparing', 'ready', 'out_for_delivery');

  -- If no active orders, return early with info
  IF v_active_orders = 0 THEN
    RETURN json_build_object(
      'success', true,
      'message', 'No active orders to cancel',
      'customer_id', p_customer_id,
      'total_orders_found', v_total_orders,
      'active_orders_found', 0,
      'cancelled_count', 0
    );
  END IF;

  -- Loop through active orders and cancel them one by one
  FOR v_order IN
    SELECT id, order_number, provider_id, total, status
    FROM orders
    WHERE customer_id = p_customer_id
    AND status IN ('pending', 'accepted', 'preparing', 'ready', 'out_for_delivery')
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
      'تم إلغاء الطلب #' || v_order.order_number || ' بقيمة ' || v_order.total || ' ج.م بسبب حظر العميل. للاستفسار، تواصل مع خدمة عملاء إنجزنا.',
      'Order #' || v_order.order_number || ' (' || v_order.total || ' EGP) cancelled due to customer ban.',
      v_order.id,
      p_customer_id
    );

    v_cancelled_count := v_cancelled_count + 1;
  END LOOP;

  -- Return detailed result
  RETURN json_build_object(
    'success', true,
    'message', 'Orders cancelled successfully',
    'customer_id', p_customer_id,
    'total_orders_found', v_total_orders,
    'active_orders_found', v_active_orders,
    'cancelled_count', v_cancelled_count
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'error_detail', SQLSTATE,
    'customer_id', p_customer_id
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.cancel_orders_for_banned_customer(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_orders_for_banned_customer(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_orders_for_banned_customer(UUID, TEXT) TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION public.cancel_orders_for_banned_customer IS
  'Cancels all active orders for a banned customer and notifies providers. Uses SECURITY DEFINER to bypass RLS.';

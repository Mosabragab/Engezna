-- ============================================================================
-- Migration: Create function to cancel orders when customer is banned
-- دالة: إلغاء الطلبات عند حظر العميل
-- ============================================================================
-- Date: 2025-12-08
-- Description:
--   Creates a SECURITY DEFINER function that can cancel orders and notify
--   providers when a customer is banned. This bypasses RLS policies.
-- ============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS public.cancel_orders_for_banned_customer(UUID, TEXT);

-- Function to cancel all active orders for a banned customer
CREATE OR REPLACE FUNCTION public.cancel_orders_for_banned_customer(
  p_customer_id UUID,
  p_reason TEXT DEFAULT 'تم إلغاء الطلب بسبب حظر العميل - Admin'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_cancelled_count INTEGER := 0;
  v_cancelled_orders JSON;
BEGIN
  -- First, always send notification to the banned customer
  INSERT INTO customer_notifications (
    customer_id,
    type,
    title_ar,
    title_en,
    body_ar,
    body_en
  ) VALUES (
    p_customer_id,
    'account_banned',
    'تم تعليق حسابك',
    'Account Suspended',
    'تم تعليق حسابك في إنجزنا. للاستفسار، يرجى التواصل مع خدمة عملاء إنجزنا.',
    'Your Engezna account has been suspended. For inquiries, please contact Engezna support.'
  );

  -- Loop through all active orders for this customer and cancel them
  FOR v_order IN
    SELECT id, order_number, provider_id, total
    FROM orders
    WHERE customer_id = p_customer_id
      AND status IN ('pending', 'confirmed', 'accepted', 'preparing', 'ready')
  LOOP
    -- Update the order to cancelled
    UPDATE orders
    SET
      status = 'cancelled',
      cancelled_at = NOW(),
      cancellation_reason = p_reason,
      updated_at = NOW()
    WHERE id = v_order.id;

    -- Create notification for the provider
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
      'Order #' || v_order.order_number || ' (' || v_order.total || ' EGP) has been cancelled due to customer ban. For inquiries, contact Engezna support.',
      v_order.id,
      p_customer_id
    );

    v_cancelled_count := v_cancelled_count + 1;
  END LOOP;

  -- Return result as JSON
  RETURN json_build_object(
    'success', true,
    'cancelled_count', v_cancelled_count,
    'customer_notified', true
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cancel_orders_for_banned_customer(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_orders_for_banned_customer(UUID, TEXT) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.cancel_orders_for_banned_customer IS
  'Cancels all active orders for a banned customer and sends notifications. Uses SECURITY DEFINER to bypass RLS.';

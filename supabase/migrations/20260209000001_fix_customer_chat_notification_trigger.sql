-- Fix: Customer chat message notification via database trigger
--
-- Problem: After security fixes (20260204000001), the INSERT policy on
-- customer_notifications was restricted to service_role only.
-- The OrderChat component was doing a client-side INSERT which is now
-- blocked by RLS. This caused provider→customer message notifications
-- to silently fail.
--
-- Solution: Create a database trigger (SECURITY DEFINER) that automatically
-- inserts a customer notification when a provider sends a message,
-- mirroring the existing notify_provider_new_message() trigger.

-- Function to create customer notification when provider sends a message
CREATE OR REPLACE FUNCTION notify_customer_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_order_number TEXT;
  v_provider_name TEXT;
  v_provider_id UUID;
BEGIN
  -- Only for provider messages
  IF NEW.sender_type = 'provider' THEN
    -- Get customer_id, order_number, and provider_id from orders table
    SELECT o.customer_id, o.order_number, o.provider_id
    INTO v_customer_id, v_order_number, v_provider_id
    FROM orders o
    WHERE o.id = NEW.order_id;

    -- Get provider/store name
    SELECT p.store_name INTO v_provider_name
    FROM providers p
    WHERE p.id = v_provider_id;

    IF v_customer_id IS NOT NULL THEN
      INSERT INTO customer_notifications (
        customer_id,
        type,
        title_ar,
        title_en,
        body_ar,
        body_en,
        related_order_id,
        related_provider_id
      ) VALUES (
        v_customer_id,
        'order_message',
        'رسالة جديدة من ' || COALESCE(v_provider_name, 'المتجر'),
        'New Message from ' || COALESCE(v_provider_name, 'Store'),
        COALESCE(v_provider_name, 'المتجر') || ': ' || LEFT(NEW.message, 50) || CASE WHEN LENGTH(NEW.message) > 50 THEN '...' ELSE '' END,
        COALESCE(v_provider_name, 'Store') || ': ' || LEFT(NEW.message, 50) || CASE WHEN LENGTH(NEW.message) > 50 THEN '...' ELSE '' END,
        NEW.order_id,
        v_provider_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on order_messages table
DROP TRIGGER IF EXISTS trigger_notify_customer_new_message ON order_messages;
CREATE TRIGGER trigger_notify_customer_new_message
  AFTER INSERT ON order_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_customer_new_message();

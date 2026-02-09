-- Fix: Use correct column names (name_ar/name_en) instead of non-existent store_name
--
-- The previous migration used p.store_name which doesn't exist in the providers table.
-- This caused the trigger to fail, which rolled back the entire INSERT transaction,
-- preventing providers from sending any chat messages.

CREATE OR REPLACE FUNCTION notify_customer_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_order_number TEXT;
  v_provider_name_ar TEXT;
  v_provider_name_en TEXT;
  v_provider_id UUID;
BEGIN
  -- Only for provider messages
  IF NEW.sender_type = 'provider' THEN
    -- Get customer_id, order_number, provider_id, and store names
    -- using JOIN (same pattern as notify_provider_new_message)
    SELECT o.customer_id, o.order_number, o.provider_id, p.name_ar, p.name_en
    INTO v_customer_id, v_order_number, v_provider_id, v_provider_name_ar, v_provider_name_en
    FROM orders o
    JOIN providers p ON p.id = o.provider_id
    WHERE o.id = NEW.order_id;

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
        'رسالة جديدة من ' || COALESCE(v_provider_name_ar, 'المتجر'),
        'New Message from ' || COALESCE(v_provider_name_en, 'Store'),
        COALESCE(v_provider_name_ar, 'المتجر') || ': ' || LEFT(NEW.message, 50) || CASE WHEN LENGTH(NEW.message) > 50 THEN '...' ELSE '' END,
        COALESCE(v_provider_name_en, 'Store') || ': ' || LEFT(NEW.message, 50) || CASE WHEN LENGTH(NEW.message) > 50 THEN '...' ELSE '' END,
        NEW.order_id,
        v_provider_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

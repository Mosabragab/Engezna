-- Migration: Create provider_notifications table
-- Similar to customer_notifications but for providers

-- Create provider_notifications table
CREATE TABLE IF NOT EXISTS public.provider_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,

  type VARCHAR(50) NOT NULL, -- 'new_order', 'order_cancelled', 'new_message', 'new_review', 'settlement', 'system'
  title_ar VARCHAR(255) NOT NULL,
  title_en VARCHAR(255) NOT NULL,
  body_ar TEXT,
  body_en TEXT,

  -- Related entities
  related_order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  related_customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  related_review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE,
  related_message_id UUID REFERENCES public.order_messages(id) ON DELETE CASCADE,

  -- Read status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_provider_notifications_provider ON provider_notifications(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_notifications_read ON provider_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_provider_notifications_created ON provider_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_notifications_type ON provider_notifications(type);

-- Enable RLS
ALTER TABLE provider_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Providers can view their own notifications
CREATE POLICY "Providers can view own notifications"
  ON provider_notifications FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE owner_id = auth.uid()
    )
  );

-- Providers can update their own notifications (mark as read)
CREATE POLICY "Providers can update own notifications"
  ON provider_notifications FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE owner_id = auth.uid()
    )
  );

-- Providers can delete their own notifications
CREATE POLICY "Providers can delete own notifications"
  ON provider_notifications FOR DELETE
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE owner_id = auth.uid()
    )
  );

-- System can insert notifications (for triggers/functions)
CREATE POLICY "System can insert notifications"
  ON provider_notifications FOR INSERT
  WITH CHECK (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE provider_notifications;

-- Function to create provider notification when new order is placed
CREATE OR REPLACE FUNCTION notify_provider_new_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
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
      NEW.provider_id,
      'new_order',
      'طلب جديد',
      'New Order',
      'لديك طلب جديد #' || NEW.order_number || ' بقيمة ' || NEW.total || ' ج.م',
      'You have a new order #' || NEW.order_number || ' worth ' || NEW.total || ' EGP',
      NEW.id,
      NEW.customer_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new orders
DROP TRIGGER IF EXISTS trigger_notify_provider_new_order ON orders;
CREATE TRIGGER trigger_notify_provider_new_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_provider_new_order();

-- Function to create provider notification when customer sends message
CREATE OR REPLACE FUNCTION notify_provider_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_provider_id UUID;
  v_order_number TEXT;
  v_customer_name TEXT;
BEGIN
  -- Only for customer messages
  IF NEW.sender_type = 'customer' THEN
    -- Get provider_id and order_number from orders table
    SELECT o.provider_id, o.order_number INTO v_provider_id, v_order_number
    FROM orders o
    WHERE o.id = NEW.order_id;

    -- Get customer name
    SELECT p.full_name INTO v_customer_name
    FROM profiles p
    WHERE p.id = NEW.sender_id;

    IF v_provider_id IS NOT NULL THEN
      INSERT INTO provider_notifications (
        provider_id,
        type,
        title_ar,
        title_en,
        body_ar,
        body_en,
        related_order_id,
        related_customer_id,
        related_message_id
      ) VALUES (
        v_provider_id,
        'new_message',
        'رسالة جديدة من عميل',
        'New Message from Customer',
        COALESCE(v_customer_name, 'عميل') || ': ' || LEFT(NEW.message, 50) || CASE WHEN LENGTH(NEW.message) > 50 THEN '...' ELSE '' END,
        COALESCE(v_customer_name, 'Customer') || ': ' || LEFT(NEW.message, 50) || CASE WHEN LENGTH(NEW.message) > 50 THEN '...' ELSE '' END,
        NEW.order_id,
        NEW.sender_id,
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new messages
DROP TRIGGER IF EXISTS trigger_notify_provider_new_message ON order_messages;
CREATE TRIGGER trigger_notify_provider_new_message
  AFTER INSERT ON order_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_provider_new_message();

-- Function to create provider notification when new review is posted
CREATE OR REPLACE FUNCTION notify_provider_new_review()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_name TEXT;
BEGIN
  -- Get customer name
  SELECT p.full_name INTO v_customer_name
  FROM profiles p
  WHERE p.id = NEW.customer_id;

  INSERT INTO provider_notifications (
    provider_id,
    type,
    title_ar,
    title_en,
    body_ar,
    body_en,
    related_order_id,
    related_customer_id,
    related_review_id
  ) VALUES (
    NEW.provider_id,
    'new_review',
    'تقييم جديد',
    'New Review',
    COALESCE(v_customer_name, 'عميل') || ' أعطاك ' || NEW.rating || ' نجوم' || CASE WHEN NEW.comment IS NOT NULL THEN ': ' || LEFT(NEW.comment, 50) ELSE '' END,
    COALESCE(v_customer_name, 'Customer') || ' gave you ' || NEW.rating || ' stars' || CASE WHEN NEW.comment IS NOT NULL THEN ': ' || LEFT(NEW.comment, 50) ELSE '' END,
    NEW.order_id,
    NEW.customer_id,
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new reviews
DROP TRIGGER IF EXISTS trigger_notify_provider_new_review ON reviews;
CREATE TRIGGER trigger_notify_provider_new_review
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_provider_new_review();

-- Grant permissions
GRANT SELECT, UPDATE, DELETE ON provider_notifications TO authenticated;
GRANT INSERT ON provider_notifications TO authenticated;
GRANT INSERT ON provider_notifications TO service_role;

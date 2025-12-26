-- ============================================================================
-- Create ticket_messages table if not exists
-- ============================================================================

-- Create the table
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL,

  -- Sender info
  sender_type VARCHAR(20) NOT NULL, -- 'customer', 'provider', 'admin'
  sender_id UUID,

  -- Recipient info (for dual chat)
  recipient_type VARCHAR(20) DEFAULT 'customer', -- 'customer', 'provider', 'admin'

  -- Message content
  message TEXT NOT NULL,
  attachments JSONB, -- Array of attachment URLs

  -- For admin messages
  is_internal BOOLEAN DEFAULT false, -- Internal notes not visible to customer

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add foreign key if support_tickets table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_tickets') THEN
    ALTER TABLE ticket_messages
    DROP CONSTRAINT IF EXISTS ticket_messages_ticket_id_fkey;

    ALTER TABLE ticket_messages
    ADD CONSTRAINT ticket_messages_ticket_id_fkey
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key to profiles if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    ALTER TABLE ticket_messages
    DROP CONSTRAINT IF EXISTS ticket_messages_sender_id_fkey;

    ALTER TABLE ticket_messages
    ADD CONSTRAINT ticket_messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created ON ticket_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_recipient ON ticket_messages(recipient_type);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender_type ON ticket_messages(sender_type);

-- Enable RLS
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Admins can view all ticket messages" ON ticket_messages;
CREATE POLICY "Admins can view all ticket messages"
  ON ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert ticket messages" ON ticket_messages;
CREATE POLICY "Admins can insert ticket messages"
  ON ticket_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view their ticket messages" ON ticket_messages;
CREATE POLICY "Users can view their ticket messages"
  ON ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = ticket_messages.ticket_id
      AND (st.user_id = auth.uid() OR st.provider_id IN (
        SELECT id FROM providers WHERE owner_id = auth.uid()
      ))
    )
    AND is_internal = false
  );

DROP POLICY IF EXISTS "Users can send messages to their tickets" ON ticket_messages;
CREATE POLICY "Users can send messages to their tickets"
  ON ticket_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = ticket_id
      AND (st.user_id = auth.uid() OR st.provider_id IN (
        SELECT id FROM providers WHERE owner_id = auth.uid()
      ))
    )
  );

-- Grant permissions
GRANT ALL ON ticket_messages TO authenticated;
GRANT ALL ON ticket_messages TO service_role;

-- ============================================================================
-- Add recipient_type to ticket_messages for dual chat functionality
-- ============================================================================

-- Add recipient_type column to track who the message is intended for
ALTER TABLE ticket_messages
ADD COLUMN IF NOT EXISTS recipient_type VARCHAR(20) DEFAULT 'customer';

-- Add comment for documentation
COMMENT ON COLUMN ticket_messages.recipient_type IS 'Target recipient: customer, provider, or both';

-- Update existing admin messages to have recipient_type = 'customer' (default behavior)
UPDATE ticket_messages
SET recipient_type = 'customer'
WHERE sender_type = 'admin' AND recipient_type IS NULL;

-- Update customer messages to have recipient_type = 'admin'
UPDATE ticket_messages
SET recipient_type = 'admin'
WHERE sender_type = 'customer';

-- Update provider messages to have recipient_type = 'admin'
UPDATE ticket_messages
SET recipient_type = 'admin'
WHERE sender_type = 'provider';

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_ticket_messages_recipient ON ticket_messages(recipient_type);

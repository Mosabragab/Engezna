-- Add welcome_email_sent column to profiles table
-- This column tracks whether the welcome email has been sent to the customer

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN profiles.welcome_email_sent IS 'Indicates if welcome email has been sent to this user';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_welcome_email_sent ON profiles(welcome_email_sent) WHERE welcome_email_sent = FALSE;

-- ============================================================================
-- Migration: Add contact form fields to support_tickets
-- Date: 2026-01-23
-- Description: Adds contact_name and contact_email columns to support anonymous
--              contact form submissions from non-registered users.
-- ============================================================================

-- Add contact_name column for visitors who aren't logged in
ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);

-- Add contact_email column for visitors who aren't logged in
ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);

-- Add 'contact_form' as a valid source
-- Note: source column already accepts VARCHAR(50), so 'contact_form' is valid

-- Comment for documentation
COMMENT ON COLUMN public.support_tickets.contact_name IS 'Name of the contact form sender (for non-registered users)';
COMMENT ON COLUMN public.support_tickets.contact_email IS 'Email of the contact form sender (for non-registered users)';

-- Create index on contact_email for admin queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_contact_email ON support_tickets(contact_email);

-- Update RLS policy to allow anonymous contact form submissions
-- First, drop existing insert policy if it exists
DROP POLICY IF EXISTS "Allow anonymous contact form submissions" ON support_tickets;

-- Create new policy for contact form (anonymous users can submit)
CREATE POLICY "Allow anonymous contact form submissions"
  ON support_tickets FOR INSERT
  WITH CHECK (
    source = 'contact_form'
    AND contact_email IS NOT NULL
    AND contact_name IS NOT NULL
  );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

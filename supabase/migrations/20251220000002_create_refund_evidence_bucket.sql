-- Create storage bucket for refund evidence images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'refund-evidence',
  'refund-evidence',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload refund evidence"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'refund-evidence'
);

-- Allow public read access to refund evidence
CREATE POLICY "Public read access for refund evidence"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'refund-evidence');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own refund evidence"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'refund-evidence');

-- Update RLS policies for refunds table to allow customer inserts
DO $$
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "Customers can create refund requests" ON refunds;

  -- Create new policy for customer inserts
  CREATE POLICY "Customers can create refund requests"
  ON refunds FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
  );
END $$;

-- Ensure customers can view their own refunds
DO $$
BEGIN
  DROP POLICY IF EXISTS "Customers can view their refunds" ON refunds;

  CREATE POLICY "Customers can view their refunds"
  ON refunds FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid()
    OR provider_id IN (
      SELECT id FROM providers WHERE owner_id = auth.uid()
    )
  );
END $$;

-- Update RLS for support_tickets to allow customer inserts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Customers can create support tickets" ON support_tickets;

  CREATE POLICY "Customers can create support tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );
END $$;

-- Ensure customers can view their own tickets
DO $$
BEGIN
  DROP POLICY IF EXISTS "Customers can view their tickets" ON support_tickets;

  CREATE POLICY "Customers can view their tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR provider_id IN (
      SELECT id FROM providers WHERE owner_id = auth.uid()
    )
  );
END $$;

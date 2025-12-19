-- ═══════════════════════════════════════════════════════════════════════════
-- Fix Provider Banner Update Policy
-- Allow providers to update rejected/cancelled banners (for resubmission)
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop existing policy
DROP POLICY IF EXISTS "Providers can update pending banners" ON public.homepage_banners;

-- Create new policy that allows updating pending, rejected, and cancelled banners
CREATE POLICY "Providers can update own banners"
ON public.homepage_banners FOR UPDATE
TO authenticated
USING (
  provider_id IN (
    SELECT id FROM public.providers
    WHERE owner_id = auth.uid()
  )
  AND approval_status IN ('pending', 'rejected', 'cancelled')
)
WITH CHECK (
  provider_id IN (
    SELECT id FROM public.providers
    WHERE owner_id = auth.uid()
  )
  -- Ensure providers can only set status to pending when resubmitting
  AND approval_status = 'pending'
);

-- Comment
COMMENT ON POLICY "Providers can update own banners" ON public.homepage_banners IS
  'Allow providers to update their pending, rejected, or cancelled banners (for resubmission with pending status)';

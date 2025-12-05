-- Fix promo_codes RLS policy to allow customers to read codes for validation
-- The application code handles validation (active status, date range, etc.)

-- Drop the restrictive policy
drop policy if exists "Active promo codes viewable by everyone" on public.promo_codes;

-- Create a more permissive policy - allow everyone to read promo codes
-- Application code will handle validation logic
create policy "Anyone can view promo codes for validation"
  on public.promo_codes for select
  using (true);

-- Note: Admins still have full management access via the existing admin policy

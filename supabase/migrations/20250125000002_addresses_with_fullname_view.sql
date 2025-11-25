-- Migration: Create view to show addresses with user full_name
-- This view joins addresses with profiles to display the full_name next to user_id

-- Create a view that shows addresses with the user's full name
create or replace view public.addresses_with_user as
select
  a.id,
  a.user_id,
  p.full_name as user_full_name,
  p.phone as user_phone,
  a.label,
  a.address_line1,
  a.address_line2,
  a.city,
  a.area,
  a.building,
  a.floor,
  a.apartment,
  a.landmark,
  a.location,
  a.phone as address_phone,
  a.delivery_instructions,
  a.is_default,
  a.is_active,
  a.created_at,
  a.updated_at
from public.addresses a
left join public.profiles p on a.user_id = p.id;

-- Grant access to the view
grant select on public.addresses_with_user to anon, authenticated;

-- Add comment for documentation
comment on view public.addresses_with_user is 'Addresses with user profile information (full_name) for easy reference';

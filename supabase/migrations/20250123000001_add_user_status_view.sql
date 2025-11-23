-- Migration: Add view to show user confirmation status
-- This allows us to see auth.users confirmation status in the admin panel

-- Create a view that joins profiles with auth.users to show email confirmation status
create or replace view public.user_status_view as
select
  p.id,
  p.email,
  p.full_name,
  p.phone,
  p.role,
  p.is_active,
  p.created_at,
  p.updated_at,
  au.email_confirmed_at,
  au.confirmed_at,
  au.last_sign_in_at,
  case
    when au.email_confirmed_at is not null or au.confirmed_at is not null then true
    else false
  end as is_email_confirmed
from public.profiles p
left join auth.users au on p.id = au.id;

-- Grant access to authenticated users
grant select on public.user_status_view to authenticated;

-- Add comment
comment on view public.user_status_view is 'View that combines profile data with auth user status including email confirmation';

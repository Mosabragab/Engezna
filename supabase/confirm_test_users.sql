-- Confirm all test users manually
-- This script ensures test users can login without email confirmation

-- Update auth.users to mark emails as confirmed
update auth.users
set
  email_confirmed_at = now(),
  confirmed_at = now()
where email in ('admin@test.com', 'customer@test.com', 'provider@test.com')
  and (email_confirmed_at is null or confirmed_at is null);

-- Verify the update
select
  email,
  email_confirmed_at,
  confirmed_at,
  case
    when email_confirmed_at is not null and confirmed_at is not null then '✅ Confirmed'
    else '❌ Not Confirmed'
  end as status
from auth.users
where email in ('admin@test.com', 'customer@test.com', 'provider@test.com')
order by email;

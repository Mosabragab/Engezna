-- ============================================================================
-- RESET TEST USER PASSWORDS
-- ============================================================================
-- This script helps you reset passwords for test users
-- Run this in Supabase SQL Editor
-- ============================================================================

-- IMPORTANT: Supabase doesn't allow setting passwords directly via SQL
-- You must use one of these methods:

-- ============================================================================
-- METHOD 1: Via Supabase Dashboard (EASIEST)
-- ============================================================================
-- 1. Go to: Authentication > Users
--    https://supabase.com/dashboard/project/cmxpvzqrmptfnuymhxmr/auth/users
--
-- 2. For EACH user (customer@test.com, provider@test.com, admin@test.com):
--    a. Click on the user
--    b. Click "Reset Password" button
--    c. OR Delete the user and create new one with password: Test123!
--

-- ============================================================================
-- METHOD 2: Delete and Recreate Users (If Method 1 doesn't work)
-- ============================================================================

-- First, let's check which users exist
select
  id,
  email,
  created_at,
  confirmed_at
from auth.users
where email in ('admin@test.com', 'customer@test.com', 'provider@test.com')
order by email;

-- OPTIONAL: Delete existing test users (ONLY if you want to start fresh)
-- UNCOMMENT the lines below to delete:

-- delete from public.profiles where email in ('admin@test.com', 'customer@test.com', 'provider@test.com');
-- delete from auth.users where email in ('admin@test.com', 'customer@test.com', 'provider@test.com');

-- After deleting, go to Supabase Dashboard > Authentication > Users > Add User
-- and create each user manually with password: Test123!

-- ============================================================================
-- METHOD 3: Update passwords programmatically via JavaScript
-- ============================================================================
-- If you need to do this programmatically, use this code in your app:

/*
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // You need service role key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Update password for a user
await supabaseAdmin.auth.admin.updateUserById(
  'USER_ID_HERE',
  { password: 'Test123!' }
)
*/

-- ============================================================================
-- VERIFICATION: After resetting passwords
-- ============================================================================
-- Try logging in with these credentials:

-- Customer:
--   Email: customer@test.com
--   Password: Test123!
--   Expected: Redirect to /[locale]/providers

-- Provider:
--   Email: provider@test.com
--   Password: Test123!
--   Expected: Redirect to /[locale]/provider

-- Admin:
--   Email: admin@test.com
--   Password: Test123!
--   Expected: Redirect to /[locale]/admin

-- ============================================================================
-- DEBUGGING: Check if login is working
-- ============================================================================

-- Check if profiles are correctly set up
select
  u.email,
  u.confirmed_at,
  p.role,
  p.full_name
from auth.users u
left join public.profiles p on p.id = u.id
where u.email in ('admin@test.com', 'customer@test.com', 'provider@test.com')
order by u.email;

-- Expected output:
-- email                 | confirmed_at        | role            | full_name
-- --------------------- | ------------------- | --------------- | -------------------
-- admin@test.com        | [timestamp]         | admin           | عبدالله حسن
-- customer@test.com     | [timestamp]         | customer        | محمد أحمد
-- provider@test.com     | [timestamp]         | provider_owner  | أحمد محمود

-- ============================================================================
-- CREATE TEST USERS FOR ENGEZNA
-- ============================================================================
-- This script creates test authentication users and their profiles
-- Run this BEFORE running seed.sql
-- ============================================================================

-- ============================================================================
-- IMPORTANT: How to run this script
-- ============================================================================
-- Option 1: Via Supabase Dashboard (Recommended)
--   1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
--   2. Create a new query
--   3. Copy and paste this entire file
--   4. Click "Run"
--
-- Option 2: Via Supabase CLI
--   supabase db push
-- ============================================================================

-- ============================================================================
-- 1. CREATE AUTH USERS
-- ============================================================================
-- Note: In Supabase, auth.users can only be created via the Auth API or Dashboard
-- This script provides the user data that needs to be created manually
-- ============================================================================

-- For manual creation via Supabase Dashboard:
-- Go to Authentication > Users > Add User
-- Create these three users:

-- User 1: Admin
-- Email: admin@test.com
-- Password: Test123!
-- Confirm Password: Test123!
-- Auto Confirm User: YES (enable this checkbox)

-- User 2: Customer
-- Email: customer@test.com
-- Password: Test123!
-- Confirm Password: Test123!
-- Auto Confirm User: YES (enable this checkbox)

-- User 3: Provider
-- Email: provider@test.com
-- Password: Test123!
-- Confirm Password: Test123!
-- Auto Confirm User: YES (enable this checkbox)

-- ============================================================================
-- 2. CREATE PROFILES (Run this after creating auth users above)
-- ============================================================================

-- Clean up any existing test profiles first (optional)
delete from public.profiles where email in ('admin@test.com', 'customer@test.com', 'provider@test.com');

-- Insert admin profile (only if user exists)
insert into public.profiles (id, email, phone, full_name, role)
select
  id,
  email,
  '+201234567890',
  'System Admin',
  'admin'::user_role
from auth.users
where email = 'admin@test.com'
on conflict (id) do update
set
  email = excluded.email,
  phone = excluded.phone,
  full_name = excluded.full_name,
  role = excluded.role;

-- Insert customer profile (only if user exists)
insert into public.profiles (id, email, phone, full_name, role)
select
  id,
  email,
  '+201234567891',
  'Test Customer',
  'customer'::user_role
from auth.users
where email = 'customer@test.com'
on conflict (id) do update
set
  email = excluded.email,
  phone = excluded.phone,
  full_name = excluded.full_name,
  role = excluded.role;

-- Insert provider profile (only if user exists)
insert into public.profiles (id, email, phone, full_name, role)
select
  id,
  email,
  '+201234567892',
  'Test Provider Owner',
  'provider_owner'::user_role
from auth.users
where email = 'provider@test.com'
on conflict (id) do update
set
  email = excluded.email,
  phone = excluded.phone,
  full_name = excluded.full_name,
  role = excluded.role;

-- ============================================================================
-- 3. VERIFICATION
-- ============================================================================

-- Check if auth users were created
select
  email,
  created_at,
  confirmed_at,
  case when confirmed_at is not null then '✅ Confirmed' else '❌ Not confirmed' end as status
from auth.users
where email in ('admin@test.com', 'customer@test.com', 'provider@test.com')
order by email;

-- Check if profiles were created with correct roles
select
  p.email,
  p.full_name,
  p.role,
  p.phone,
  case when p.id is not null then '✅ Profile exists' else '❌ No profile' end as status
from auth.users u
left join public.profiles p on p.id = u.id
where u.email in ('admin@test.com', 'customer@test.com', 'provider@test.com')
order by p.email;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
-- After running this script successfully, you should see:
--
-- Auth Users (3 rows):
-- email                 | status
-- --------------------- | ---------------
-- admin@test.com        | ✅ Confirmed
-- customer@test.com     | ✅ Confirmed
-- provider@test.com     | ✅ Confirmed
--
-- Profiles (3 rows):
-- email                 | full_name           | role            | status
-- --------------------- | ------------------- | --------------- | ------------------
-- admin@test.com        | System Admin        | admin           | ✅ Profile exists
-- customer@test.com     | Test Customer       | customer        | ✅ Profile exists
-- provider@test.com     | Test Provider Owner | provider_owner  | ✅ Profile exists
-- ============================================================================

-- ============================================================================
-- TEST CREDENTIALS
-- ============================================================================
-- After successful setup, you can login with:
--
-- Admin:
--   Email: admin@test.com
--   Password: Test123!
--   Expected redirect: /[locale]/admin
--
-- Customer:
--   Email: customer@test.com
--   Password: Test123!
--   Expected redirect: /[locale]/providers
--
-- Provider:
--   Email: provider@test.com
--   Password: Test123!
--   Expected redirect: /[locale]/provider
-- ============================================================================

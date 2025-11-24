-- ============================================================================
-- FIX provider@test.com USER
-- ============================================================================
-- Run this AFTER you delete and recreate provider@test.com in Supabase Dashboard
-- ============================================================================

-- Step 1: Check if provider@test.com exists in auth.users
SELECT
  '1. Check if user exists in auth.users' as step,
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'provider@test.com';

-- Step 2: Create or update profile for provider@test.com
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  'أحمد محمود' as full_name,
  'provider_owner'::user_role as role
FROM auth.users u
WHERE u.email = 'provider@test.com'
ON CONFLICT (id) DO UPDATE
SET
  role = 'provider_owner',
  full_name = 'أحمد محمود',
  email = EXCLUDED.email;

-- Step 3: Verify the profile was created
SELECT
  '3. Verify profile created' as step,
  u.email,
  p.role,
  p.full_name,
  CASE
    WHEN p.id IS NOT NULL THEN '✅ Profile exists - CAN LOGIN'
    ELSE '❌ Profile missing - CANNOT LOGIN'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'provider@test.com';

-- ============================================================================
-- INSTRUCTIONS:
-- ============================================================================
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Delete the existing provider@test.com user
-- 3. Click "Add user" and create:
--    - Email: provider@test.com
--    - Password: Test123!
--    - Auto Confirm: ✅ YES
-- 4. Run this SQL script in Supabase SQL Editor
-- 5. Try logging in at localhost:3000/ar/auth/login
-- ============================================================================

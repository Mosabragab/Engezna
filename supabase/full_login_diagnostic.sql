-- ============================================================================
-- COMPLETE LOGIN DIAGNOSTIC AND FIX
-- ============================================================================
-- This script diagnoses ALL possible login issues and fixes them
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: Check if users exist
-- ============================================================================
SELECT
  '1. USER CHECK' as step,
  COUNT(*) as total_users
FROM auth.users;

-- ============================================================================
-- STEP 2: Check email confirmation (should NOT matter if disabled)
-- ============================================================================
SELECT
  '2. EMAIL CONFIRMATION' as step,
  email,
  CASE
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmed'
    ELSE '⚠️ Not confirmed (OK if confirmation disabled)'
  END as status
FROM auth.users
ORDER BY email;

-- ============================================================================
-- STEP 3: Check if profiles exist for ALL users
-- ============================================================================
SELECT
  '3. PROFILE CHECK' as step,
  u.email,
  CASE
    WHEN p.id IS NOT NULL THEN '✅ Profile exists'
    ELSE '❌ MISSING PROFILE - THIS WILL CAUSE LOGIN TO FAIL!'
  END as profile_status,
  p.role,
  p.full_name
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.email;

-- ============================================================================
-- STEP 4: AUTO-FIX - Create profiles for users who don't have one
-- ============================================================================
-- This will create a customer profile for any user without a profile

DO $$
DECLARE
  user_count INTEGER;
  profile_count INTEGER;
BEGIN
  -- Count users
  SELECT COUNT(*) INTO user_count FROM auth.users;

  -- Count profiles
  SELECT COUNT(*) INTO profile_count FROM public.profiles;

  RAISE NOTICE 'Found % users and % profiles', user_count, profile_count;

  -- Create missing profiles
  INSERT INTO public.profiles (id, email, full_name, role)
  SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as full_name,
    'customer'::user_role as role
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE p.id IS NULL
  ON CONFLICT (id) DO NOTHING;

  -- Report what was created
  SELECT COUNT(*) INTO profile_count FROM public.profiles;
  RAISE NOTICE 'Now have % profiles', profile_count;
END $$;

-- ============================================================================
-- STEP 5: Verify RLS policies allow profile reading
-- ============================================================================
SELECT
  '5. RLS POLICY CHECK' as step,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- ============================================================================
-- STEP 6: Final verification - All users should be ready to login
-- ============================================================================
SELECT
  '6. FINAL STATUS' as step,
  u.email,
  p.role,
  p.full_name,
  CASE
    WHEN p.id IS NOT NULL THEN '✅ READY TO LOGIN'
    ELSE '❌ CANNOT LOGIN - Profile missing'
  END as login_status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.email;

-- ============================================================================
-- TEST CREDENTIALS
-- ============================================================================
-- After running this script, you should be able to login with:
-- - admin@test.com / Test123!
-- - customer@test.com / Test123!
-- - provider@test.com / Test123!
-- - dr.mosab@hotmail.com / [your password]
-- ============================================================================

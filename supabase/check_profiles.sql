-- ============================================================================
-- CHECK IF PROFILES EXIST FOR ALL USERS
-- ============================================================================
-- This script checks if every auth user has a corresponding profile
-- Missing profiles will cause login to fail!
-- ============================================================================

-- Check which users are MISSING profiles
SELECT
  u.id,
  u.email,
  CASE
    WHEN p.id IS NULL THEN '❌ MISSING PROFILE - THIS IS WHY LOGIN FAILS!'
    ELSE '✅ Profile exists'
  END as profile_status,
  p.role,
  p.full_name
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.email;

-- ============================================================================
-- FIX: Create missing profiles for all users
-- ============================================================================
-- This creates a profile for any user that doesn't have one
-- All users will be created as 'customer' role by default

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

-- ============================================================================
-- VERIFY: All users should now have profiles
-- ============================================================================
SELECT
  u.email,
  p.role,
  p.full_name,
  CASE
    WHEN p.id IS NOT NULL THEN '✅ CAN LOGIN NOW'
    ELSE '❌ Still missing profile'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.email;

-- ============================================================================
-- MANUALLY SET ROLE (if needed)
-- ============================================================================
-- If you want to change a user's role, uncomment and edit:

-- UPDATE public.profiles
-- SET role = 'admin'::user_role
-- WHERE email = 'dr.mosab@hotmail.com';

-- UPDATE public.profiles
-- SET role = 'provider_owner'::user_role
-- WHERE email = 'provider@test.com';
-- ============================================================================

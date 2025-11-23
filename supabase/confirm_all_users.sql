-- ============================================================================
-- CONFIRM ALL USERS - Fix Login Issues
-- ============================================================================
-- This script confirms ALL users in the database so they can login
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Confirm ALL users (not just test users)
UPDATE auth.users
SET
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  confirmed_at = COALESCE(confirmed_at, NOW())
WHERE email_confirmed_at IS NULL OR confirmed_at IS NULL;

-- ============================================================================
-- VERIFICATION - Check all users are now confirmed
-- ============================================================================

-- Show confirmation status for ALL users
SELECT
  email,
  created_at,
  email_confirmed_at,
  confirmed_at,
  last_sign_in_at,
  CASE
    WHEN email_confirmed_at IS NOT NULL AND confirmed_at IS NOT NULL THEN '✅ Confirmed - Can Login'
    ELSE '❌ Not Confirmed - Cannot Login'
  END as status
FROM auth.users
ORDER BY created_at DESC;

-- ============================================================================
-- NEXT STEPS
-- ============================================================================
-- After running this script:
-- 1. All users should show "✅ Confirmed - Can Login"
-- 2. Try logging in with any user credentials
-- 3. If you still can't login, check that:
--    - The password is correct
--    - A profile exists for the user in public.profiles table
--
-- Known users and passwords:
-- - admin@test.com / Test123!
-- - customer@test.com / Test123!
-- - provider@test.com / Test123!
-- - dr.mosab@hotmail.com / [your password]
-- ============================================================================

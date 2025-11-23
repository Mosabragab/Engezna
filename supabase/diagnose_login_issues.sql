-- ============================================================================
-- DIAGNOSE LOGIN ISSUES
-- ============================================================================
-- This script helps identify why users cannot login
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. CHECK EMAIL CONFIRMATION STATUS
-- ============================================================================
SELECT
  'Email Confirmation Status' as check_name,
  email,
  CASE
    WHEN email_confirmed_at IS NOT NULL AND confirmed_at IS NOT NULL THEN '✅ Email Confirmed'
    ELSE '❌ Email NOT Confirmed - THIS IS WHY LOGIN FAILS!'
  END as status,
  email_confirmed_at,
  confirmed_at
FROM auth.users
ORDER BY created_at DESC;

-- ============================================================================
-- 2. CHECK PROFILE EXISTS FOR EACH USER
-- ============================================================================
SELECT
  'Profile Status' as check_name,
  u.email,
  CASE
    WHEN p.id IS NOT NULL THEN '✅ Profile Exists'
    ELSE '❌ Profile Missing - THIS WILL CAUSE LOGIN ERROR!'
  END as status,
  p.role,
  p.full_name
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC;

-- ============================================================================
-- 3. COMBINED STATUS - FULL DIAGNOSIS
-- ============================================================================
SELECT
  u.email,
  -- Email confirmation check
  CASE
    WHEN u.email_confirmed_at IS NOT NULL AND u.confirmed_at IS NOT NULL THEN '✅'
    ELSE '❌ NOT CONFIRMED'
  END as email_confirmed,
  -- Profile check
  CASE
    WHEN p.id IS NOT NULL THEN '✅'
    ELSE '❌ NO PROFILE'
  END as has_profile,
  p.role,
  p.full_name,
  -- Overall status
  CASE
    WHEN u.email_confirmed_at IS NULL OR u.confirmed_at IS NULL THEN '❌ Cannot login - Email not confirmed'
    WHEN p.id IS NULL THEN '❌ Cannot login - Profile missing'
    ELSE '✅ CAN LOGIN'
  END as overall_status,
  u.last_sign_in_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC;

-- ============================================================================
-- COMMON ISSUES AND SOLUTIONS
-- ============================================================================
-- Issue: Email not confirmed
-- Solution: Run confirm_all_users.sql
--
-- Issue: Profile missing
-- Solution: Run create_test_users.sql section 2 or manually create profile
--
-- Issue: Wrong password
-- Solution: Use password reset or contact admin
-- ============================================================================

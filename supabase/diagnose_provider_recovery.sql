-- ============================================================================
-- DIAGNOSE PROVIDER@TEST.COM RECOVERY ISSUE
-- ============================================================================
-- The user is seeing: /recover | 400: Email address "provider@test.com" is invalid
-- This error comes from Supabase auth system, not our application code
-- ============================================================================

-- Step 1: Check if provider@test.com exists in auth.users
select
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  banned_until,
  deleted_at,
  created_at,
  raw_user_meta_data,
  raw_app_meta_data
from auth.users
where email = 'provider@test.com';

-- Step 2: Check if email is properly formatted (should be valid)
select
  'provider@test.com'::text as email,
  'provider@test.com' ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' as is_valid_format;

-- Step 3: Check profile exists
select
  id,
  email,
  full_name,
  role,
  is_active
from public.profiles
where email = 'provider@test.com';

-- Step 4: Check for any auth identities issues
select
  i.id,
  i.user_id,
  i.provider_id,
  i.identity_data,
  i.created_at,
  u.email
from auth.identities i
join auth.users u on u.id = i.user_id
where u.email = 'provider@test.com';

-- ============================================================================
-- FIX: Ensure provider@test.com is properly configured
-- ============================================================================

-- Fix 1: Ensure email is confirmed (Supabase may block recovery for unconfirmed emails)
update auth.users
set
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  confirmed_at = coalesce(confirmed_at, now())
where email = 'provider@test.com'
  and (email_confirmed_at is null or confirmed_at is null);

-- Fix 2: Ensure user is not soft-deleted or banned
update auth.users
set
  banned_until = null,
  deleted_at = null
where email = 'provider@test.com';

-- Fix 3: Ensure profile is active
update public.profiles
set is_active = true
where email = 'provider@test.com';

-- ============================================================================
-- VERIFY THE FIX
-- ============================================================================

-- Check user status after fix
select
  email,
  email_confirmed_at,
  confirmed_at,
  case
    when email_confirmed_at is not null and confirmed_at is not null then '✅ Confirmed'
    else '❌ Not Confirmed'
  end as confirmation_status,
  case
    when banned_until is null and deleted_at is null then '✅ Active'
    else '❌ Banned/Deleted'
  end as account_status
from auth.users
where email = 'provider@test.com';

-- ============================================================================
-- NOTES FOR DEBUGGING
-- ============================================================================
-- If the issue persists after running this script:
-- 1. The error might be coming from Supabase's email provider configuration
-- 2. Check if there's a domain blocklist for @test.com emails
-- 3. Check Supabase project settings for email confirmation requirements
-- 4. The issue might be in the frontend code calling the recovery endpoint
-- ============================================================================

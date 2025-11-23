# Authentication Fix Guide

## Problem Summary
You're experiencing two issues:
1. **Provider login** (`provider@test.com`) → Returns "Invalid login credentials"
2. **Customer login** (`customer@test.com`) → Redirects to home page instead of providers page

## Root Cause
The test users exist in your database ✅, but the passwords don't match `Test123!`. This happens because:
- The users were created manually in Supabase Dashboard
- The password used during creation might be different from `Test123!`

## Your Current Database State
Based on the queries you ran, your setup is correct:
- ✅ All 3 auth users exist and are confirmed
- ✅ All 3 profiles exist with correct roles
- ✅ Profile IDs are properly linked

The only issue is the **password mismatch**.

---

## 🔧 How to Fix

### Option 1: Reset Passwords via Dashboard (EASIEST - 2 minutes)

1. **Go to Supabase Users Page**
   ```
   https://supabase.com/dashboard/project/cmxpvzqrmptfnuymhxmr/auth/users
   ```

2. **For EACH of these users:**
   - `customer@test.com`
   - `provider@test.com`
   - `admin@test.com`

   **Do this:**
   1. Click on the user's email
   2. Look for "Reset Password" or "Update Password" option
   3. Set new password to: `Test123!`
   4. Make sure "Auto Confirm User" is checked (if visible)
   5. Save

3. **Test the login**
   - Try logging in with `customer@test.com` / `Test123!`
   - Should redirect to: `/ar/providers` or `/en/providers`

---

### Option 2: Delete & Recreate Users (If Option 1 doesn't work)

**⚠️ WARNING: This will delete the test users and recreate them**

1. **Delete existing test users**

   Run this in Supabase SQL Editor:
   ```sql
   -- Delete profiles first (foreign key constraint)
   delete from public.profiles
   where email in ('admin@test.com', 'customer@test.com', 'provider@test.com');

   -- Delete auth users
   delete from auth.users
   where email in ('admin@test.com', 'customer@test.com', 'provider@test.com');
   ```

2. **Recreate users via Dashboard**

   Go to: Authentication > Users > Add User

   Create each user:

   **User 1: Customer**
   - Email: `customer@test.com`
   - Password: `Test123!`
   - ✅ **Check "Auto Confirm User"**
   - Click "Create User"

   **User 2: Provider**
   - Email: `provider@test.com`
   - Password: `Test123!`
   - ✅ **Check "Auto Confirm User"**
   - Click "Create User"

   **User 3: Admin**
   - Email: `admin@test.com`
   - Password: `Test123!`
   - ✅ **Check "Auto Confirm User"**
   - Click "Create User"

3. **Create profiles**

   Run the profile creation section from `supabase/create_test_users.sql`:
   ```sql
   -- Insert customer profile
   insert into public.profiles (id, email, phone, full_name, role)
   select id, email, '+201234567891', 'Test Customer', 'customer'::user_role
   from auth.users where email = 'customer@test.com'
   on conflict (id) do update set role = excluded.role;

   -- Insert provider profile
   insert into public.profiles (id, email, phone, full_name, role)
   select id, email, '+201234567892', 'Test Provider Owner', 'provider_owner'::user_role
   from auth.users where email = 'provider@test.com'
   on conflict (id) do update set role = excluded.role;

   -- Insert admin profile
   insert into public.profiles (id, email, phone, full_name, role)
   select id, email, '+201234567890', 'System Admin', 'admin'::user_role
   from auth.users where email = 'admin@test.com'
   on conflict (id) do update set role = excluded.role;
   ```

---

## ✅ Verification

After resetting passwords, test each account:

### Test Customer Login
```
Email: customer@test.com
Password: Test123!
Expected behavior: Redirects to /ar/providers (or /en/providers)
```

### Test Provider Login
```
Email: provider@test.com
Password: Test123!
Expected behavior: Redirects to /ar/provider (or /en/provider)
```

### Test Admin Login
```
Email: admin@test.com
Password: Test123!
Expected behavior: Redirects to /ar/admin (or /en/admin)
```

---

## 🔍 Still Not Working?

If after resetting passwords you still have issues, run this diagnostic query:

```sql
-- Check user confirmation status
select
  email,
  confirmed_at,
  case
    when confirmed_at is null then '❌ NOT CONFIRMED - This is the problem!'
    else '✅ Confirmed'
  end as status
from auth.users
where email in ('admin@test.com', 'customer@test.com', 'provider@test.com');
```

If any user shows "NOT CONFIRMED", you need to confirm them:

1. Go to Authentication > Users
2. Click on the unconfirmed user
3. Look for "Confirm User" or "Email Confirmed" toggle
4. Enable it

---

## 📝 Quick Reference: Test Credentials

After fixing, these should work:

| Email | Password | Role | Redirects To |
|-------|----------|------|--------------|
| `customer@test.com` | `Test123!` | customer | `/[locale]/providers` |
| `provider@test.com` | `Test123!` | provider_owner | `/[locale]/provider` |
| `admin@test.com` | `Test123!` | admin | `/[locale]/admin` |

---

## Need Help?

If you're still experiencing issues after following this guide, please share:
1. Which option you tried (1 or 2)
2. Screenshot of any error messages
3. Result of the diagnostic query above

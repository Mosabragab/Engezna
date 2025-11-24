# 🔧 Fix Sign-In Issue - Password Reset Guide

## Problem Identified

✅ Email confirmation: **Working**
✅ User profiles: **Working**
✅ Database setup: **Working**
❌ **User passwords: NOT SET** ← This is the problem!

The diagnostic data shows that all users have confirmed emails and valid profiles, but **Supabase doesn't allow setting passwords via SQL**. The test users were created in the database but their passwords were never initialized.

---

## Solution: Reset Passwords Using Admin API

### Step 1: Get Your Supabase Service Role Key

1. Go to your Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/cmxpvzqrmptfnuymhxmr/settings/api
   ```

2. Scroll down to **"Project API keys"**

3. Find the **"service_role"** key (NOT the anon key)

4. Click the copy icon to copy the key

5. **IMPORTANT**: This is a secret key with admin privileges. Never share it or commit it to git!

---

### Step 2: Add Service Role Key to .env.local

Open `/home/user/Engezna/.env.local` and replace `your_service_role_key_here` with your actual service role key:

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...your_actual_key_here
```

---

### Step 3: Install Dependencies (if needed)

Make sure you have the required packages:

```bash
npm install dotenv tsx
```

---

### Step 4: Run the Password Reset Script

```bash
npx tsx scripts/reset-passwords.ts
```

Expected output:
```
🔧 Starting password reset for test users...

🔄 Resetting password for: customer@test.com
   ✅ Success! Password set to: Test123!
🔄 Resetting password for: provider@test.com
   ✅ Success! Password set to: Test123!
🔄 Resetting password for: admin@test.com
   ✅ Success! Password set to: Test123!
🔄 Resetting password for: dr.mosab@hotmail.com
   ✅ Success! Password set to: Test123!

============================================================
📊 Summary:
   ✅ Successful: 4
   ❌ Failed: 0
============================================================

🎉 Password reset complete!

📝 Test Credentials:
   Password for all users: Test123!

   Users:
   • customer@test.com
   • provider@test.com
   • admin@test.com
   • dr.mosab@hotmail.com

🚀 You can now try logging in!
```

---

### Step 5: Test the Login

Now try logging in with:

**Customer Account:**
- Email: `customer@test.com`
- Password: `Test123!`
- Expected: Redirect to `/[locale]/providers`

**Provider Account:**
- Email: `provider@test.com`
- Password: `Test123!`
- Expected: Redirect to `/[locale]/provider`

**Admin Account:**
- Email: `admin@test.com`
- Password: `Test123!`
- Expected: Redirect to `/[locale]/admin`

**Your Personal Account:**
- Email: `dr.mosab@hotmail.com`
- Password: `Test123!`
- Expected: Redirect to `/[locale]/providers`

---

## Alternative Method: Manual Password Reset via Dashboard

If the script doesn't work, you can reset passwords manually:

1. Go to: https://supabase.com/dashboard/project/cmxpvzqrmptfnuymhxmr/auth/users

2. For each user:
   - Click on the user's email
   - Click **"Reset Password"** or **"Send reset password email"**
   - User will receive an email to reset their password

---

## Why This Happened

According to your `reset_test_passwords.sql` file:
> "IMPORTANT: Supabase doesn't allow setting passwords directly via SQL"

When test users were created:
1. ✅ Auth users were inserted into `auth.users`
2. ✅ Emails were confirmed
3. ✅ Profiles were created in `public.profiles`
4. ❌ **But passwords were never set** because SQL can't set Supabase auth passwords

The only way to set passwords is through:
- Supabase Admin API (our script)
- Supabase Dashboard
- Password reset email flow

---

## Security Note

After testing is complete, you can:
1. Remove the `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`
2. The `.env.local` file is already in `.gitignore` so it won't be committed

---

## Troubleshooting

### Error: "Missing required environment variables"
- Make sure you added the service role key to `.env.local`
- Make sure there are no extra spaces or quotes around the key

### Error: "Failed to fetch users"
- Check that your service role key is correct
- Verify your Supabase project URL is correct

### Login still fails after password reset
- Clear your browser cookies/cache
- Try in an incognito window
- Check the browser console for errors
- Check Supabase logs: https://supabase.com/dashboard/project/cmxpvzqrmptfnuymhxmr/logs

---

## Files Created/Modified

- ✅ `scripts/reset-passwords.ts` - Password reset script
- ✅ `.env.local` - Added SERVICE_ROLE_KEY placeholder
- ✅ `FIX_SIGN_IN_ISSUE.md` - This guide

---

Ready to fix the issue? Run:
```bash
npx tsx scripts/reset-passwords.ts
```

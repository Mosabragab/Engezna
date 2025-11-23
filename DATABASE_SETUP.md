# Database Setup Instructions - SAFE UPDATE

## ⚠️ IMPORTANT: This is SAFE for existing databases
**This update will NOT destroy your existing data!**
- ✅ Preserves all existing providers (Lavender Cafe, Al Safa Restaurant, etc.)
- ✅ Preserves all existing categories
- ✅ Only ADDS menu items to providers that don't have any
- ✅ Safe to run multiple times

## Overview
This guide will help you:
1. Create test users for authentication testing
2. Add sample menu items to your existing providers in Supabase

## Prerequisites
- Access to your Supabase dashboard
- ✅ Database schema already deployed (you have this!)
- ✅ Existing providers (you have 4 providers!)

---

## Step 0: Create Test Users (REQUIRED for login testing)

**IMPORTANT**: You need to create test users first before you can login!

### Option A: Via Supabase Dashboard (Easiest)

1. Go to your Supabase Dashboard > **Authentication** > **Users**
   ```
   https://supabase.com/dashboard/project/cmxpvzqrmptfnuymhxmr/auth/users
   ```

2. Click **"Add User"** button and create these three users:

   **User 1: Admin**
   - Email: `admin@test.com`
   - Password: `Test123!`
   - ✅ **Enable "Auto Confirm User"** checkbox
   - Click "Create User"

   **User 2: Customer**
   - Email: `customer@test.com`
   - Password: `Test123!`
   - ✅ **Enable "Auto Confirm User"** checkbox
   - Click "Create User"

   **User 3: Provider**
   - Email: `provider@test.com`
   - Password: `Test123!`
   - ✅ **Enable "Auto Confirm User"** checkbox
   - Click "Create User"

3. After creating the auth users, create their profiles by running this SQL:

   Go to: **SQL Editor** > **New Query**
   ```
   https://supabase.com/dashboard/project/cmxpvzqrmptfnuymhxmr/sql
   ```

   Copy and paste the content from:
   ```
   supabase/create_test_users.sql
   ```

   Then click **"Run"** (skip to section 2 that creates profiles)

### Option B: Via SQL Script (Advanced)

1. Open the file `supabase/create_test_users.sql`
2. Follow the instructions in the file
3. Create users manually via Dashboard (SQL can't create auth users directly)
4. Then run the profile creation section

### Verify Test Users

Run this query to verify:
```sql
select
  u.email,
  p.full_name,
  p.role,
  case when p.id is not null then '✅ Has profile' else '❌ Missing profile' end as status
from auth.users u
left join public.profiles p on p.id = u.id
where u.email in ('admin@test.com', 'customer@test.com', 'provider@test.com')
order by u.email;
```

Expected result:
```
email                 | full_name           | role            | status
--------------------- | ------------------- | --------------- | ----------------
admin@test.com        | System Admin        | admin           | ✅ Has profile
customer@test.com     | Test Customer       | customer        | ✅ Has profile
provider@test.com     | Test Provider Owner | provider_owner  | ✅ Has profile
```

---

## Step 1: Add Menu Items to Your Providers (SAFE)

**This step is completely safe - it only adds menu items, doesn't modify existing data**

1. Go to your Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/cmxpvzqrmptfnuymhxmr/sql
   ```

2. Click "New Query"

3. Copy and paste the ENTIRE content from:
   ```
   supabase/seed.sql
   ```

4. Click "Run" to execute

5. The script will:
   - Check each of your 4 existing providers
   - Add menu items ONLY to providers that don't have any
   - Skip providers that already have menu items
   - Not modify or delete anything

## Step 2: Verify Menu Items Were Added

Run this query in the SQL Editor to see menu items per provider:

```sql
SELECT
  p.name_en as provider,
  p.category,
  COUNT(m.id) as menu_items_count,
  CASE
    WHEN COUNT(m.id) > 0 THEN '✅ Has menu'
    ELSE '❌ No menu yet'
  END as status
FROM providers p
LEFT JOIN menu_items m ON m.provider_id = p.id
GROUP BY p.id, p.name_en, p.category
ORDER BY p.name_en;
```

Expected result: Your 4 providers should now have menu items

### View Sample Menu Items
```sql
SELECT
  p.name_en as provider,
  m.name_ar,
  m.name_en,
  m.price,
  m.is_available
FROM menu_items m
JOIN providers p ON m.provider_id = p.id
ORDER BY p.name_en, m.display_order
LIMIT 20;
```

## Step 3: Test the Application

Now test the provider pages with your REAL data:

1. Make sure dev server is running:
   ```bash
   npm run dev
   ```

2. Visit the providers page:
   ```
   http://localhost:3000/ar/providers
   ```

3. You should see all 4 of your existing providers!

4. Click on any provider to see their menu items

5. Try the shopping cart:
   - Add items to cart
   - Adjust quantities
   - See the cart total

## What Just Happened?

✅ **Your existing providers are now displayed** on the browsing page
✅ **Each provider now has menu items** (if they didn't before)
✅ **Shopping cart works** inline on the provider detail page
✅ **All your original data is preserved** - nothing was deleted or modified

## Quick Reference: Your Existing Providers

Based on your screenshot, you have:
1. **Lavender Cafe** - Coffee shop
2. **Al Safa Restaurant** - Restaurant
3. **Al Najah Supermarket** - Grocery
4. **Sultan Pizza** - Restaurant

All should now have appropriate menu items based on their category!

## Troubleshooting

### Providers page shows "No providers available"
- Check if providers have status='open' or status='closed' (the page filters out pending/paused providers)
- Update provider status in Supabase dashboard

### Menu items not showing
- Run the verification query above to check menu items count
- If count is 0, re-run the seed.sql file (it's safe!)

### Can't see my providers
- Check that you have the correct Supabase credentials in your `.env.local` file
- Make sure RLS policies allow public read access to providers

---

**✨ Congrats! Your Engezna app now has a working provider browsing and shopping cart system!**

# Database Setup Instructions

## Overview
This guide will help you deploy the Engezna database schema and seed data to your Supabase project.

## Prerequisites
- Access to your Supabase dashboard
- Test users created in Supabase Auth:
  - `admin@test.com`
  - `customer@test.com`
  - `provider@test.com`

## Step 1: Deploy Initial Schema

1. Go to your Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/cmxpvzqrmptfnuymhxmr/sql
   ```

2. Open the SQL Editor (New Query button)

3. Copy and paste the content from:
   ```
   supabase/migrations/20250122000000_initial_schema.sql
   ```

4. Click "Run" to execute the schema

5. Wait for completion (this creates all tables, functions, triggers, and policies)

## Step 2: Add Profile Auto-Creation Trigger

1. In the same SQL Editor, create a new query

2. Copy and paste the content from:
   ```
   supabase/migrations/20250123000000_add_profile_trigger.sql
   ```

3. Click "Run" to execute

4. This trigger will automatically create profile records for new users going forward

## Step 3: Seed Test Data

1. In the SQL Editor, create a new query

2. Copy and paste the content from:
   ```
   supabase/seed.sql
   ```

3. Click "Run" to execute

4. This will:
   - Create profiles for your 3 existing test users
   - Create 2 test providers:
     - **مطعم التجربة** (Test Restaurant) - with 14 menu items
     - **كافيه التجربة** (Test Coffee Shop) - with 14 menu items

## Step 4: Verify Installation

### Check Profiles Table
```sql
SELECT id, email, full_name, role FROM profiles;
```

Expected result: 3 rows (admin, customer, provider)

### Check Providers Table
```sql
SELECT id, name_ar, name_en, category, status FROM providers;
```

Expected result: 2 rows (Test Restaurant, Test Coffee Shop)

### Check Menu Items
```sql
SELECT
  m.name_ar,
  m.name_en,
  m.price,
  p.name_en as provider
FROM menu_items m
JOIN providers p ON m.provider_id = p.id
ORDER BY p.name_en, m.display_order;
```

Expected result: 28 rows total (14 per provider)

## Step 5: Test Login

1. Go to your app: http://localhost:3000/ar
2. Click "تسجيل الدخول" (Login)
3. Try logging in with:
   - Email: `customer@test.com`
   - Password: (the password you set when creating the user)

## Troubleshooting

### "User not found" error when logging in
- Make sure you ran the seed.sql file
- Check that profiles were created:
  ```sql
  SELECT * FROM profiles WHERE email = 'customer@test.com';
  ```

### "Permission denied" errors
- The schema includes RLS policies
- Make sure you're using the correct user role
- Admin users should have access to everything

### Missing menu items
- Re-run the seed.sql file
- Check provider_id values match:
  ```sql
  SELECT COUNT(*) FROM menu_items;
  ```

## Next Steps

Once the database is set up:
1. ✅ Users can log in
2. ✅ Provider pages can display data
3. ✅ Menu items are available
4. Ready to implement provider browsing and shopping cart

## Database Structure Summary

### User Tables
- `profiles` - User profiles (extends auth.users)
- `addresses` - Customer delivery addresses

### Provider Tables
- `providers` - Restaurants, coffee shops, etc.
- `provider_staff` - Multi-user access for providers
- `categories` - Service categories
- `menu_items` - Products/dishes offered by providers

### Order Tables
- `orders` - Customer orders
- `order_items` - Line items in orders
- `order_tracking` - Real-time order status updates

### Additional Tables
- `chats` & `chat_messages` - In-app messaging
- `notifications` - Push notifications
- `reviews` - Customer reviews
- `settlements` - Provider payouts

## Security Notes

- All tables have Row Level Security (RLS) enabled
- Users can only access their own data
- Providers can only manage their own content
- Admins have elevated permissions

---

**Project:** Engezna (انجزنا)
**Database:** PostgreSQL 15 (Supabase)
**Version:** 1.0

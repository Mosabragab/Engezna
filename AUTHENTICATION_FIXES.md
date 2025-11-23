# Authentication and Checkout Fixes

## Issues Fixed

### 1. Signup Profile Creation Error ✅
**Problem:** The signup page was trying to insert into a non-existent `users` table, causing profile creation to fail.

**Root Cause:**
- The database schema uses a `profiles` table, not `users`
- A database trigger automatically creates profiles when users sign up
- The manual insertion code was causing conflicts

**Solution:**
- Removed manual profile insertion from signup page
- Updated code to use the automatic trigger and just update the phone number
- Fixed in: `src/app/[locale]/auth/signup/page.tsx`

### 2. Phone Number Not Saved ✅
**Problem:** User phone numbers weren't being saved during registration.

**Root Cause:**
- The database trigger didn't extract the phone number from user metadata

**Solution:**
- Updated the `handle_new_user()` trigger function to include phone number
- Fixed in: `supabase/migrations/20250123000000_add_profile_trigger.sql`

### 3. Checkout Button Not Working ✅
**Problem:** Orders couldn't be created - button appeared unresponsive.

**Root Cause:**
- Field name mismatch: Using `user_id` instead of `customer_id`
- Missing required fields in order creation
- Incorrect field names for order items

**Solution:**
- Changed `user_id` to `customer_id` in order insert
- Added required `platform_commission` field (7% of subtotal)
- Fixed `delivery_address` to use JSONB format
- Changed `notes` to `customer_notes`
- Added missing fields to order_items: `item_name_ar`, `item_name_en`, `item_price`
- Changed `subtotal` to `total_price` in order_items
- Fixed in: `src/app/[locale]/checkout/page.tsx`

### 4. Can't Sign In After Registration ✅
**Problem:** Users couldn't sign in with newly created credentials.

**Root Cause:**
- Profile creation was failing, so authentication couldn't complete
- Fixed by resolving issue #1

## Database Migration Required

⚠️ **IMPORTANT:** The updated trigger function needs to be deployed to your Supabase project.

### Option 1: Via Supabase Dashboard (SQL Editor)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run this migration:

```sql
-- Update the handle_new_user function to include phone number
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer')
  );
  RETURN NEW;
END;
$$;
```

### Option 2: Via Supabase CLI
If you have the Supabase CLI installed and linked to your project:

```bash
# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Push the migration
supabase db push
```

## Testing Checklist

After deploying the fixes, test the following:

1. **Signup Flow**
   - [ ] Create a new account with email, password, name, and phone
   - [ ] Verify no errors appear after signup
   - [ ] Check that phone number is saved in the profile

2. **Login Flow**
   - [ ] Sign in with newly created credentials
   - [ ] Verify successful authentication
   - [ ] Check that user data loads correctly

3. **Checkout Flow**
   - [ ] Add items to cart
   - [ ] Navigate to checkout page
   - [ ] Fill in delivery details
   - [ ] Click "تأكيد الطلب" (Confirm Order) button
   - [ ] Verify order is created successfully
   - [ ] Check order appears in orders list

## Files Modified

1. `src/app/[locale]/auth/signup/page.tsx` - Fixed profile creation logic
2. `src/app/[locale]/checkout/page.tsx` - Fixed order creation with correct field names
3. `supabase/migrations/20250123000000_add_profile_trigger.sql` - Updated trigger to save phone

## Additional Notes

- The profile trigger now automatically captures: email, phone, full_name, and role from signup metadata
- Orders now correctly include platform commission (7% of subtotal)
- Delivery address is now stored as JSONB with full details
- All field names now match the database schema exactly

-- ============================================================================
-- Migration: Block Banned Customers from Creating Orders
-- منع العملاء المحظورين من إنشاء طلبات جديدة
-- ============================================================================
-- Date: 2025-12-08
-- Problem: Banned customers (is_active = false) can still create new orders
-- Solution: Update RLS policy to check is_active status
-- ============================================================================

-- Step 1: Drop the old policy that doesn't check is_active
DROP POLICY IF EXISTS "Customers can create orders" ON public.orders;

-- Step 2: Create new policy that checks if customer is active (not banned)
CREATE POLICY "Customers can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_active = true
    )
  );

-- Step 3: Also update the customer update policy to check is_active
DROP POLICY IF EXISTS "Customers can update own orders before preparing" ON public.orders;
DROP POLICY IF EXISTS "orders_update_customer_cancel" ON public.orders;

CREATE POLICY "Customers can update own orders before preparing"
  ON public.orders FOR UPDATE
  USING (
    customer_id = auth.uid()
    AND can_modify = true
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_active = true
    )
  );

-- Step 4: Add policy for customer to cancel their own pending orders (if active)
CREATE POLICY "orders_update_customer_cancel"
  ON public.orders FOR UPDATE
  USING (
    customer_id = auth.uid()
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_active = true
    )
  );

-- ============================================================================
-- Note: Banned customers will now get a "new row violates row-level security
-- policy" error when trying to create orders. The frontend should also check
-- the is_active status and show a friendly message.
-- ============================================================================

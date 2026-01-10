-- ============================================================================
-- Allow Providers to Create Orders for Custom Order Flow
-- السماح للتجار بإنشاء طلبات للطلبات المفتوحة
-- ============================================================================
-- Problem: When merchant prices a custom order and submits, they try to INSERT
-- into orders table. But RLS only allows customers to insert where customer_id = auth.uid()
--
-- Solution: Add a policy that allows providers to INSERT orders when:
-- 1. The provider_id matches a provider they own
-- 2. The order_flow = 'custom' (to limit to custom orders only)
-- ============================================================================

-- Drop if exists (for re-running)
DROP POLICY IF EXISTS "Providers can create custom orders" ON public.orders;

-- Create policy for providers to insert custom orders
CREATE POLICY "Providers can create custom orders"
  ON public.orders FOR INSERT
  WITH CHECK (
    -- Must be a custom order flow
    order_flow = 'custom'
    AND
    -- Provider must own this provider account
    EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = provider_id
      AND p.owner_id = auth.uid()
    )
  );

-- Also ensure providers can update orders they created
DROP POLICY IF EXISTS "Providers can update custom orders" ON public.orders;

CREATE POLICY "Providers can update custom orders"
  ON public.orders FOR UPDATE
  USING (
    order_flow = 'custom'
    AND EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = provider_id
      AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    order_flow = 'custom'
    AND EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = provider_id
      AND p.owner_id = auth.uid()
    )
  );

-- Grant execute permissions
GRANT ALL ON public.orders TO authenticated;

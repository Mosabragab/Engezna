-- ============================================================================
-- Fix: Allow broadcast owner to insert custom_order_requests
-- إصلاح: السماح لصاحب البث بإنشاء طلبات التسعير
--
-- Problem:
-- Security fix migration (20260204) changed INSERT policy from 'authenticated'
-- to 'service_role' only, but broadcast-service.ts runs client-side as
-- 'authenticated'. This broke custom order creation entirely.
--
-- Solution:
-- Allow authenticated users to INSERT requests ONLY when they own the
-- broadcast (customer_id = auth.uid()). This is secure because:
-- 1. User can only create requests for their own broadcasts
-- 2. The broadcast itself is already validated by its own RLS policy
--
-- @date February 2026
-- ============================================================================

-- Keep the service_role policy for backend/cron operations
-- (it was created by 20260204000001_security_fixes_phase1.sql)

-- Add policy for broadcast owners (customers) to create requests
CREATE POLICY "broadcast_owner_insert_requests"
ON public.custom_order_requests
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM custom_order_broadcasts b
    WHERE b.id = custom_order_requests.broadcast_id
    AND b.customer_id = auth.uid()
    AND b.status = 'active'
  )
);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- ============================================================================
-- COMPREHENSIVE FIX: RLS infinite recursion in providers/provider_staff/reviews
-- ============================================================================
-- Root Cause: Circular dependency between providers and provider_staff policies
-- providers SELECT → "Staff can view their provider" → queries provider_staff
-- provider_staff SELECT → "Owners can view provider staff" → queries providers
-- → INFINITE LOOP!
--
-- Solution: Use SECURITY DEFINER helper functions to bypass RLS checks
-- ============================================================================

-- ============================================================================
-- STEP 1: Create SECURITY DEFINER helper functions
-- ============================================================================

-- Check if user is the owner of a provider (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_provider_owner(p_provider_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.providers
    WHERE id = p_provider_id AND owner_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is active staff of a provider (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_provider_staff(p_provider_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.provider_staff
    WHERE provider_id = p_provider_id
    AND user_id = p_user_id
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is owner OR staff of a provider (bypasses RLS)
CREATE OR REPLACE FUNCTION public.can_access_provider(p_provider_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.providers
    WHERE id = p_provider_id AND owner_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.provider_staff
    WHERE provider_id = p_provider_id
    AND user_id = p_user_id
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is staff with menu management permission (bypasses RLS)
CREATE OR REPLACE FUNCTION public.can_manage_provider_menu(p_provider_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.providers
    WHERE id = p_provider_id AND owner_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.provider_staff
    WHERE provider_id = p_provider_id
    AND user_id = p_user_id
    AND is_active = true
    AND can_manage_menu = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is staff with orders management permission (bypasses RLS)
CREATE OR REPLACE FUNCTION public.can_manage_provider_orders(p_provider_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.providers
    WHERE id = p_provider_id AND owner_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.provider_staff
    WHERE provider_id = p_provider_id
    AND user_id = p_user_id
    AND is_active = true
    AND can_manage_orders = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user can review an order (order is theirs and delivered)
CREATE OR REPLACE FUNCTION public.can_review_order(p_order_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = p_order_id
    AND customer_id = p_user_id
    AND status = 'delivered'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get provider_id from order (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_order_provider(p_order_id UUID)
RETURNS UUID AS $$
DECLARE
  v_provider_id UUID;
BEGIN
  SELECT provider_id INTO v_provider_id
  FROM public.orders
  WHERE id = p_order_id;
  RETURN v_provider_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- STEP 2: Drop ALL existing problematic policies
-- ============================================================================

-- Drop providers policies
DROP POLICY IF EXISTS "Active providers viewable by everyone" ON public.providers;
DROP POLICY IF EXISTS "Owners can view own providers" ON public.providers;
DROP POLICY IF EXISTS "Staff can view their provider" ON public.providers;
DROP POLICY IF EXISTS "Owners can create providers" ON public.providers;
DROP POLICY IF EXISTS "Owners and staff can update provider" ON public.providers;
DROP POLICY IF EXISTS "Admins have full access to providers" ON public.providers;

-- Drop provider_staff policies
DROP POLICY IF EXISTS "Users can view own staff record" ON public.provider_staff;
DROP POLICY IF EXISTS "Owners can view provider staff" ON public.provider_staff;
DROP POLICY IF EXISTS "Owners can manage staff" ON public.provider_staff;

-- Drop reviews policies
DROP POLICY IF EXISTS "Reviews viewable by everyone" ON public.reviews;
DROP POLICY IF EXISTS "Customers can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Customers can update own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Providers can respond to reviews" ON public.reviews;
DROP POLICY IF EXISTS "reviews_select_policy" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_policy" ON public.reviews;
DROP POLICY IF EXISTS "reviews_update_policy" ON public.reviews;

-- Drop menu_items policies that might cause issues
DROP POLICY IF EXISTS "Available menu items viewable by everyone" ON public.menu_items;
DROP POLICY IF EXISTS "Providers can view own menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Providers can manage menu items" ON public.menu_items;

-- Drop orders policies that might cause issues
DROP POLICY IF EXISTS "Providers can view orders placed with them" ON public.orders;
DROP POLICY IF EXISTS "Providers can update their orders" ON public.orders;

-- Drop order_items policies that might cause issues
DROP POLICY IF EXISTS "Providers can view their order items" ON public.order_items;

-- ============================================================================
-- STEP 3: Recreate PROVIDERS policies (using helper functions)
-- ============================================================================

-- Active providers viewable by everyone (no recursion issue)
CREATE POLICY "providers_select_active"
  ON public.providers FOR SELECT
  USING (status IN ('open', 'closed', 'temporarily_paused', 'on_vacation'));

-- Owners can view their own providers (simple, no recursion)
CREATE POLICY "providers_select_owner"
  ON public.providers FOR SELECT
  USING (owner_id = auth.uid());

-- Staff can view their provider (using helper function to avoid recursion)
CREATE POLICY "providers_select_staff"
  ON public.providers FOR SELECT
  USING (public.is_provider_staff(id, auth.uid()));

-- Owners can create providers
CREATE POLICY "providers_insert_owner"
  ON public.providers FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Owners and staff can update provider (using helper function)
CREATE POLICY "providers_update"
  ON public.providers FOR UPDATE
  USING (public.can_access_provider(id, auth.uid()));

-- Admins have full access
CREATE POLICY "providers_admin"
  ON public.providers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- STEP 4: Recreate PROVIDER_STAFF policies (using helper functions)
-- ============================================================================

-- Staff can view their own record (simple, no recursion)
CREATE POLICY "provider_staff_select_self"
  ON public.provider_staff FOR SELECT
  USING (user_id = auth.uid());

-- Owners can view their provider's staff (using helper function)
CREATE POLICY "provider_staff_select_owner"
  ON public.provider_staff FOR SELECT
  USING (public.is_provider_owner(provider_id, auth.uid()));

-- Owners can manage staff (using helper function)
CREATE POLICY "provider_staff_all_owner"
  ON public.provider_staff FOR ALL
  USING (public.is_provider_owner(provider_id, auth.uid()));

-- ============================================================================
-- STEP 5: Recreate MENU_ITEMS policies (using helper functions)
-- ============================================================================

-- Available menu items viewable by everyone
CREATE POLICY "menu_items_select_public"
  ON public.menu_items FOR SELECT
  USING (is_available = true);

-- Providers can view all their menu items (using helper function)
CREATE POLICY "menu_items_select_provider"
  ON public.menu_items FOR SELECT
  USING (public.can_access_provider(provider_id, auth.uid()));

-- Providers can manage menu items (using helper function)
CREATE POLICY "menu_items_all_provider"
  ON public.menu_items FOR ALL
  USING (public.can_manage_provider_menu(provider_id, auth.uid()));

-- ============================================================================
-- STEP 6: Recreate ORDERS policies (using helper functions)
-- ============================================================================

-- Providers can view orders placed with them (using helper function)
CREATE POLICY "orders_select_provider"
  ON public.orders FOR SELECT
  USING (public.can_access_provider(provider_id, auth.uid()));

-- Providers can update their orders (using helper function)
CREATE POLICY "orders_update_provider"
  ON public.orders FOR UPDATE
  USING (public.can_manage_provider_orders(provider_id, auth.uid()));

-- ============================================================================
-- STEP 7: Recreate ORDER_ITEMS policies (using helper function)
-- ============================================================================

-- Providers can view their order items (using helper function)
CREATE POLICY "order_items_select_provider"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND public.can_access_provider(o.provider_id, auth.uid())
    )
  );

-- ============================================================================
-- STEP 8: Recreate REVIEWS policies (using helper functions)
-- ============================================================================

-- Anyone can view reviews
CREATE POLICY "reviews_select_public"
  ON public.reviews FOR SELECT
  USING (true);

-- Customers can create reviews for delivered orders (using helper function)
CREATE POLICY "reviews_insert_customer"
  ON public.reviews FOR INSERT
  WITH CHECK (
    customer_id = auth.uid()
    AND public.can_review_order(order_id, auth.uid())
  );

-- Customers can update their own reviews
CREATE POLICY "reviews_update_customer"
  ON public.reviews FOR UPDATE
  USING (customer_id = auth.uid());

-- Providers can respond to reviews (using helper function)
CREATE POLICY "reviews_update_provider"
  ON public.reviews FOR UPDATE
  USING (public.is_provider_owner(provider_id, auth.uid()));

-- ============================================================================
-- DONE! All circular dependencies have been resolved using SECURITY DEFINER
-- ============================================================================

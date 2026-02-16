-- ============================================================================
-- Function: update_admin_last_active
-- Updates the last_active_at timestamp for the currently authenticated admin
-- Uses SECURITY DEFINER to bypass RLS (since only super_admin can UPDATE admin_users)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_admin_last_active()
RETURNS VOID AS $$
BEGIN
  UPDATE public.admin_users
  SET last_active_at = NOW()
  WHERE user_id = auth.uid()
    AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.update_admin_last_active() TO authenticated;

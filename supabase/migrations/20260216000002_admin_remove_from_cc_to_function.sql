-- ============================================================================
-- Function: admin_remove_from_cc_to
-- Removes an admin_id from admin_tasks.cc_to UUID arrays
-- Used during admin deletion to clean up array references
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_remove_from_cc_to(p_admin_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.admin_tasks
  SET cc_to = array_remove(cc_to, p_admin_id)
  WHERE p_admin_id = ANY(cc_to);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (called from delete-admin API with service role)
GRANT EXECUTE ON FUNCTION public.admin_remove_from_cc_to(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_from_cc_to(UUID) TO service_role;

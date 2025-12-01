-- ============================================================================
-- Auto-create admin_users records for users with profiles.role = 'admin'
-- إنشاء تلقائي لسجلات admin_users للمستخدمين بدور admin في profiles
-- ============================================================================

-- Step 1: Create admin_users records for users who have admin role in profiles
-- but don't have an admin_users record
INSERT INTO admin_users (user_id, role, is_active, created_at, updated_at)
SELECT
  p.id as user_id,
  'super_admin'::admin_role as role,
  true as is_active,
  NOW() as created_at,
  NOW() as updated_at
FROM profiles p
WHERE p.role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM admin_users au WHERE au.user_id = p.id
  )
ON CONFLICT (user_id) DO NOTHING;

-- Step 2: Report how many records were created
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM admin_users au
  JOIN profiles p ON p.id = au.user_id
  WHERE p.role = 'admin';

  RAISE NOTICE '✓ يوجد % مشرف في النظام', v_count;
END $$;

-- Step 3: Sync to admin_roles if roles table exists
DO $$
DECLARE
  v_admin RECORD;
  v_role_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- Check if roles table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles' AND table_schema = 'public') THEN
    -- Get super_admin role id
    SELECT id INTO v_role_id FROM roles WHERE code = 'super_admin';

    IF v_role_id IS NOT NULL THEN
      -- Sync all admin_users who don't have admin_roles records
      FOR v_admin IN
        SELECT au.id
        FROM admin_users au
        WHERE au.is_active = true
          AND NOT EXISTS (SELECT 1 FROM admin_roles ar WHERE ar.admin_id = au.id)
      LOOP
        INSERT INTO admin_roles (admin_id, role_id, is_primary)
        VALUES (v_admin.id, v_role_id, true)
        ON CONFLICT DO NOTHING;
        v_count := v_count + 1;
      END LOOP;

      RAISE NOTICE '✓ تمت مزامنة % مشرف مع نظام الأدوار الجديد', v_count;
    END IF;
  END IF;
END $$;

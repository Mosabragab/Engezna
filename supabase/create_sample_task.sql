-- ============================================================================
-- CREATE SAMPLE TASK FOR TESTING
-- إنشاء مهمة تجريبية للاختبار
-- ============================================================================
-- Run this AFTER running fix_tasks_visibility.sql
-- ============================================================================

-- Create a sample task assigned to the first super_admin
DO $$
DECLARE
  super_admin_id UUID;
  new_task_id UUID;
BEGIN
  -- Get the first super_admin
  SELECT id INTO super_admin_id
  FROM admin_users
  WHERE role = 'super_admin' AND is_active = true
  LIMIT 1;

  IF super_admin_id IS NULL THEN
    -- Fallback to any active admin
    SELECT id INTO super_admin_id
    FROM admin_users
    WHERE is_active = true
    LIMIT 1;
  END IF;

  IF super_admin_id IS NULL THEN
    RAISE EXCEPTION 'No active admin found! Run fix_admin_users_sync.sql first.';
  END IF;

  -- Create sample task
  INSERT INTO admin_tasks (
    title,
    description,
    type,
    priority,
    status,
    created_by,
    assigned_to,
    deadline
  ) VALUES (
    'مهمة تجريبية للاختبار',
    'هذه مهمة تجريبية تم إنشاؤها للتحقق من عمل نظام المهام بشكل صحيح. يمكن حذفها بعد التأكد.',
    'other',
    'medium',
    'new',
    super_admin_id,
    super_admin_id,
    NOW() + INTERVAL '7 days'
  )
  RETURNING id INTO new_task_id;

  RAISE NOTICE '✅ Sample task created successfully!';
  RAISE NOTICE '   Task ID: %', new_task_id;
  RAISE NOTICE '   Assigned to admin: %', super_admin_id;

  -- Create notification for this task
  INSERT INTO admin_notifications (
    admin_id,
    type,
    title,
    body,
    related_task_id
  ) VALUES (
    super_admin_id,
    'task',
    'مهمة جديدة: مهمة تجريبية للاختبار',
    'تم إنشاء مهمة تجريبية جديدة للتحقق من عمل النظام.',
    new_task_id
  );

  RAISE NOTICE '✅ Notification created for the task';
END $$;

-- Show the created task
SELECT
  'Created Task' as section,
  t.id,
  t.task_number,
  t.title,
  t.status,
  t.priority,
  p.full_name as assigned_to_name,
  t.created_at
FROM admin_tasks t
JOIN admin_users au ON t.assigned_to = au.id
JOIN profiles p ON au.user_id = p.id
ORDER BY t.created_at DESC
LIMIT 1;

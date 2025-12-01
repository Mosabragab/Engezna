-- ============================================================================
-- DIAGNOSTIC SCRIPT FOR ADMIN TASKS VISIBILITY ISSUE
-- سكريبت تشخيصي لمشكلة عدم ظهور المهام
-- ============================================================================
-- Run this in Supabase SQL Editor to identify the problem
-- قم بتشغيل هذا في محرر SQL لقاعدة البيانات لتحديد المشكلة
-- ============================================================================

-- ============================================================================
-- STEP 1: CHECK IF admin_tasks TABLE EXISTS
-- التحقق من وجود جدول admin_tasks
-- ============================================================================
SELECT
  '1. Table Existence Check' as section,
  CASE
    WHEN EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'admin_tasks'
    ) THEN '✅ admin_tasks table EXISTS'
    ELSE '❌ admin_tasks table MISSING - Run migrations!'
  END as admin_tasks_status,
  CASE
    WHEN EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'admin_users'
    ) THEN '✅ admin_users table EXISTS'
    ELSE '❌ admin_users table MISSING - Run migrations!'
  END as admin_users_status,
  CASE
    WHEN EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'admin_notifications'
    ) THEN '✅ admin_notifications table EXISTS'
    ELSE '❌ admin_notifications table MISSING - Run migrations!'
  END as admin_notifications_status;

-- ============================================================================
-- STEP 2: CHECK ADMIN USERS AND THEIR STATUS
-- فحص حالة المشرفين
-- ============================================================================
SELECT
  '2. Admin Users Status' as section,
  au.id as admin_id,
  au.user_id,
  p.full_name,
  p.email,
  p.role as profile_role,
  au.role as admin_role,
  au.is_active,
  CASE
    WHEN au.is_active = true THEN '✅ Active - Can see tasks'
    ELSE '❌ INACTIVE - Cannot see tasks! Set is_active=true'
  END as status
FROM admin_users au
LEFT JOIN profiles p ON au.user_id = p.id
ORDER BY au.created_at;

-- ============================================================================
-- STEP 3: CHECK FOR ADMINS WITHOUT admin_users RECORD
-- فحص المشرفين بدون سجل في admin_users
-- ============================================================================
SELECT
  '3. Missing admin_users Records' as section,
  p.id as user_id,
  p.full_name,
  p.email,
  p.role,
  '❌ Has admin role but NO admin_users entry!' as issue
FROM profiles p
WHERE p.role = 'admin'
AND NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = p.id);

-- ============================================================================
-- STEP 4: CHECK TOTAL TASKS IN DATABASE
-- عدد المهام في قاعدة البيانات
-- ============================================================================
SELECT
  '4. Tasks Summary' as section,
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE status = 'new') as new_tasks,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks
FROM admin_tasks;

-- ============================================================================
-- STEP 5: LIST ALL TASKS (regardless of RLS)
-- عرض جميع المهام (بدون RLS)
-- ============================================================================
SELECT
  '5. All Tasks in Database' as section,
  t.id,
  t.task_number,
  t.title,
  t.status,
  t.priority,
  t.created_by,
  (SELECT p.full_name FROM admin_users a JOIN profiles p ON a.user_id = p.id WHERE a.id = t.created_by) as creator_name,
  t.assigned_to,
  (SELECT p.full_name FROM admin_users a JOIN profiles p ON a.user_id = p.id WHERE a.id = t.assigned_to) as assignee_name,
  t.created_at
FROM admin_tasks t
ORDER BY t.created_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 6: CHECK RLS POLICIES ON admin_tasks
-- فحص سياسات RLS على جدول المهام
-- ============================================================================
SELECT
  '6. RLS Policies on admin_tasks' as section,
  polname as policy_name,
  polcmd as command,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as operation,
  polroles::regrole[] as roles
FROM pg_policy
WHERE polrelid = 'admin_tasks'::regclass;

-- ============================================================================
-- STEP 7: CHECK IF RLS IS ENABLED
-- هل RLS مفعّل؟
-- ============================================================================
SELECT
  '7. RLS Status' as section,
  relname as table_name,
  relrowsecurity as rls_enabled,
  CASE relrowsecurity
    WHEN true THEN '✅ RLS enabled'
    ELSE '⚠️ RLS disabled - all data visible'
  END as status
FROM pg_class
WHERE relname IN ('admin_tasks', 'admin_users', 'admin_notifications');

-- ============================================================================
-- STEP 8: CHECK FOR SUPER ADMIN
-- هل يوجد مشرف عام؟
-- ============================================================================
SELECT
  '8. Super Admins' as section,
  au.id as admin_id,
  p.full_name,
  p.email,
  au.role,
  au.is_active,
  CASE
    WHEN au.role = 'super_admin' AND au.is_active THEN '✅ Can see all tasks'
    ELSE '⚠️ Limited access'
  END as access_level
FROM admin_users au
JOIN profiles p ON au.user_id = p.id
WHERE au.role = 'super_admin';

-- ============================================================================
-- SUMMARY
-- ملخص
-- ============================================================================
SELECT
  'SUMMARY' as section,
  (SELECT COUNT(*) FROM admin_tasks) as total_tasks,
  (SELECT COUNT(*) FROM admin_users WHERE is_active = true) as active_admins,
  (SELECT COUNT(*) FROM admin_users WHERE is_active = false) as inactive_admins,
  (SELECT COUNT(*) FROM profiles WHERE role = 'admin' AND NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = profiles.id)) as admins_without_record;

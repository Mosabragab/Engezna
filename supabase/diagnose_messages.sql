-- ============================================================================
-- DIAGNOSTIC SCRIPT FOR INTERNAL MESSAGES VISIBILITY ISSUE
-- سكريبت تشخيصي لمشكلة عدم ظهور الرسائل الداخلية
-- ============================================================================
-- Run this in Supabase SQL Editor to identify the problem
-- قم بتشغيل هذا في محرر SQL لقاعدة البيانات لتحديد المشكلة
-- ============================================================================

-- 1. CHECK ALL ADMIN USERS AND THEIR STATUS
-- فحص جميع المشرفين وحالتهم
SELECT
  '1. Admin Users Status' as section,
  au.id as admin_id,
  au.user_id,
  p.full_name,
  p.email,
  p.role as profile_role,
  au.role as admin_role,
  au.is_active,
  CASE
    WHEN au.is_active = true THEN '✅ Active - Can see messages'
    ELSE '❌ INACTIVE - Cannot see messages! Run fix_admin_users_sync.sql'
  END as status
FROM admin_users au
JOIN profiles p ON au.user_id = p.id
ORDER BY au.created_at;

-- 2. CHECK ALL MESSAGES AND THEIR RECIPIENTS
-- فحص جميع الرسائل والمستلمين
SELECT
  '2. Messages Overview' as section,
  im.id as message_id,
  im.subject,
  LEFT(im.body, 50) as body_preview,
  im.sender_id,
  (SELECT p.full_name FROM admin_users a JOIN profiles p ON a.user_id = p.id WHERE a.id = im.sender_id) as sender_name,
  array_length(im.recipient_ids, 1) as recipient_count,
  im.recipient_ids,
  im.is_broadcast,
  im.created_at
FROM internal_messages im
ORDER BY im.created_at DESC
LIMIT 10;

-- 3. Check if recipient_ids match actual admin_users
SELECT
  'Recipient Validation' as section,
  im.id as message_id,
  im.subject,
  unnest(im.recipient_ids) as recipient_id,
  CASE
    WHEN EXISTS (SELECT 1 FROM admin_users WHERE id = unnest(im.recipient_ids))
    THEN '✅ Valid admin_id'
    ELSE '❌ Invalid! admin_id does not exist'
  END as validation
FROM internal_messages im;

-- 4. Check for admins in profiles table without admin_users entry
SELECT
  'Missing Admin Records' as section,
  p.id as user_id,
  p.full_name,
  p.email,
  p.role,
  '❌ Has admin role but NO admin_users entry!' as issue
FROM profiles p
WHERE p.role = 'admin'
AND NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = p.id);

-- 5. Check notifications for messages
SELECT
  'Notifications' as section,
  an.id,
  an.admin_id,
  (SELECT p.full_name FROM admin_users a JOIN profiles p ON a.user_id = p.id WHERE a.id = an.admin_id) as recipient_name,
  an.type,
  an.title,
  an.is_read,
  an.created_at
FROM admin_notifications an
WHERE an.type = 'message'
ORDER BY an.created_at DESC
LIMIT 10;

-- 6. Summary: Count of active vs inactive admins
SELECT
  'Summary' as section,
  COUNT(*) FILTER (WHERE is_active = true) as active_admins,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_admins,
  COUNT(*) as total_admins
FROM admin_users;

-- 7. Direct test: What messages can a specific user see?
-- Replace 'USER_ID_HERE' with actual auth.uid() to test
-- SELECT * FROM internal_messages WHERE EXISTS (
--   SELECT 1 FROM admin_users
--   WHERE user_id = 'USER_ID_HERE'
--   AND is_active = true
--   AND (
--     id = internal_messages.sender_id
--     OR id = ANY(internal_messages.recipient_ids)
--     OR internal_messages.is_broadcast = true
--   )
-- );

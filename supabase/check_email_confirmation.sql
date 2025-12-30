-- ============================================================================
-- استعلامات للكشف على نظام تأكيد البريد الإلكتروني
-- Email Confirmation System Diagnostic Queries
-- ============================================================================

-- 1. التحقق من المستخدمين الذين لم يؤكدوا بريدهم
-- Check users who haven't confirmed their email
SELECT
    id,
    email,
    email_confirmed_at,
    created_at,
    CASE
        WHEN email_confirmed_at IS NULL THEN '❌ غير مؤكد / Not Confirmed'
        ELSE '✅ مؤكد / Confirmed'
    END as confirmation_status,
    EXTRACT(DAY FROM NOW() - created_at) as days_since_signup
FROM auth.users
ORDER BY created_at DESC
LIMIT 50;

-- ============================================================================

-- 2. إحصائيات تأكيد البريد الإلكتروني
-- Email confirmation statistics
SELECT
    COUNT(*) as total_users,
    COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as confirmed_users,
    COUNT(CASE WHEN email_confirmed_at IS NULL THEN 1 END) as unconfirmed_users,
    ROUND(
        COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END)::numeric /
        NULLIF(COUNT(*)::numeric, 0) * 100,
        2
    ) as confirmation_rate_percent
FROM auth.users;

-- ============================================================================

-- 3. تحليل المستخدمين حسب الدور مع حالة التأكيد
-- User analysis by role with confirmation status
SELECT
    p.role,
    COUNT(*) as total,
    COUNT(CASE WHEN u.email_confirmed_at IS NOT NULL THEN 1 END) as confirmed,
    COUNT(CASE WHEN u.email_confirmed_at IS NULL THEN 1 END) as not_confirmed
FROM profiles p
JOIN auth.users u ON p.id = u.id
GROUP BY p.role
ORDER BY total DESC;

-- ============================================================================

-- 4. التحقق من إعدادات Auth في Supabase
-- Check auth settings (requires admin access)
-- This shows if email confirmation is required
SELECT
    name,
    value
FROM auth.config
WHERE name IN (
    'MAILER_AUTOCONFIRM',
    'MAILER_SECURE_EMAIL_CHANGE_ENABLED',
    'SECURITY_CONFIRMEMAIL'
);

-- ============================================================================

-- 5. آخر 20 مستخدم تم تسجيلهم
-- Last 20 registered users
SELECT
    u.id,
    u.email,
    u.created_at as signup_date,
    u.email_confirmed_at,
    u.last_sign_in_at,
    p.role,
    p.full_name,
    CASE
        WHEN u.email_confirmed_at IS NULL AND u.last_sign_in_at IS NOT NULL
            THEN '⚠️ يستخدم بدون تأكيد / Using without confirmation'
        WHEN u.email_confirmed_at IS NULL
            THEN '🔴 لم يؤكد البريد / Email not confirmed'
        WHEN u.email_confirmed_at IS NOT NULL AND u.last_sign_in_at IS NOT NULL
            THEN '✅ مؤكد ونشط / Confirmed & Active'
        ELSE '✅ مؤكد / Confirmed'
    END as status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 20;

-- ============================================================================

-- 6. التحقق من دعوات المشرفين والتجار
-- Check admin and provider invitations
SELECT
    'Admin Invitations' as type,
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
    COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired
FROM admin_invitations
UNION ALL
SELECT
    'Provider Invitations' as type,
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
    COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired
FROM provider_invitations;

-- ============================================================================

-- 7. قوالب البريد الإلكتروني (إذا وجدت)
-- Email templates (if exist in custom table)
-- SELECT * FROM email_templates;

-- ============================================================================

-- 8. سجل إرسال البريد الإلكتروني (إذا وجد)
-- Email sending log (if exists)
-- SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 20;

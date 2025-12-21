-- ============================================================================
-- Assign Default Permissions to New Roles
-- تعيين الصلاحيات الافتراضية للأدوار الجديدة
-- ============================================================================
-- Version: 1.0
-- Created: 2025-12-21
-- Description: Assigns default permissions to regional_manager, orders_moderator,
--              support_agent, analyst, and viewer roles
-- ============================================================================

-- ============================================================================
-- 1. REGIONAL MANAGER (مدير منطقة)
-- إدارة المتاجر والطلبات والعملاء في منطقته
-- ============================================================================
SELECT assign_permission_to_role('regional_manager', 'dashboard.view');
SELECT assign_permission_to_role('regional_manager', 'providers.view');
SELECT assign_permission_to_role('regional_manager', 'providers.update');
SELECT assign_permission_to_role('regional_manager', 'providers.approve');
SELECT assign_permission_to_role('regional_manager', 'orders.view');
SELECT assign_permission_to_role('regional_manager', 'orders.update');
SELECT assign_permission_to_role('regional_manager', 'customers.view');
SELECT assign_permission_to_role('regional_manager', 'customers.update');
SELECT assign_permission_to_role('regional_manager', 'analytics.view');
SELECT assign_permission_to_role('regional_manager', 'locations.view');
SELECT assign_permission_to_role('regional_manager', 'support.view');
SELECT assign_permission_to_role('regional_manager', 'tasks.view');
SELECT assign_permission_to_role('regional_manager', 'tasks.create');
SELECT assign_permission_to_role('regional_manager', 'tasks.update');
SELECT assign_permission_to_role('regional_manager', 'approvals.view');
SELECT assign_permission_to_role('regional_manager', 'approvals.create');
SELECT assign_permission_to_role('regional_manager', 'messages.view');
SELECT assign_permission_to_role('regional_manager', 'messages.create');
SELECT assign_permission_to_role('regional_manager', 'announcements.view');
SELECT assign_permission_to_role('regional_manager', 'disputes.view');
SELECT assign_permission_to_role('regional_manager', 'disputes.update');

-- ============================================================================
-- 2. ORDERS MODERATOR (مشرف الطلبات)
-- إدارة الطلبات والتواصل مع العملاء والمتاجر
-- ============================================================================
SELECT assign_permission_to_role('orders_moderator', 'dashboard.view');
SELECT assign_permission_to_role('orders_moderator', 'providers.view');
SELECT assign_permission_to_role('orders_moderator', 'orders.view');
SELECT assign_permission_to_role('orders_moderator', 'orders.update');
SELECT assign_permission_to_role('orders_moderator', 'customers.view');
SELECT assign_permission_to_role('orders_moderator', 'support.view');
SELECT assign_permission_to_role('orders_moderator', 'support.create');
SELECT assign_permission_to_role('orders_moderator', 'tasks.view');
SELECT assign_permission_to_role('orders_moderator', 'tasks.update');
SELECT assign_permission_to_role('orders_moderator', 'messages.view');
SELECT assign_permission_to_role('orders_moderator', 'messages.create');
SELECT assign_permission_to_role('orders_moderator', 'announcements.view');
SELECT assign_permission_to_role('orders_moderator', 'disputes.view');

-- ============================================================================
-- 3. SUPPORT AGENT (موظف دعم)
-- دعم العملاء والتذاكر
-- ============================================================================
SELECT assign_permission_to_role('support_agent', 'dashboard.view');
SELECT assign_permission_to_role('support_agent', 'providers.view');
SELECT assign_permission_to_role('support_agent', 'orders.view');
SELECT assign_permission_to_role('support_agent', 'customers.view');
SELECT assign_permission_to_role('support_agent', 'support.view');
SELECT assign_permission_to_role('support_agent', 'support.create');
SELECT assign_permission_to_role('support_agent', 'support.update');
SELECT assign_permission_to_role('support_agent', 'tasks.view');
SELECT assign_permission_to_role('support_agent', 'tasks.update');
SELECT assign_permission_to_role('support_agent', 'messages.view');
SELECT assign_permission_to_role('support_agent', 'messages.create');
SELECT assign_permission_to_role('support_agent', 'announcements.view');
SELECT assign_permission_to_role('support_agent', 'disputes.view');
SELECT assign_permission_to_role('support_agent', 'disputes.update');

-- ============================================================================
-- 4. ANALYST (محلل بيانات)
-- عرض التحليلات والتقارير فقط
-- ============================================================================
SELECT assign_permission_to_role('analyst', 'dashboard.view');
SELECT assign_permission_to_role('analyst', 'providers.view');
SELECT assign_permission_to_role('analyst', 'orders.view');
SELECT assign_permission_to_role('analyst', 'customers.view');
SELECT assign_permission_to_role('analyst', 'finance.view');
SELECT assign_permission_to_role('analyst', 'analytics.view');
SELECT assign_permission_to_role('analyst', 'analytics.export');
SELECT assign_permission_to_role('analyst', 'locations.view');
SELECT assign_permission_to_role('analyst', 'announcements.view');
SELECT assign_permission_to_role('analyst', 'activity_log.view');

-- ============================================================================
-- 5. VIEWER (مراقب)
-- عرض فقط - بدون أي تعديل
-- ============================================================================
SELECT assign_permission_to_role('viewer', 'dashboard.view');
SELECT assign_permission_to_role('viewer', 'providers.view');
SELECT assign_permission_to_role('viewer', 'orders.view');
SELECT assign_permission_to_role('viewer', 'customers.view');
SELECT assign_permission_to_role('viewer', 'analytics.view');
SELECT assign_permission_to_role('viewer', 'locations.view');
SELECT assign_permission_to_role('viewer', 'announcements.view');

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

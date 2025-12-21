-- ============================================================================
-- Extend admin_role enum with new role codes
-- توسيع enum الأدوار ليشمل الأدوار الجديدة
-- ============================================================================
-- Version: 1.1
-- Created: 2025-12-21
-- Description: Adds missing role codes to the admin_role enum to match
--              the roles table. This fixes the admin invitation and
--              registration errors when using newer role codes.
-- ============================================================================

-- ============================================================================
-- 1. ADD MISSING VALUES TO admin_role ENUM
-- ============================================================================

-- PostgreSQL 9.3+ supports ADD VALUE IF NOT EXISTS
-- These are the roles from the roles table that are missing from admin_role enum:
-- - store_supervisor
-- - regional_manager
-- - orders_moderator
-- - support_agent
-- - analyst
-- - viewer

-- Note: ALTER TYPE ... ADD VALUE cannot be inside a transaction block with
-- other statements. Each ADD VALUE must be in its own statement.

ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'store_supervisor';
ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'regional_manager';
ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'orders_moderator';
ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'support_agent';
ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'analyst';
ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'viewer';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

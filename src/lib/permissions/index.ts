// ═══════════════════════════════════════════════════════════════════════
// نظام الصلاحيات - Permissions Module
// ═══════════════════════════════════════════════════════════════════════

export { PermissionService, createServerPermissionService } from './permission-service';
export type { EscalationCheckResult } from './permission-service';
export {
  PermissionsProvider,
  usePermissions,
  useCanAccess,
  usePermissionGate,
} from './use-permissions';
export type {
  Permission,
  Resource,
  Action,
  Role,
  RolePermission,
  AdminRole,
  AdminPermission,
  PermissionConstraints,
  GeographicConstraint,
  TimeConstraint,
  PermissionCheckRequest,
  PermissionCheckResult,
  PermissionCheckContext,
  AdminPermissions,
  ResourceCode,
  ActionCode,
  PermissionCode,
  SidebarItem,
  AuditLogEntry,
  EscalationRule,
  RESOURCE_CONFIG,
  ACTION_CONFIG,
} from '@/types/permissions';

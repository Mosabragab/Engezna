// ═══════════════════════════════════════════════════════════════════════
// نظام الصلاحيات المتقدم - Types
// ═══════════════════════════════════════════════════════════════════════

// الموارد المتاحة في النظام
export type ResourceCode =
  | 'dashboard'
  | 'providers'
  | 'orders'
  | 'customers'
  | 'finance'
  | 'analytics'
  | 'support'
  | 'locations'
  | 'team'
  | 'approvals'
  | 'tasks'
  | 'messages'
  | 'announcements'
  | 'promotions'
  | 'settings'
  | 'activity_log';

// الإجراءات المتاحة
export type ActionCode =
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'export'
  | 'assign'
  | 'escalate'
  | 'refund'
  | 'ban'
  | 'settle';

// كود الصلاحية (resource.action)
export type PermissionCode = `${ResourceCode}.${ActionCode}`;

// القيود الجغرافية
export interface GeographicConstraint {
  governorates?: string[];
  cities?: string[];
  districts?: string[];
}

// قيود الوقت
export interface TimeConstraint {
  start: string;  // HH:mm
  end: string;    // HH:mm
  days: number[]; // 0-6 (Sunday-Saturday)
}

// قيود الصلاحية
export interface PermissionConstraints {
  geographic?: GeographicConstraint;
  provider_categories?: string[];
  amount_limit?: number;
  own_only?: boolean;
  assigned_only?: boolean;
  requires_approval?: boolean;
  approval_threshold?: number;
  fields?: string[];
  time_restriction?: TimeConstraint;
  aggregated_only?: boolean;
}

// صلاحية كاملة مع القيود
export interface Permission {
  id: string;
  code: PermissionCode;
  resource_code: ResourceCode;
  action_code: ActionCode;
  constraints?: PermissionConstraints;
  grant_type?: 'grant' | 'deny';
}

// المورد
export interface Resource {
  id: string;
  code: ResourceCode;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  icon?: string;
  parent_resource_id?: string;
  sort_order: number;
  is_active: boolean;
}

// الإجراء
export interface Action {
  id: string;
  code: ActionCode;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  requires_reason: boolean;
}

// الدور
export interface Role {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  color: string;
  icon: string;
  is_system: boolean;
  is_active: boolean;
  permissions?: RolePermission[];
}

// صلاحية الدور
export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  permission?: Permission;
  constraints: PermissionConstraints;
  expires_at?: string;
}

// دور المشرف
export interface AdminRole {
  id: string;
  admin_id: string;
  role_id: string;
  role?: Role;
  is_primary: boolean;
  custom_constraints: PermissionConstraints;
  assigned_at: string;
  expires_at?: string;
}

// صلاحية مخصصة للمشرف
export interface AdminPermission {
  id: string;
  admin_id: string;
  permission_id: string;
  permission?: Permission;
  grant_type: 'grant' | 'deny';
  constraints: PermissionConstraints;
  reason?: string;
  expires_at?: string;
}

// سياق التحقق من الصلاحية
export interface PermissionCheckContext {
  entityId?: string;
  entityType?: string;
  amount?: number;
  governorateId?: string;
  cityId?: string;
  districtId?: string;
  providerCategory?: string;
  ownerId?: string;
  assignedTo?: string;
}

// طلب التحقق من الصلاحية
export interface PermissionCheckRequest {
  resource: ResourceCode;
  action: ActionCode;
  context?: PermissionCheckContext;
}

// نتيجة التحقق من الصلاحية
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: 'no_permission' | 'geographic_restriction' | 'amount_exceeded' | 'own_only' | 'not_assigned' | 'time_restriction' | 'denied' | 'expired';
  requiresApproval?: boolean;
  constraint?: PermissionConstraints;
}

// صلاحيات المشرف الكاملة (محملة من قاعدة البيانات)
export interface AdminPermissions {
  adminId: string;
  roles: AdminRole[];
  directPermissions: AdminPermission[];
  effectivePermissions: Permission[];
  geographicScope: GeographicConstraint;
}

// عنصر القائمة الجانبية
export interface SidebarItem {
  resource: ResourceCode;
  label: { ar: string; en: string };
  icon: string;
  href: string;
  children?: SidebarItem[];
}

// سجل التدقيق
export interface AuditLogEntry {
  id: string;
  admin_id: string;
  resource_code: ResourceCode;
  action_code: ActionCode;
  permission_code: PermissionCode;
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  changes?: Record<string, unknown>;
  status: 'success' | 'denied' | 'failed';
  denial_reason?: string;
  ip_address?: string;
  created_at: string;
}

// قاعدة التصعيد
export interface EscalationRule {
  id: string;
  name_ar: string;
  name_en: string;
  trigger_type: 'threshold' | 'count' | 'time' | 'pattern';
  trigger_conditions: Record<string, unknown>;
  escalate_to_role_id?: string;
  escalate_to_admin_id?: string;
  action_type: 'require_approval' | 'notify' | 'block';
  priority: number;
  is_active: boolean;
}

// ثوابت الموارد مع الأيقونات والمسارات
export const RESOURCE_CONFIG: Record<ResourceCode, {
  icon: string;
  href: string;
  label: { ar: string; en: string };
  category: 'main' | 'team' | 'system';
}> = {
  dashboard: {
    icon: 'LayoutDashboard',
    href: '/admin',
    label: { ar: 'الرئيسية', en: 'Dashboard' },
    category: 'main',
  },
  providers: {
    icon: 'Store',
    href: '/admin/providers',
    label: { ar: 'المتاجر', en: 'Providers' },
    category: 'main',
  },
  orders: {
    icon: 'ShoppingBag',
    href: '/admin/orders',
    label: { ar: 'الطلبات', en: 'Orders' },
    category: 'main',
  },
  customers: {
    icon: 'Users',
    href: '/admin/customers',
    label: { ar: 'العملاء', en: 'Customers' },
    category: 'main',
  },
  finance: {
    icon: 'Wallet',
    href: '/admin/finance',
    label: { ar: 'المالية', en: 'Finance' },
    category: 'main',
  },
  analytics: {
    icon: 'BarChart3',
    href: '/admin/analytics',
    label: { ar: 'التحليلات', en: 'Analytics' },
    category: 'main',
  },
  support: {
    icon: 'Headphones',
    href: '/admin/support',
    label: { ar: 'الدعم', en: 'Support' },
    category: 'main',
  },
  locations: {
    icon: 'MapPin',
    href: '/admin/locations',
    label: { ar: 'المواقع', en: 'Locations' },
    category: 'main',
  },
  team: {
    icon: 'UserCog',
    href: '/admin/supervisors',
    label: { ar: 'المشرفين', en: 'Team' },
    category: 'team',
  },
  tasks: {
    icon: 'ListTodo',
    href: '/admin/tasks',
    label: { ar: 'المهام', en: 'Tasks' },
    category: 'team',
  },
  approvals: {
    icon: 'CheckSquare',
    href: '/admin/approvals',
    label: { ar: 'الموافقات', en: 'Approvals' },
    category: 'team',
  },
  messages: {
    icon: 'MessageSquare',
    href: '/admin/messages',
    label: { ar: 'المراسلات الداخلية', en: 'Internal Messages' },
    category: 'team',
  },
  announcements: {
    icon: 'Megaphone',
    href: '/admin/announcements',
    label: { ar: 'الإعلانات', en: 'Announcements' },
    category: 'team',
  },
  promotions: {
    icon: 'Tag',
    href: '/admin/promotions',
    label: { ar: 'العروض', en: 'Promotions' },
    category: 'main',
  },
  settings: {
    icon: 'Settings',
    href: '/admin/settings',
    label: { ar: 'الإعدادات', en: 'Settings' },
    category: 'system',
  },
  activity_log: {
    icon: 'History',
    href: '/admin/activity',
    label: { ar: 'سجل النشاط', en: 'Activity Log' },
    category: 'system',
  },
};

// ثوابت الإجراءات
export const ACTION_CONFIG: Record<ActionCode, {
  label: { ar: string; en: string };
  severity: 'low' | 'medium' | 'high' | 'critical';
}> = {
  view: { label: { ar: 'عرض', en: 'View' }, severity: 'low' },
  create: { label: { ar: 'إنشاء', en: 'Create' }, severity: 'medium' },
  update: { label: { ar: 'تعديل', en: 'Update' }, severity: 'medium' },
  delete: { label: { ar: 'حذف', en: 'Delete' }, severity: 'high' },
  approve: { label: { ar: 'موافقة', en: 'Approve' }, severity: 'high' },
  reject: { label: { ar: 'رفض', en: 'Reject' }, severity: 'high' },
  export: { label: { ar: 'تصدير', en: 'Export' }, severity: 'medium' },
  assign: { label: { ar: 'تعيين', en: 'Assign' }, severity: 'medium' },
  escalate: { label: { ar: 'تصعيد', en: 'Escalate' }, severity: 'medium' },
  refund: { label: { ar: 'استرداد', en: 'Refund' }, severity: 'critical' },
  ban: { label: { ar: 'حظر', en: 'Ban' }, severity: 'critical' },
  settle: { label: { ar: 'تسوية', en: 'Settle' }, severity: 'critical' },
};

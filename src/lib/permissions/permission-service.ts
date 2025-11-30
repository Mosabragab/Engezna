// ═══════════════════════════════════════════════════════════════════════
// خدمة الصلاحيات - Permission Service
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/client';
import type {
  Permission,
  PermissionCheckRequest,
  PermissionCheckResult,
  PermissionConstraints,
  GeographicConstraint,
  AdminRole,
  AdminPermission,
  ResourceCode,
  ActionCode,
  PermissionCode,
} from '@/types/permissions';

export class PermissionService {
  private adminId: string;
  private userId: string;
  private roles: AdminRole[] = [];
  private directPermissions: AdminPermission[] = [];
  private effectivePermissions: Map<PermissionCode, Permission> = new Map();
  private deniedPermissions: Set<PermissionCode> = new Set();
  private loaded: boolean = false;

  constructor(adminId: string, userId: string) {
    this.adminId = adminId;
    this.userId = userId;
  }

  // تحميل الصلاحيات من قاعدة البيانات
  async load(): Promise<void> {
    if (this.loaded) return;

    const supabase = createClient();

    try {
      // 1. جلب أدوار المشرف
      const { data: adminRoles, error: rolesError } = await supabase
        .from('admin_roles')
        .select(`
          *,
          role:roles (
            id,
            code,
            name_ar,
            name_en,
            color,
            icon,
            is_system
          )
        `)
        .eq('admin_id', this.adminId)
        .or('expires_at.is.null,expires_at.gt.now()');

      if (rolesError) {
        console.error('Error loading admin roles:', rolesError);
      } else {
        this.roles = adminRoles || [];
      }

      // 2. جلب صلاحيات كل دور
      const roleIds = this.roles.map(r => r.role_id);

      if (roleIds.length > 0) {
        const { data: rolePermissions, error: rpError } = await supabase
          .from('role_permissions')
          .select(`
            *,
            permission:permissions (
              id,
              code,
              resource_id,
              action_id,
              resource:resources (code),
              action:actions (code)
            )
          `)
          .in('role_id', roleIds)
          .or('expires_at.is.null,expires_at.gt.now()');

        if (rpError) {
          console.error('Error loading role permissions:', rpError);
        } else if (rolePermissions) {
          // دمج الصلاحيات من كل الأدوار
          for (const rp of rolePermissions) {
            if (rp.permission) {
              const code = rp.permission.code as PermissionCode;
              const adminRole = this.roles.find(r => r.role_id === rp.role_id);

              // دمج القيود من الدور والصلاحية
              const mergedConstraints = this.mergeConstraints(
                rp.constraints || {},
                adminRole?.custom_constraints || {}
              );

              this.effectivePermissions.set(code, {
                id: rp.permission.id,
                code,
                resource_code: rp.permission.resource?.code as ResourceCode,
                action_code: rp.permission.action?.code as ActionCode,
                constraints: mergedConstraints,
              });
            }
          }
        }
      }

      // 3. جلب الصلاحيات المخصصة للمشرف
      const { data: directPerms, error: dpError } = await supabase
        .from('admin_permissions')
        .select(`
          *,
          permission:permissions (
            id,
            code,
            resource:resources (code),
            action:actions (code)
          )
        `)
        .eq('admin_id', this.adminId)
        .or('expires_at.is.null,expires_at.gt.now()');

      if (dpError) {
        console.error('Error loading direct permissions:', dpError);
      } else if (directPerms) {
        this.directPermissions = directPerms;

        // تطبيق الصلاحيات المخصصة (إضافة/منع)
        for (const dp of directPerms) {
          if (dp.permission) {
            const code = dp.permission.code as PermissionCode;

            if (dp.grant_type === 'deny') {
              // منع الصلاحية
              this.deniedPermissions.add(code);
              this.effectivePermissions.delete(code);
            } else {
              // إضافة الصلاحية
              this.effectivePermissions.set(code, {
                id: dp.permission.id,
                code,
                resource_code: dp.permission.resource?.code as ResourceCode,
                action_code: dp.permission.action?.code as ActionCode,
                constraints: dp.constraints || {},
              });
            }
          }
        }
      }

      this.loaded = true;
    } catch (error) {
      console.error('Error loading permissions:', error);
      throw error;
    }
  }

  // التحقق من صلاحية معينة
  async can(request: PermissionCheckRequest): Promise<PermissionCheckResult> {
    await this.load();

    const code = `${request.resource}.${request.action}` as PermissionCode;

    // التحقق من المنع المباشر
    if (this.deniedPermissions.has(code)) {
      return { allowed: false, reason: 'denied' };
    }

    // جلب الصلاحية
    const permission = this.effectivePermissions.get(code);

    if (!permission) {
      return { allowed: false, reason: 'no_permission' };
    }

    // التحقق من القيود
    if (permission.constraints && request.context) {
      return this.checkConstraints(permission.constraints, request.context);
    }

    return { allowed: true };
  }

  // التحقق من عدة صلاحيات
  async canAll(requests: PermissionCheckRequest[]): Promise<boolean> {
    const results = await Promise.all(requests.map(r => this.can(r)));
    return results.every(r => r.allowed);
  }

  // التحقق من أي صلاحية
  async canAny(requests: PermissionCheckRequest[]): Promise<boolean> {
    const results = await Promise.all(requests.map(r => this.can(r)));
    return results.some(r => r.allowed);
  }

  // جلب الموارد المسموح الوصول لها
  async getAccessibleResources(): Promise<ResourceCode[]> {
    await this.load();

    const resources = new Set<ResourceCode>();

    for (const [code] of this.effectivePermissions) {
      const [resource] = code.split('.') as [ResourceCode, ActionCode];
      // نعتبر المورد متاحاً إذا كان لديه على الأقل صلاحية view
      if (code.endsWith('.view')) {
        resources.add(resource);
      }
    }

    return Array.from(resources);
  }

  // جلب الإجراءات المسموحة لمورد معين
  async getResourceActions(resource: ResourceCode): Promise<ActionCode[]> {
    await this.load();

    const actions: ActionCode[] = [];

    for (const [code] of this.effectivePermissions) {
      if (code.startsWith(`${resource}.`)) {
        const action = code.split('.')[1] as ActionCode;
        actions.push(action);
      }
    }

    return actions;
  }

  // جلب النطاق الجغرافي
  async getGeographicScope(): Promise<GeographicConstraint> {
    await this.load();

    const scope: GeographicConstraint = {
      governorates: [],
      cities: [],
      districts: [],
    };

    // دمج القيود الجغرافية من جميع الصلاحيات
    for (const [, permission] of this.effectivePermissions) {
      if (permission.constraints?.geographic) {
        const geo = permission.constraints.geographic;
        if (geo.governorates) {
          scope.governorates = [...new Set([...scope.governorates!, ...geo.governorates])];
        }
        if (geo.cities) {
          scope.cities = [...new Set([...scope.cities!, ...geo.cities])];
        }
        if (geo.districts) {
          scope.districts = [...new Set([...scope.districts!, ...geo.districts])];
        }
      }
    }

    return scope;
  }

  // جلب الأدوار
  getRoles(): AdminRole[] {
    return this.roles;
  }

  // جلب الدور الرئيسي
  getPrimaryRole(): AdminRole | undefined {
    return this.roles.find(r => r.is_primary) || this.roles[0];
  }

  // هل المشرف super_admin؟
  isSuperAdmin(): boolean {
    return this.roles.some(r => r.role?.code === 'super_admin');
  }

  // التحقق من القيود
  private checkConstraints(
    constraints: PermissionConstraints,
    context: PermissionCheckRequest['context']
  ): PermissionCheckResult {
    if (!context) return { allowed: true };

    // 1. التحقق الجغرافي
    if (constraints.geographic) {
      const geo = constraints.geographic;

      if (context.governorateId && geo.governorates?.length) {
        if (!geo.governorates.includes(context.governorateId)) {
          return { allowed: false, reason: 'geographic_restriction' };
        }
      }

      if (context.cityId && geo.cities?.length) {
        if (!geo.cities.includes(context.cityId)) {
          return { allowed: false, reason: 'geographic_restriction' };
        }
      }

      if (context.districtId && geo.districts?.length) {
        if (!geo.districts.includes(context.districtId)) {
          return { allowed: false, reason: 'geographic_restriction' };
        }
      }
    }

    // 2. التحقق من الحد المالي
    if (constraints.amount_limit !== undefined && context.amount !== undefined) {
      if (context.amount > constraints.amount_limit) {
        if (constraints.requires_approval) {
          return {
            allowed: true,
            requiresApproval: true,
            constraint: constraints,
          };
        }
        return { allowed: false, reason: 'amount_exceeded' };
      }
    }

    // 3. التحقق من الملكية
    if (constraints.own_only && context.ownerId) {
      if (context.ownerId !== this.userId) {
        return { allowed: false, reason: 'own_only' };
      }
    }

    // 4. التحقق من التعيين
    if (constraints.assigned_only && context.assignedTo) {
      if (context.assignedTo !== this.adminId && context.assignedTo !== this.userId) {
        return { allowed: false, reason: 'not_assigned' };
      }
    }

    // 5. التحقق من نوع المتجر
    if (constraints.provider_categories?.length && context.providerCategory) {
      if (!constraints.provider_categories.includes(context.providerCategory)) {
        return { allowed: false, reason: 'no_permission' };
      }
    }

    // 6. التحقق من الوقت
    if (constraints.time_restriction) {
      if (!this.checkTimeRestriction(constraints.time_restriction)) {
        return { allowed: false, reason: 'time_restriction' };
      }
    }

    return { allowed: true };
  }

  // التحقق من قيود الوقت
  private checkTimeRestriction(restriction: PermissionConstraints['time_restriction']): boolean {
    if (!restriction) return true;

    const now = new Date();
    const day = now.getDay();
    const time = now.toTimeString().slice(0, 5); // HH:mm

    // التحقق من اليوم
    if (restriction.days && !restriction.days.includes(day)) {
      return false;
    }

    // التحقق من الوقت
    if (restriction.start && restriction.end) {
      if (time < restriction.start || time > restriction.end) {
        return false;
      }
    }

    return true;
  }

  // دمج القيود
  private mergeConstraints(
    roleConstraints: PermissionConstraints,
    customConstraints: PermissionConstraints
  ): PermissionConstraints {
    // القيود المخصصة تُضاف للقيود الأصلية (لا تستبدلها)
    return {
      ...roleConstraints,
      geographic: {
        governorates: [
          ...(roleConstraints.geographic?.governorates || []),
          ...(customConstraints.geographic?.governorates || []),
        ],
        cities: [
          ...(roleConstraints.geographic?.cities || []),
          ...(customConstraints.geographic?.cities || []),
        ],
        districts: [
          ...(roleConstraints.geographic?.districts || []),
          ...(customConstraints.geographic?.districts || []),
        ],
      },
      amount_limit: customConstraints.amount_limit ?? roleConstraints.amount_limit,
      own_only: customConstraints.own_only ?? roleConstraints.own_only,
      assigned_only: customConstraints.assigned_only ?? roleConstraints.assigned_only,
      requires_approval: customConstraints.requires_approval ?? roleConstraints.requires_approval,
    };
  }
}

// إنشاء خدمة الصلاحيات من السيرفر
export async function createServerPermissionService(): Promise<PermissionService | null> {
  const { createClient: createServerClient } = await import('@/lib/supabase/server');
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // جلب admin_id
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!adminUser) return null;

  const service = new PermissionService(adminUser.id, user.id);
  await service.load();

  return service;
}

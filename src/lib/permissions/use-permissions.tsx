'use client';

// ═══════════════════════════════════════════════════════════════════════
// React Hook للصلاحيات - usePermissions
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  ResourceCode,
  ActionCode,
  PermissionCheckRequest,
  PermissionCheckResult,
  GeographicConstraint,
  AdminRole,
  PermissionCode,
} from '@/types/permissions';

interface PermissionsContextValue {
  loading: boolean;
  adminId: string | null;
  userId: string | null;
  roles: AdminRole[];
  isSuperAdmin: boolean;
  legacyRole: string | null; // الدور من جدول admin_users (للتوافقية)
  accessibleResources: ResourceCode[];
  geographicScope: GeographicConstraint;
  can: (resource: ResourceCode, action: ActionCode, context?: PermissionCheckRequest['context']) => Promise<PermissionCheckResult>;
  canSync: (resource: ResourceCode, action: ActionCode) => boolean;
  hasResource: (resource: ResourceCode) => boolean;
  reload: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

// الصلاحيات المخزنة
interface CachedPermissions {
  permissions: Map<PermissionCode, { constraints: Record<string, unknown> }>;
  deniedPermissions: Set<PermissionCode>;
  roles: AdminRole[];
  geographicScope: GeographicConstraint;
}

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [legacyRole, setLegacyRole] = useState<string | null>(null); // الدور من جدول admin_users
  const [cache, setCache] = useState<CachedPermissions>({
    permissions: new Map(),
    deniedPermissions: new Set(),
    roles: [],
    geographicScope: { governorates: [], cities: [], districts: [] },
  });

  // تحميل الصلاحيات
  const loadPermissions = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      // جلب المستخدم الحالي
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      // جلب بيانات الملف الشخصي للتحقق من الدور
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      // جلب admin_id و الدور (للتوافقية)
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id, role')
        .eq('user_id', user.id)
        .single();

      // إذا لم يوجد سجل admin_users ولكن المستخدم admin في profiles
      // نعتبره super_admin كـ fallback
      if (!adminUser) {
        if (profile?.role === 'admin') {
          // المستخدم admin في profiles لكن لا يوجد سجل admin_users
          // نعتبره super_admin مؤقتاً حتى يتم إنشاء سجل admin_users
          setLegacyRole('super_admin');
          setLoading(false);
          return;
        }
        setLoading(false);
        return;
      }
      setAdminId(adminUser.id);
      // استخدام الدور من admin_users أو super_admin إذا كان admin في profiles
      setLegacyRole(adminUser.role || (profile?.role === 'admin' ? 'super_admin' : null));

      const newCache: CachedPermissions = {
        permissions: new Map(),
        deniedPermissions: new Set(),
        roles: [],
        geographicScope: { governorates: [], cities: [], districts: [] },
      };

      // 1. جلب أدوار المشرف
      const { data: adminRoles } = await supabase
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
        .eq('admin_id', adminUser.id)
        .or('expires_at.is.null,expires_at.gt.now()');

      if (adminRoles) {
        newCache.roles = adminRoles;

        // 2. جلب صلاحيات الأدوار
        const roleIds = adminRoles.map((r: AdminRole) => r.role_id);

        if (roleIds.length > 0) {
          const { data: rolePermissions } = await supabase
            .from('role_permissions')
            .select(`
              *,
              permission:permissions (
                id,
                code
              )
            `)
            .in('role_id', roleIds)
            .or('expires_at.is.null,expires_at.gt.now()');

          if (rolePermissions) {
            for (const rp of rolePermissions) {
              if (rp.permission) {
                const code = rp.permission.code as PermissionCode;
                newCache.permissions.set(code, { constraints: rp.constraints || {} });

                // تجميع النطاق الجغرافي
                if (rp.constraints?.geographic) {
                  const geo = rp.constraints.geographic;
                  if (geo.governorates) {
                    newCache.geographicScope.governorates = [
                      ...new Set([...newCache.geographicScope.governorates!, ...geo.governorates]),
                    ];
                  }
                  if (geo.cities) {
                    newCache.geographicScope.cities = [
                      ...new Set([...newCache.geographicScope.cities!, ...geo.cities]),
                    ];
                  }
                }
              }
            }
          }
        }
      }

      // 3. جلب الصلاحيات المخصصة
      const { data: directPerms } = await supabase
        .from('admin_permissions')
        .select(`
          *,
          permission:permissions (
            id,
            code
          )
        `)
        .eq('admin_id', adminUser.id)
        .or('expires_at.is.null,expires_at.gt.now()');

      if (directPerms) {
        for (const dp of directPerms) {
          if (dp.permission) {
            const code = dp.permission.code as PermissionCode;
            if (dp.grant_type === 'deny') {
              newCache.deniedPermissions.add(code);
              newCache.permissions.delete(code);
            } else {
              newCache.permissions.set(code, { constraints: dp.constraints || {} });
            }
          }
        }
      }

      setCache(newCache);
    } catch (error) {
      console.error('Error loading permissions:', error);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // التحقق من صلاحية (async مع context)
  const can = useCallback(
    async (
      resource: ResourceCode,
      action: ActionCode,
      context?: PermissionCheckRequest['context']
    ): Promise<PermissionCheckResult> => {
      const code = `${resource}.${action}` as PermissionCode;

      // التحقق من المنع
      if (cache.deniedPermissions.has(code)) {
        return { allowed: false, reason: 'denied' };
      }

      const permission = cache.permissions.get(code);
      if (!permission) {
        return { allowed: false, reason: 'no_permission' };
      }

      // التحقق من القيود إذا وجد context
      if (context && permission.constraints) {
        // التحقق الجغرافي
        const geo = permission.constraints.geographic as GeographicConstraint | undefined;
        if (geo) {
          if (context.governorateId && geo.governorates?.length) {
            if (!geo.governorates.includes(context.governorateId)) {
              return { allowed: false, reason: 'geographic_restriction' };
            }
          }
        }

        // التحقق من الحد المالي
        const amountLimit = permission.constraints.amount_limit as number | undefined;
        if (amountLimit !== undefined && context.amount !== undefined) {
          if (context.amount > amountLimit) {
            if (permission.constraints.requires_approval) {
              return { allowed: true, requiresApproval: true };
            }
            return { allowed: false, reason: 'amount_exceeded' };
          }
        }
      }

      return { allowed: true };
    },
    [cache]
  );

  // التحقق السريع (sync بدون context)
  const canSync = useCallback(
    (resource: ResourceCode, action: ActionCode): boolean => {
      const code = `${resource}.${action}` as PermissionCode;
      if (cache.deniedPermissions.has(code)) return false;
      return cache.permissions.has(code);
    },
    [cache]
  );

  // هل يمكن الوصول للمورد؟
  const hasResource = useCallback(
    (resource: ResourceCode): boolean => {
      const code = `${resource}.view` as PermissionCode;
      if (cache.deniedPermissions.has(code)) return false;
      return cache.permissions.has(code);
    },
    [cache]
  );

  // الموارد المتاحة
  const accessibleResources: ResourceCode[] = Array.from(cache.permissions.keys())
    .filter(code => code.endsWith('.view'))
    .map(code => code.split('.')[0] as ResourceCode);

  // هل super_admin؟ (تحقق من الأدوار الجديدة أو الدور القديم كـ fallback)
  const isSuperAdmin = cache.roles.some(r => r.role?.code === 'super_admin') || legacyRole === 'super_admin';

  const value: PermissionsContextValue = {
    loading,
    adminId,
    userId,
    roles: cache.roles,
    isSuperAdmin,
    legacyRole,
    accessibleResources: [...new Set(accessibleResources)],
    geographicScope: cache.geographicScope,
    can,
    canSync,
    hasResource,
    reload: loadPermissions,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

// Hook لاستخدام الصلاحيات
export function usePermissions() {
  const context = useContext(PermissionsContext);

  if (!context) {
    throw new Error('usePermissions must be used within PermissionsProvider');
  }

  return context;
}

// Hook للتحقق من صلاحية واحدة
export function useCanAccess(resource: ResourceCode, action: ActionCode = 'view') {
  const { canSync, loading } = usePermissions();
  return { can: canSync(resource, action), loading };
}

// Hook لعرض/إخفاء عناصر حسب الصلاحية
export function usePermissionGate(resource: ResourceCode, action: ActionCode = 'view') {
  const { canSync, loading, isSuperAdmin } = usePermissions();

  // super_admin يرى كل شيء
  if (isSuperAdmin) return { allowed: true, loading };

  return { allowed: canSync(resource, action), loading };
}

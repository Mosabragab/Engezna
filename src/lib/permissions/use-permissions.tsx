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

// Session storage key for caching permissions
const PERMISSIONS_CACHE_KEY = 'admin_permissions_cache';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

interface StoredCache {
  adminId: string;
  legacyRole: string | null;
  permissions: [PermissionCode, { constraints: Record<string, unknown> }][];
  deniedPermissions: PermissionCode[];
  roles: AdminRole[];
  geographicScope: GeographicConstraint;
  timestamp: number;
}

// Load cached permissions from sessionStorage
function loadFromSessionStorage(): StoredCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = sessionStorage.getItem(PERMISSIONS_CACHE_KEY);
    if (!cached) return null;
    const data: StoredCache = JSON.parse(cached);
    // Check if cache is expired
    if (Date.now() - data.timestamp > CACHE_EXPIRY_MS) {
      sessionStorage.removeItem(PERMISSIONS_CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

// Save permissions to sessionStorage
function saveToSessionStorage(data: Omit<StoredCache, 'timestamp'>) {
  if (typeof window === 'undefined') return;
  try {
    const stored: StoredCache = { ...data, timestamp: Date.now() };
    sessionStorage.setItem(PERMISSIONS_CACHE_KEY, JSON.stringify(stored));
  } catch {
    // Ignore storage errors
  }
}

// Clear permissions cache (call on logout)
function clearPermissionsCache() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(PERMISSIONS_CACHE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function PermissionsProvider({ children }: { children: ReactNode }) {
  // Try to load from cache for faster initial render
  const cachedData = loadFromSessionStorage();

  const [loading, setLoading] = useState(!cachedData);
  const [adminId, setAdminId] = useState<string | null>(cachedData?.adminId || null);
  const [userId, setUserId] = useState<string | null>(null);
  const [legacyRole, setLegacyRole] = useState<string | null>(cachedData?.legacyRole || null);
  const [cache, setCache] = useState<CachedPermissions>(() => {
    if (cachedData) {
      return {
        permissions: new Map(cachedData.permissions),
        deniedPermissions: new Set(cachedData.deniedPermissions),
        roles: cachedData.roles,
        geographicScope: cachedData.geographicScope,
      };
    }
    return {
      permissions: new Map(),
      deniedPermissions: new Set(),
      roles: [],
      geographicScope: { governorates: [], cities: [], districts: [] },
    };
  });

  // تحميل الصلاحيات
  const loadPermissions = useCallback(async (backgroundRefresh = false) => {
    if (!backgroundRefresh) {
      setLoading(true);
    }
    const supabase = createClient();

    try {
      // جلب المستخدم الحالي
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Clear cache when no user is logged in
        clearPermissionsCache();
        setLoading(false);
        return;
      }
      setUserId(user.id);

      // جلب بيانات الملف الشخصي و admin_user بالتوازي (أسرع)
      const [profileResult, adminUserResult] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        supabase.from('admin_users').select('id, role').eq('user_id', user.id).single()
      ]);

      const profile = profileResult.data;
      const adminUser = adminUserResult.data;

      // إذا لم يوجد سجل admin_users ولكن المستخدم admin في profiles
      // نحتاج لإنشاء سجل admin_users له أولاً
      if (!adminUser) {
        if (profile?.role === 'admin') {
          // إنشاء سجل admin_users للمستخدم الأول (المؤسس)
          const { data: newAdminUser, error: createError } = await supabase
            .from('admin_users')
            .insert({
              user_id: user.id,
              role: 'super_admin',
              is_active: true
            })
            .select('id, role')
            .single();

          if (createError) {
            setLegacyRole('super_admin');
            setLoading(false);
            return;
          }

          setAdminId(newAdminUser.id);
          setLegacyRole(newAdminUser.role);
          setLoading(false);
          return;
        }
        setLoading(false);
        return;
      }
      setAdminId(adminUser.id);

      // استخدام الدور الفعلي من admin_users
      const effectiveRole = adminUser.role || null;
      setLegacyRole(effectiveRole);

      const newCache: CachedPermissions = {
        permissions: new Map(),
        deniedPermissions: new Set(),
        roles: [],
        geographicScope: { governorates: [], cities: [], districts: [] },
      };

      // جلب أدوار المشرف والصلاحيات المخصصة بالتوازي (أسرع)
      const [adminRolesResult, directPermsResult] = await Promise.all([
        supabase
          .from('admin_roles')
          .select(`*, role:roles (id, code, name_ar, name_en, color, icon, is_system)`)
          .eq('admin_id', adminUser.id)
          .or('expires_at.is.null,expires_at.gt.now()'),
        supabase
          .from('admin_permissions')
          .select(`*, permission:permissions (id, code)`)
          .eq('admin_id', adminUser.id)
          .or('expires_at.is.null,expires_at.gt.now()')
      ]);

      const adminRoles = adminRolesResult.data;
      const directPerms = directPermsResult.data;

      if (adminRoles) {
        newCache.roles = adminRoles;

        // جلب صلاحيات الأدوار
        const roleIds = adminRoles.map((r: AdminRole) => r.role_id);

        if (roleIds.length > 0) {
          const { data: rolePermissions } = await supabase
            .from('role_permissions')
            .select(`*, permission:permissions (id, code)`)
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

      // معالجة الصلاحيات المخصصة
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

      // Save to sessionStorage for faster subsequent loads
      saveToSessionStorage({
        adminId: adminUser.id,
        legacyRole: effectiveRole,
        permissions: Array.from(newCache.permissions.entries()),
        deniedPermissions: Array.from(newCache.deniedPermissions),
        roles: newCache.roles,
        geographicScope: newCache.geographicScope,
      });
    } catch (error) {
      console.error('Error loading permissions:', error);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // If we have cached data, load in background without showing loading state
    // Otherwise, load with loading state
    if (cachedData) {
      // Background refresh - don't set loading to true
      loadPermissions(true).catch(() => {});
    } else {
      loadPermissions(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // الصلاحيات الافتراضية للأدوار القديمة (للاستخدام في hasResource)
  const legacyRoleDefaultPermissions: Record<string, ResourceCode[]> = {
    super_admin: ['dashboard', 'providers', 'orders', 'customers', 'finance', 'analytics', 'support', 'locations', 'team', 'approvals', 'tasks', 'messages', 'announcements', 'promotions', 'settings', 'activity_log', 'roles', 'escalation_rules'], // super_admin يرى كل شيء
    general_moderator: ['dashboard', 'providers', 'orders', 'customers', 'support', 'locations', 'promotions', 'team', 'tasks', 'messages', 'announcements'],
    store_supervisor: ['dashboard', 'providers', 'orders', 'support', 'messages'],
    support: ['dashboard', 'support', 'orders', 'customers', 'messages'],
    finance: ['dashboard', 'finance', 'orders', 'analytics', 'messages'],
  };

  // هل يمكن الوصول للمورد؟
  const hasResource = useCallback(
    (resource: ResourceCode): boolean => {
      const code = `${resource}.view` as PermissionCode;
      if (cache.deniedPermissions.has(code)) return false;

      // التحقق من النظام الجديد أولاً
      if (cache.permissions.has(code)) return true;

      // التحقق من صلاحيات الدور القديم كـ fallback
      if (legacyRole && legacyRoleDefaultPermissions[legacyRole]) {
        return legacyRoleDefaultPermissions[legacyRole].includes(resource);
      }

      return false;
    },
    [cache, legacyRole]
  );

  // الموارد المتاحة من النظام الجديد
  const newSystemResources: ResourceCode[] = Array.from(cache.permissions.keys())
    .filter(code => code.endsWith('.view'))
    .map(code => code.split('.')[0] as ResourceCode);

  // دمج الموارد من النظام الجديد والصلاحيات الافتراضية للدور القديم
  const legacyResources = legacyRole ? (legacyRoleDefaultPermissions[legacyRole] || []) : [];
  const accessibleResources: ResourceCode[] = [...new Set([...newSystemResources, ...legacyResources])];

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
    reload: () => loadPermissions(false), // Manual reload always shows loading
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

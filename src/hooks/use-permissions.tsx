'use client'

import { useEffect, useState, useCallback, createContext, useContext, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  ResourceCode,
  ActionCode,
  PermissionCode,
  PermissionCheckRequest,
  PermissionCheckResult,
  Permission,
  AdminRole,
  GeographicConstraint,
  PermissionConstraints,
} from '@/types/permissions'

// ═══════════════════════════════════════════════════════════════════════
// نظام الصلاحيات - Hook
// ═══════════════════════════════════════════════════════════════════════

interface PermissionsState {
  loading: boolean
  loaded: boolean
  adminId: string | null
  userId: string | null
  roles: AdminRole[]
  effectivePermissions: Map<PermissionCode, Permission>
  deniedPermissions: Set<PermissionCode>
}

interface PermissionsContextValue extends PermissionsState {
  can: (resource: ResourceCode, action: ActionCode, context?: PermissionCheckRequest['context']) => PermissionCheckResult
  canAsync: (request: PermissionCheckRequest) => Promise<PermissionCheckResult>
  canAll: (requests: PermissionCheckRequest[]) => boolean
  canAny: (requests: PermissionCheckRequest[]) => boolean
  hasResource: (resource: ResourceCode) => boolean
  getAccessibleResources: () => ResourceCode[]
  getResourceActions: (resource: ResourceCode) => ActionCode[]
  isSuperAdmin: () => boolean
  getPrimaryRole: () => AdminRole | undefined
  getGeographicScope: () => GeographicConstraint
  refresh: () => Promise<void>
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null)

// ═══════════════════════════════════════════════════════════════════════
// Provider Component
// ═══════════════════════════════════════════════════════════════════════

interface PermissionsProviderProps {
  children: ReactNode
}

export function PermissionsProvider({ children }: PermissionsProviderProps) {
  const [state, setState] = useState<PermissionsState>({
    loading: true,
    loaded: false,
    adminId: null,
    userId: null,
    roles: [],
    effectivePermissions: new Map(),
    deniedPermissions: new Set(),
  })

  const loadPermissions = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }))
    const supabase = createClient()

    try {
      // جلب المستخدم الحالي
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setState(prev => ({ ...prev, loading: false, loaded: true }))
        return
      }

      // جلب admin_user
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!adminUser) {
        setState(prev => ({ ...prev, loading: false, loaded: true, userId: user.id }))
        return
      }

      const adminId = adminUser.id
      const effectivePermissions = new Map<PermissionCode, Permission>()
      const deniedPermissions = new Set<PermissionCode>()
      let roles: AdminRole[] = []

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
        .eq('admin_id', adminId)
        .or('expires_at.is.null,expires_at.gt.now()')

      roles = adminRoles || []

      // 2. جلب صلاحيات كل دور
      const roleIds = roles.map(r => r.role_id)

      if (roleIds.length > 0) {
        const { data: rolePermissions } = await supabase
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
          .or('expires_at.is.null,expires_at.gt.now()')

        if (rolePermissions) {
          for (const rp of rolePermissions) {
            if (rp.permission) {
              const code = rp.permission.code as PermissionCode
              const adminRole = roles.find(r => r.role_id === rp.role_id)

              const mergedConstraints = mergeConstraints(
                rp.constraints || {},
                adminRole?.custom_constraints || {}
              )

              effectivePermissions.set(code, {
                id: rp.permission.id,
                code,
                resource_code: rp.permission.resource?.code as ResourceCode,
                action_code: rp.permission.action?.code as ActionCode,
                constraints: mergedConstraints,
              })
            }
          }
        }
      }

      // 3. جلب الصلاحيات المخصصة للمشرف
      const { data: directPerms } = await supabase
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
        .eq('admin_id', adminId)
        .or('expires_at.is.null,expires_at.gt.now()')

      if (directPerms) {
        for (const dp of directPerms) {
          if (dp.permission) {
            const code = dp.permission.code as PermissionCode

            if (dp.grant_type === 'deny') {
              deniedPermissions.add(code)
              effectivePermissions.delete(code)
            } else {
              effectivePermissions.set(code, {
                id: dp.permission.id,
                code,
                resource_code: dp.permission.resource?.code as ResourceCode,
                action_code: dp.permission.action?.code as ActionCode,
                constraints: dp.constraints || {},
              })
            }
          }
        }
      }

      setState({
        loading: false,
        loaded: true,
        adminId,
        userId: user.id,
        roles,
        effectivePermissions,
        deniedPermissions,
      })
    } catch (error) {
      console.error('Error loading permissions:', error)
      setState(prev => ({ ...prev, loading: false, loaded: true }))
    }
  }, [])

  useEffect(() => {
    loadPermissions()
  }, [loadPermissions])

  // التحقق من صلاحية (sync)
  const can = useCallback((
    resource: ResourceCode,
    action: ActionCode,
    context?: PermissionCheckRequest['context']
  ): PermissionCheckResult => {
    const code = `${resource}.${action}` as PermissionCode

    // التحقق من المنع المباشر
    if (state.deniedPermissions.has(code)) {
      return { allowed: false, reason: 'denied' }
    }

    // جلب الصلاحية
    const permission = state.effectivePermissions.get(code)

    if (!permission) {
      return { allowed: false, reason: 'no_permission' }
    }

    // التحقق من القيود إذا وجدت
    if (permission.constraints && context) {
      return checkConstraints(permission.constraints, context, state.adminId, state.userId)
    }

    return { allowed: true }
  }, [state])

  // التحقق من صلاحية (async) - للتوافق
  const canAsync = useCallback(async (request: PermissionCheckRequest): Promise<PermissionCheckResult> => {
    return can(request.resource, request.action, request.context)
  }, [can])

  // التحقق من عدة صلاحيات
  const canAll = useCallback((requests: PermissionCheckRequest[]): boolean => {
    return requests.every(r => can(r.resource, r.action, r.context).allowed)
  }, [can])

  // التحقق من أي صلاحية
  const canAny = useCallback((requests: PermissionCheckRequest[]): boolean => {
    return requests.some(r => can(r.resource, r.action, r.context).allowed)
  }, [can])

  // هل المورد متاح؟
  const hasResource = useCallback((resource: ResourceCode): boolean => {
    return can(resource, 'view').allowed
  }, [can])

  // جلب الموارد المتاحة
  const getAccessibleResources = useCallback((): ResourceCode[] => {
    const resources = new Set<ResourceCode>()

    for (const [code] of state.effectivePermissions) {
      if (code.endsWith('.view')) {
        const [resource] = code.split('.') as [ResourceCode, ActionCode]
        resources.add(resource)
      }
    }

    return Array.from(resources)
  }, [state.effectivePermissions])

  // جلب الإجراءات المتاحة لمورد
  const getResourceActions = useCallback((resource: ResourceCode): ActionCode[] => {
    const actions: ActionCode[] = []

    for (const [code] of state.effectivePermissions) {
      if (code.startsWith(`${resource}.`)) {
        const action = code.split('.')[1] as ActionCode
        actions.push(action)
      }
    }

    return actions
  }, [state.effectivePermissions])

  // هل المشرف super_admin؟
  const isSuperAdmin = useCallback((): boolean => {
    return state.roles.some(r => r.role?.code === 'super_admin')
  }, [state.roles])

  // جلب الدور الرئيسي
  const getPrimaryRole = useCallback((): AdminRole | undefined => {
    return state.roles.find(r => r.is_primary) || state.roles[0]
  }, [state.roles])

  // جلب النطاق الجغرافي
  const getGeographicScope = useCallback((): GeographicConstraint => {
    const scope: GeographicConstraint = {
      governorates: [],
      cities: [],
      districts: [],
    }

    for (const [, permission] of state.effectivePermissions) {
      if (permission.constraints?.geographic) {
        const geo = permission.constraints.geographic
        if (geo.governorates) {
          scope.governorates = [...new Set([...scope.governorates!, ...geo.governorates])]
        }
        if (geo.cities) {
          scope.cities = [...new Set([...scope.cities!, ...geo.cities])]
        }
        if (geo.districts) {
          scope.districts = [...new Set([...scope.districts!, ...geo.districts])]
        }
      }
    }

    return scope
  }, [state.effectivePermissions])

  const value: PermissionsContextValue = {
    ...state,
    can,
    canAsync,
    canAll,
    canAny,
    hasResource,
    getAccessibleResources,
    getResourceActions,
    isSuperAdmin,
    getPrimaryRole,
    getGeographicScope,
    refresh: loadPermissions,
  }

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════════════

export function usePermissions() {
  const context = useContext(PermissionsContext)

  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider')
  }

  return context
}

// ═══════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════

function mergeConstraints(
  roleConstraints: PermissionConstraints,
  customConstraints: PermissionConstraints
): PermissionConstraints {
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
  }
}

function checkConstraints(
  constraints: PermissionConstraints,
  context: PermissionCheckRequest['context'],
  adminId: string | null,
  userId: string | null
): PermissionCheckResult {
  if (!context) return { allowed: true }

  // 1. التحقق الجغرافي
  if (constraints.geographic) {
    const geo = constraints.geographic

    if (context.governorateId && geo.governorates?.length) {
      if (!geo.governorates.includes(context.governorateId)) {
        return { allowed: false, reason: 'geographic_restriction' }
      }
    }

    if (context.cityId && geo.cities?.length) {
      if (!geo.cities.includes(context.cityId)) {
        return { allowed: false, reason: 'geographic_restriction' }
      }
    }

    if (context.districtId && geo.districts?.length) {
      if (!geo.districts.includes(context.districtId)) {
        return { allowed: false, reason: 'geographic_restriction' }
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
        }
      }
      return { allowed: false, reason: 'amount_exceeded' }
    }
  }

  // 3. التحقق من الملكية
  if (constraints.own_only && context.ownerId) {
    if (context.ownerId !== userId) {
      return { allowed: false, reason: 'own_only' }
    }
  }

  // 4. التحقق من التعيين
  if (constraints.assigned_only && context.assignedTo) {
    if (context.assignedTo !== adminId && context.assignedTo !== userId) {
      return { allowed: false, reason: 'not_assigned' }
    }
  }

  // 5. التحقق من نوع المتجر
  if (constraints.provider_categories?.length && context.providerCategory) {
    if (!constraints.provider_categories.includes(context.providerCategory)) {
      return { allowed: false, reason: 'no_permission' }
    }
  }

  // 6. التحقق من الوقت
  if (constraints.time_restriction) {
    const now = new Date()
    const day = now.getDay()
    const time = now.toTimeString().slice(0, 5)

    if (constraints.time_restriction.days && !constraints.time_restriction.days.includes(day)) {
      return { allowed: false, reason: 'time_restriction' }
    }

    if (constraints.time_restriction.start && constraints.time_restriction.end) {
      if (time < constraints.time_restriction.start || time > constraints.time_restriction.end) {
        return { allowed: false, reason: 'time_restriction' }
      }
    }
  }

  return { allowed: true }
}

// ═══════════════════════════════════════════════════════════════════════
// Permission Guard Component
// ═══════════════════════════════════════════════════════════════════════

interface PermissionGuardProps {
  resource: ResourceCode
  action?: ActionCode
  fallback?: ReactNode
  children: ReactNode
}

export function PermissionGuard({
  resource,
  action = 'view',
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { can, loading, loaded } = usePermissions()

  if (loading || !loaded) {
    return null
  }

  const result = can(resource, action)

  if (!result.allowed) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// ═══════════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════════

export type { PermissionsContextValue, PermissionGuardProps }

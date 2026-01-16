// ═══════════════════════════════════════════════════════════════════════
// سجل التدقيق - Audit Logging Helper
// ═══════════════════════════════════════════════════════════════════════

import { createAdminClient } from '@/lib/supabase/admin';
import type { AuditAction, AuditLogEntry, OperationResult } from './types';

/**
 * تسجيل إجراء في سجل التدقيق
 * Log an action to the audit trail
 */
export async function logAuditAction(
  adminId: string,
  action: AuditAction,
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<OperationResult<AuditLogEntry>> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('permission_audit_log')
      .insert({
        admin_id: adminId,
        resource_code: action.resourceType,
        action_code: action.action,
        permission_code: `${action.resourceType}.${action.action}`,
        entity_type: action.resourceType,
        entity_id: action.resourceId,
        entity_name: action.resourceName || null,
        old_data: action.oldData || null,
        new_data: action.newData || null,
        changes: computeChanges(action.oldData, action.newData),
        status: 'success',
        ip_address: metadata?.ipAddress || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to log audit action:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as AuditLogEntry };
  } catch (err) {
    console.error('Audit logging error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * تسجيل إجراء مرفوض
 * Log a denied action
 */
export async function logDeniedAction(
  adminId: string,
  action: AuditAction,
  denialReason: string,
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<OperationResult<AuditLogEntry>> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('permission_audit_log')
      .insert({
        admin_id: adminId,
        resource_code: action.resourceType,
        action_code: action.action,
        permission_code: `${action.resourceType}.${action.action}`,
        entity_type: action.resourceType,
        entity_id: action.resourceId,
        entity_name: action.resourceName || null,
        status: 'denied',
        denial_reason: denialReason,
        ip_address: metadata?.ipAddress || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to log denied action:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as AuditLogEntry };
  } catch (err) {
    console.error('Audit logging error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * أيضًا تسجيل في جدول activity_log للتوافقية
 * Also log to activity_log table for compatibility
 */
export async function logActivity(
  userId: string,
  activityType: string,
  description: string,
  metadata?: Record<string, unknown>
): Promise<OperationResult> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase.from('activity_log').insert({
      user_id: userId,
      activity_type: activityType,
      description: description,
      metadata: metadata || null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to log activity:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Activity logging error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * حساب التغييرات بين البيانات القديمة والجديدة
 * Compute changes between old and new data
 */
function computeChanges(
  oldData?: Record<string, unknown>,
  newData?: Record<string, unknown>
): Record<string, { old: unknown; new: unknown }> | null {
  if (!oldData || !newData) return null;

  const changes: Record<string, { old: unknown; new: unknown }> = {};

  // Get all keys from both objects
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  for (const key of allKeys) {
    const oldValue = oldData[key];
    const newValue = newData[key];

    // Check if values are different
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[key] = { old: oldValue, new: newValue };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

/**
 * جلب سجل التدقيق
 * Fetch audit log entries
 */
export async function getAuditLog(options: {
  adminId?: string;
  resourceType?: string;
  resourceId?: string;
  status?: 'success' | 'denied' | 'failed';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}): Promise<OperationResult<{ entries: AuditLogEntry[]; total: number }>> {
  try {
    const supabase = createAdminClient();
    const {
      page = 1,
      limit = 20,
      adminId,
      resourceType,
      resourceId,
      status,
      dateFrom,
      dateTo,
    } = options;

    let query = supabase.from('permission_audit_log').select('*', { count: 'exact' });

    // Apply filters
    if (adminId) {
      query = query.eq('admin_id', adminId);
    }
    if (resourceType) {
      query = query.eq('entity_type', resourceType);
    }
    if (resourceId) {
      query = query.eq('entity_id', resourceId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    // Pagination and ordering
    const offset = (page - 1) * limit;
    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        entries: (data || []) as AuditLogEntry[],
        total: count || 0,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// أنواع الإجراءات المسبقة التعريف
// Pre-defined action types
// ═══════════════════════════════════════════════════════════════════════

export const AUDIT_ACTIONS = {
  // مقدمو الخدمة
  PROVIDER_APPROVED: 'approve',
  PROVIDER_REJECTED: 'reject',
  PROVIDER_SUSPENDED: 'suspend',
  PROVIDER_UPDATED: 'update',
  PROVIDER_COMMISSION_CHANGED: 'update_commission',

  // المستخدمون
  USER_ACTIVATED: 'activate',
  USER_DEACTIVATED: 'deactivate',
  USER_BANNED: 'ban',
  USER_ROLE_CHANGED: 'change_role',

  // الطلبات
  ORDER_CANCELLED: 'cancel',
  ORDER_REFUNDED: 'refund',
  ORDER_STATUS_CHANGED: 'update_status',

  // النظام
  SETTINGS_CHANGED: 'update_settings',
} as const;

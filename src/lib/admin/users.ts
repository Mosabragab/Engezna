// ═══════════════════════════════════════════════════════════════════════
// إدارة المستخدمين - Users Management
// ═══════════════════════════════════════════════════════════════════════

import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditAction, logActivity } from './audit';
import type {
  AdminUser,
  UserFilters,
  PaginatedResult,
  OperationResult,
  UserRole,
} from './types';

const PAGE_SIZE = 20;
const MAX_SIZE = 100;

// ═══════════════════════════════════════════════════════════════════════
// جلب المستخدمين - Fetch Users
// ═══════════════════════════════════════════════════════════════════════

/**
 * جلب قائمة المستخدمين مع الفلترة والتصفح
 * Fetch users list with filtering and pagination
 */
export async function getUsers(
  filters: UserFilters = {}
): Promise<OperationResult<PaginatedResult<AdminUser>>> {
  try {
    const supabase = createAdminClient();

    const {
      role,
      isActive,
      governorateId,
      cityId,
      search,
      page = 1,
      limit = PAGE_SIZE,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = filters;

    const actualLimit = Math.min(limit, MAX_SIZE);
    const offset = (page - 1) * actualLimit;

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    // Apply filters
    if (role) {
      query = query.eq('role', role);
    }

    if (typeof isActive === 'boolean') {
      query = query.eq('is_active', isActive);
    }

    if (governorateId) {
      query = query.eq('governorate_id', governorateId);
    }

    if (cityId) {
      query = query.eq('city_id', cityId);
    }

    // Search filter
    if (search && search.trim()) {
      const searchTerm = search.trim();
      query = query.or(
        `full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`
      );
    }

    // Sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Pagination
    query = query.range(offset, offset + actualLimit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return { success: false, error: error.message, errorCode: 'DATABASE_ERROR' };
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / actualLimit);

    return {
      success: true,
      data: {
        data: (data || []) as AdminUser[],
        total,
        page,
        limit: actualLimit,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  } catch (err) {
    console.error('Error in getUsers:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      errorCode: 'DATABASE_ERROR',
    };
  }
}

/**
 * جلب مستخدم واحد بالمعرف
 * Fetch a single user by ID
 */
export async function getUserById(
  userId: string
): Promise<OperationResult<AdminUser>> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'User not found', errorCode: 'NOT_FOUND' };
      }
      return { success: false, error: error.message, errorCode: 'DATABASE_ERROR' };
    }

    return { success: true, data: data as AdminUser };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      errorCode: 'DATABASE_ERROR',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// إدارة حالة المستخدم - User Status Management
// ═══════════════════════════════════════════════════════════════════════

/**
 * حظر مستخدم
 * Ban a user
 */
export async function banUser(
  adminId: string,
  userId: string,
  reason: string
): Promise<OperationResult<AdminUser>> {
  try {
    if (!reason || !reason.trim()) {
      return { success: false, error: 'Ban reason is required', errorCode: 'VALIDATION_ERROR' };
    }

    const supabase = createAdminClient();

    // Fetch current user from profiles table
    const { data: current, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'User not found', errorCode: 'NOT_FOUND' };
    }

    // Cannot ban admins
    if (current.role === 'admin') {
      return { success: false, error: 'Cannot ban admin users', errorCode: 'FORBIDDEN' };
    }

    // Update user in profiles table
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (updateError) {
      return { success: false, error: updateError.message, errorCode: 'DATABASE_ERROR' };
    }

    // Cancel all pending/active orders for the banned customer
    const activeStatuses = ['pending', 'confirmed', 'accepted', 'preparing', 'ready'];
    const { error: cancelError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'customer_banned',
        cancelled_by: 'admin',
        updated_at: new Date().toISOString(),
      })
      .eq('customer_id', userId)
      .in('status', activeStatuses);

    if (cancelError) {
      console.error('Error cancelling orders for banned user:', cancelError);
      // Continue even if order cancellation fails
    }

    // Log audit action
    await logAuditAction(adminId, {
      action: 'ban',
      resourceType: 'user',
      resourceId: userId,
      resourceName: current.full_name || current.email,
      oldData: { is_active: current.is_active },
      newData: { is_active: false },
      reason: reason.trim(),
    });

    // Log activity
    await logActivity(
      adminId,
      'user_banned',
      `تم حظر المستخدم: ${current.full_name || current.email} - السبب: ${reason}`,
      { userId, userName: current.full_name, reason }
    );

    return { success: true, data: updated as AdminUser };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      errorCode: 'DATABASE_ERROR',
    };
  }
}

/**
 * إلغاء حظر مستخدم
 * Unban a user
 */
export async function unbanUser(
  adminId: string,
  userId: string
): Promise<OperationResult<AdminUser>> {
  try {
    const supabase = createAdminClient();

    // Fetch current user from profiles table
    const { data: current, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'User not found', errorCode: 'NOT_FOUND' };
    }

    // Update user in profiles table
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (updateError) {
      return { success: false, error: updateError.message, errorCode: 'DATABASE_ERROR' };
    }

    // Log audit action
    await logAuditAction(adminId, {
      action: 'unban',
      resourceType: 'user',
      resourceId: userId,
      resourceName: current.full_name || current.email,
      oldData: { is_active: current.is_active },
      newData: { is_active: true },
    });

    // Log activity
    await logActivity(
      adminId,
      'user_unbanned',
      `تم إلغاء حظر المستخدم: ${current.full_name || current.email}`,
      { userId, userName: current.full_name }
    );

    return { success: true, data: updated as AdminUser };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      errorCode: 'DATABASE_ERROR',
    };
  }
}

/**
 * تغيير دور المستخدم
 * Change user role
 */
export async function changeUserRole(
  adminId: string,
  userId: string,
  newRole: UserRole,
  reason?: string
): Promise<OperationResult<AdminUser>> {
  try {
    const supabase = createAdminClient();

    // Fetch current user from profiles table
    const { data: current, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'User not found', errorCode: 'NOT_FOUND' };
    }

    // Cannot change own role
    if (userId === adminId) {
      return { success: false, error: 'Cannot change your own role', errorCode: 'FORBIDDEN' };
    }

    // Update user in profiles table
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({
        role: newRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (updateError) {
      return { success: false, error: updateError.message, errorCode: 'DATABASE_ERROR' };
    }

    // Log audit action
    await logAuditAction(adminId, {
      action: 'change_role',
      resourceType: 'user',
      resourceId: userId,
      resourceName: current.full_name || current.email,
      oldData: { role: current.role },
      newData: { role: newRole },
      reason,
    });

    // Log activity
    await logActivity(
      adminId,
      'user_role_changed',
      `تم تغيير دور المستخدم: ${current.full_name || current.email} من ${current.role} إلى ${newRole}`,
      { userId, userName: current.full_name, oldRole: current.role, newRole }
    );

    return { success: true, data: updated as AdminUser };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      errorCode: 'DATABASE_ERROR',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// إحصائيات المستخدمين - User Statistics
// ═══════════════════════════════════════════════════════════════════════

/**
 * جلب إحصائيات المستخدمين
 * Get user statistics
 */
export async function getUserStats(): Promise<
  OperationResult<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<UserRole, number>;
  }>
> {
  try {
    const supabase = createAdminClient();

    const { data: users, error } = await supabase
      .from('profiles')
      .select('role, is_active');

    if (error) {
      return { success: false, error: error.message, errorCode: 'DATABASE_ERROR' };
    }

    const byRole: Record<string, number> = {
      customer: 0,
      provider: 0,
      admin: 0,
    };

    let active = 0;
    let inactive = 0;

    for (const user of users || []) {
      if (user.role) {
        byRole[user.role] = (byRole[user.role] || 0) + 1;
      }
      if (user.is_active) {
        active++;
      } else {
        inactive++;
      }
    }

    return {
      success: true,
      data: {
        total: users?.length || 0,
        active,
        inactive,
        byRole: byRole as Record<UserRole, number>,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      errorCode: 'DATABASE_ERROR',
    };
  }
}

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
    const timestamp = new Date().toISOString();

    // Step 1: Fetch current user from profiles table
    console.log('[BAN USER v2] Step 1: Fetching user profile for userId:', userId);
    const { data: current, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !current) {
      console.error('[BAN USER v2] User not found:', fetchError);
      return { success: false, error: 'User not found', errorCode: 'NOT_FOUND' };
    }
    console.log('[BAN USER v2] User found:', current.full_name, 'role:', current.role);

    // Cannot ban admins
    if (current.role === 'admin') {
      return { success: false, error: 'Cannot ban admin users', errorCode: 'FORBIDDEN' };
    }

    // Step 2: Call the database function to cancel orders
    // This uses SECURITY DEFINER to bypass RLS policies
    console.log('[BAN USER v2] Step 2: Calling cancel_orders_for_banned_customer RPC...');
    const { data: cancelResult, error: cancelError } = await supabase
      .rpc('cancel_orders_for_banned_customer', {
        p_customer_id: userId,
        p_reason: `تم إلغاء الطلب بسبب حظر العميل - السبب: ${reason.trim()}`
      });

    console.log('[BAN USER v2] Cancel orders RPC result:', {
      result: cancelResult,
      error: cancelError?.message || null
    });

    if (cancelError) {
      console.error('[BAN USER v2] RPC Error:', cancelError);
      // If RPC fails, try direct approach as fallback
      console.log('[BAN USER v2] Trying direct approach as fallback...');

      const activeStatuses = ['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery'];
      const { data: ordersToCancel, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, provider_id, total, status')
        .eq('customer_id', userId)
        .in('status', activeStatuses);

      console.log('[BAN USER v2] Orders query result:', {
        found: ordersToCancel?.length || 0,
        orders: ordersToCancel,
        error: ordersError?.message || null
      });

      if (ordersToCancel && ordersToCancel.length > 0) {
        for (const order of ordersToCancel) {
          console.log('[BAN USER v2] Cancelling order:', order.order_number);

          const { data: cancelData, error: updateError } = await supabase
            .from('orders')
            .update({
              status: 'cancelled',
              cancelled_at: timestamp,
              cancellation_reason: `تم إلغاء الطلب بسبب حظر العميل - السبب: ${reason.trim()}`,
              updated_at: timestamp,
            })
            .eq('id', order.id)
            .select('id, status');

          console.log('[BAN USER v2] Order cancel result:', {
            orderId: order.id,
            success: !updateError,
            newData: cancelData,
            error: updateError?.message || null
          });

          // Send notification to provider
          const { error: providerNotifError } = await supabase
            .from('provider_notifications')
            .insert({
              provider_id: order.provider_id,
              type: 'order_cancelled',
              title_ar: 'تم إلغاء طلب بسبب حظر العميل',
              title_en: 'Order Cancelled - Customer Banned',
              body_ar: `تم إلغاء الطلب #${order.order_number} بقيمة ${order.total} ج.م بسبب حظر العميل. للاستفسار، تواصل مع خدمة عملاء إنجزنا.`,
              body_en: `Order #${order.order_number} (${order.total} EGP) has been cancelled due to customer ban.`,
              related_order_id: order.id,
              related_customer_id: userId,
            });

          if (providerNotifError) {
            console.error('[BAN USER v2] Failed to notify provider:', providerNotifError.message);
          }
        }
      }
    }

    // Step 3: Now update user to banned
    console.log('[BAN USER v2] Step 3: Updating user is_active to false...');
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({
        is_active: false,
        updated_at: timestamp,
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (updateError) {
      console.error('[BAN USER v2] Failed to update user:', updateError);
      return { success: false, error: updateError.message, errorCode: 'DATABASE_ERROR' };
    }
    console.log('[BAN USER v2] User banned successfully');

    // Step 4: Send notification to the banned customer (if RPC didn't send it)
    console.log('[BAN USER v2] Step 4: Sending notification to customer...');
    const { error: customerNotifError } = await supabase
      .from('customer_notifications')
      .insert({
        customer_id: userId,
        type: 'account_banned',
        title_ar: 'تم تعليق حسابك',
        title_en: 'Account Suspended',
        body_ar: `تم تعليق حسابك في إنجزنا. السبب: ${reason.trim()}. للاستفسار، يرجى التواصل مع خدمة عملاء إنجزنا.`,
        body_en: `Your Engezna account has been suspended. Reason: ${reason.trim()}. For inquiries, please contact Engezna support.`,
      });

    if (customerNotifError) {
      console.error('[BAN USER v2] Failed to send customer notification:', customerNotifError.message);
    } else {
      console.log('[BAN USER v2] Customer notification sent');
    }

    console.log('[BAN USER v2] Complete! All operations finished.');
    return { success: true, data: updated as AdminUser };
  } catch (err) {
    console.error('[BAN USER v2] Unexpected error:', err);
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

    // Send notification to the customer that their account has been reactivated
    const { error: notifError } = await supabase
      .from('customer_notifications')
      .insert({
        customer_id: userId,
        type: 'account_reactivated',
        title_ar: 'تم تفعيل حسابك',
        title_en: 'Account Reactivated',
        body_ar: 'تم إلغاء تعليق حسابك في إنجزنا. يمكنك الآن استخدام التطبيق بشكل طبيعي. شكراً لتفهمك.',
        body_en: 'Your Engezna account has been reactivated. You can now use the app normally. Thank you for your understanding.',
      });

    if (notifError) {
      console.error('[UNBAN USER] Failed to send notification:', notifError.message);
    }

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

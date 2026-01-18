// ═══════════════════════════════════════════════════════════════════════
// إدارة الطلبات - Orders Management
// ═══════════════════════════════════════════════════════════════════════

import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditAction, logActivity, AUDIT_ACTIONS } from './audit';
import type {
  AdminOrder,
  OrderFilters,
  OrderStatus,
  PaginatedResult,
  OperationResult,
} from './types';

const PAGE_SIZE = 20;
const MAX_SIZE = 100;

// Optimized order select (Phase 4.1)
const ORDER_SELECT = `
  id, order_number, customer_id, provider_id, status,
  subtotal, delivery_fee, discount, total, platform_commission,
  payment_method, payment_status, delivery_address, notes,
  promo_code_id, created_at, updated_at,
  confirmed_at, preparing_at, ready_at, delivering_at, delivered_at,
  cancelled_reason, cancelled_by
`;

// Optimized order items select
const ORDER_ITEMS_SELECT = `
  id, order_id, menu_item_id, variant_id, quantity,
  unit_price, total_price, notes, addons
`;

// ═══════════════════════════════════════════════════════════════════════
// جلب الطلبات - Fetch Orders
// ═══════════════════════════════════════════════════════════════════════

/**
 * جلب قائمة الطلبات مع الفلترة والتصفح
 * Fetch orders list with filtering and pagination
 */
export async function getOrders(
  filters: OrderFilters = {}
): Promise<OperationResult<PaginatedResult<AdminOrder>>> {
  try {
    const supabase = createAdminClient();

    const {
      status,
      providerId,
      customerId,
      dateFrom,
      dateTo,
      page = 1,
      limit = PAGE_SIZE,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = filters;

    // Clamp limit to max
    const actualLimit = Math.min(limit, MAX_SIZE);
    const offset = (page - 1) * actualLimit;

    // Build query
    let query = supabase.from('orders').select(
      `
        *,
        customer:profiles(id, full_name, phone),
        provider:providers(id, name_ar, name_en, governorate_id, city_id, district_id)
      `,
      { count: 'exact' }
    );

    // Apply filters
    if (status) {
      if (Array.isArray(status)) {
        query = query.in('status', status);
      } else {
        query = query.eq('status', status);
      }
    }

    if (providerId) {
      query = query.eq('provider_id', providerId);
    }

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    // Sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Pagination
    query = query.range(offset, offset + actualLimit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return { success: false, error: error.message, errorCode: 'DATABASE_ERROR' };
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / actualLimit);

    return {
      success: true,
      data: {
        data: (data || []) as AdminOrder[],
        total,
        page,
        limit: actualLimit,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  } catch (err) {
    console.error('Error in getOrders:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      errorCode: 'DATABASE_ERROR',
    };
  }
}

/**
 * جلب طلب واحد بالمعرف
 * Fetch a single order by ID
 */
export async function getOrderById(
  orderId: string
): Promise<OperationResult<AdminOrder & { items: OrderItem[] }>> {
  try {
    const supabase = createAdminClient();

    // Fetch order with relations
    const { data: order, error } = await supabase
      .from('orders')
      .select(
        `
        *,
        customer:profiles(id, full_name, phone, email),
        provider:providers(id, name_ar, name_en, phone, commission_rate)
      `
      )
      .eq('id', orderId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Order not found', errorCode: 'NOT_FOUND' };
      }
      return { success: false, error: error.message, errorCode: 'DATABASE_ERROR' };
    }

    // Fetch order items
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select(ORDER_ITEMS_SELECT)
      .eq('order_id', orderId);

    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
    }

    return {
      success: true,
      data: {
        ...order,
        items: items || [],
      } as AdminOrder & { items: OrderItem[] },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      errorCode: 'DATABASE_ERROR',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// إدارة الطلبات - Order Management
// ═══════════════════════════════════════════════════════════════════════

/**
 * إلغاء طلب
 * Cancel an order
 */
export async function cancelOrder(
  adminId: string,
  orderId: string,
  reason: string
): Promise<OperationResult<AdminOrder>> {
  try {
    if (!reason || !reason.trim()) {
      return {
        success: false,
        error: 'Cancellation reason is required',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    const supabase = createAdminClient();

    // Fetch current order
    const { data: current, error: fetchError } = await supabase
      .from('orders')
      .select('*, provider:providers(name_ar)')
      .eq('id', orderId)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'Order not found', errorCode: 'NOT_FOUND' };
    }

    // Validate status - can only cancel certain statuses
    const cancellableStatuses: OrderStatus[] = ['pending', 'confirmed', 'preparing'];
    if (!cancellableStatuses.includes(current.status)) {
      return {
        success: false,
        error: `Cannot cancel order with status: ${current.status}`,
        errorCode: 'INVALID_STATUS_TRANSITION',
      };
    }

    // Update order
    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_reason: reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select(
        `
        *,
        customer:profiles(id, full_name, phone),
        provider:providers(id, name_ar, name_en)
      `
      )
      .single();

    if (updateError) {
      return { success: false, error: updateError.message, errorCode: 'DATABASE_ERROR' };
    }

    // Log audit action
    await logAuditAction(adminId, {
      action: AUDIT_ACTIONS.ORDER_CANCELLED,
      resourceType: 'order',
      resourceId: orderId,
      resourceName: `Order #${current.order_number}`,
      oldData: { status: current.status },
      newData: { status: 'cancelled', cancelled_reason: reason.trim() },
      reason: reason.trim(),
    });

    // Log activity
    await logActivity(
      adminId,
      'order_cancelled',
      `تم إلغاء الطلب #${current.order_number} - السبب: ${reason}`,
      { orderId, orderNumber: current.order_number, reason }
    );

    return { success: true, data: updated as AdminOrder };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      errorCode: 'DATABASE_ERROR',
    };
  }
}

/**
 * بدء عملية استرداد
 * Initiate a refund for an order
 */
export async function initiateRefund(
  adminId: string,
  orderId: string,
  amount: number,
  reason: string
): Promise<OperationResult<AdminOrder>> {
  try {
    if (!reason || !reason.trim()) {
      return { success: false, error: 'Refund reason is required', errorCode: 'VALIDATION_ERROR' };
    }

    if (amount <= 0) {
      return {
        success: false,
        error: 'Refund amount must be positive',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    const supabase = createAdminClient();

    // Fetch current order
    const { data: current, error: fetchError } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .eq('id', orderId)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'Order not found', errorCode: 'NOT_FOUND' };
    }

    // Validate - can only refund completed or cancelled orders
    const refundableStatuses: OrderStatus[] = ['delivered', 'cancelled'];
    if (!refundableStatuses.includes(current.status)) {
      return {
        success: false,
        error: `Cannot refund order with status: ${current.status}`,
        errorCode: 'INVALID_STATUS_TRANSITION',
      };
    }

    // Validate amount
    if (amount > current.total) {
      return {
        success: false,
        error: 'Refund amount cannot exceed order total',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Update order status to refunded
    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'refunded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select(
        `
        *,
        customer:profiles(id, full_name, phone),
        provider:providers(id, name_ar, name_en)
      `
      )
      .single();

    if (updateError) {
      return { success: false, error: updateError.message, errorCode: 'DATABASE_ERROR' };
    }

    // Create refund record (if refunds table exists)
    try {
      await supabase.from('refunds').insert({
        order_id: orderId,
        amount,
        reason: reason.trim(),
        status: 'pending',
        initiated_by: adminId,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Refunds table might not exist, continue anyway
      console.log('Refunds table not available, skipping refund record');
    }

    // Log audit action
    await logAuditAction(adminId, {
      action: AUDIT_ACTIONS.ORDER_REFUNDED,
      resourceType: 'order',
      resourceId: orderId,
      resourceName: `Order #${current.order_number}`,
      oldData: { status: current.status },
      newData: { status: 'refunded', refund_amount: amount },
      reason: reason.trim(),
    });

    // Log activity
    await logActivity(
      adminId,
      'order_refunded',
      `تم استرداد ${amount} ج.م للطلب #${current.order_number} - السبب: ${reason}`,
      { orderId, orderNumber: current.order_number, amount, reason }
    );

    return { success: true, data: updated as AdminOrder };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      errorCode: 'DATABASE_ERROR',
    };
  }
}

/**
 * تحديث حالة الطلب
 * Update order status
 */
export async function updateOrderStatus(
  adminId: string,
  orderId: string,
  newStatus: OrderStatus,
  note?: string
): Promise<OperationResult<AdminOrder>> {
  try {
    const supabase = createAdminClient();

    // Fetch current order
    const { data: current, error: fetchError } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .eq('id', orderId)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'Order not found', errorCode: 'NOT_FOUND' };
    }

    // Validate status transition
    const validTransitions: Record<string, OrderStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: ['delivering', 'cancelled'],
      delivering: ['delivered', 'cancelled'],
      delivered: ['refunded'],
      cancelled: ['refunded'],
      refunded: [],
    };

    const currentStatus = current.status as string;
    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      return {
        success: false,
        error: `Cannot transition from ${current.status} to ${newStatus}`,
        errorCode: 'INVALID_STATUS_TRANSITION',
      };
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Set timestamps based on status
    if (newStatus === 'confirmed' && !current.confirmed_at) {
      updateData.confirmed_at = new Date().toISOString();
    }
    if (newStatus === 'delivered' && !current.delivered_at) {
      updateData.delivered_at = new Date().toISOString();
    }
    if (newStatus === 'cancelled' && note) {
      updateData.cancelled_reason = note;
    }

    // Update order
    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select(
        `
        *,
        customer:profiles(id, full_name, phone),
        provider:providers(id, name_ar, name_en)
      `
      )
      .single();

    if (updateError) {
      return { success: false, error: updateError.message, errorCode: 'DATABASE_ERROR' };
    }

    // Log audit action
    await logAuditAction(adminId, {
      action: AUDIT_ACTIONS.ORDER_STATUS_CHANGED,
      resourceType: 'order',
      resourceId: orderId,
      resourceName: `Order #${current.order_number}`,
      oldData: { status: current.status },
      newData: { status: newStatus },
      reason: note,
    });

    return { success: true, data: updated as AdminOrder };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      errorCode: 'DATABASE_ERROR',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// إحصائيات الطلبات - Order Statistics
// ═══════════════════════════════════════════════════════════════════════

/**
 * جلب إحصائيات الطلبات
 * Get order statistics
 */
export async function getOrderStats(): Promise<
  OperationResult<{
    total: number;
    byStatus: Record<OrderStatus, number>;
    todayCount: number;
    todayRevenue: number;
    avgOrderValue: number;
  }>
> {
  try {
    const supabase = createAdminClient();

    // Get all orders
    const { data: orders, error } = await supabase
      .from('orders')
      .select('status, total, created_at');

    if (error) {
      return { success: false, error: error.message, errorCode: 'DATABASE_ERROR' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const byStatus: Record<string, number> = {};
    let todayCount = 0;
    let todayRevenue = 0;
    let totalRevenue = 0;
    let completedCount = 0;

    for (const order of orders || []) {
      // Count by status
      byStatus[order.status] = (byStatus[order.status] || 0) + 1;

      // Today stats
      const orderDate = new Date(order.created_at);
      if (orderDate >= today) {
        todayCount++;
        if (order.status === 'delivered') {
          todayRevenue += order.total || 0;
        }
      }

      // Total revenue for completed orders
      if (order.status === 'delivered') {
        totalRevenue += order.total || 0;
        completedCount++;
      }
    }

    return {
      success: true,
      data: {
        total: orders?.length || 0,
        byStatus: byStatus as Record<OrderStatus, number>,
        todayCount,
        todayRevenue,
        avgOrderValue: completedCount > 0 ? totalRevenue / completedCount : 0,
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

// ═══════════════════════════════════════════════════════════════════════
// أنواع إضافية - Additional Types
// ═══════════════════════════════════════════════════════════════════════

interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  item_name_ar: string;
  item_name_en: string;
  item_price: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  customizations?: unknown;
  special_instructions?: string;
  created_at: string;
  updated_at: string;
}

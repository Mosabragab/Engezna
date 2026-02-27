import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  getOrders,
  getOrderById,
  cancelOrder,
  initiateRefund,
  updateOrderStatus,
  getOrderStats,
} from '@/lib/admin/orders';
import type { OrderFilters, OrderStatus } from '@/lib/admin/types';
import { withErrorHandler } from '@/lib/api/error-handler';
import { validateBody } from '@/lib/api/validate';
import { AuthenticationError, AuthorizationError, ValidationError } from '@/lib/errors';

const adminOrderActionSchema = z.object({
  action: z.enum(['list', 'get', 'cancel', 'refund', 'updateStatus', 'stats']),
  orderId: z.string().optional(),
  reason: z.string().optional(),
  amount: z.number().positive().optional(),
  status: z.string().optional(),
  note: z.string().optional(),
  filters: z.any().optional(),
});

/**
 * API Route for Admin Order Management
 * POST /api/admin/orders
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Verify authentication and admin role
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthenticationError('Unauthorized');
  }

  // Get user role from profiles table
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userError || userData?.role !== 'admin') {
    throw AuthorizationError.adminOnly();
  }

  const body = await validateBody(request, adminOrderActionSchema);
  const { action, ...params } = body;

  switch (action) {
    // ───────────────────────────────────────────────────────────────────
    // جلب قائمة الطلبات
    // ───────────────────────────────────────────────────────────────────
    case 'list': {
      const filters: OrderFilters = params.filters || {};
      logger.info('[Orders API] Fetching orders with filters', { filters });
      const result = await getOrders(filters);
      logger.info('[Orders API] Result received', {
        success: result.success,
        dataCount: result.data?.data?.length || 0,
      });
      if (!result.success) {
        logger.error('[Orders API] Error fetching orders', { error: result.error });
      }
      return NextResponse.json(result);
    }

    // ───────────────────────────────────────────────────────────────────
    // جلب طلب واحد
    // ───────────────────────────────────────────────────────────────────
    case 'get': {
      const { orderId } = params;
      if (!orderId) {
        return NextResponse.json(
          { success: false, error: 'Order ID is required' },
          { status: 400 }
        );
      }
      const result = await getOrderById(orderId);
      return NextResponse.json(result);
    }

    // ───────────────────────────────────────────────────────────────────
    // إلغاء طلب
    // ───────────────────────────────────────────────────────────────────
    case 'cancel': {
      const { orderId, reason } = params;
      if (!orderId) {
        return NextResponse.json(
          { success: false, error: 'Order ID is required' },
          { status: 400 }
        );
      }
      if (!reason) {
        return NextResponse.json(
          { success: false, error: 'Cancellation reason is required' },
          { status: 400 }
        );
      }
      const result = await cancelOrder(user.id, orderId, reason);
      return NextResponse.json(result);
    }

    // ───────────────────────────────────────────────────────────────────
    // استرداد طلب
    // ───────────────────────────────────────────────────────────────────
    case 'refund': {
      const { orderId, amount, reason } = params;
      if (!orderId) {
        return NextResponse.json(
          { success: false, error: 'Order ID is required' },
          { status: 400 }
        );
      }
      if (typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json(
          { success: false, error: 'Valid refund amount is required' },
          { status: 400 }
        );
      }
      if (!reason) {
        return NextResponse.json(
          { success: false, error: 'Refund reason is required' },
          { status: 400 }
        );
      }
      const result = await initiateRefund(user.id, orderId, amount, reason);
      return NextResponse.json(result);
    }

    // ───────────────────────────────────────────────────────────────────
    // تحديث حالة الطلب
    // ───────────────────────────────────────────────────────────────────
    case 'updateStatus': {
      const { orderId, status, note } = params;
      if (!orderId) {
        return NextResponse.json(
          { success: false, error: 'Order ID is required' },
          { status: 400 }
        );
      }
      if (!status) {
        return NextResponse.json(
          { success: false, error: 'New status is required' },
          { status: 400 }
        );
      }
      const result = await updateOrderStatus(user.id, orderId, status as OrderStatus, note);
      return NextResponse.json(result);
    }

    // ───────────────────────────────────────────────────────────────────
    // إحصائيات الطلبات
    // ───────────────────────────────────────────────────────────────────
    case 'stats': {
      const result = await getOrderStats();
      return NextResponse.json(result);
    }

    default:
      throw ValidationError.field('action', 'Unknown action');
  }
});

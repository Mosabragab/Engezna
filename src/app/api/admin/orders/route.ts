import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getOrders,
  getOrderById,
  cancelOrder,
  initiateRefund,
  updateOrderStatus,
  getOrderStats,
} from '@/lib/admin/orders';
import type { OrderFilters, OrderStatus } from '@/lib/admin/types';

/**
 * API Route for Admin Order Management
 * POST /api/admin/orders
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication and admin role
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role from profiles table
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      // ───────────────────────────────────────────────────────────────────
      // جلب قائمة الطلبات
      // ───────────────────────────────────────────────────────────────────
      case 'list': {
        const filters: OrderFilters = params.filters || {};
        console.log('[Orders API] Fetching orders with filters:', filters);
        const result = await getOrders(filters);
        console.log(
          '[Orders API] Result success:',
          result.success,
          'Data count:',
          result.data?.data?.length || 0
        );
        if (!result.success) {
          console.error('[Orders API] Error:', result.error);
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
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in admin orders API:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

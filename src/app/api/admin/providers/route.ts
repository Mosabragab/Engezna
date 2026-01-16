import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getProviders,
  getProviderById,
  approveProvider,
  rejectProvider,
  suspendProvider,
  reactivateProvider,
  updateProviderCommission,
  toggleProviderFeatured,
  getProviderStats,
} from '@/lib/admin/providers';
import type { ProviderFilters } from '@/lib/admin/types';

/**
 * API Route for Admin Provider Management
 * POST /api/admin/providers
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
      // جلب قائمة مقدمي الخدمة
      // ───────────────────────────────────────────────────────────────────
      case 'list': {
        const filters: ProviderFilters = params.filters || {};
        const result = await getProviders(filters);
        return NextResponse.json(result);
      }

      // ───────────────────────────────────────────────────────────────────
      // جلب مقدم خدمة واحد
      // ───────────────────────────────────────────────────────────────────
      case 'get': {
        const { providerId } = params;
        if (!providerId) {
          return NextResponse.json(
            { success: false, error: 'Provider ID is required' },
            { status: 400 }
          );
        }
        const result = await getProviderById(providerId);
        return NextResponse.json(result);
      }

      // ───────────────────────────────────────────────────────────────────
      // الموافقة على مقدم خدمة
      // ───────────────────────────────────────────────────────────────────
      case 'approve': {
        const { providerId, commissionRate } = params;
        if (!providerId) {
          return NextResponse.json(
            { success: false, error: 'Provider ID is required' },
            { status: 400 }
          );
        }
        const result = await approveProvider(user.id, providerId, commissionRate);
        return NextResponse.json(result);
      }

      // ───────────────────────────────────────────────────────────────────
      // رفض مقدم خدمة
      // ───────────────────────────────────────────────────────────────────
      case 'reject': {
        const { providerId, reason } = params;
        if (!providerId) {
          return NextResponse.json(
            { success: false, error: 'Provider ID is required' },
            { status: 400 }
          );
        }
        if (!reason) {
          return NextResponse.json(
            { success: false, error: 'Rejection reason is required' },
            { status: 400 }
          );
        }
        const result = await rejectProvider(user.id, providerId, reason);
        return NextResponse.json(result);
      }

      // ───────────────────────────────────────────────────────────────────
      // إيقاف مقدم خدمة
      // ───────────────────────────────────────────────────────────────────
      case 'suspend': {
        const { providerId, reason } = params;
        if (!providerId) {
          return NextResponse.json(
            { success: false, error: 'Provider ID is required' },
            { status: 400 }
          );
        }
        if (!reason) {
          return NextResponse.json(
            { success: false, error: 'Suspension reason is required' },
            { status: 400 }
          );
        }
        const result = await suspendProvider(user.id, providerId, reason);
        return NextResponse.json(result);
      }

      // ───────────────────────────────────────────────────────────────────
      // إعادة تفعيل مقدم خدمة
      // ───────────────────────────────────────────────────────────────────
      case 'reactivate': {
        const { providerId } = params;
        if (!providerId) {
          return NextResponse.json(
            { success: false, error: 'Provider ID is required' },
            { status: 400 }
          );
        }
        const result = await reactivateProvider(user.id, providerId);
        return NextResponse.json(result);
      }

      // ───────────────────────────────────────────────────────────────────
      // تحديث نسبة العمولة
      // ───────────────────────────────────────────────────────────────────
      case 'updateCommission': {
        const { providerId, commissionRate } = params;
        if (!providerId) {
          return NextResponse.json(
            { success: false, error: 'Provider ID is required' },
            { status: 400 }
          );
        }
        if (typeof commissionRate !== 'number') {
          return NextResponse.json(
            { success: false, error: 'Commission rate is required' },
            { status: 400 }
          );
        }
        const result = await updateProviderCommission(user.id, providerId, commissionRate);
        return NextResponse.json(result);
      }

      // ───────────────────────────────────────────────────────────────────
      // تبديل حالة التميز
      // ───────────────────────────────────────────────────────────────────
      case 'toggleFeatured': {
        const { providerId, isFeatured } = params;
        if (!providerId) {
          return NextResponse.json(
            { success: false, error: 'Provider ID is required' },
            { status: 400 }
          );
        }
        if (typeof isFeatured !== 'boolean') {
          return NextResponse.json(
            { success: false, error: 'Featured status is required' },
            { status: 400 }
          );
        }
        const result = await toggleProviderFeatured(user.id, providerId, isFeatured);
        return NextResponse.json(result);
      }

      // ───────────────────────────────────────────────────────────────────
      // إحصائيات مقدمي الخدمة
      // ───────────────────────────────────────────────────────────────────
      case 'stats': {
        const result = await getProviderStats();
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in admin providers API:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

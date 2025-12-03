import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuditLog } from '@/lib/admin/audit';

/**
 * API Route for Admin Audit Log
 * POST /api/admin/audit
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
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
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
      // جلب سجل التدقيق
      // ───────────────────────────────────────────────────────────────────
      case 'list': {
        const { adminId, resourceType, resourceId, status, dateFrom, dateTo, page, limit } = params;
        const result = await getAuditLog({
          adminId,
          resourceType,
          resourceId,
          status,
          dateFrom,
          dateTo,
          page: page || 1,
          limit: limit || 20,
        });
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in admin audit API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

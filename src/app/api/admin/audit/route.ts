import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import { validateBody } from '@/lib/api/validate';
import { getAuditLog } from '@/lib/admin/audit';

const adminAuditActionSchema = z.object({
  action: z.enum(['list']),
  adminId: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  status: z.enum(['success', 'denied', 'failed']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
});

/**
 * API Route for Admin Audit Log
 * POST /api/admin/audit
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
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

  const body = await validateBody(request, adminAuditActionSchema);
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
      return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  }
});

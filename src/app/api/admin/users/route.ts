import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import {
  getUsers,
  getUserById,
  banUser,
  unbanUser,
  changeUserRole,
  getUserStats,
} from '@/lib/admin/users';
import type { UserFilters, UserRole } from '@/lib/admin/types';

/**
 * API Route for Admin User Management
 * POST /api/admin/users
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

  const body = await request.json();
  const { action, ...params } = body;

  switch (action) {
    // ───────────────────────────────────────────────────────────────────
    // جلب قائمة المستخدمين
    // ───────────────────────────────────────────────────────────────────
    case 'list': {
      const filters: UserFilters = params.filters || {};
      const result = await getUsers(filters);
      return NextResponse.json(result);
    }

    // ───────────────────────────────────────────────────────────────────
    // جلب مستخدم واحد
    // ───────────────────────────────────────────────────────────────────
    case 'get': {
      const { userId } = params;
      if (!userId) {
        return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
      }
      const result = await getUserById(userId);
      return NextResponse.json(result);
    }

    // ───────────────────────────────────────────────────────────────────
    // حظر مستخدم
    // ───────────────────────────────────────────────────────────────────
    case 'ban': {
      const { userId, reason } = params;
      if (!userId) {
        return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
      }
      if (!reason) {
        return NextResponse.json(
          { success: false, error: 'Ban reason is required' },
          { status: 400 }
        );
      }
      const result = await banUser(user.id, userId, reason);
      return NextResponse.json(result);
    }

    // ───────────────────────────────────────────────────────────────────
    // إلغاء حظر مستخدم
    // ───────────────────────────────────────────────────────────────────
    case 'unban': {
      const { userId } = params;
      if (!userId) {
        return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
      }
      const result = await unbanUser(user.id, userId);
      return NextResponse.json(result);
    }

    // ───────────────────────────────────────────────────────────────────
    // تغيير دور المستخدم
    // ───────────────────────────────────────────────────────────────────
    case 'changeRole': {
      const { userId, newRole, reason } = params;
      if (!userId) {
        return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
      }
      if (!newRole || !['customer', 'provider', 'admin'].includes(newRole)) {
        return NextResponse.json(
          { success: false, error: 'Valid role is required' },
          { status: 400 }
        );
      }
      const result = await changeUserRole(user.id, userId, newRole as UserRole, reason);
      return NextResponse.json(result);
    }

    // ───────────────────────────────────────────────────────────────────
    // إحصائيات المستخدمين
    // ───────────────────────────────────────────────────────────────────
    case 'stats': {
      const result = await getUserStats();
      return NextResponse.json(result);
    }

    default:
      return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  }
});

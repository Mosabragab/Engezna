import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// Create Supabase admin client with service role key
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

interface DeleteAdminRequest {
  adminId: string;
  userId: string;
}

export async function DELETE(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - no token' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseAdmin();

    // Verify the caller's token
    const {
      data: { user: caller },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !caller) {
      return NextResponse.json(
        { error: `Invalid token: ${authError?.message || 'user not found'}` },
        { status: 401 }
      );
    }

    // Verify caller is a super_admin
    const { data: callerAdmin, error: callerAdminError } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('user_id', caller.id)
      .single();

    if (callerAdminError || !callerAdmin || callerAdmin.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Not authorized - only super admins can delete administrators' },
        { status: 403 }
      );
    }

    // Parse request body
    const body: DeleteAdminRequest = await request.json();
    const { adminId, userId } = body;

    if (!adminId || !userId) {
      return NextResponse.json({ error: 'Missing adminId or userId' }, { status: 400 });
    }

    // Prevent self-deletion
    if (caller.id === userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Verify the target admin exists
    const { data: targetAdmin, error: targetError } = await supabase
      .from('admin_users')
      .select('id, user_id, role')
      .eq('id', adminId)
      .single();

    if (targetError || !targetAdmin) {
      return NextResponse.json(
        { error: `Admin not found: ${targetError?.message || 'no record'}` },
        { status: 404 }
      );
    }

    if (targetAdmin.user_id !== userId) {
      return NextResponse.json({ error: 'Admin ID and user ID mismatch' }, { status: 400 });
    }

    logger.info('[Delete Admin] Starting complete deletion', {
      adminId,
      userId,
      role: targetAdmin.role,
      deletedBy: caller.id,
    });

    // Delete from auth.users - this cascades to:
    // auth.users → profiles (ON DELETE CASCADE) → admin_users (ON DELETE CASCADE)
    //   → admin_roles (ON DELETE CASCADE)
    //   → admin_permissions (ON DELETE CASCADE)
    //   → admin_notifications (ON DELETE CASCADE)
    // admin_invitations.invited_by / cancelled_by → SET NULL
    // activity_log.admin_id → SET NULL
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      logger.error('[Delete Admin] Failed to delete auth user', undefined, {
        userId,
        error: deleteAuthError.message,
      });
      return NextResponse.json(
        { error: `Failed to delete user: ${deleteAuthError.message}` },
        { status: 500 }
      );
    }

    logger.info('[Delete Admin] Successfully deleted admin completely', {
      adminId,
      userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[Delete Admin] Unexpected error', error instanceof Error ? error : undefined, {
      errorMessage: msg,
    });
    return NextResponse.json({ error: `Unexpected error: ${msg}` }, { status: 500 });
  }
}

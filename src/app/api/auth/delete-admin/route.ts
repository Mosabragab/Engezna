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

// Helper to safely run a query and log errors without blocking
async function safeDelete(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  description: string,
  queryFn: () => Promise<{ error: { message: string } | null }>
): Promise<void> {
  try {
    const { error } = await queryFn();
    if (error) {
      logger.warn(`[Delete Admin] ${description} - non-blocking error: ${error.message}`);
    }
  } catch (err) {
    // Table might not exist yet - that's OK
    logger.warn(
      `[Delete Admin] ${description} - skipped: ${err instanceof Error ? err.message : String(err)}`
    );
  }
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

    // ================================================================
    // Phase 1: Clean up references FROM admin_users (admin_id)
    // These must be handled before admin_users is deleted
    // ================================================================

    // CASCADE tables (auto-deleted, but we delete explicitly for safety)
    await safeDelete(supabase, 'admin_roles', () =>
      supabase.from('admin_roles').delete().eq('admin_id', adminId)
    );
    await safeDelete(supabase, 'admin_permissions', () =>
      supabase.from('admin_permissions').delete().eq('admin_id', adminId)
    );
    await safeDelete(supabase, 'admin_notifications', () =>
      supabase.from('admin_notifications').delete().eq('admin_id', adminId)
    );

    // SET NULL tables referencing admin_id
    await safeDelete(supabase, 'activity_log.admin_id', () =>
      supabase.from('activity_log').update({ admin_id: null }).eq('admin_id', adminId)
    );
    await safeDelete(supabase, 'admin_tasks.assigned_to', () =>
      supabase.from('admin_tasks').update({ assigned_to: null }).eq('assigned_to', adminId)
    );
    await safeDelete(supabase, 'admin_tasks.created_by', () =>
      supabase.from('admin_tasks').update({ created_by: null }).eq('created_by', adminId)
    );
    await safeDelete(supabase, 'support_tickets.assigned_to', () =>
      supabase.from('support_tickets').update({ assigned_to: null }).eq('assigned_to', adminId)
    );
    await safeDelete(supabase, 'approval_requests.requested_by', () =>
      supabase.from('approval_requests').update({ requested_by: null }).eq('requested_by', adminId)
    );
    await safeDelete(supabase, 'approval_requests.decided_by', () =>
      supabase.from('approval_requests').update({ decided_by: null }).eq('decided_by', adminId)
    );
    await safeDelete(supabase, 'approval_discussions.admin_id', () =>
      supabase.from('approval_discussions').update({ admin_id: null }).eq('admin_id', adminId)
    );
    await safeDelete(supabase, 'internal_messages.sender_id', () =>
      supabase.from('internal_messages').update({ sender_id: null }).eq('sender_id', adminId)
    );
    await safeDelete(supabase, 'announcements.created_by', () =>
      supabase.from('announcements').update({ created_by: null }).eq('created_by', adminId)
    );
    await safeDelete(supabase, 'platform_settings.updated_by', () =>
      supabase.from('platform_settings').update({ updated_by: null }).eq('updated_by', adminId)
    );
    await safeDelete(supabase, 'admin_invitations.invited_by', () =>
      supabase.from('admin_invitations').update({ invited_by: null }).eq('invited_by', adminId)
    );
    await safeDelete(supabase, 'admin_invitations.cancelled_by', () =>
      supabase.from('admin_invitations').update({ cancelled_by: null }).eq('cancelled_by', adminId)
    );
    await safeDelete(supabase, 'escalation_rules.escalate_to_admin_id', () =>
      supabase
        .from('escalation_rules')
        .update({ escalate_to_admin_id: null })
        .eq('escalate_to_admin_id', adminId)
    );
    await safeDelete(supabase, 'escalation_rules.created_by', () =>
      supabase.from('escalation_rules').update({ created_by: null }).eq('created_by', adminId)
    );
    await safeDelete(supabase, 'settlements.processed_by', () =>
      supabase.from('settlements').update({ processed_by: null }).eq('processed_by', adminId)
    );
    await safeDelete(supabase, 'admin_users.reports_to (self-ref)', () =>
      supabase.from('admin_users').update({ reports_to: null }).eq('reports_to', adminId)
    );

    // Special: admin_tasks.cc_to is a UUID array - remove adminId from arrays
    // This can't be done with a simple update, use raw SQL via rpc
    try {
      await supabase.rpc('admin_remove_from_cc_to', { p_admin_id: adminId });
    } catch {
      // Function might not exist, handle manually or skip
      logger.warn(
        '[Delete Admin] admin_remove_from_cc_to rpc not available, skipping cc_to cleanup'
      );
    }

    // ================================================================
    // Phase 2: Clean up references FROM profiles (user_id)
    // These must be handled before profiles is deleted
    // ================================================================

    // DELETE tables with NOT NULL constraint on FK (can't SET NULL)
    await safeDelete(supabase, 'homepage_section_drafts', () =>
      supabase.from('homepage_section_drafts').delete().eq('created_by', userId)
    );

    // SET NULL + NOT NULL conflict: update to caller's ID instead of NULL
    await safeDelete(supabase, 'homepage_sections.created_by', () =>
      supabase.from('homepage_sections').update({ created_by: caller.id }).eq('created_by', userId)
    );

    // SET NULL tables referencing user_id (profiles.id)
    await safeDelete(supabase, 'support_tickets.user_id', () =>
      supabase.from('support_tickets').update({ user_id: null }).eq('user_id', userId)
    );
    await safeDelete(supabase, 'ticket_messages.sender_id', () =>
      supabase.from('ticket_messages').update({ sender_id: null }).eq('sender_id', userId)
    );
    await safeDelete(supabase, 'admin_invitations.accepted_user_id', () =>
      supabase
        .from('admin_invitations')
        .update({ accepted_user_id: null })
        .eq('accepted_user_id', userId)
    );
    await safeDelete(supabase, 'homepage_banners.created_by', () =>
      supabase.from('homepage_banners').update({ created_by: null }).eq('created_by', userId)
    );
    await safeDelete(supabase, 'homepage_section_items.created_by', () =>
      supabase.from('homepage_section_items').update({ created_by: null }).eq('created_by', userId)
    );
    await safeDelete(supabase, 'homepage_section_items.updated_by', () =>
      supabase.from('homepage_section_items').update({ updated_by: null }).eq('updated_by', userId)
    );
    await safeDelete(supabase, 'settlement_group_members.added_by', () =>
      supabase.from('settlement_group_members').update({ added_by: null }).eq('added_by', userId)
    );

    // ================================================================
    // Phase 3: Delete admin_users record explicitly
    // ================================================================
    await safeDelete(supabase, 'admin_users', () =>
      supabase.from('admin_users').delete().eq('id', adminId)
    );

    // ================================================================
    // Phase 4: Delete profiles record explicitly
    // ================================================================
    await safeDelete(supabase, 'profiles', () =>
      supabase.from('profiles').delete().eq('id', userId)
    );

    // ================================================================
    // Phase 5: Delete auth.users (final cleanup)
    // ================================================================
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

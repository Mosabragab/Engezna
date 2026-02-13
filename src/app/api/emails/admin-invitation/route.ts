import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendAdminInvitationEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';

// Create Supabase admin client
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

interface AdminInvitationEmailRequest {
  to: string;
  adminName: string;
  roleName: string;
  roleColor: string;
  inviterName: string;
  inviteUrl: string;
  expiresIn: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseAdmin();

    // Verify the user's token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify user is a super_admin
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select(
        `
        id,
        role,
        admin_roles (
          role:roles (code)
        )
      `
      )
      .eq('user_id', user.id)
      .single();

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Not authorized - admin user not found' }, { status: 403 });
    }

    // Check if user is super_admin (legacy field or admin_roles)
    const isSuperAdmin =
      adminUser.role === 'super_admin' ||
      (adminUser.admin_roles as { role: { code: string } | { code: string }[] | null }[])?.some(
        (ar) => {
          const role = ar.role;
          const roleCode = Array.isArray(role) ? role[0]?.code : role?.code;
          return roleCode === 'super_admin';
        }
      );

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Not authorized - only super admins can send invitations' },
        { status: 403 }
      );
    }

    // Parse request body
    const body: AdminInvitationEmailRequest = await request.json();
    const { to, adminName, roleName, roleColor, inviterName, inviteUrl, expiresIn, message } = body;

    // Validate required fields
    if (!to || !adminName || !roleName || !inviteUrl || !expiresIn) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Send the email
    const result = await sendAdminInvitationEmail({
      to,
      adminName,
      roleName,
      roleColor: roleColor || '#009DE0',
      inviterName: inviterName || 'مدير النظام',
      inviteUrl,
      expiresIn,
      message,
    });

    if (!result.success) {
      logger.error('[Admin Invitation Email] Failed to send', { error: result.error });
      return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 });
    }

    logger.info(`[Admin Invitation Email] Successfully sent to ${to}`);
    return NextResponse.json({
      success: true,
      messageId: result.data?.id,
    });
  } catch (error) {
    logger.error('[Admin Invitation Email] Error', { error });
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { sendAdminInvitationEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';
import { withErrorHandler } from '@/lib/api/error-handler';
import { validateBody } from '@/lib/api/validate';
import { emailSchema } from '@/lib/validations';

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

const adminInvitationSchema = z.object({
  to: emailSchema,
  adminName: z.string().min(1),
  roleName: z.string().min(1),
  roleColor: z.string().default('#009DE0'),
  inviterName: z.string().default('مدير النظام'),
  inviteUrl: z.string().url(),
  expiresIn: z.string().min(1),
  message: z.string().optional(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  // Get authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    logger.error('[Admin Invitation Email] No Bearer token in request');
    return NextResponse.json({ error: 'Unauthorized - no token' }, { status: 401 });
  }

  const token = authHeader.substring(7);
  const supabase = getSupabaseAdmin();

  // Verify the user's token
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    logger.error('[Admin Invitation Email] Token verification failed', undefined, {
      authError: authError?.message,
    });
    return NextResponse.json(
      { error: `Invalid token: ${authError?.message || 'user not found'}` },
      { status: 401 }
    );
  }

  // Verify user is a super_admin
  const { data: adminUser, error: adminError } = await supabase
    .from('admin_users')
    .select('id, role')
    .eq('user_id', user.id)
    .single();

  if (adminError || !adminUser) {
    logger.error('[Admin Invitation Email] Admin user not found', undefined, {
      userId: user.id,
      adminError: adminError?.message,
    });
    return NextResponse.json(
      { error: `Admin not found: ${adminError?.message || 'no record'}` },
      { status: 403 }
    );
  }

  // Check if user is super_admin
  if (adminUser.role !== 'super_admin') {
    logger.error('[Admin Invitation Email] User is not super_admin', undefined, {
      role: adminUser.role,
    });
    return NextResponse.json(
      { error: 'Not authorized - only super admins can send invitations' },
      { status: 403 }
    );
  }

  // Parse and validate request body
  const { to, adminName, roleName, roleColor, inviterName, inviteUrl, expiresIn, message } =
    await validateBody(request, adminInvitationSchema);

  // Send the email
  logger.info(`[Admin Invitation Email] Sending to ${to}...`);
  const result = await sendAdminInvitationEmail({
    to,
    adminName,
    roleName,
    roleColor,
    inviterName,
    inviteUrl,
    expiresIn,
    message,
  });

  if (!result.success) {
    logger.error('[Admin Invitation Email] Failed to send', undefined, {
      error: result.error,
      to,
    });
    return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 });
  }

  logger.info(`[Admin Invitation Email] Successfully sent to ${to}`);
  return NextResponse.json({
    success: true,
    messageId: result.data?.id,
  });
});

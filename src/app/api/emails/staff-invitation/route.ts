import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { sendStaffInvitationEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';
import { withErrorHandler } from '@/lib/api/error-handler';
import { validateBody } from '@/lib/api/validate';
import { emailSchema } from '@/lib/validations';

const staffInvitationSchema = z.object({
  to: emailSchema,
  staffName: z.string().optional(),
  storeName: z.string().min(1),
  merchantName: z.string().optional(),
  role: z.string().optional(),
  inviteUrl: z.string().url(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();

  // Verify the request is from an authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse and validate request body
  const { to, staffName, storeName, merchantName, role, inviteUrl } = await validateBody(
    request,
    staffInvitationSchema
  );

  // Verify the user is a provider owner
  const { data: provider } = await supabase
    .from('providers')
    .select('id, owner_id')
    .eq('owner_id', user.id)
    .single();

  if (!provider) {
    return NextResponse.json(
      { error: 'Only provider owners can send staff invitations' },
      { status: 403 }
    );
  }

  // Send staff invitation email
  logger.info('[staff-invitation API] Sending email to', { data: to });
  const result = await sendStaffInvitationEmail({
    to,
    staffName: staffName || to.split('@')[0],
    storeName,
    merchantName: merchantName || 'صاحب المتجر',
    role: role || 'staff',
    inviteUrl,
  });

  if (!result.success) {
    logger.error('[staff-invitation API] Failed to send email', undefined, {
      error: result.error,
    });
    return NextResponse.json(
      { error: 'Failed to send email', details: result.error },
      { status: 500 }
    );
  }

  logger.info('[staff-invitation API] Email sent successfully');
  return NextResponse.json({
    success: true,
    message: 'Staff invitation email sent successfully',
  });
});

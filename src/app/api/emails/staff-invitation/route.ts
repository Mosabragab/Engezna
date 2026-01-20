import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendStaffInvitationEmail } from '@/lib/email/resend';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify the request is from an authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { to, staffName, storeName, merchantName, role, inviteUrl } = body;

    // Validate required fields
    if (!to || !storeName || !inviteUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: to, storeName, inviteUrl' },
        { status: 400 }
      );
    }

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
    console.log('[staff-invitation API] Sending email to:', to);
    const result = await sendStaffInvitationEmail({
      to,
      staffName: staffName || to.split('@')[0],
      storeName,
      merchantName: merchantName || 'صاحب المتجر',
      role: role || 'staff',
      inviteUrl,
    });

    if (!result.success) {
      console.error('[staff-invitation API] Failed to send email:', result.error);
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      );
    }

    console.log('[staff-invitation API] Email sent successfully');
    return NextResponse.json({
      success: true,
      message: 'Staff invitation email sent successfully',
    });
  } catch (error) {
    console.error('[staff-invitation API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

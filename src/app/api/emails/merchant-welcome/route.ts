import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendMerchantWelcomeEmail } from '@/lib/email/resend';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify the request is from an authenticated admin or the system
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (optional - can be called from system too)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Allow admin or merchant themselves to trigger welcome email
    const isAdmin = profile?.role === 'admin';
    const isMerchant = profile?.role === 'merchant';

    if (!isAdmin && !isMerchant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { merchantId, storeName } = body;

    if (!merchantId) {
      return NextResponse.json({ error: 'merchantId is required' }, { status: 400 });
    }

    // Get merchant data
    const { data: merchant, error: merchantError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', merchantId)
      .single();

    if (merchantError || !merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    if (!merchant.email) {
      return NextResponse.json({ error: 'Merchant has no email' }, { status: 400 });
    }

    // Send welcome email
    const result = await sendMerchantWelcomeEmail({
      to: merchant.email,
      merchantName: merchant.full_name || 'التاجر',
      storeName: storeName || 'متجرك',
      dashboardUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.engezna.com'}/ar/provider/dashboard`,
    });

    if (!result.success) {
      console.error('Failed to send welcome email:', result.error);
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Welcome email sent successfully' });
  } catch (error) {
    console.error('Error in merchant-welcome API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

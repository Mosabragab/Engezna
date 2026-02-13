import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendSettlementEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify the request is from an authenticated admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { settlementId, storeId, merchantId, amount, ordersCount, period, settlementDate } = body;

    // Validate required fields
    if (!settlementId || !storeId || !amount) {
      return NextResponse.json(
        { error: 'settlementId, storeId, and amount are required' },
        { status: 400 }
      );
    }

    // Get store data
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('name, owner_id')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Get merchant data
    const ownerId = merchantId || store.owner_id;
    const { data: merchant, error: merchantError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', ownerId)
      .single();

    if (merchantError || !merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    if (!merchant.email) {
      return NextResponse.json({ error: 'Merchant has no email' }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.engezna.com';

    // Send settlement email
    const result = await sendSettlementEmail({
      to: merchant.email,
      merchantName: merchant.full_name || 'التاجر',
      storeName: store.name,
      amount: Number(amount),
      settlementId: String(settlementId),
      settlementDate: settlementDate || new Date().toISOString(),
      ordersCount: ordersCount || 0,
      period: period || 'الفترة الماضية',
      dashboardUrl: `${siteUrl}/ar/provider/dashboard/settlements`,
    });

    if (!result.success) {
      logger.error('Failed to send settlement email', { error: result.error });
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Settlement email sent successfully' });
  } catch (error) {
    logger.error('Error in settlement API', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

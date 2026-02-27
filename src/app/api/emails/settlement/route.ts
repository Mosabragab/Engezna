import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { sendSettlementEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';
import { withErrorHandler } from '@/lib/api/error-handler';
import { validateBody } from '@/lib/api/validate';

const settlementSchema = z.object({
  settlementId: z.string().min(1),
  storeId: z.string().min(1),
  merchantId: z.string().optional(),
  amount: z.number(),
  ordersCount: z.number().optional(),
  period: z.string().optional(),
  settlementDate: z.string().optional(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
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

  const { settlementId, storeId, merchantId, amount, ordersCount, period, settlementDate } =
    await validateBody(request, settlementSchema);

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
});

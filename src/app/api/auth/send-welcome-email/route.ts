import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendCustomerWelcomeEmail, sendMerchantWelcomeEmail } from '@/lib/email/resend';
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name, role, welcome_email_sent')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if welcome email was already sent
    if (profile.welcome_email_sent) {
      return NextResponse.json({ success: true, message: 'Welcome email already sent' });
    }

    // Get site URL for links
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.engezna.com';

    const firstName = profile.full_name?.split(' ')[0] || 'عميلنا الكريم';
    let emailResult;

    // Send appropriate welcome email based on role
    if (profile.role === 'provider_owner') {
      // Get provider/store info for merchant welcome email
      const { data: provider } = await supabase
        .from('providers')
        .select('name_ar')
        .eq('owner_id', userId)
        .single();

      emailResult = await sendMerchantWelcomeEmail({
        to: profile.email,
        merchantName: firstName,
        storeName: provider?.name_ar || 'متجرك',
        dashboardUrl: `${siteUrl}/ar/provider`,
      });
    } else {
      // Send customer welcome email
      emailResult = await sendCustomerWelcomeEmail({
        to: profile.email,
        userName: firstName,
        browseUrl: `${siteUrl}/ar`,
        supportUrl: `${siteUrl}/ar/support`,
      });
    }

    if (emailResult.success) {
      // Mark welcome email as sent
      await supabase.from('profiles').update({ welcome_email_sent: true }).eq('id', userId);
    }

    return NextResponse.json({
      success: emailResult.success,
      message: emailResult.success ? 'Welcome email sent' : 'Failed to send welcome email',
    });
  } catch (error) {
    logger.error('Send welcome email error:', { error });
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

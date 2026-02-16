import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPasswordResetEmail } from '@/lib/email/resend';
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
    const { email, locale = 'ar' } = body;

    if (!email) {
      return NextResponse.json(
        { error: locale === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: locale === 'ar' ? 'البريد الإلكتروني غير صالح' : 'Invalid email format' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.engezna.com';

    // Check if user exists (look up by email in profiles)
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('email', email.toLowerCase())
      .single();

    // Always return success even if user doesn't exist (to prevent email enumeration)
    if (!profile) {
      logger.info('[Forgot Password] Email not found, returning success silently', {
        data: email,
      });
      return NextResponse.json({ success: true });
    }

    const userName = profile.full_name?.split(' ')[0] || (locale === 'ar' ? 'المستخدم' : 'User');

    // Generate recovery link using admin API
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email.toLowerCase(),
      options: {
        redirectTo: `${siteUrl}/${locale}/auth/reset-password`,
      },
    });

    if (linkError) {
      logger.error('[Forgot Password] Link generation error', undefined, {
        errorMessage: linkError.message,
      });
      // Still return success to prevent email enumeration
      return NextResponse.json({ success: true });
    }

    // Build the password reset URL using the callback page
    let resetUrl = `${siteUrl}/${locale}/auth/reset-password`;
    if (linkData?.properties?.hashed_token) {
      resetUrl = `${siteUrl}/${locale}/auth/callback?token_hash=${linkData.properties.hashed_token}&type=recovery`;
    } else if (linkData?.properties?.action_link) {
      resetUrl = linkData.properties.action_link;
    }

    // Send password reset email via Resend
    logger.info('[Forgot Password] Sending password reset email to:', { data: email });

    const emailResult = await sendPasswordResetEmail({
      to: email.toLowerCase(),
      userName,
      resetUrl,
      expiryTime: locale === 'ar' ? '٦٠ دقيقة' : '60 minutes',
    });

    logger.info('[Forgot Password] Email result:', { data: emailResult });

    if (!emailResult.success) {
      logger.error('[Forgot Password] Email send error', undefined, {
        error: emailResult.error,
      });
      // Still return success to prevent email enumeration
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Forgot Password] Unexpected error', error instanceof Error ? error : undefined, {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPasswordResetEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';
import { withErrorHandler } from '@/lib/api/error-handler';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validate';
import { emailSchema } from '@/lib/validations';

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

const forgotPasswordBodySchema = z.object({
  email: emailSchema,
  locale: z.string().optional(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { email, locale = 'ar' } = await validateBody(request, forgotPasswordBodySchema);

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
});

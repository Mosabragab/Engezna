/**
 * Resend Email Verification API
 *
 * POST /api/auth/resend-verification
 * Resends the email verification link for a user who hasn't verified yet.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmailVerificationEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';
import { withErrorHandler, successResponse } from '@/lib/api/error-handler';
import { ValidationError } from '@/lib/errors';

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

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { email } = body;

  if (!email || typeof email !== 'string') {
    throw ValidationError.field('email', 'Email is required');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw ValidationError.field('email', 'Invalid email format');
  }

  const supabase = getSupabaseAdmin();

  // Find user by email
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (!profile) {
    // Don't reveal whether email exists — return success silently
    return successResponse({ message: 'If the email exists, a verification link has been sent.' });
  }

  // Get site URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.engezna.com';

  // Generate new verification link using magiclink type (doesn't require password)
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: profile.email,
    options: {
      redirectTo: `${siteUrl}/ar/auth/callback?verified=true`,
    },
  });

  if (linkError) {
    logger.error('[ResendVerification] Link generation error', undefined, {
      errorMessage: linkError.message,
    });
    return successResponse({ message: 'If the email exists, a verification link has been sent.' });
  }

  // Build verification URL
  let verificationUrl = `${siteUrl}/ar/auth/verify-email`;
  if (linkData?.properties?.hashed_token) {
    verificationUrl = `${siteUrl}/ar/auth/callback?token_hash=${linkData.properties.hashed_token}&type=signup`;
  } else if (linkData?.properties?.action_link) {
    verificationUrl = linkData.properties.action_link;
  }

  // Send verification email
  const firstName = profile.full_name?.split(' ')[0] || '';
  const emailResult = await sendEmailVerificationEmail({
    to: profile.email,
    userName: firstName,
    verificationUrl,
  });

  if (!emailResult.success) {
    logger.error('[ResendVerification] Email send error', undefined, { error: emailResult.error });
  }

  return successResponse({ message: 'If the email exists, a verification link has been sent.' });
});

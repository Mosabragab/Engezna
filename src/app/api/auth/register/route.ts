import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmailVerificationEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';
import { withErrorHandler } from '@/lib/api/error-handler';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validate';
import { emailSchema, strongPasswordSchema } from '@/lib/validations';

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

const registerBodySchema = z.object({
  email: emailSchema,
  password: strongPasswordSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().optional(),
  governorateId: z.string().optional(),
  cityId: z.string().optional(),
  locale: z.string().optional(),
});

/**
 * Check if email is a test account that should bypass email verification.
 * ONLY active in development/test environments - disabled in production.
 * Test accounts: test@engezna.com, demo@*, *+test@*, testuser*@*
 */
function isTestAccount(email: string): boolean {
  // Never bypass email verification in production
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  const testPatterns = [
    /^test@engezna\.com$/i,
    /^demo@/i,
    /^testuser/i,
    /\+test@/i,
    /@test\./i,
    /^test\d*@/i,
  ];
  return testPatterns.some((pattern) => pattern.test(email));
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const {
    email,
    password,
    firstName,
    lastName,
    phone,
    governorateId,
    cityId,
    locale = 'ar',
  } = await validateBody(request, registerBodySchema);

  const supabase = getSupabaseAdmin();

  // Check if email already exists
  const { data: existingUsers } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .limit(1);

  if (existingUsers && existingUsers.length > 0) {
    return NextResponse.json(
      { error: locale === 'ar' ? 'البريد الإلكتروني مسجل بالفعل' : 'Email already registered' },
      { status: 400 }
    );
  }

  // Check if phone already exists
  const { data: existingPhone } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .limit(1);

  if (existingPhone && existingPhone.length > 0) {
    return NextResponse.json(
      { error: locale === 'ar' ? 'رقم الهاتف مسجل بالفعل' : 'Phone number already registered' },
      { status: 400 }
    );
  }

  // Get the site URL for verification link
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.engezna.com';

  // Check if this is a test account
  const isTest = isTestAccount(email);

  // Create user in Supabase Auth
  // Auto-confirm test accounts to bypass email verification
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: isTest, // Auto-confirm test accounts
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      phone,
    },
  });

  if (authError) {
    logger.error('[Register] Auth error', undefined, { errorMessage: authError.message });

    // Handle specific auth errors
    if (authError.message?.includes('already registered')) {
      return NextResponse.json(
        { error: locale === 'ar' ? 'البريد الإلكتروني مسجل بالفعل' : 'Email already registered' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: locale === 'ar' ? 'فشل في إنشاء الحساب' : 'Failed to create account' },
      { status: 500 }
    );
  }

  if (!authData.user) {
    return NextResponse.json(
      { error: locale === 'ar' ? 'فشل في إنشاء الحساب' : 'Failed to create account' },
      { status: 500 }
    );
  }

  // Create/update profile - handle_new_user() trigger auto-creates a basic profile,
  // so we upsert to add additional fields (phone, location).
  const fullName = `${firstName} ${lastName}`.trim();
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: authData.user.id,
    email,
    full_name: fullName,
    phone,
    governorate_id: governorateId,
    city_id: cityId,
    role: 'customer',
    is_active: true,
  });

  if (profileError) {
    logger.error('[Register] Profile error', undefined, {
      errorMessage: profileError.message,
      errorCode: profileError.code,
    });

    // If profile creation fails, delete the auth user
    await supabase.auth.admin.deleteUser(authData.user.id);

    // Check for unique constraint violations
    if (profileError.code === '23505') {
      if (profileError.message?.includes('phone')) {
        return NextResponse.json(
          {
            error: locale === 'ar' ? 'رقم الهاتف مسجل بالفعل' : 'Phone number already registered',
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: locale === 'ar' ? 'البيانات مسجلة بالفعل' : 'Data already registered' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: locale === 'ar' ? 'فشل في إنشاء الملف الشخصي' : 'Failed to create profile' },
      { status: 500 }
    );
  }

  // Skip verification for test accounts
  if (isTest) {
    logger.info('[Register] Test account detected, skipping email verification:', {
      data: email,
    });
    return NextResponse.json({
      success: true,
      message:
        locale === 'ar'
          ? 'تم إنشاء حساب الاختبار بنجاح. يمكنك تسجيل الدخول الآن.'
          : 'Test account created successfully. You can login now.',
      userId: authData.user.id,
      isTestAccount: true, // Flag for client to auto-login
    });
  }

  // Generate verification token for regular accounts
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'signup',
    email,
    password, // Required for signup type
    options: {
      redirectTo: `${siteUrl}/${locale}/auth/callback?verified=true`,
    },
  });

  if (linkError) {
    logger.error('[Register] Link generation error', undefined, {
      errorMessage: linkError?.message,
    });
  }

  // Extract token from the link
  let verificationUrl = `${siteUrl}/${locale}/auth/verify-email`;
  if (linkData?.properties?.hashed_token) {
    verificationUrl = `${siteUrl}/${locale}/auth/callback?token_hash=${linkData.properties.hashed_token}&type=signup`;
  } else if (linkData?.properties?.action_link) {
    verificationUrl = linkData.properties.action_link;
  }

  // Send verification email using our custom template
  logger.info('[Register] Sending verification email to:', { data: email });
  logger.debug('[Register] Verification URL:', { data: verificationUrl });

  const emailResult = await sendEmailVerificationEmail({
    to: email,
    userName: firstName,
    verificationUrl,
  });

  logger.info('[Register] Email result:', { data: emailResult });

  if (!emailResult.success) {
    logger.error('[Register] Email send error', undefined, { error: emailResult.error });
    // Don't fail registration if email fails, user can request resend
  }

  return NextResponse.json({
    success: true,
    message:
      locale === 'ar'
        ? 'تم إنشاء الحساب بنجاح. يرجى تأكيد بريدك الإلكتروني.'
        : 'Account created successfully. Please verify your email.',
    userId: authData.user.id,
    isTestAccount: false,
  });
});

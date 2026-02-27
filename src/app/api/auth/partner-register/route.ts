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

const partnerRegisterBodySchema = z.object({
  email: emailSchema,
  password: strongPasswordSchema,
  fullName: z.string().min(2).max(100),
  phone: z.string().optional(),
  governorateId: z.string().optional(),
  cityId: z.string().optional(),
  businessCategory: z.string().optional(),
  storeNameAr: z.string().optional(),
  storeNameEn: z.string().optional(),
  partnerRole: z.string().optional(),
  locale: z.string().optional(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const {
    email,
    password,
    fullName,
    phone,
    governorateId,
    cityId,
    businessCategory,
    storeNameAr,
    storeNameEn,
    partnerRole,
    locale = 'ar',
  } = await validateBody(request, partnerRegisterBodySchema);

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

  // Create user in Supabase Auth with admin API
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: false, // Don't auto-confirm, we'll send custom email
    user_metadata: {
      full_name: fullName,
      phone,
      role: 'provider_owner',
    },
  });

  if (authError) {
    logger.error('[Partner Register] Auth error', undefined, { errorMessage: authError.message });

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
  // so we upsert to add additional fields (phone, location, partner_role).
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: authData.user.id,
    email,
    full_name: fullName,
    phone,
    governorate_id: governorateId,
    city_id: cityId || null,
    role: 'provider_owner',
    partner_role: partnerRole,
    is_active: true,
  });

  if (profileError) {
    logger.error('[Partner Register] Profile error', undefined, {
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

  // Create provider record with status "incomplete"
  const { error: providerError } = await supabase.from('providers').insert({
    owner_id: authData.user.id,
    name_ar: storeNameAr,
    name_en: storeNameEn,
    category: businessCategory,
    phone,
    address_ar: '',
    delivery_fee: 0,
    status: 'incomplete',
    governorate_id: governorateId,
    city_id: cityId || null,
  });

  if (providerError) {
    logger.error('[Partner Register] Provider error', undefined, {
      errorMessage: providerError.message,
      errorCode: providerError.code,
    });
    // Don't fail - provider can be created later
  }

  // Generate verification token
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: {
      redirectTo: `${siteUrl}/${locale}/provider?verified=true`,
    },
  });

  if (linkError) {
    logger.error('[Partner Register] Link generation error', undefined, {
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

  // Send email verification email (user must verify before accessing dashboard)
  logger.info('[Partner Register] Sending verification email to:', { data: email });

  const emailResult = await sendEmailVerificationEmail({
    to: email,
    userName: fullName,
    verificationUrl: verificationUrl,
  });

  logger.info('[Partner Register] Email result:', { data: emailResult });

  if (!emailResult.success) {
    logger.error('[Partner Register] Email send error', undefined, {
      error: emailResult.error,
    });
    // Don't fail registration if email fails, user can request resend
  }

  return NextResponse.json({
    success: true,
    message:
      locale === 'ar'
        ? 'تم إنشاء الحساب بنجاح. يرجى تأكيد بريدك الإلكتروني.'
        : 'Account created successfully. Please verify your email.',
    userId: authData.user.id,
  });
});

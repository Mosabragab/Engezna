import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmailVerificationEmail } from '@/lib/email/resend';

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

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  governorateId: string;
  cityId: string;
  locale: string;
}

/**
 * Check if email is a test account that should bypass email verification
 * Test accounts: test@engezna.com, demo@*, *+test@*, testuser*@*
 */
function isTestAccount(email: string): boolean {
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

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      governorateId,
      cityId,
      locale = 'ar',
    } = body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !phone || !governorateId || !cityId) {
      return NextResponse.json(
        { error: locale === 'ar' ? 'جميع الحقول مطلوبة' : 'All fields are required' },
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

    // Validate Egyptian phone number
    const phoneRegex = /^01[0-2,5]{1}[0-9]{8}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: locale === 'ar' ? 'رقم الهاتف غير صالح' : 'Invalid phone number' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        {
          error:
            locale === 'ar'
              ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
              : 'Password must be at least 8 characters',
        },
        { status: 400 }
      );
    }

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
      console.error('Auth error:', authError);

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

    // Create profile
    const fullName = `${firstName} ${lastName}`.trim();
    const { error: profileError } = await supabase.from('profiles').insert({
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
      console.error('Profile error:', profileError);

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
      console.log('[Register] Test account detected, skipping email verification:', email);
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
      console.error('Link generation error:', linkError);
    }

    // Extract token from the link
    let verificationUrl = `${siteUrl}/${locale}/auth/verify-email`;
    if (linkData?.properties?.hashed_token) {
      verificationUrl = `${siteUrl}/${locale}/auth/callback?token_hash=${linkData.properties.hashed_token}&type=signup`;
    } else if (linkData?.properties?.action_link) {
      verificationUrl = linkData.properties.action_link;
    }

    // Send verification email using our custom template
    console.log('[Register] Sending verification email to:', email);
    console.log('[Register] Verification URL:', verificationUrl);

    const emailResult = await sendEmailVerificationEmail({
      to: email,
      userName: firstName,
      verificationUrl,
    });

    console.log('[Register] Email result:', emailResult);

    if (!emailResult.success) {
      console.error('[Register] Email send error:', emailResult.error);
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
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

interface StaffRegisterRequest {
  email: string;
  password: string;
  invitationToken: string;
  locale: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: StaffRegisterRequest = await request.json();
    const { email, password, invitationToken, locale = 'ar' } = body;

    // Validate required fields
    if (!email || !password || !invitationToken) {
      return NextResponse.json(
        {
          error: locale === 'ar' ? 'جميع الحقول مطلوبة' : 'All fields are required',
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          error: locale === 'ar' ? 'البريد الإلكتروني غير صالح' : 'Invalid email format',
        },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        {
          error:
            locale === 'ar'
              ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
              : 'Password must be at least 6 characters',
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Step 1: Verify the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('provider_invitations')
      .select(
        `
        id,
        email,
        status,
        expires_at,
        provider_id,
        can_manage_orders,
        can_manage_menu,
        can_manage_customers,
        can_view_analytics,
        can_manage_offers,
        providers (
          id,
          name_ar,
          name_en
        )
      `
      )
      .eq('invitation_token', invitationToken)
      .single();

    if (inviteError || !invitation) {
      logger.error('[Staff Register] Invitation not found', undefined, {
        errorMessage: inviteError?.message,
      });
      return NextResponse.json(
        {
          error:
            locale === 'ar' ? 'الدعوة غير صالحة أو غير موجودة' : 'Invalid or missing invitation',
        },
        { status: 400 }
      );
    }

    // Check invitation status
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        {
          error:
            locale === 'ar'
              ? 'هذه الدعوة تم استخدامها بالفعل'
              : 'This invitation has already been used',
        },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        {
          error: locale === 'ar' ? 'انتهت صلاحية الدعوة' : 'Invitation has expired',
        },
        { status: 400 }
      );
    }

    // Check email matches invitation
    if (invitation.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        {
          error:
            locale === 'ar'
              ? 'البريد الإلكتروني غير متطابق مع الدعوة'
              : 'Email does not match the invitation',
        },
        { status: 400 }
      );
    }

    // Step 2: Check if email already exists
    const { data: existingUsers } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json(
        {
          error:
            locale === 'ar'
              ? 'البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.'
              : 'Email already registered. Please login instead.',
        },
        { status: 400 }
      );
    }

    // Step 3: Create user in Supabase Auth
    // Auto-confirm email since they're invited by a verified provider owner
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true, // Auto-confirm since they're invited
      user_metadata: {
        role: 'provider_staff',
      },
    });

    if (authError) {
      logger.error('[Staff Register] Auth error', undefined, {
        errorMessage: authError.message,
      });

      if (authError.message?.includes('already registered')) {
        return NextResponse.json(
          {
            error: locale === 'ar' ? 'البريد الإلكتروني مسجل بالفعل' : 'Email already registered',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: locale === 'ar' ? 'فشل في إنشاء الحساب' : 'Failed to create account',
        },
        { status: 500 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        {
          error: locale === 'ar' ? 'فشل في إنشاء الحساب' : 'Failed to create account',
        },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // Step 4: Create/update profile - handle_new_user() trigger auto-creates a basic profile,
    // so we upsert to ensure additional fields are set correctly.
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      email: email.toLowerCase(),
      full_name: email.split('@')[0], // Default name from email
      role: 'provider_staff',
      is_active: true,
    });

    if (profileError) {
      logger.error('[Staff Register] Profile error', undefined, {
        errorMessage: profileError.message,
        errorCode: profileError.code,
      });

      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(userId);

      return NextResponse.json(
        {
          error: locale === 'ar' ? 'فشل في إنشاء الملف الشخصي' : 'Failed to create profile',
        },
        { status: 500 }
      );
    }

    // Step 5: Create staff record with permissions from invitation
    const { error: staffError } = await supabase.from('provider_staff').insert({
      provider_id: invitation.provider_id,
      user_id: userId,
      role: 'staff',
      can_manage_orders: invitation.can_manage_orders || false,
      can_manage_menu: invitation.can_manage_menu || false,
      can_manage_customers: invitation.can_manage_customers || false,
      can_view_analytics: invitation.can_view_analytics || false,
      can_manage_offers: invitation.can_manage_offers || false,
      is_active: true,
    });

    if (staffError) {
      logger.error('[Staff Register] Staff record error', undefined, {
        errorMessage: staffError.message,
        errorCode: staffError.code,
      });

      // Rollback: delete profile and auth user
      await supabase.from('profiles').delete().eq('id', userId);
      await supabase.auth.admin.deleteUser(userId);

      return NextResponse.json(
        {
          error: locale === 'ar' ? 'فشل في إنشاء سجل الموظف' : 'Failed to create staff record',
        },
        { status: 500 }
      );
    }

    // Step 6: Update invitation status to accepted
    const { error: updateError } = await supabase
      .from('provider_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: userId,
      })
      .eq('id', invitation.id);

    if (updateError) {
      logger.error('[Staff Register] Update invitation error', undefined, {
        errorMessage: updateError.message,
      });
      // Don't rollback - the important parts succeeded
    }

    // Get provider info for response
    // Supabase join can return object or array depending on relationship inference
    const providersData = invitation.providers as
      | { id: string; name_ar: string; name_en: string }
      | { id: string; name_ar: string; name_en: string }[]
      | null;
    const provider = Array.isArray(providersData) ? providersData[0] : providersData;
    const providerName = locale === 'ar' ? provider?.name_ar : provider?.name_en;

    logger.info(
      `[Staff Register] Successfully registered staff ${email} for provider ${providerName}`
    );

    return NextResponse.json({
      success: true,
      message:
        locale === 'ar'
          ? `تم إنشاء حسابك بنجاح وتمت إضافتك إلى ${providerName}`
          : `Account created successfully. You've been added to ${providerName}`,
      userId,
      providerId: invitation.provider_id,
    });
  } catch (error) {
    logger.error('[Staff Register] Unexpected error', error instanceof Error ? error : undefined, {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

interface AdminRegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  invitationToken: string;
  locale?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AdminRegisterRequest = await request.json();
    const { email, password, fullName, phone, invitationToken, locale = 'ar' } = body;

    // Validate required fields
    if (!email || !password || !fullName || !invitationToken) {
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

    // Step 1: Verify the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('admin_invitations')
      .select(
        `
        id,
        email,
        status,
        expires_at,
        role,
        role_id,
        permissions,
        assigned_regions,
        invited_by
      `
      )
      .eq('invitation_token', invitationToken)
      .single();

    if (inviteError || !invitation) {
      console.error('[Admin Register] Invitation not found:', inviteError);
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
      // Mark as expired
      await supabase
        .from('admin_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

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
    // Auto-confirm email since they're invited by a super admin
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true, // Auto-confirm since they're invited
      user_metadata: {
        full_name: fullName,
        phone: phone || null,
        role: 'admin',
      },
    });

    if (authError) {
      console.error('[Admin Register] Auth error:', authError);

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

    // Step 4: Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      email: email.toLowerCase(),
      full_name: fullName,
      phone: phone || null,
      role: 'admin',
      is_active: true,
    });

    if (profileError) {
      console.error('[Admin Register] Profile error:', profileError);

      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(userId);

      return NextResponse.json(
        {
          error: locale === 'ar' ? 'فشل في إنشاء الملف الشخصي' : 'Failed to create profile',
        },
        { status: 500 }
      );
    }

    // Step 5: Create admin_users record
    const { data: newAdmin, error: adminError } = await supabase
      .from('admin_users')
      .insert({
        user_id: userId,
        role: invitation.role,
        permissions: invitation.permissions || {},
        assigned_regions: invitation.assigned_regions || [],
        is_active: true,
      })
      .select('id')
      .single();

    if (adminError || !newAdmin) {
      console.error('[Admin Register] Admin user error:', adminError);

      // Rollback: delete profile and auth user
      await supabase.from('profiles').delete().eq('id', userId);
      await supabase.auth.admin.deleteUser(userId);

      return NextResponse.json(
        {
          error: locale === 'ar' ? 'فشل في إنشاء سجل المشرف' : 'Failed to create admin record',
        },
        { status: 500 }
      );
    }

    // Step 6: Create admin_roles entry if role_id exists
    let roleId = invitation.role_id;

    // If role_id is not set, try to find it by role code
    if (!roleId && invitation.role) {
      const { data: roleData } = await supabase
        .from('roles')
        .select('id')
        .eq('code', invitation.role)
        .single();

      if (roleData) {
        roleId = roleData.id;
      }
    }

    if (roleId) {
      const { error: roleError } = await supabase.from('admin_roles').insert({
        admin_id: newAdmin.id,
        role_id: roleId,
        is_primary: true,
      });

      if (roleError) {
        console.error('[Admin Register] Admin role error:', roleError);
        // Continue anyway - admin was created
      }
    }

    // Step 7: Update invitation status to accepted
    const { error: updateError } = await supabase
      .from('admin_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_user_id: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('[Admin Register] Update invitation error:', updateError);
      // Don't rollback - the important parts succeeded
    }

    // Step 8: Notify the inviter (create notification)
    if (invitation.invited_by) {
      try {
        await supabase.from('admin_notifications').insert({
          admin_id: invitation.invited_by,
          type: 'invitation_accepted',
          title: locale === 'ar' ? 'تم قبول الدعوة' : 'Invitation Accepted',
          message:
            locale === 'ar'
              ? `قام ${fullName} بقبول دعوتك والانضمام لفريق الإدارة`
              : `${fullName} has accepted your invitation and joined the admin team`,
          data: {
            new_admin_id: newAdmin.id,
            new_admin_name: fullName,
            new_admin_email: email,
          },
          is_read: false,
        });
      } catch (notifError) {
        console.error('[Admin Register] Notification error:', notifError);
        // Don't fail registration if notification fails
      }
    }

    console.log(
      `[Admin Register] Successfully registered admin ${email} with role ${invitation.role}`
    );

    return NextResponse.json({
      success: true,
      message:
        locale === 'ar'
          ? 'تم إنشاء حسابك بنجاح. يمكنك الآن تسجيل الدخول.'
          : 'Account created successfully. You can now login.',
      userId,
      adminId: newAdmin.id,
    });
  } catch (error) {
    console.error('[Admin Register] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

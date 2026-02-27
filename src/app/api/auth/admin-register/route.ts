import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

const adminRegisterBodySchema = z.object({
  email: emailSchema,
  password: strongPasswordSchema,
  fullName: z.string().min(2).max(100),
  phone: z.string().optional(),
  invitationToken: z.string().min(1),
  locale: z.string().optional(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const {
    email,
    password,
    fullName,
    phone,
    invitationToken,
    locale = 'ar',
  } = await validateBody(request, adminRegisterBodySchema);

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
    logger.error('[Admin Register] Invitation not found', undefined, {
      errorMessage: inviteError?.message,
    });
    return NextResponse.json(
      {
        error: locale === 'ar' ? 'الدعوة غير صالحة أو غير موجودة' : 'Invalid or missing invitation',
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
    await supabase.from('admin_invitations').update({ status: 'expired' }).eq('id', invitation.id);

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

  // Step 2: Check if email already has a complete registration (profile exists)
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
  let authData = await supabase.auth.admin.createUser({
    email: email.toLowerCase(),
    password,
    email_confirm: true, // Auto-confirm since they're invited
    user_metadata: {
      full_name: fullName,
      phone: phone || null,
      role: 'admin',
    },
  });

  // Handle orphaned auth user: exists in auth but no profile (from previous failed attempt)
  if (authData.error) {
    const isAlreadyRegistered = /already (registered|exists)|duplicate/i.test(
      authData.error.message || ''
    );

    if (isAlreadyRegistered) {
      // No profile exists (checked above), so this is an orphaned auth user
      // Try to clean up and recreate
      logger.info('[Admin Register] Orphaned auth user detected, attempting cleanup', {
        email: email.toLowerCase(),
      });

      // Find the orphaned user in auth
      const {
        data: { users: authUsers },
      } = await supabase.auth.admin.listUsers({ page: 1, perPage: 500 });
      const orphanedUser = authUsers?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

      if (orphanedUser) {
        // Delete the orphaned auth user
        const { error: deleteError } = await supabase.auth.admin.deleteUser(orphanedUser.id);
        if (deleteError) {
          logger.error('[Admin Register] Failed to delete orphaned user', undefined, {
            orphanedUserId: orphanedUser.id,
            deleteError: deleteError.message,
          });
          return NextResponse.json(
            {
              error:
                locale === 'ar'
                  ? 'البريد الإلكتروني مسجل جزئياً من محاولة سابقة. يرجى التواصل مع المدير.'
                  : 'Email partially registered from a previous attempt. Please contact admin.',
            },
            { status: 400 }
          );
        }

        logger.info('[Admin Register] Orphaned user deleted, retrying creation', {
          orphanedUserId: orphanedUser.id,
        });

        // Retry user creation
        authData = await supabase.auth.admin.createUser({
          email: email.toLowerCase(),
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            phone: phone || null,
            role: 'admin',
          },
        });
      }
    }
  }

  if (authData.error) {
    logger.error('[Admin Register] Auth error', undefined, {
      errorMessage: authData.error.message,
      errorCode: (authData.error as { code?: string }).code,
      email: email.toLowerCase(),
    });

    return NextResponse.json(
      {
        error:
          locale === 'ar'
            ? `فشل في إنشاء الحساب: ${authData.error.message}`
            : `Failed to create account: ${authData.error.message}`,
      },
      { status: 500 }
    );
  }

  if (!authData.data.user) {
    return NextResponse.json(
      {
        error: locale === 'ar' ? 'فشل في إنشاء الحساب' : 'Failed to create account',
      },
      { status: 500 }
    );
  }

  const userId = authData.data.user.id;

  // Step 4: Create/update profile
  // Note: The handle_new_user() trigger auto-creates a profile on auth.users INSERT,
  // so we use upsert to update it with additional fields (phone, is_active).
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    email: email.toLowerCase(),
    full_name: fullName,
    phone: phone || null,
    role: 'admin',
    is_active: true,
  });

  if (profileError) {
    logger.error('[Admin Register] Profile error', undefined, {
      errorMessage: profileError.message,
      errorCode: profileError.code,
      userId,
    });

    // Rollback: delete auth user (cascade will also delete trigger-created profile)
    await supabase.auth.admin.deleteUser(userId);

    return NextResponse.json(
      {
        error:
          locale === 'ar'
            ? `فشل في إنشاء الملف الشخصي: ${profileError.message}`
            : `Failed to create profile: ${profileError.message}`,
      },
      { status: 500 }
    );
  }

  // Step 5: Create admin_users record
  const regionsToSave = invitation.assigned_regions || [];
  logger.info('[Admin Register] Saving assigned_regions from invitation', {
    invitationId: invitation.id,
    assignedRegions: JSON.stringify(regionsToSave),
    regionsCount: Array.isArray(regionsToSave) ? regionsToSave.length : 'not-array',
  });

  const { data: newAdmin, error: adminError } = await supabase
    .from('admin_users')
    .insert({
      user_id: userId,
      role: invitation.role,
      permissions: invitation.permissions || {},
      assigned_regions: regionsToSave,
      is_active: true,
    })
    .select('id, assigned_regions')
    .single();

  if (newAdmin) {
    logger.info('[Admin Register] Admin created, verifying regions', {
      adminId: newAdmin.id,
      savedRegions: JSON.stringify(newAdmin.assigned_regions),
    });
  }

  if (adminError || !newAdmin) {
    logger.error('[Admin Register] Admin user error', undefined, {
      errorMessage: adminError?.message,
      errorCode: adminError?.code,
      userId,
      role: invitation.role,
    });

    // Rollback: delete profile and auth user
    await supabase.from('profiles').delete().eq('id', userId);
    await supabase.auth.admin.deleteUser(userId);

    return NextResponse.json(
      {
        error:
          locale === 'ar'
            ? `فشل في إنشاء سجل المشرف: ${adminError?.message || 'unknown'}`
            : `Failed to create admin record: ${adminError?.message || 'unknown'}`,
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
      logger.error('[Admin Register] Admin role error', undefined, {
        errorMessage: roleError.message,
        errorCode: roleError.code,
      });
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
    logger.error('[Admin Register] Update invitation error', undefined, {
      errorMessage: updateError.message,
    });
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
      logger.error(
        '[Admin Register] Notification error',
        notifError instanceof Error ? notifError : undefined
      );
      // Don't fail registration if notification fails
    }
  }

  logger.info(
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
});

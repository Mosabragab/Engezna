'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import {
  checkRateLimit,
  resetRateLimit,
  getRateLimitKey,
  OTP_SEND_LIMIT,
  OTP_VERIFY_LIMIT,
  LOGIN_LIMIT,
  PASSWORD_RESET_LIMIT,
} from '@/lib/utils/rate-limit';

/**
 * Get client IP from headers
 */
async function getClientIP(): Promise<string> {
  const headersList = await headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  const realIP = headersList.get('x-real-ip');

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(formData: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  locale: string;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      data: {
        full_name: formData.fullName,
        phone: formData.phone,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/${formData.locale}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Create user profile in database
  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      email: formData.email,
      full_name: formData.fullName,
      phone: formData.phone,
      role: 'customer',
    });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }
  }

  return { success: true, data };
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(formData: {
  email: string;
  password: string;
  locale: string;
}) {
  // Rate limit check
  const ip = await getClientIP();
  const rateLimitKey = getRateLimitKey(ip, formData.email, 'login');
  const rateLimitResult = checkRateLimit(rateLimitKey, LOGIN_LIMIT);

  if (!rateLimitResult.allowed) {
    return { error: rateLimitResult.message };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });

  if (error) {
    return { error: error.message };
  }

  // Reset rate limit on successful login
  resetRateLimit(rateLimitKey);

  return { success: true, data };
}

/**
 * Sign in with OTP (phone or email)
 */
export async function signInWithOTP(formData: { phone?: string; email?: string; locale: string }) {
  // Rate limit check - prevent OTP spam
  const ip = await getClientIP();
  const target = formData.phone || formData.email || '';
  const rateLimitKey = getRateLimitKey(ip, target, 'otp-send');
  const rateLimitResult = checkRateLimit(rateLimitKey, OTP_SEND_LIMIT);

  if (!rateLimitResult.allowed) {
    return { error: rateLimitResult.message };
  }

  const supabase = await createClient();

  if (formData.phone) {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: formData.phone,
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true, data };
  }

  if (formData.email) {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: formData.email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/${formData.locale}/auth/callback`,
      },
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true, data };
  }

  return { error: 'Phone or email required' };
}

/**
 * Verify OTP code
 */
export async function verifyOTP(formData: {
  phone?: string;
  email?: string;
  token: string;
  type: 'sms' | 'email';
}) {
  // Rate limit check - prevent brute force attacks on OTP codes
  const ip = await getClientIP();
  const target = formData.phone || formData.email || '';
  const rateLimitKey = getRateLimitKey(ip, target, 'otp-verify');
  const rateLimitResult = checkRateLimit(rateLimitKey, OTP_VERIFY_LIMIT);

  if (!rateLimitResult.allowed) {
    return { error: rateLimitResult.message };
  }

  const supabase = await createClient();

  if (formData.type === 'sms' && formData.phone) {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formData.phone,
      token: formData.token,
      type: 'sms',
    });

    if (error) {
      return { error: error.message };
    }

    // Reset rate limits on successful verification
    resetRateLimit(rateLimitKey);
    resetRateLimit(getRateLimitKey(ip, target, 'otp-send'));

    return { success: true, data };
  }

  if (formData.type === 'email' && formData.email) {
    const { data, error } = await supabase.auth.verifyOtp({
      email: formData.email,
      token: formData.token,
      type: 'email',
    });

    if (error) {
      return { error: error.message };
    }

    // Reset rate limits on successful verification
    resetRateLimit(rateLimitKey);
    resetRateLimit(getRateLimitKey(ip, target, 'otp-send'));

    return { success: true, data };
  }

  return { error: 'Invalid verification type or missing credentials' };
}

/**
 * Sign out
 */
export async function signOut(locale: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/auth/login`);
}

/**
 * Reset password - send reset email
 */
export async function resetPassword(formData: { email: string; locale: string }) {
  // Rate limit check - prevent password reset spam
  const ip = await getClientIP();
  const rateLimitKey = getRateLimitKey(ip, formData.email, 'password-reset');
  const rateLimitResult = checkRateLimit(rateLimitKey, PASSWORD_RESET_LIMIT);

  if (!rateLimitResult.allowed) {
    return { error: rateLimitResult.message };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.resetPasswordForEmail(formData.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/${formData.locale}/auth/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, data };
}

/**
 * Update password after reset
 */
export async function updatePassword(formData: { password: string }) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.updateUser({
    password: formData.password,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, data };
}

/**
 * Get current user session
 */
export async function getSession() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Get current user
 */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

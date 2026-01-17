'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import {
  loginLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
  passwordResetLimiter,
  checkRateLimit,
  getClientIdentifier,
} from '@/lib/utils/upstash-rate-limit';

/**
 * Get client IP from headers
 */
async function getClientIP(): Promise<string> {
  const headersList = await headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  const realIP = headersList.get('x-real-ip');
  const cfIP = headersList.get('cf-connecting-ip');

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (cfIP) {
    return cfIP;
  }
  return 'unknown';
}

/**
 * Get identifier for rate limiting (IP + optional target)
 */
function getRateLimitIdentifier(ip: string, target?: string): string {
  return target ? `${ip}:${target}` : ip;
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
  // Rate limit check (10 requests per 15 minutes)
  const ip = await getClientIP();
  const identifier = getRateLimitIdentifier(ip, formData.email);
  const rateLimitResult = await checkRateLimit(loginLimiter, identifier);

  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
    return {
      error:
        retryAfter > 60
          ? `تم تجاوز الحد المسموح. حاول مرة أخرى بعد ${Math.ceil(retryAfter / 60)} دقيقة.`
          : `تم تجاوز الحد المسموح. حاول مرة أخرى بعد ${retryAfter} ثانية.`,
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, data };
}

/**
 * Sign in with OTP (phone or email)
 */
export async function signInWithOTP(formData: { phone?: string; email?: string; locale: string }) {
  // Rate limit check - prevent OTP spam (5 requests per 10 minutes)
  const ip = await getClientIP();
  const target = formData.phone || formData.email || '';
  const identifier = getRateLimitIdentifier(ip, target);
  const rateLimitResult = await checkRateLimit(otpSendLimiter, identifier);

  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
    return {
      error:
        retryAfter > 60
          ? `تم تجاوز الحد المسموح. حاول مرة أخرى بعد ${Math.ceil(retryAfter / 60)} دقيقة.`
          : `تم تجاوز الحد المسموح. حاول مرة أخرى بعد ${retryAfter} ثانية.`,
    };
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
  // Rate limit check - prevent brute force attacks (5 requests per 5 minutes)
  const ip = await getClientIP();
  const target = formData.phone || formData.email || '';
  const identifier = getRateLimitIdentifier(ip, target);
  const rateLimitResult = await checkRateLimit(otpVerifyLimiter, identifier);

  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
    return {
      error:
        retryAfter > 60
          ? `تم تجاوز الحد المسموح. حاول مرة أخرى بعد ${Math.ceil(retryAfter / 60)} دقيقة.`
          : `تم تجاوز الحد المسموح. حاول مرة أخرى بعد ${retryAfter} ثانية.`,
    };
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
  // Rate limit check - prevent password reset spam (3 requests per hour)
  const ip = await getClientIP();
  const identifier = getRateLimitIdentifier(ip, formData.email);
  const rateLimitResult = await checkRateLimit(passwordResetLimiter, identifier);

  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
    return {
      error:
        retryAfter > 60
          ? `تم تجاوز الحد المسموح. حاول مرة أخرى بعد ${Math.ceil(retryAfter / 60)} دقيقة.`
          : `تم تجاوز الحد المسموح. حاول مرة أخرى بعد ${retryAfter} ثانية.`,
    };
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

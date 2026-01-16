import { z } from 'zod';
import { emailSchema, passwordSchema, egyptianPhoneSchema } from './common';

/**
 * Authentication validation schemas
 */

/**
 * User registration schema
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: egyptianPhoneSchema.optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Login with email schema
 */
export const loginEmailSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginEmailInput = z.infer<typeof loginEmailSchema>;

/**
 * Login with phone schema
 */
export const loginPhoneSchema = z.object({
  phone: egyptianPhoneSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginPhoneInput = z.infer<typeof loginPhoneSchema>;

/**
 * Password reset request schema
 */
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;

/**
 * Password reset schema
 */
export const passwordResetSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

/**
 * Change password schema
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * OTP verification schema
 */
export const otpVerifySchema = z.object({
  phone: egyptianPhoneSchema,
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only numbers'),
});

export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

/**
 * OTP request schema
 */
export const otpRequestSchema = z.object({
  phone: egyptianPhoneSchema,
});

export type OtpRequestInput = z.infer<typeof otpRequestSchema>;

/**
 * Update profile schema
 */
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: egyptianPhoneSchema.optional(),
  avatar_url: z.string().url().optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

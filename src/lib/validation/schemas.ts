/**
 * Zod Validation Schemas
 *
 * Centralized validation schemas for API routes and form data.
 * Ensures 100% type-safe input validation.
 *
 * @version 1.0.0 - Phase 1.3 Implementation
 * @see docs/MASTER_IMPLEMENTATION_PLAN.md - Section 1.3
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// Common Schemas
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid('معرف غير صالح');

/**
 * Egyptian phone number validation (01XXXXXXXXX)
 */
export const egyptianPhoneSchema = z
  .string()
  .regex(/^01[0-2,5]{1}[0-9]{8}$/, 'رقم هاتف مصري غير صحيح');

/**
 * Email validation
 */
export const emailSchema = z.string().email('بريد إلكتروني غير صالح').max(255);

/**
 * Password validation (min 8 characters)
 */
export const passwordSchema = z
  .string()
  .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
  .max(128, 'كلمة المرور طويلة جداً');

/**
 * Locale validation
 */
export const localeSchema = z.enum(['ar', 'en']);

// ═══════════════════════════════════════════════════════════════════════════════
// Auth Schemas
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * User registration schema
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  full_name: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل').max(100, 'الاسم طويل جداً'),
  phone: egyptianPhoneSchema,
});

/**
 * Login schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

// ═══════════════════════════════════════════════════════════════════════════════
// Chat Schemas
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Single chat message schema
 */
export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z
    .string()
    .min(1, 'الرسالة فارغة')
    .max(10000, 'الرسالة طويلة جداً (الحد الأقصى 10,000 حرف)'),
});

/**
 * Chat API request schema
 */
export const chatRequestSchema = z.object({
  messages: z
    .array(chatMessageSchema)
    .min(1, 'يجب إرسال رسالة واحدة على الأقل')
    .max(100, 'عدد الرسائل كبير جداً'),
  providerId: uuidSchema.optional(),
  mode: z.enum(['customer', 'provider']).optional(),
  locale: localeSchema.optional(),
  customerId: uuidSchema.optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// Order Schemas
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Single order item schema
 */
export const orderItemSchema = z.object({
  productId: uuidSchema,
  providerId: uuidSchema,
  quantity: z
    .number()
    .int('الكمية يجب أن تكون عدد صحيح')
    .min(1, 'الكمية يجب أن تكون 1 على الأقل')
    .max(100, 'الكمية كبيرة جداً'),
  price: z.number().positive('السعر يجب أن يكون موجباً').max(100000, 'السعر كبير جداً'),
  notes: z.string().max(500, 'الملاحظات طويلة جداً').optional(),
});

/**
 * Voice order confirmation schema
 */
export const voiceOrderConfirmSchema = z.object({
  items: z
    .array(orderItemSchema)
    .min(1, 'يجب إضافة منتج واحد على الأقل')
    .max(50, 'عدد المنتجات كبير جداً'),
  customerId: uuidSchema.optional(),
  locale: localeSchema.optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// Payment Schemas
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Payment initiation schema
 */
export const paymentInitiateSchema = z.object({
  orderData: z.object({
    provider_id: uuidSchema,
    total: z.number().positive('المبلغ يجب أن يكون موجباً').max(1000000, 'المبلغ كبير جداً'),
    cart_items: z
      .array(
        z.object({
          id: uuidSchema,
          quantity: z.number().int().positive(),
          price: z.number().positive(),
        })
      )
      .min(1, 'السلة فارغة'),
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// Voice Order Process Schema
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Voice order process request schema
 */
export const voiceOrderProcessSchema = z.object({
  audioData: z.string().min(1, 'البيانات الصوتية مطلوبة'),
  providerId: uuidSchema,
  locale: localeSchema.optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// Type Exports
// ═══════════════════════════════════════════════════════════════════════════════

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type VoiceOrderConfirmInput = z.infer<typeof voiceOrderConfirmSchema>;
export type PaymentInitiateInput = z.infer<typeof paymentInitiateSchema>;
export type VoiceOrderProcessInput = z.infer<typeof voiceOrderProcessSchema>;

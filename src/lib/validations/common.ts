import { z } from 'zod';

/**
 * Common validation schemas used across the application
 */

/**
 * Egyptian phone number validation
 * Formats: 01012345678, +201012345678, 201012345678
 */
export const egyptianPhoneSchema = z
  .string()
  .transform((val) => val.replace(/[\s\-()]/g, '')) // Remove spaces, dashes, parentheses
  .refine(
    (val) => {
      // Check various Egyptian phone formats
      const patterns = [
        /^01[0125]\d{8}$/, // Local: 01012345678
        /^\+201[0125]\d{8}$/, // International with +: +201012345678
        /^201[0125]\d{8}$/, // International without +: 201012345678
      ];
      return patterns.some((pattern) => pattern.test(val));
    },
    { message: 'Invalid Egyptian phone number' }
  );

/**
 * Email validation with better error messages
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .trim() // Trim first before email validation
  .toLowerCase()
  .email('Invalid email format');

/**
 * Password validation
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password is too long');

/**
 * Strong password with requirements
 */
export const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid('Invalid ID format');

/**
 * Pagination parameters
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Sort parameters
 */
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Date range parameters
 */
export const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

/**
 * Arabic text (allows Arabic characters, numbers, and common punctuation)
 */
export const arabicTextSchema = z
  .string()
  .min(1, 'This field is required')
  .regex(/^[\u0600-\u06FF\u0750-\u077F\s\d.,!?()-]+$/, 'Only Arabic characters are allowed');

/**
 * Optional Arabic text
 */
export const optionalArabicTextSchema = arabicTextSchema.optional().or(z.literal(''));

/**
 * Price/amount validation (positive number with 2 decimal places max)
 */
export const priceSchema = z
  .number()
  .positive('Price must be positive')
  .multipleOf(0.01, 'Price can have at most 2 decimal places');

/**
 * Quantity validation (positive integer)
 */
export const quantitySchema = z
  .number()
  .int('Quantity must be a whole number')
  .positive('Quantity must be positive');

/**
 * Coordinates validation
 */
export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

/**
 * Address validation
 */
export const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  building: z.string().optional(),
  floor: z.string().optional(),
  apartment: z.string().optional(),
  landmark: z.string().optional(),
  coordinates: coordinatesSchema.optional(),
});

import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  passwordSchema,
  egyptianPhoneSchema,
  uuidSchema,
  priceSchema,
  quantitySchema,
  paginationSchema,
  registerSchema,
  loginEmailSchema,
  createOrderSchema,
} from '@/lib/validations';

describe('Validation Schemas', () => {
  describe('Common Schemas', () => {
    describe('emailSchema', () => {
      it('should accept valid email', () => {
        const result = emailSchema.safeParse('test@example.com');
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe('test@example.com');
        }
      });

      it('should lowercase email', () => {
        const result = emailSchema.safeParse('TEST@EXAMPLE.COM');
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe('test@example.com');
        }
      });

      it('should trim whitespace', () => {
        const result = emailSchema.safeParse('  test@example.com  ');
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe('test@example.com');
        }
      });

      it('should reject invalid email', () => {
        const result = emailSchema.safeParse('invalid-email');
        expect(result.success).toBe(false);
      });

      it('should reject empty email', () => {
        const result = emailSchema.safeParse('');
        expect(result.success).toBe(false);
      });
    });

    describe('passwordSchema', () => {
      it('should accept valid password', () => {
        const result = passwordSchema.safeParse('password123');
        expect(result.success).toBe(true);
      });

      it('should reject short password', () => {
        const result = passwordSchema.safeParse('short');
        expect(result.success).toBe(false);
      });

      it('should accept exactly 8 characters', () => {
        const result = passwordSchema.safeParse('12345678');
        expect(result.success).toBe(true);
      });
    });

    describe('egyptianPhoneSchema', () => {
      it('should accept local format (01xxxxxxxxx)', () => {
        expect(egyptianPhoneSchema.safeParse('01012345678').success).toBe(true);
        expect(egyptianPhoneSchema.safeParse('01112345678').success).toBe(true);
        expect(egyptianPhoneSchema.safeParse('01212345678').success).toBe(true);
        expect(egyptianPhoneSchema.safeParse('01512345678').success).toBe(true);
      });

      it('should accept international format (+201xxxxxxxxx)', () => {
        const result = egyptianPhoneSchema.safeParse('+201012345678');
        expect(result.success).toBe(true);
      });

      it('should accept international format without plus (201xxxxxxxxx)', () => {
        const result = egyptianPhoneSchema.safeParse('201012345678');
        expect(result.success).toBe(true);
      });

      it('should remove spaces and dashes', () => {
        const result = egyptianPhoneSchema.safeParse('010-1234-5678');
        expect(result.success).toBe(true);
      });

      it('should reject invalid carrier codes', () => {
        expect(egyptianPhoneSchema.safeParse('01312345678').success).toBe(false);
        expect(egyptianPhoneSchema.safeParse('01412345678').success).toBe(false);
      });

      it('should reject wrong length', () => {
        expect(egyptianPhoneSchema.safeParse('0101234567').success).toBe(false); // Too short
        expect(egyptianPhoneSchema.safeParse('010123456789').success).toBe(false); // Too long
      });
    });

    describe('uuidSchema', () => {
      it('should accept valid UUID', () => {
        const result = uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000');
        expect(result.success).toBe(true);
      });

      it('should reject invalid UUID', () => {
        expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false);
        expect(uuidSchema.safeParse('').success).toBe(false);
      });
    });

    describe('priceSchema', () => {
      it('should accept positive prices', () => {
        expect(priceSchema.safeParse(10.5).success).toBe(true);
        expect(priceSchema.safeParse(100).success).toBe(true);
        expect(priceSchema.safeParse(0.01).success).toBe(true);
      });

      it('should reject negative prices', () => {
        expect(priceSchema.safeParse(-10).success).toBe(false);
      });

      it('should reject zero', () => {
        expect(priceSchema.safeParse(0).success).toBe(false);
      });

      it('should reject more than 2 decimal places', () => {
        expect(priceSchema.safeParse(10.123).success).toBe(false);
      });
    });

    describe('quantitySchema', () => {
      it('should accept positive integers', () => {
        expect(quantitySchema.safeParse(1).success).toBe(true);
        expect(quantitySchema.safeParse(100).success).toBe(true);
      });

      it('should reject decimals', () => {
        expect(quantitySchema.safeParse(1.5).success).toBe(false);
      });

      it('should reject zero and negative', () => {
        expect(quantitySchema.safeParse(0).success).toBe(false);
        expect(quantitySchema.safeParse(-1).success).toBe(false);
      });
    });

    describe('paginationSchema', () => {
      it('should apply defaults', () => {
        const result = paginationSchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.page).toBe(1);
          expect(result.data.limit).toBe(20);
        }
      });

      it('should coerce string numbers', () => {
        const result = paginationSchema.safeParse({ page: '2', limit: '50' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.page).toBe(2);
          expect(result.data.limit).toBe(50);
        }
      });

      it('should enforce max limit', () => {
        const result = paginationSchema.safeParse({ limit: 200 });
        expect(result.success).toBe(false);
      });

      it('should reject page < 1', () => {
        const result = paginationSchema.safeParse({ page: 0 });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Auth Schemas', () => {
    describe('registerSchema', () => {
      it('should accept valid registration data', () => {
        const result = registerSchema.safeParse({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });
        expect(result.success).toBe(true);
      });

      it('should accept with optional phone', () => {
        const result = registerSchema.safeParse({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
          phone: '01012345678',
        });
        expect(result.success).toBe(true);
      });

      it('should reject short name', () => {
        const result = registerSchema.safeParse({
          email: 'test@example.com',
          password: 'password123',
          name: 'A',
        });
        expect(result.success).toBe(false);
      });

      it('should reject invalid phone', () => {
        const result = registerSchema.safeParse({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
          phone: '123456',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('loginEmailSchema', () => {
      it('should accept valid login data', () => {
        const result = loginEmailSchema.safeParse({
          email: 'test@example.com',
          password: 'password123',
        });
        expect(result.success).toBe(true);
      });

      it('should reject missing password', () => {
        const result = loginEmailSchema.safeParse({
          email: 'test@example.com',
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Order Schemas', () => {
    describe('createOrderSchema', () => {
      it('should accept valid order', () => {
        const result = createOrderSchema.safeParse({
          provider_id: '550e8400-e29b-41d4-a716-446655440000',
          items: [
            {
              product_id: '550e8400-e29b-41d4-a716-446655440001',
              quantity: 2,
            },
          ],
          order_type: 'delivery',
          delivery_address: {
            street: '123 Test Street',
          },
        });
        expect(result.success).toBe(true);
      });

      it('should reject empty items', () => {
        const result = createOrderSchema.safeParse({
          provider_id: '550e8400-e29b-41d4-a716-446655440000',
          items: [],
          order_type: 'delivery',
        });
        expect(result.success).toBe(false);
      });

      it('should accept pickup without address', () => {
        const result = createOrderSchema.safeParse({
          provider_id: '550e8400-e29b-41d4-a716-446655440000',
          items: [
            {
              product_id: '550e8400-e29b-41d4-a716-446655440001',
              quantity: 1,
            },
          ],
          order_type: 'pickup',
        });
        expect(result.success).toBe(true);
      });
    });
  });
});

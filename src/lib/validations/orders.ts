import { z } from 'zod';
import { uuidSchema, priceSchema, quantitySchema, addressSchema } from './common';

/**
 * Order validation schemas
 */

/**
 * Cart item schema
 */
export const cartItemSchema = z.object({
  product_id: uuidSchema,
  quantity: quantitySchema,
  notes: z.string().max(500).optional(),
  customizations: z
    .array(
      z.object({
        name: z.string(),
        value: z.string(),
        price: priceSchema.optional(),
      })
    )
    .optional(),
});

export type CartItemInput = z.infer<typeof cartItemSchema>;

/**
 * Order type enum
 */
export const orderTypeSchema = z.enum(['delivery', 'pickup']);

/**
 * Create order schema
 */
export const createOrderSchema = z.object({
  provider_id: uuidSchema,
  items: z.array(cartItemSchema).min(1, 'At least one item is required'),
  order_type: orderTypeSchema,
  delivery_address: addressSchema.optional(),
  notes: z.string().max(1000).optional(),
  scheduled_for: z.coerce.date().optional(),
  payment_method: z.enum(['cash', 'card', 'wallet']).default('cash'),
  promo_code: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/**
 * Order status enum
 */
export const orderStatusSchema = z.enum([
  'pending_payment',
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'refunded',
]);

/**
 * Update order status schema
 */
export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
  reason: z.string().max(500).optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

/**
 * Cancel order schema
 */
export const cancelOrderSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required').max(500),
});

export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

/**
 * Rate order schema
 */
export const rateOrderSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(1000).optional(),
  delivery_rating: z.number().int().min(1).max(5).optional(),
});

export type RateOrderInput = z.infer<typeof rateOrderSchema>;

/**
 * Order list filters schema
 */
export const orderListFiltersSchema = z.object({
  status: orderStatusSchema.optional(),
  provider_id: uuidSchema.optional(),
  customer_id: uuidSchema.optional(),
  order_type: orderTypeSchema.optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
});

export type OrderListFiltersInput = z.infer<typeof orderListFiltersSchema>;

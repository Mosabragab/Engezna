import { z } from 'zod';
import { uuidSchema, priceSchema, quantitySchema, addressSchema } from './common';

/**
 * Custom Order validation schemas
 */

/**
 * Custom order input type
 */
export const customOrderInputTypeSchema = z.enum(['text', 'voice', 'image', 'mixed']);

/**
 * Custom order item availability status
 */
export const itemAvailabilityStatusSchema = z.enum([
  'available',
  'unavailable',
  'partial',
  'substituted',
]);

/**
 * Unit types for pricing
 */
export const unitTypeSchema = z.enum([
  'kg',
  'gram',
  'piece',
  'box',
  'carton',
  'pack',
  'bottle',
  'liter',
  'bag',
  'dozen',
  'bundle',
]);

/**
 * Create broadcast schema (customer sending order to merchants)
 */
export const createBroadcastSchema = z.object({
  provider_ids: z
    .array(uuidSchema)
    .min(1, 'Select at least one provider')
    .max(3, 'Maximum 3 providers allowed'),
  order_type: z.enum(['delivery', 'pickup']),
  delivery_address: addressSchema.optional(),
  // Input can be text, voice URL, or image URLs
  text_input: z.string().max(5000).optional(),
  voice_url: z.string().url().optional(),
  image_urls: z.array(z.string().url()).max(5).optional(),
  notes: z.string().max(1000).optional(),
});

export type CreateBroadcastInput = z.infer<typeof createBroadcastSchema>;

/**
 * Priced item schema (merchant pricing an item)
 */
export const pricedItemSchema = z.object({
  original_text: z.string().min(1, 'Original item text is required'),
  merchant_name: z.string().min(1, 'Item name is required').max(200),
  unit_type: unitTypeSchema,
  unit_price: priceSchema,
  quantity: quantitySchema,
  availability_status: itemAvailabilityStatusSchema,
  substitute_name: z.string().max(200).optional(),
  substitute_price: priceSchema.optional(),
  notes: z.string().max(500).optional(),
  image_url: z.string().url().optional(),
});

export type PricedItemInput = z.infer<typeof pricedItemSchema>;

/**
 * Submit pricing schema (merchant submitting pricing for a broadcast)
 */
export const submitPricingSchema = z.object({
  items: z.array(pricedItemSchema).min(1, 'At least one item is required'),
  delivery_fee: z.number().min(0, 'Delivery fee cannot be negative'),
  notes: z.string().max(1000).optional(),
  estimated_preparation_time: z.number().int().min(1).max(480).optional(), // minutes
});

export type SubmitPricingInput = z.infer<typeof submitPricingSchema>;

/**
 * Approve pricing schema (customer approving a merchant's pricing)
 */
export const approvePricingSchema = z.object({
  request_id: uuidSchema,
});

export type ApprovePricingInput = z.infer<typeof approvePricingSchema>;

/**
 * Reject pricing schema
 */
export const rejectPricingSchema = z.object({
  request_id: uuidSchema,
  reason: z.string().max(500).optional(),
});

export type RejectPricingInput = z.infer<typeof rejectPricingSchema>;

/**
 * Cancel broadcast schema
 */
export const cancelBroadcastSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type CancelBroadcastInput = z.infer<typeof cancelBroadcastSchema>;

/**
 * Update item pricing schema (merchant updating a single item)
 */
export const updateItemPricingSchema = pricedItemSchema.partial().extend({
  item_id: uuidSchema,
});

export type UpdateItemPricingInput = z.infer<typeof updateItemPricingSchema>;

/**
 * Broadcast filters schema
 */
export const broadcastFiltersSchema = z.object({
  status: z.enum(['active', 'completed', 'expired', 'cancelled']).optional(),
  provider_id: uuidSchema.optional(),
  customer_id: uuidSchema.optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
});

export type BroadcastFiltersInput = z.infer<typeof broadcastFiltersSchema>;

/**
 * Custom request status schema
 */
export const customRequestStatusSchema = z.enum([
  'pending',
  'priced',
  'customer_approved',
  'customer_rejected',
  'expired',
  'cancelled',
]);

/**
 * Provider custom order settings schema
 */
export const providerCustomOrderSettingsSchema = z.object({
  accepts_text: z.boolean().default(true),
  accepts_voice: z.boolean().default(true),
  accepts_image: z.boolean().default(true),
  max_items_per_order: z.number().int().min(1).max(100).default(50),
  pricing_timeout_hours: z.number().int().min(1).max(72).default(24),
  customer_approval_timeout_hours: z.number().int().min(1).max(24).default(2),
  auto_cancel_after_hours: z.number().int().min(1).max(96).default(48),
  show_price_history: z.boolean().default(true),
});

export type ProviderCustomOrderSettingsInput = z.infer<typeof providerCustomOrderSettingsSchema>;

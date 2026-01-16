/**
 * Centralized Validation Schemas for Engezna
 *
 * Usage:
 * import { registerSchema, createOrderSchema } from '@/lib/validations';
 *
 * const result = registerSchema.safeParse(data);
 * if (!result.success) {
 *   throw ValidationError.fromZodError(result.error);
 * }
 */

// Common schemas
export {
  emailSchema,
  passwordSchema,
  strongPasswordSchema,
  egyptianPhoneSchema,
  uuidSchema,
  paginationSchema,
  sortSchema,
  dateRangeSchema,
  arabicTextSchema,
  optionalArabicTextSchema,
  priceSchema,
  quantitySchema,
  coordinatesSchema,
  addressSchema,
} from './common';

// Auth schemas
export {
  registerSchema,
  loginEmailSchema,
  loginPhoneSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  changePasswordSchema,
  otpVerifySchema,
  otpRequestSchema,
  updateProfileSchema,
  type RegisterInput,
  type LoginEmailInput,
  type LoginPhoneInput,
  type PasswordResetRequestInput,
  type PasswordResetInput,
  type ChangePasswordInput,
  type OtpVerifyInput,
  type OtpRequestInput,
  type UpdateProfileInput,
} from './auth';

// Order schemas
export {
  cartItemSchema,
  orderTypeSchema,
  createOrderSchema,
  orderStatusSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
  rateOrderSchema,
  orderListFiltersSchema,
  type CartItemInput,
  type CreateOrderInput,
  type UpdateOrderStatusInput,
  type CancelOrderInput,
  type RateOrderInput,
  type OrderListFiltersInput,
} from './orders';

// Custom order schemas
export {
  customOrderInputTypeSchema,
  itemAvailabilityStatusSchema,
  unitTypeSchema,
  createBroadcastSchema,
  pricedItemSchema,
  submitPricingSchema,
  approvePricingSchema,
  rejectPricingSchema,
  cancelBroadcastSchema,
  updateItemPricingSchema,
  broadcastFiltersSchema,
  customRequestStatusSchema,
  providerCustomOrderSettingsSchema,
  type CreateBroadcastInput,
  type PricedItemInput,
  type SubmitPricingInput,
  type ApprovePricingInput,
  type RejectPricingInput,
  type CancelBroadcastInput,
  type UpdateItemPricingInput,
  type BroadcastFiltersInput,
  type ProviderCustomOrderSettingsInput,
} from './custom-orders';

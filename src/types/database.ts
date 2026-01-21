export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ============================================================================
// ENUMS
// ============================================================================

export type UserRole = 'customer' | 'provider_owner' | 'provider_staff' | 'admin';

// Business Categories - Updated January 2026
// Added pharmacy category
export type ProviderCategory =
  | 'restaurant_cafe'
  | 'coffee_patisserie'
  | 'grocery'
  | 'vegetables_fruits'
  | 'pharmacy';

// Updated: Added 'active', 'approved', 'rejected', 'incomplete' for consistency across the app
export type ProviderStatus =
  | 'incomplete'
  | 'pending_approval'
  | 'approved'
  | 'active'
  | 'open'
  | 'closed'
  | 'temporarily_paused'
  | 'on_vacation'
  | 'rejected';

// Updated: Added 'completed' and 'confirmed' for settlement calculations
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'rejected';

// Updated: Added 'online' for Kashier integration, keeping legacy types for compatibility
export type PaymentMethod = 'cash' | 'online' | 'card' | 'fawry' | 'vodafone_cash' | 'credit_card';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export type MessageType = 'text' | 'image' | 'system';

export type NotificationType = 'order_update' | 'promo' | 'system' | 'chat';

// NEW: Order type enum (delivery vs pickup)
export type OrderType = 'delivery' | 'pickup';

// NEW: Delivery timing enum (ASAP vs scheduled)
export type DeliveryTiming = 'asap' | 'scheduled';

// NEW: Settlement status enum for consistency
export type SettlementStatus =
  | 'pending'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'disputed'
  | 'waived';

// NEW: Settlement direction for COD/Online breakdown
export type SettlementDirection = 'platform_pays_provider' | 'provider_pays_platform' | 'balanced';

// NEW: Commission status for providers
export type CommissionStatus = 'in_grace_period' | 'active' | 'exempt';

// ============================================================================
// CUSTOM ORDER ENUMS - Added January 2026
// ============================================================================

// Provider operation mode
export type OperationMode = 'standard' | 'custom' | 'hybrid';

// Custom order input types
export type CustomOrderInputType = 'text' | 'voice' | 'image' | 'mixed';

// Custom order request status
export type CustomRequestStatus =
  | 'pending'
  | 'pricing_in_progress' // Temporary lock during pricing submission
  | 'priced'
  | 'customer_approved'
  | 'customer_rejected'
  | 'expired'
  | 'cancelled';

// Item availability status
export type ItemAvailabilityStatus = 'available' | 'unavailable' | 'partial' | 'substituted';

// Broadcast status
export type BroadcastStatus = 'active' | 'completed' | 'expired' | 'cancelled';

// Pricing status for custom orders
export type PricingStatus =
  | 'awaiting_pricing'
  | 'pricing_sent'
  | 'pricing_approved'
  | 'pricing_rejected'
  | 'pricing_expired';

// Order flow type
export type OrderFlow = 'standard' | 'custom';

// Item source in order_items
export type ItemSource = 'menu' | 'custom';

// ============================================================================
// DATABASE TYPES
// ============================================================================

export interface Database {
  public: {
    Tables: {
      // --------------------------------------------------------------------
      // Profiles
      // --------------------------------------------------------------------
      profiles: {
        Row: {
          id: string;
          email: string | null;
          phone: string | null;
          full_name: string;
          avatar_url: string | null;
          role: UserRole;
          is_active: boolean;
          referral_code: string | null;
          wallet_balance: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          phone?: string | null;
          full_name: string;
          avatar_url?: string | null;
          role?: UserRole;
          is_active?: boolean;
          referral_code?: string | null;
          wallet_balance?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          phone?: string | null;
          full_name?: string;
          avatar_url?: string | null;
          role?: UserRole;
          is_active?: boolean;
          referral_code?: string | null;
          wallet_balance?: number;
          created_at?: string;
          updated_at?: string;
        };
      };

      // --------------------------------------------------------------------
      // Categories
      // --------------------------------------------------------------------
      categories: {
        Row: {
          id: string;
          name_ar: string;
          name_en: string;
          slug: string;
          icon: string | null;
          type: ProviderCategory;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name_ar: string;
          name_en: string;
          slug: string;
          icon?: string | null;
          type: ProviderCategory;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name_ar?: string;
          name_en?: string;
          slug?: string;
          icon?: string | null;
          type?: ProviderCategory;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };

      // --------------------------------------------------------------------
      // Providers
      // --------------------------------------------------------------------
      providers: {
        Row: {
          id: string;
          owner_id: string;
          name_ar: string;
          name_en: string;
          description_ar: string | null;
          description_en: string | null;
          category: ProviderCategory;
          logo_url: string | null;
          cover_image_url: string | null;
          phone: string;
          email: string | null;
          address_ar: string;
          address_en: string | null;
          location: unknown | null; // PostGIS geography type
          delivery_radius_km: number;
          status: ProviderStatus;
          is_featured: boolean;
          rating: number;
          total_reviews: number;
          total_orders: number;
          min_order_amount: number;
          delivery_fee: number;
          estimated_delivery_time_min: number;
          commission_rate: number;
          business_hours: Json | null;
          bank_name: string | null;
          account_holder_name: string | null;
          account_number: string | null;
          iban: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
          // Location fields
          governorate_id: string | null;
          city_id: string | null;
          district_id: string | null;
          latitude: number | null;
          longitude: number | null;
          // Commission fields
          commission_status: CommissionStatus | null;
          grace_period_start: string | null;
          grace_period_end: string | null;
          custom_commission_rate: number | null;
          // Other fields
          rejection_reason: string | null;
          settlement_group_id: string | null;
          // Pickup settings
          supports_pickup: boolean;
          pickup_instructions_ar: string | null;
          pickup_instructions_en: string | null;
          estimated_pickup_time_min: number;
          // Custom Order settings - Added January 2026
          operation_mode: OperationMode;
          custom_order_settings: Json | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name_ar: string;
          name_en: string;
          description_ar?: string | null;
          description_en?: string | null;
          category: ProviderCategory;
          logo_url?: string | null;
          cover_image_url?: string | null;
          phone: string;
          email?: string | null;
          address_ar: string;
          address_en?: string | null;
          location?: unknown | null;
          delivery_radius_km?: number;
          status?: ProviderStatus;
          is_featured?: boolean;
          rating?: number;
          total_reviews?: number;
          total_orders?: number;
          min_order_amount?: number;
          delivery_fee: number;
          estimated_delivery_time_min?: number;
          commission_rate?: number;
          business_hours?: Json | null;
          bank_name?: string | null;
          account_holder_name?: string | null;
          account_number?: string | null;
          iban?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
          // Location fields
          governorate_id?: string | null;
          city_id?: string | null;
          district_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          // Commission fields
          commission_status?: CommissionStatus | null;
          grace_period_start?: string | null;
          grace_period_end?: string | null;
          custom_commission_rate?: number | null;
          // Other fields
          rejection_reason?: string | null;
          settlement_group_id?: string | null;
          // Pickup settings
          supports_pickup?: boolean;
          pickup_instructions_ar?: string | null;
          pickup_instructions_en?: string | null;
          estimated_pickup_time_min?: number;
          // Custom Order settings - Added January 2026
          operation_mode?: OperationMode;
          custom_order_settings?: Json | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name_ar?: string;
          name_en?: string;
          description_ar?: string | null;
          description_en?: string | null;
          category?: ProviderCategory;
          logo_url?: string | null;
          cover_image_url?: string | null;
          phone?: string;
          email?: string | null;
          address_ar?: string;
          address_en?: string | null;
          location?: unknown | null;
          delivery_radius_km?: number;
          status?: ProviderStatus;
          is_featured?: boolean;
          rating?: number;
          total_reviews?: number;
          total_orders?: number;
          min_order_amount?: number;
          delivery_fee?: number;
          estimated_delivery_time_min?: number;
          commission_rate?: number;
          business_hours?: Json | null;
          bank_name?: string | null;
          account_holder_name?: string | null;
          account_number?: string | null;
          iban?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
          // Location fields
          governorate_id?: string | null;
          city_id?: string | null;
          district_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          // Commission fields
          commission_status?: CommissionStatus | null;
          grace_period_start?: string | null;
          grace_period_end?: string | null;
          custom_commission_rate?: number | null;
          // Other fields
          rejection_reason?: string | null;
          settlement_group_id?: string | null;
          // Pickup settings
          supports_pickup?: boolean;
          pickup_instructions_ar?: string | null;
          pickup_instructions_en?: string | null;
          estimated_pickup_time_min?: number;
          // Custom Order settings - Added January 2026
          operation_mode?: OperationMode;
          custom_order_settings?: Json | null;
        };
      };

      // --------------------------------------------------------------------
      // Provider Staff
      // --------------------------------------------------------------------
      provider_staff: {
        Row: {
          id: string;
          provider_id: string;
          user_id: string;
          role: string;
          can_manage_menu: boolean;
          can_manage_orders: boolean;
          can_manage_customers: boolean;
          can_view_analytics: boolean;
          can_manage_offers: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          user_id: string;
          role?: string;
          can_manage_menu?: boolean;
          can_manage_orders?: boolean;
          can_manage_customers?: boolean;
          can_view_analytics?: boolean;
          can_manage_offers?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          user_id?: string;
          role?: string;
          can_manage_menu?: boolean;
          can_manage_orders?: boolean;
          can_manage_customers?: boolean;
          can_view_analytics?: boolean;
          can_manage_offers?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };

      // --------------------------------------------------------------------
      // Provider Invitations - Pending staff invitations
      // --------------------------------------------------------------------
      provider_invitations: {
        Row: {
          id: string;
          provider_id: string;
          email: string;
          invited_by: string;
          can_manage_orders: boolean;
          can_manage_menu: boolean;
          can_manage_customers: boolean;
          can_view_analytics: boolean;
          can_manage_offers: boolean;
          status: 'pending' | 'accepted' | 'expired' | 'cancelled';
          token: string;
          expires_at: string;
          created_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          provider_id: string;
          email: string;
          invited_by: string;
          can_manage_orders?: boolean;
          can_manage_menu?: boolean;
          can_manage_customers?: boolean;
          can_view_analytics?: boolean;
          can_manage_offers?: boolean;
          status?: 'pending' | 'accepted' | 'expired' | 'cancelled';
          token?: string;
          expires_at?: string;
          created_at?: string;
          accepted_at?: string | null;
        };
        Update: {
          id?: string;
          provider_id?: string;
          email?: string;
          invited_by?: string;
          can_manage_orders?: boolean;
          can_manage_menu?: boolean;
          can_manage_customers?: boolean;
          can_view_analytics?: boolean;
          can_manage_offers?: boolean;
          status?: 'pending' | 'accepted' | 'expired' | 'cancelled';
          token?: string;
          expires_at?: string;
          created_at?: string;
          accepted_at?: string | null;
        };
      };

      // --------------------------------------------------------------------
      // Menu Items - Updated December 2025 with variants, pricing types
      // --------------------------------------------------------------------
      menu_items: {
        Row: {
          id: string;
          provider_id: string;
          category_id: string | null;
          name_ar: string;
          name_en: string;
          description_ar: string | null;
          description_en: string | null;
          price: number;
          original_price: number | null;
          image_url: string | null;
          is_available: boolean;
          has_stock: boolean;
          stock_notes: string | null;
          is_vegetarian: boolean;
          is_spicy: boolean;
          calories: number | null;
          preparation_time_min: number;
          display_order: number;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
          // Variant and pricing fields - Added Dec 2025
          pricing_type: 'fixed' | 'per_unit' | 'variants';
          has_variants: boolean;
          provider_category_id: string | null;
          variant_type: string | null; // 'size', 'weight', 'option', 'coffee_weight'
          unit_type: string | null; // 'kg', 'gram', 'liter', 'piece', etc.
          unit_price: number | null;
          min_quantity: number | null;
          quantity_step: number | null;
          price_from: number | null;
          // Combo and special fields
          combo_contents_ar: string | null;
          combo_contents_en: string | null;
          serves_count: number | null;
          is_popular: boolean;
          is_new: boolean;
          import_id: string | null;
        };
        Insert: {
          id?: string;
          provider_id: string;
          category_id?: string | null;
          name_ar: string;
          name_en: string;
          description_ar?: string | null;
          description_en?: string | null;
          price: number;
          original_price?: number | null;
          image_url?: string | null;
          is_available?: boolean;
          has_stock?: boolean;
          stock_notes?: string | null;
          is_vegetarian?: boolean;
          is_spicy?: boolean;
          calories?: number | null;
          preparation_time_min?: number;
          display_order?: number;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
          // Variant and pricing fields
          pricing_type?: 'fixed' | 'per_unit' | 'variants';
          has_variants?: boolean;
          provider_category_id?: string | null;
          variant_type?: string | null;
          unit_type?: string | null;
          unit_price?: number | null;
          min_quantity?: number | null;
          quantity_step?: number | null;
          price_from?: number | null;
          // Combo and special fields
          combo_contents_ar?: string | null;
          combo_contents_en?: string | null;
          serves_count?: number | null;
          is_popular?: boolean;
          is_new?: boolean;
          import_id?: string | null;
        };
        Update: {
          id?: string;
          provider_id?: string;
          category_id?: string | null;
          name_ar?: string;
          name_en?: string;
          description_ar?: string | null;
          description_en?: string | null;
          price?: number;
          original_price?: number | null;
          image_url?: string | null;
          is_available?: boolean;
          has_stock?: boolean;
          stock_notes?: string | null;
          is_vegetarian?: boolean;
          is_spicy?: boolean;
          calories?: number | null;
          preparation_time_min?: number;
          display_order?: number;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
          // Variant and pricing fields
          pricing_type?: 'fixed' | 'per_unit' | 'variants';
          has_variants?: boolean;
          provider_category_id?: string | null;
          variant_type?: string | null;
          unit_type?: string | null;
          unit_price?: number | null;
          min_quantity?: number | null;
          quantity_step?: number | null;
          price_from?: number | null;
          // Combo and special fields
          combo_contents_ar?: string | null;
          combo_contents_en?: string | null;
          serves_count?: number | null;
          is_popular?: boolean;
          is_new?: boolean;
          import_id?: string | null;
        };
      };

      // --------------------------------------------------------------------
      // Product Variants - Sizes, weights, options for menu items
      // --------------------------------------------------------------------
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          variant_type: string; // 'size', 'weight', 'option'
          name_ar: string;
          name_en: string | null;
          price: number;
          original_price: number | null;
          is_default: boolean;
          display_order: number;
          is_available: boolean;
          multiplier: number | null; // For weight-based variants
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          variant_type: string;
          name_ar: string;
          name_en?: string | null;
          price: number;
          original_price?: number | null;
          is_default?: boolean;
          display_order?: number;
          is_available?: boolean;
          multiplier?: number | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          variant_type?: string;
          name_ar?: string;
          name_en?: string | null;
          price?: number;
          original_price?: number | null;
          is_default?: boolean;
          display_order?: number;
          is_available?: boolean;
          multiplier?: number | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      // --------------------------------------------------------------------
      // Provider Categories - Provider-specific menu categories
      // --------------------------------------------------------------------
      provider_categories: {
        Row: {
          id: string;
          provider_id: string;
          name_ar: string;
          name_en: string | null;
          display_order: number;
          is_active: boolean;
          is_extras: boolean; // When true, items show as cross-sell in cart
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          name_ar: string;
          name_en?: string | null;
          display_order?: number;
          is_active?: boolean;
          is_extras?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          name_ar?: string;
          name_en?: string | null;
          display_order?: number;
          is_active?: boolean;
          is_extras?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };

      // --------------------------------------------------------------------
      // Promotions - Provider offers (separate from platform promo codes)
      // --------------------------------------------------------------------
      promotions: {
        Row: {
          id: string;
          provider_id: string;
          name_ar: string;
          name_en: string | null;
          type: 'percentage' | 'fixed' | 'buy_x_get_y';
          discount_value: number;
          buy_quantity: number | null;
          get_quantity: number | null;
          min_order_amount: number | null;
          max_discount: number | null;
          start_date: string;
          end_date: string;
          is_active: boolean;
          applies_to: 'all' | 'specific' | 'category';
          product_ids: string[] | null;
          category_ids: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          name_ar: string;
          name_en?: string | null;
          type: 'percentage' | 'fixed' | 'buy_x_get_y';
          discount_value: number;
          buy_quantity?: number | null;
          get_quantity?: number | null;
          min_order_amount?: number | null;
          max_discount?: number | null;
          start_date: string;
          end_date: string;
          is_active?: boolean;
          applies_to?: 'all' | 'specific' | 'category';
          product_ids?: string[] | null;
          category_ids?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          name_ar?: string;
          name_en?: string | null;
          type?: 'percentage' | 'fixed' | 'buy_x_get_y';
          discount_value?: number;
          buy_quantity?: number | null;
          get_quantity?: number | null;
          min_order_amount?: number | null;
          max_discount?: number | null;
          start_date?: string;
          end_date?: string;
          is_active?: boolean;
          applies_to?: 'all' | 'specific' | 'category';
          product_ids?: string[] | null;
          category_ids?: string[] | null;
          created_at?: string;
        };
      };

      // --------------------------------------------------------------------
      // Addresses
      // --------------------------------------------------------------------
      addresses: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          address_line1: string;
          address_line2: string | null;
          city: string;
          area: string | null;
          building: string | null;
          floor: string | null;
          apartment: string | null;
          landmark: string | null;
          location: unknown | null;
          phone: string | null;
          delivery_instructions: string | null;
          is_default: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          // Location reference fields
          governorate_id: string | null;
          city_id: string | null;
          district_id: string | null;
          street_address: string | null;
          // GPS coordinates
          latitude: number | null;
          longitude: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          label: string;
          address_line1: string;
          address_line2?: string | null;
          city?: string;
          area?: string | null;
          building?: string | null;
          floor?: string | null;
          apartment?: string | null;
          landmark?: string | null;
          location?: unknown | null;
          phone?: string | null;
          delivery_instructions?: string | null;
          is_default?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          // Location reference fields
          governorate_id?: string | null;
          city_id?: string | null;
          district_id?: string | null;
          street_address?: string | null;
          // GPS coordinates
          latitude?: number | null;
          longitude?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          address_line1?: string;
          address_line2?: string | null;
          city?: string;
          area?: string | null;
          building?: string | null;
          floor?: string | null;
          apartment?: string | null;
          landmark?: string | null;
          location?: unknown | null;
          phone?: string | null;
          delivery_instructions?: string | null;
          is_default?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          // Location reference fields
          governorate_id?: string | null;
          city_id?: string | null;
          district_id?: string | null;
          street_address?: string | null;
          // GPS coordinates
          latitude?: number | null;
          longitude?: number | null;
        };
      };

      // --------------------------------------------------------------------
      // Orders
      // --------------------------------------------------------------------
      orders: {
        Row: {
          id: string;
          order_number: string;
          customer_id: string | null;
          provider_id: string;
          address_id: string | null;
          status: OrderStatus;
          subtotal: number;
          delivery_fee: number;
          discount: number;
          total: number;
          platform_commission: number;
          payment_method: PaymentMethod;
          payment_status: PaymentStatus;
          // Order type and timing
          order_type: OrderType;
          delivery_timing: DeliveryTiming;
          scheduled_time: string | null;
          delivery_address: Json;
          delivery_instructions: string | null;
          estimated_delivery_time: string | null;
          actual_delivery_time: string | null;
          customer_notes: string | null;
          provider_notes: string | null;
          cancellation_reason: string | null;
          promo_code: string | null;
          can_modify: boolean;
          modification_count: number;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
          accepted_at: string | null;
          preparing_at: string | null;
          ready_at: string | null;
          out_for_delivery_at: string | null;
          delivered_at: string | null;
          cancelled_at: string | null;
          // Custom Order fields - Added January 2026
          order_flow: OrderFlow;
          broadcast_id: string | null;
          pricing_status: PricingStatus | null;
          pricing_sent_at: string | null;
          pricing_responded_at: string | null;
          pricing_expires_at: string | null;
        };
        Insert: {
          id?: string;
          order_number?: string;
          customer_id?: string | null;
          provider_id: string;
          address_id?: string | null;
          status?: OrderStatus;
          subtotal: number;
          delivery_fee: number;
          discount?: number;
          total: number;
          platform_commission: number;
          payment_method: PaymentMethod;
          payment_status?: PaymentStatus;
          // Order type and timing
          order_type?: OrderType;
          delivery_timing?: DeliveryTiming;
          scheduled_time?: string | null;
          delivery_address?: Json;
          delivery_instructions?: string | null;
          estimated_delivery_time?: string | null;
          actual_delivery_time?: string | null;
          customer_notes?: string | null;
          provider_notes?: string | null;
          cancellation_reason?: string | null;
          promo_code?: string | null;
          can_modify?: boolean;
          modification_count?: number;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
          accepted_at?: string | null;
          preparing_at?: string | null;
          ready_at?: string | null;
          out_for_delivery_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          // Custom Order fields - Added January 2026
          order_flow?: OrderFlow;
          broadcast_id?: string | null;
          pricing_status?: PricingStatus | null;
          pricing_sent_at?: string | null;
          pricing_responded_at?: string | null;
          pricing_expires_at?: string | null;
        };
        Update: {
          id?: string;
          order_number?: string;
          customer_id?: string | null;
          provider_id?: string;
          address_id?: string | null;
          status?: OrderStatus;
          subtotal?: number;
          delivery_fee?: number;
          discount?: number;
          total?: number;
          platform_commission?: number;
          payment_method?: PaymentMethod;
          payment_status?: PaymentStatus;
          // Order type and timing
          order_type?: OrderType;
          delivery_timing?: DeliveryTiming;
          scheduled_time?: string | null;
          delivery_address?: Json;
          delivery_instructions?: string | null;
          estimated_delivery_time?: string | null;
          actual_delivery_time?: string | null;
          customer_notes?: string | null;
          provider_notes?: string | null;
          cancellation_reason?: string | null;
          promo_code?: string | null;
          can_modify?: boolean;
          modification_count?: number;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
          accepted_at?: string | null;
          preparing_at?: string | null;
          ready_at?: string | null;
          out_for_delivery_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          // Custom Order fields - Added January 2026
          order_flow?: OrderFlow;
          broadcast_id?: string | null;
          pricing_status?: PricingStatus | null;
          pricing_sent_at?: string | null;
          pricing_responded_at?: string | null;
          pricing_expires_at?: string | null;
        };
      };

      // --------------------------------------------------------------------
      // Order Items
      // --------------------------------------------------------------------
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string | null;
          item_name_ar: string;
          item_name_en: string;
          item_price: number;
          quantity: number;
          unit_price: number;
          total_price: number;
          customizations: Json | null;
          special_instructions: string | null;
          created_at: string;
          updated_at: string;
          // Custom Order fields - Added January 2026
          item_source: ItemSource;
          custom_item_id: string | null;
          original_customer_text: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_item_id?: string | null;
          item_name_ar: string;
          item_name_en: string;
          item_price: number;
          quantity?: number;
          unit_price: number;
          total_price: number;
          customizations?: Json | null;
          special_instructions?: string | null;
          created_at?: string;
          updated_at?: string;
          // Custom Order fields - Added January 2026
          item_source?: ItemSource;
          custom_item_id?: string | null;
          original_customer_text?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          menu_item_id?: string | null;
          item_name_ar?: string;
          item_name_en?: string;
          item_price?: number;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          customizations?: Json | null;
          special_instructions?: string | null;
          created_at?: string;
          updated_at?: string;
          // Custom Order fields - Added January 2026
          item_source?: ItemSource;
          custom_item_id?: string | null;
          original_customer_text?: string | null;
        };
      };

      // --------------------------------------------------------------------
      // Reviews
      // --------------------------------------------------------------------
      reviews: {
        Row: {
          id: string;
          order_id: string;
          customer_id: string;
          provider_id: string;
          rating: number;
          comment: string | null;
          provider_response: string | null;
          provider_response_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          customer_id: string;
          provider_id: string;
          rating: number;
          comment?: string | null;
          provider_response?: string | null;
          provider_response_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          customer_id?: string;
          provider_id?: string;
          rating?: number;
          comment?: string | null;
          provider_response?: string | null;
          provider_response_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      // --------------------------------------------------------------------
      // Loyalty Points
      // --------------------------------------------------------------------
      loyalty_points: {
        Row: {
          id: string;
          user_id: string;
          points_balance: number;
          lifetime_points: number;
          tier: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          points_balance?: number;
          lifetime_points?: number;
          tier?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          points_balance?: number;
          lifetime_points?: number;
          tier?: string;
          created_at?: string;
          updated_at?: string;
        };
      };

      // --------------------------------------------------------------------
      // Loyalty Transactions
      // --------------------------------------------------------------------
      loyalty_transactions: {
        Row: {
          id: string;
          user_id: string;
          order_id: string | null;
          points: number;
          transaction_type: string;
          description: string | null;
          balance_after: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          order_id?: string | null;
          points: number;
          transaction_type: string;
          description?: string | null;
          balance_after: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          order_id?: string | null;
          points?: number;
          transaction_type?: string;
          description?: string | null;
          balance_after?: number;
          created_at?: string;
        };
      };

      // --------------------------------------------------------------------
      // Referrals
      // --------------------------------------------------------------------
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referee_id: string;
          referral_code: string;
          status: string;
          referrer_credit: number;
          referee_credit: number;
          referrer_credit_applied: boolean;
          referee_credit_applied: boolean;
          completed_at: string | null;
          referee_first_order_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referee_id: string;
          referral_code: string;
          status?: string;
          referrer_credit?: number;
          referee_credit?: number;
          referrer_credit_applied?: boolean;
          referee_credit_applied?: boolean;
          completed_at?: string | null;
          referee_first_order_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          referrer_id?: string;
          referee_id?: string;
          referral_code?: string;
          status?: string;
          referrer_credit?: number;
          referee_credit?: number;
          referrer_credit_applied?: boolean;
          referee_credit_applied?: boolean;
          completed_at?: string | null;
          referee_first_order_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      // --------------------------------------------------------------------
      // Chat Conversations
      // --------------------------------------------------------------------
      chat_conversations: {
        Row: {
          id: string;
          order_id: string;
          customer_id: string;
          provider_id: string;
          is_active: boolean;
          last_message_at: string | null;
          last_message_preview: string | null;
          customer_unread_count: number;
          provider_unread_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          customer_id: string;
          provider_id: string;
          is_active?: boolean;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          customer_unread_count?: number;
          provider_unread_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          customer_id?: string;
          provider_id?: string;
          is_active?: boolean;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          customer_unread_count?: number;
          provider_unread_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };

      // --------------------------------------------------------------------
      // Chat Messages
      // --------------------------------------------------------------------
      chat_messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string | null;
          message_type: MessageType;
          content: string | null;
          image_url: string | null;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id?: string | null;
          message_type?: MessageType;
          content?: string | null;
          image_url?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string | null;
          message_type?: MessageType;
          content?: string | null;
          image_url?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      // --------------------------------------------------------------------
      // Promo Codes
      // --------------------------------------------------------------------
      promo_codes: {
        Row: {
          id: string;
          code: string;
          description_ar: string | null;
          description_en: string | null;
          discount_type: string;
          discount_value: number;
          max_discount_amount: number | null;
          min_order_amount: number;
          usage_limit: number | null;
          usage_count: number;
          per_user_limit: number;
          valid_from: string;
          valid_until: string;
          is_active: boolean;
          applicable_categories: ProviderCategory[] | null;
          applicable_providers: string[] | null;
          first_order_only: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          description_ar?: string | null;
          description_en?: string | null;
          discount_type: string;
          discount_value: number;
          max_discount_amount?: number | null;
          min_order_amount?: number;
          usage_limit?: number | null;
          usage_count?: number;
          per_user_limit?: number;
          valid_from: string;
          valid_until: string;
          is_active?: boolean;
          applicable_categories?: ProviderCategory[] | null;
          applicable_providers?: string[] | null;
          first_order_only?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          description_ar?: string | null;
          description_en?: string | null;
          discount_type?: string;
          discount_value?: number;
          max_discount_amount?: number | null;
          min_order_amount?: number;
          usage_limit?: number | null;
          usage_count?: number;
          per_user_limit?: number;
          valid_from?: string;
          valid_until?: string;
          is_active?: boolean;
          applicable_categories?: ProviderCategory[] | null;
          applicable_providers?: string[] | null;
          first_order_only?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };

      // --------------------------------------------------------------------
      // Promo Code Usage
      // --------------------------------------------------------------------
      promo_code_usage: {
        Row: {
          id: string;
          promo_code_id: string;
          user_id: string;
          order_id: string;
          discount_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          promo_code_id: string;
          user_id: string;
          order_id: string;
          discount_amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          promo_code_id?: string;
          user_id?: string;
          order_id?: string;
          discount_amount?: number;
          created_at?: string;
        };
      };

      // --------------------------------------------------------------------
      // Notifications
      // --------------------------------------------------------------------
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title_ar: string;
          title_en: string;
          message_ar: string;
          message_en: string;
          order_id: string | null;
          provider_id: string | null;
          action_url: string | null;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          title_ar: string;
          title_en: string;
          message_ar: string;
          message_en: string;
          order_id?: string | null;
          provider_id?: string | null;
          action_url?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: NotificationType;
          title_ar?: string;
          title_en?: string;
          message_ar?: string;
          message_en?: string;
          order_id?: string | null;
          provider_id?: string | null;
          action_url?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
      };

      // --------------------------------------------------------------------
      // Settlements
      // Updated: Added all fields from migrations 20251207000002 and 20251207000003
      // --------------------------------------------------------------------
      settlements: {
        Row: {
          id: string;
          provider_id: string;
          // Period information
          period_start: string;
          period_end: string;
          // Financial breakdown
          total_orders: number;
          gross_revenue: number;
          platform_commission: number;
          delivery_fees_collected: number;
          net_amount_due: number; // Amount provider owes platform (replaces net_payout)
          // Status
          status: SettlementStatus;
          // Payment tracking
          amount_paid: number;
          payment_date: string | null; // Replaces paid_at
          payment_method: string | null;
          payment_reference: string | null;
          // Due date and overdue tracking
          due_date: string;
          is_overdue: boolean;
          overdue_days: number;
          // Notes
          notes: string | null;
          admin_notes: string | null;
          // COD breakdown
          cod_orders_count: number;
          cod_gross_revenue: number;
          cod_commission_owed: number;
          // Online breakdown
          online_orders_count: number;
          online_gross_revenue: number;
          online_platform_commission: number;
          online_payout_owed: number;
          // Net balance and direction
          net_balance: number;
          settlement_direction: SettlementDirection | null;
          // Audit
          created_at: string;
          updated_at: string;
          created_by: string | null;
          processed_by: string | null;
          // Legacy fields for backward compatibility
          net_payout?: number; // Deprecated: use net_amount_due
          paid_at?: string | null; // Deprecated: use payment_date
          orders_included?: string[] | null; // Deprecated: use settlement_items table
        };
        Insert: {
          id?: string;
          provider_id: string;
          period_start: string;
          period_end: string;
          total_orders?: number;
          gross_revenue?: number;
          platform_commission?: number;
          delivery_fees_collected?: number;
          net_amount_due?: number;
          status?: SettlementStatus;
          amount_paid?: number;
          payment_date?: string | null;
          payment_method?: string | null;
          payment_reference?: string | null;
          due_date: string;
          is_overdue?: boolean;
          overdue_days?: number;
          notes?: string | null;
          admin_notes?: string | null;
          cod_orders_count?: number;
          cod_gross_revenue?: number;
          cod_commission_owed?: number;
          online_orders_count?: number;
          online_gross_revenue?: number;
          online_platform_commission?: number;
          online_payout_owed?: number;
          net_balance?: number;
          settlement_direction?: SettlementDirection | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          processed_by?: string | null;
        };
        Update: {
          id?: string;
          provider_id?: string;
          period_start?: string;
          period_end?: string;
          total_orders?: number;
          gross_revenue?: number;
          platform_commission?: number;
          delivery_fees_collected?: number;
          net_amount_due?: number;
          status?: SettlementStatus;
          amount_paid?: number;
          payment_date?: string | null;
          payment_method?: string | null;
          payment_reference?: string | null;
          due_date?: string;
          is_overdue?: boolean;
          overdue_days?: number;
          notes?: string | null;
          admin_notes?: string | null;
          cod_orders_count?: number;
          cod_gross_revenue?: number;
          cod_commission_owed?: number;
          online_orders_count?: number;
          online_gross_revenue?: number;
          online_platform_commission?: number;
          online_payout_owed?: number;
          net_balance?: number;
          settlement_direction?: SettlementDirection | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          processed_by?: string | null;
        };
      };

      // --------------------------------------------------------------------
      // Settlement Items - Individual orders in each settlement
      // --------------------------------------------------------------------
      settlement_items: {
        Row: {
          id: string;
          settlement_id: string;
          order_id: string;
          order_total: number;
          commission_rate: number;
          commission_amount: number;
          delivery_fee: number;
          payment_method: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          settlement_id: string;
          order_id: string;
          order_total: number;
          commission_rate?: number;
          commission_amount: number;
          delivery_fee?: number;
          payment_method?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          settlement_id?: string;
          order_id?: string;
          order_total?: number;
          commission_rate?: number;
          commission_amount?: number;
          delivery_fee?: number;
          payment_method?: string | null;
          created_at?: string;
        };
      };

      // --------------------------------------------------------------------
      // Governorates (محافظات) - Egyptian Administrative Level 1
      // --------------------------------------------------------------------
      governorates: {
        Row: {
          id: string;
          name_ar: string;
          name_en: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          // Commission & display settings
          commission_override: number | null;
          display_order: number;
        };
        Insert: {
          id?: string;
          name_ar: string;
          name_en: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          // Commission & display settings
          commission_override?: number | null;
          display_order?: number;
        };
        Update: {
          id?: string;
          name_ar?: string;
          name_en?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          // Commission & display settings
          commission_override?: number | null;
          display_order?: number;
        };
      };

      // --------------------------------------------------------------------
      // Cities (مراكز/مدن) - Egyptian Administrative Level 2
      // --------------------------------------------------------------------
      cities: {
        Row: {
          id: string;
          governorate_id: string;
          name_ar: string;
          name_en: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          governorate_id: string;
          name_ar: string;
          name_en: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          governorate_id?: string;
          name_ar?: string;
          name_en?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };

      // --------------------------------------------------------------------
      // Districts (أحياء) - Egyptian Administrative Level 3
      // NOTE: Districts are deprecated - using GPS coordinates instead
      // --------------------------------------------------------------------
      districts: {
        Row: {
          id: string;
          governorate_id: string;
          city_id: string | null;
          name_ar: string;
          name_en: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          governorate_id: string;
          city_id?: string | null;
          name_ar: string;
          name_en: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          governorate_id?: string;
          city_id?: string | null;
          name_ar?: string;
          name_en?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };

      // --------------------------------------------------------------------
      // Platform Settings - Global configuration for commission, grace period, etc.
      // --------------------------------------------------------------------
      platform_settings: {
        Row: {
          key: string;
          value: Json;
          description: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          key: string;
          value: Json;
          description?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          key?: string;
          value?: Json;
          description?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
      };

      // ====================================================================
      // CUSTOM ORDER TABLES - Added January 2026
      // ====================================================================

      // --------------------------------------------------------------------
      // Custom Order Broadcasts - Triple broadcast system
      // --------------------------------------------------------------------
      custom_order_broadcasts: {
        Row: {
          id: string;
          customer_id: string;
          provider_ids: string[];
          winning_order_id: string | null;
          original_input_type: CustomOrderInputType;
          original_text: string | null;
          voice_url: string | null;
          image_urls: string[] | null;
          transcribed_text: string | null;
          customer_notes: string | null;
          delivery_address_id: string | null;
          delivery_address: Json | null;
          order_type: 'delivery' | 'pickup';
          status: BroadcastStatus;
          pricing_deadline: string;
          expires_at: string;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          customer_id: string;
          provider_ids: string[];
          winning_order_id?: string | null;
          original_input_type: CustomOrderInputType;
          original_text?: string | null;
          voice_url?: string | null;
          image_urls?: string[] | null;
          transcribed_text?: string | null;
          customer_notes?: string | null;
          delivery_address_id?: string | null;
          delivery_address?: Json | null;
          order_type?: 'delivery' | 'pickup';
          status?: BroadcastStatus;
          pricing_deadline: string;
          expires_at: string;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          customer_id?: string;
          provider_ids?: string[];
          winning_order_id?: string | null;
          original_input_type?: CustomOrderInputType;
          original_text?: string | null;
          voice_url?: string | null;
          image_urls?: string[] | null;
          transcribed_text?: string | null;
          customer_notes?: string | null;
          delivery_address_id?: string | null;
          delivery_address?: Json | null;
          order_type?: 'delivery' | 'pickup';
          status?: BroadcastStatus;
          pricing_deadline?: string;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
      };

      // --------------------------------------------------------------------
      // Custom Order Requests - Per-provider pricing request
      // --------------------------------------------------------------------
      custom_order_requests: {
        Row: {
          id: string;
          broadcast_id: string | null;
          order_id: string | null;
          provider_id: string;
          input_type: CustomOrderInputType;
          original_text: string | null;
          voice_url: string | null;
          image_urls: string[] | null;
          transcribed_text: string | null;
          customer_notes: string | null;
          status: CustomRequestStatus;
          items_count: number;
          subtotal: number;
          delivery_fee: number;
          total: number;
          created_at: string;
          updated_at: string;
          priced_at: string | null;
          responded_at: string | null;
          pricing_expires_at: string | null;
        };
        Insert: {
          id?: string;
          broadcast_id?: string | null;
          order_id?: string | null;
          provider_id: string;
          input_type: CustomOrderInputType;
          original_text?: string | null;
          voice_url?: string | null;
          image_urls?: string[] | null;
          transcribed_text?: string | null;
          customer_notes?: string | null;
          status?: CustomRequestStatus;
          items_count?: number;
          subtotal?: number;
          delivery_fee?: number;
          total?: number;
          created_at?: string;
          updated_at?: string;
          priced_at?: string | null;
          responded_at?: string | null;
          pricing_expires_at?: string | null;
        };
        Update: {
          id?: string;
          broadcast_id?: string | null;
          order_id?: string | null;
          provider_id?: string;
          input_type?: CustomOrderInputType;
          original_text?: string | null;
          voice_url?: string | null;
          image_urls?: string[] | null;
          transcribed_text?: string | null;
          customer_notes?: string | null;
          status?: CustomRequestStatus;
          items_count?: number;
          subtotal?: number;
          delivery_fee?: number;
          total?: number;
          created_at?: string;
          updated_at?: string;
          priced_at?: string | null;
          responded_at?: string | null;
          pricing_expires_at?: string | null;
        };
      };

      // --------------------------------------------------------------------
      // Custom Order Items - Merchant-priced items
      // --------------------------------------------------------------------
      custom_order_items: {
        Row: {
          id: string;
          request_id: string;
          order_id: string | null;
          original_customer_text: string | null;
          item_name_ar: string;
          item_name_en: string | null;
          description_ar: string | null;
          description_en: string | null;
          unit_type: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
          availability_status: ItemAvailabilityStatus;
          substitute_name_ar: string | null;
          substitute_name_en: string | null;
          substitute_description: string | null;
          substitute_quantity: number | null;
          substitute_unit_type: string | null;
          substitute_unit_price: number | null;
          substitute_total_price: number | null;
          merchant_notes: string | null;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          order_id?: string | null;
          original_customer_text?: string | null;
          item_name_ar: string;
          item_name_en?: string | null;
          description_ar?: string | null;
          description_en?: string | null;
          unit_type?: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
          availability_status?: ItemAvailabilityStatus;
          substitute_name_ar?: string | null;
          substitute_name_en?: string | null;
          substitute_description?: string | null;
          substitute_quantity?: number | null;
          substitute_unit_type?: string | null;
          substitute_unit_price?: number | null;
          substitute_total_price?: number | null;
          merchant_notes?: string | null;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string;
          order_id?: string | null;
          original_customer_text?: string | null;
          item_name_ar?: string;
          item_name_en?: string | null;
          description_ar?: string | null;
          description_en?: string | null;
          unit_type?: string | null;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          availability_status?: ItemAvailabilityStatus;
          substitute_name_ar?: string | null;
          substitute_name_en?: string | null;
          substitute_description?: string | null;
          substitute_quantity?: number | null;
          substitute_unit_type?: string | null;
          substitute_unit_price?: number | null;
          substitute_total_price?: number | null;
          merchant_notes?: string | null;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };

      // --------------------------------------------------------------------
      // Custom Order Price History - For "تم شراؤه مسبقاً" feature
      // --------------------------------------------------------------------
      custom_order_price_history: {
        Row: {
          id: string;
          provider_id: string;
          customer_id: string;
          item_name_normalized: string;
          item_name_ar: string;
          item_name_en: string | null;
          unit_type: string | null;
          unit_price: number;
          quantity: number;
          total_price: number | null;
          order_id: string | null;
          request_id: string | null;
          custom_item_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          customer_id: string;
          item_name_normalized: string;
          item_name_ar: string;
          item_name_en?: string | null;
          unit_type?: string | null;
          unit_price: number;
          quantity?: number;
          total_price?: number | null;
          order_id?: string | null;
          request_id?: string | null;
          custom_item_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          customer_id?: string;
          item_name_normalized?: string;
          item_name_ar?: string;
          item_name_en?: string | null;
          unit_type?: string | null;
          unit_price?: number;
          quantity?: number;
          total_price?: number | null;
          order_id?: string | null;
          request_id?: string | null;
          custom_item_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      provider_category: ProviderCategory;
      provider_status: ProviderStatus;
      order_status: OrderStatus;
      payment_method: PaymentMethod;
      payment_status: PaymentStatus;
      message_type: MessageType;
      notification_type: NotificationType;
      settlement_status: SettlementStatus;
      settlement_direction: SettlementDirection;
      commission_status: CommissionStatus;
      order_type: OrderType;
      delivery_timing: DeliveryTiming;
      // Custom Order enums - Added January 2026
      operation_mode: OperationMode;
      custom_order_input_type: CustomOrderInputType;
      custom_request_status: CustomRequestStatus;
      item_availability_status: ItemAvailabilityStatus;
      broadcast_status: BroadcastStatus;
      pricing_status: PricingStatus;
      order_flow: OrderFlow;
      item_source: ItemSource;
    };
  };
}

// ============================================================================
// HELPER TYPES - For consistent use across the app
// ============================================================================

// Valid provider statuses for active operations
export const ACTIVE_PROVIDER_STATUSES: ProviderStatus[] = [
  'approved',
  'active',
  'open',
  'closed',
  'temporarily_paused',
];

// Valid order statuses for in-progress orders
export const IN_PROGRESS_ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'accepted',
  'preparing',
  'ready',
  'out_for_delivery',
];

// Valid order statuses for completed orders (used in settlements)
export const COMPLETED_ORDER_STATUSES: OrderStatus[] = ['delivered', 'completed'];

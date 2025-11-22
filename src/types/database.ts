export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================================
// ENUMS
// ============================================================================

export type UserRole = 'customer' | 'provider_owner' | 'provider_staff' | 'admin';

export type ProviderCategory = 'restaurant' | 'coffee_shop' | 'grocery' | 'vegetables_fruits';

export type ProviderStatus = 'open' | 'closed' | 'temporarily_paused' | 'on_vacation' | 'pending_approval';

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'rejected';

export type PaymentMethod = 'cash' | 'fawry' | 'vodafone_cash' | 'credit_card';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export type MessageType = 'text' | 'image' | 'system';

export type NotificationType = 'order_update' | 'promo' | 'system' | 'chat';

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
          can_view_analytics: boolean;
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
          can_view_analytics?: boolean;
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
          can_view_analytics?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };

      // --------------------------------------------------------------------
      // Menu Items
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
          delivery_address: Json;
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
      // --------------------------------------------------------------------
      settlements: {
        Row: {
          id: string;
          provider_id: string;
          period_start: string;
          period_end: string;
          total_orders: number;
          gross_revenue: number;
          platform_commission: number;
          net_payout: number;
          status: string;
          paid_at: string | null;
          payment_method: string | null;
          payment_reference: string | null;
          orders_included: string[] | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          period_start: string;
          period_end: string;
          total_orders: number;
          gross_revenue: number;
          platform_commission: number;
          net_payout: number;
          status?: string;
          paid_at?: string | null;
          payment_method?: string | null;
          payment_reference?: string | null;
          orders_included?: string[] | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          period_start?: string;
          period_end?: string;
          total_orders?: number;
          gross_revenue?: number;
          platform_commission?: number;
          net_payout?: number;
          status?: string;
          paid_at?: string | null;
          payment_method?: string | null;
          payment_reference?: string | null;
          orders_included?: string[] | null;
          notes?: string | null;
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
    };
  };
}

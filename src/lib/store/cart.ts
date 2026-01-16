import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PricingType, VariantType } from '@/types/menu-import';

export type ProductVariant = {
  id: string;
  variant_type: VariantType;
  name_ar: string;
  name_en: string | null;
  price: number;
  original_price: number | null;
  is_default: boolean;
  display_order: number;
  is_available: boolean;
};

export type MenuItem = {
  id: string;
  provider_id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  price: number;
  original_price?: number | null;
  image_url: string | null;
  is_available: boolean;
  is_vegetarian: boolean;
  is_spicy: boolean;
  preparation_time_min: number;
  // Variant support
  has_variants?: boolean;
  pricing_type?: PricingType;
  variants?: ProductVariant[];
};

export type Provider = {
  id: string;
  name_ar: string;
  name_en: string;
  delivery_fee: number;
  min_order_amount: number;
  estimated_delivery_time_min: number;
  commission_rate?: number;
  category?: string;
};

export type CartItem = {
  menuItem: MenuItem;
  quantity: number;
  // Selected variant (for products with variants)
  selectedVariant?: ProductVariant;
};

// Helper to create unique cart item key (product + variant combination)
const getCartItemKey = (menuItemId: string, variantId?: string) => {
  return variantId ? `${menuItemId}-${variantId}` : menuItemId;
};

// Result type for addItem operation
export type AddItemResult = {
  success: boolean;
  requiresConfirmation: boolean;
  currentProviderName?: string;
  newProviderName?: string;
};

/**
 * Pending Online Order tracking
 * Used to prevent clearing cart during online payment flow
 */
export type PendingOnlineOrder = {
  orderId: string;
  createdAt: string; // ISO timestamp
};

type CartState = {
  cart: CartItem[];
  provider: Provider | null;
  _hasHydrated: boolean;
  // Pending item to add after confirmation
  pendingItem: { menuItem: MenuItem; provider: Provider; variant?: ProductVariant } | null;
  // Track pending online payment orders (don't clear cart until payment confirmed)
  pendingOnlineOrder: PendingOnlineOrder | null;
  setHasHydrated: (state: boolean) => void;
  // Returns result indicating if confirmation is needed
  addItem: (menuItem: MenuItem, provider: Provider, variant?: ProductVariant) => AddItemResult;
  // Force add item (after user confirms provider switch)
  confirmProviderSwitch: () => void;
  // Cancel pending item
  cancelProviderSwitch: () => void;
  removeItem: (menuItemId: string, variantId?: string) => void;
  removeItemCompletely: (menuItemId: string, variantId?: string) => void; // Removes entire item regardless of quantity
  updateQuantity: (menuItemId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  // Safe clear - only clears if no pending online order
  safeClearCart: () => boolean;
  // Pending online order management
  setPendingOnlineOrder: (orderId: string) => void;
  clearPendingOnlineOrder: () => void;
  hasPendingOnlineOrder: () => boolean;
  getItemQuantity: (menuItemId: string, variantId?: string) => number;
  getSubtotal: () => number;
  getTotal: () => number;
  getItemCount: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],
      provider: null,
      _hasHydrated: false,
      pendingItem: null,
      pendingOnlineOrder: null,
      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },

      addItem: (menuItem, provider, variant) => {
        const currentProvider = get().provider;
        const itemKey = getCartItemKey(menuItem.id, variant?.id);

        // If adding from a different provider and cart is not empty, request confirmation
        if (currentProvider && currentProvider.id !== provider.id && get().cart.length > 0) {
          // Store pending item and return result indicating confirmation is needed
          set({ pendingItem: { menuItem, provider, variant } });
          return {
            success: false,
            requiresConfirmation: true,
            currentProviderName: currentProvider.name_ar || currentProvider.name_en,
            newProviderName: provider.name_ar || provider.name_en,
          };
        }

        // Add item normally
        set((state) => {
          const existingItem = state.cart.find(
            (item) => getCartItemKey(item.menuItem.id, item.selectedVariant?.id) === itemKey
          );

          if (existingItem) {
            return {
              cart: state.cart.map((item) =>
                getCartItemKey(item.menuItem.id, item.selectedVariant?.id) === itemKey
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
              provider,
              pendingItem: null,
            };
          }

          return {
            cart: [...state.cart, { menuItem, quantity: 1, selectedVariant: variant }],
            provider,
            pendingItem: null,
          };
        });

        return { success: true, requiresConfirmation: false };
      },

      confirmProviderSwitch: () => {
        const pending = get().pendingItem;
        if (!pending) return;

        // Clear cart and add the pending item
        set({
          cart: [{ menuItem: pending.menuItem, quantity: 1, selectedVariant: pending.variant }],
          provider: pending.provider,
          pendingItem: null,
        });
      },

      cancelProviderSwitch: () => {
        set({ pendingItem: null });
      },

      removeItem: (menuItemId, variantId) => {
        const itemKey = getCartItemKey(menuItemId, variantId);
        set((state) => {
          const existingItem = state.cart.find(
            (item) => getCartItemKey(item.menuItem.id, item.selectedVariant?.id) === itemKey
          );

          if (existingItem && existingItem.quantity > 1) {
            return {
              cart: state.cart.map((item) =>
                getCartItemKey(item.menuItem.id, item.selectedVariant?.id) === itemKey
                  ? { ...item, quantity: item.quantity - 1 }
                  : item
              ),
            };
          }

          const newCart = state.cart.filter(
            (item) => getCartItemKey(item.menuItem.id, item.selectedVariant?.id) !== itemKey
          );

          return {
            cart: newCart,
            provider: newCart.length === 0 ? null : state.provider,
          };
        });
      },

      // Removes entire item from cart regardless of quantity (used by AI assistant)
      removeItemCompletely: (menuItemId, variantId) => {
        const itemKey = getCartItemKey(menuItemId, variantId);
        set((state) => {
          const newCart = state.cart.filter(
            (item) => getCartItemKey(item.menuItem.id, item.selectedVariant?.id) !== itemKey
          );

          return {
            cart: newCart,
            provider: newCart.length === 0 ? null : state.provider,
          };
        });
      },

      updateQuantity: (menuItemId, quantity, variantId) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId, variantId);
          return;
        }

        const itemKey = getCartItemKey(menuItemId, variantId);
        set((state) => ({
          cart: state.cart.map((item) =>
            getCartItemKey(item.menuItem.id, item.selectedVariant?.id) === itemKey
              ? { ...item, quantity }
              : item
          ),
        }));
      },

      clearCart: () => {
        set({ cart: [], provider: null, pendingOnlineOrder: null });
      },

      // Safe clear - only clears if no pending online order
      // Returns true if cart was cleared, false if blocked
      safeClearCart: () => {
        const pending = get().pendingOnlineOrder;
        if (pending) {
          // Check if pending order is older than 1 hour (expired)
          const createdAt = new Date(pending.createdAt);
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          if (createdAt > oneHourAgo) {
            // Pending order is still active, don't clear
            return false;
          }
          // Pending order expired, clear it
        }
        set({ cart: [], provider: null, pendingOnlineOrder: null });
        return true;
      },

      // Set pending online order (called when initiating online payment)
      setPendingOnlineOrder: (orderId: string) => {
        set({
          pendingOnlineOrder: {
            orderId,
            createdAt: new Date().toISOString(),
          },
        });
      },

      // Clear pending online order (called after payment success or failure)
      clearPendingOnlineOrder: () => {
        set({ pendingOnlineOrder: null });
      },

      // Check if there's a pending online order
      hasPendingOnlineOrder: () => {
        const pending = get().pendingOnlineOrder;
        if (!pending) return false;
        // Check if not expired (1 hour)
        const createdAt = new Date(pending.createdAt);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return createdAt > oneHourAgo;
      },

      getItemQuantity: (menuItemId, variantId) => {
        const itemKey = getCartItemKey(menuItemId, variantId);
        const item = get().cart.find(
          (item) => getCartItemKey(item.menuItem.id, item.selectedVariant?.id) === itemKey
        );
        return item ? item.quantity : 0;
      },

      getSubtotal: () => {
        return get().cart.reduce((sum, item) => {
          // Use variant price if available, otherwise use base product price
          const price = item.selectedVariant?.price ?? item.menuItem.price;
          return sum + price * item.quantity;
        }, 0);
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        const deliveryFee = get().provider?.delivery_fee || 0;
        return subtotal + deliveryFee;
      },

      getItemCount: () => {
        return get().cart.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'engezna-cart',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

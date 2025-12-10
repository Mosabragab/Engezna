import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { PricingType, VariantType } from '@/types/menu-import'

export type ProductVariant = {
  id: string
  variant_type: VariantType
  name_ar: string
  name_en: string | null
  price: number
  original_price: number | null
  is_default: boolean
  display_order: number
  is_available: boolean
}

export type MenuItem = {
  id: string
  provider_id: string
  name_ar: string
  name_en: string
  description_ar: string | null
  description_en: string | null
  price: number
  original_price?: number | null
  image_url: string | null
  is_available: boolean
  is_vegetarian: boolean
  is_spicy: boolean
  preparation_time_min: number
  // Variant support
  has_variants?: boolean
  pricing_type?: PricingType
  variants?: ProductVariant[]
}

export type Provider = {
  id: string
  name_ar: string
  name_en: string
  delivery_fee: number
  min_order_amount: number
  estimated_delivery_time_min: number
  commission_rate?: number
  category?: string
}

export type CartItem = {
  menuItem: MenuItem
  quantity: number
  // Selected variant (for products with variants)
  selectedVariant?: ProductVariant
}

// Helper to create unique cart item key (product + variant combination)
const getCartItemKey = (menuItemId: string, variantId?: string) => {
  return variantId ? `${menuItemId}-${variantId}` : menuItemId
}

type CartState = {
  cart: CartItem[]
  provider: Provider | null
  _hasHydrated: boolean
  setHasHydrated: (state: boolean) => void
  addItem: (menuItem: MenuItem, provider: Provider, variant?: ProductVariant) => void
  removeItem: (menuItemId: string, variantId?: string) => void
  updateQuantity: (menuItemId: string, quantity: number, variantId?: string) => void
  clearCart: () => void
  getItemQuantity: (menuItemId: string, variantId?: string) => number
  getSubtotal: () => number
  getTotal: () => number
  getItemCount: () => number
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],
      provider: null,
      _hasHydrated: false,
      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state })
      },

      addItem: (menuItem, provider, variant) => {
        const currentProvider = get().provider
        const itemKey = getCartItemKey(menuItem.id, variant?.id)

        // If adding from a different provider, clear cart
        if (currentProvider && currentProvider.id !== provider.id) {
          set({
            cart: [{ menuItem, quantity: 1, selectedVariant: variant }],
            provider,
          })
          return
        }

        set((state) => {
          const existingItem = state.cart.find(
            (item) => getCartItemKey(item.menuItem.id, item.selectedVariant?.id) === itemKey
          )

          if (existingItem) {
            return {
              cart: state.cart.map((item) =>
                getCartItemKey(item.menuItem.id, item.selectedVariant?.id) === itemKey
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
              provider,
            }
          }

          return {
            cart: [...state.cart, { menuItem, quantity: 1, selectedVariant: variant }],
            provider,
          }
        })
      },

      removeItem: (menuItemId, variantId) => {
        const itemKey = getCartItemKey(menuItemId, variantId)
        set((state) => {
          const existingItem = state.cart.find(
            (item) => getCartItemKey(item.menuItem.id, item.selectedVariant?.id) === itemKey
          )

          if (existingItem && existingItem.quantity > 1) {
            return {
              cart: state.cart.map((item) =>
                getCartItemKey(item.menuItem.id, item.selectedVariant?.id) === itemKey
                  ? { ...item, quantity: item.quantity - 1 }
                  : item
              ),
            }
          }

          const newCart = state.cart.filter(
            (item) => getCartItemKey(item.menuItem.id, item.selectedVariant?.id) !== itemKey
          )

          return {
            cart: newCart,
            provider: newCart.length === 0 ? null : state.provider,
          }
        })
      },

      updateQuantity: (menuItemId, quantity, variantId) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId, variantId)
          return
        }

        const itemKey = getCartItemKey(menuItemId, variantId)
        set((state) => ({
          cart: state.cart.map((item) =>
            getCartItemKey(item.menuItem.id, item.selectedVariant?.id) === itemKey
              ? { ...item, quantity }
              : item
          ),
        }))
      },

      clearCart: () => {
        set({ cart: [], provider: null })
      },

      getItemQuantity: (menuItemId, variantId) => {
        const itemKey = getCartItemKey(menuItemId, variantId)
        const item = get().cart.find(
          (item) => getCartItemKey(item.menuItem.id, item.selectedVariant?.id) === itemKey
        )
        return item ? item.quantity : 0
      },

      getSubtotal: () => {
        return get().cart.reduce((sum, item) => {
          // Use variant price if available, otherwise use base product price
          const price = item.selectedVariant?.price ?? item.menuItem.price
          return sum + price * item.quantity
        }, 0)
      },

      getTotal: () => {
        const subtotal = get().getSubtotal()
        const deliveryFee = get().provider?.delivery_fee || 0
        return subtotal + deliveryFee
      },

      getItemCount: () => {
        return get().cart.reduce((sum, item) => sum + item.quantity, 0)
      },
    }),
    {
      name: 'engezna-cart',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type MenuItem = {
  id: string
  provider_id: string
  name_ar: string
  name_en: string
  description_ar: string | null
  description_en: string | null
  price: number
  image_url: string | null
  is_available: boolean
  is_vegetarian: boolean
  is_spicy: boolean
  preparation_time_min: number
}

export type Provider = {
  id: string
  name_ar: string
  name_en: string
  delivery_fee: number
  min_order_amount: number
  estimated_delivery_time_min: number
}

export type CartItem = {
  menuItem: MenuItem
  quantity: number
}

type CartState = {
  cart: CartItem[]
  provider: Provider | null
  addItem: (menuItem: MenuItem, provider: Provider) => void
  removeItem: (menuItemId: string) => void
  updateQuantity: (menuItemId: string, quantity: number) => void
  clearCart: () => void
  getItemQuantity: (menuItemId: string) => number
  getSubtotal: () => number
  getTotal: () => number
  getItemCount: () => number
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],
      provider: null,

      addItem: (menuItem, provider) => {
        const currentProvider = get().provider

        // If adding from a different provider, clear cart
        if (currentProvider && currentProvider.id !== provider.id) {
          set({
            cart: [{ menuItem, quantity: 1 }],
            provider,
          })
          return
        }

        set((state) => {
          const existingItem = state.cart.find(
            (item) => item.menuItem.id === menuItem.id
          )

          if (existingItem) {
            return {
              cart: state.cart.map((item) =>
                item.menuItem.id === menuItem.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
              provider,
            }
          }

          return {
            cart: [...state.cart, { menuItem, quantity: 1 }],
            provider,
          }
        })
      },

      removeItem: (menuItemId) => {
        set((state) => {
          const existingItem = state.cart.find(
            (item) => item.menuItem.id === menuItemId
          )

          if (existingItem && existingItem.quantity > 1) {
            return {
              cart: state.cart.map((item) =>
                item.menuItem.id === menuItemId
                  ? { ...item, quantity: item.quantity - 1 }
                  : item
              ),
            }
          }

          const newCart = state.cart.filter(
            (item) => item.menuItem.id !== menuItemId
          )

          return {
            cart: newCart,
            provider: newCart.length === 0 ? null : state.provider,
          }
        })
      },

      updateQuantity: (menuItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId)
          return
        }

        set((state) => ({
          cart: state.cart.map((item) =>
            item.menuItem.id === menuItemId ? { ...item, quantity } : item
          ),
        }))
      },

      clearCart: () => {
        set({ cart: [], provider: null })
      },

      getItemQuantity: (menuItemId) => {
        const item = get().cart.find((item) => item.menuItem.id === menuItemId)
        return item ? item.quantity : 0
      },

      getSubtotal: () => {
        return get().cart.reduce(
          (sum, item) => sum + item.menuItem.price * item.quantity,
          0
        )
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
    }
  )
)

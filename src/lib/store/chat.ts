/**
 * Chat Store - Persists AI chat conversation across navigation
 */

import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import type { ChatMessage } from '@/types/chat'

interface QuickReply {
  title: string
  payload: string
}

// Extended message type with quickReplies
export interface StoredChatMessage extends ChatMessage {
  quickReplies?: QuickReply[]
}

// Memory structure for pending items
interface PendingItem {
  id: string
  name_ar: string
  price: number
  provider_id: string
  provider_name_ar?: string
  has_variants?: boolean
}

interface PendingVariant {
  id: string
  name_ar: string
  price: number
}

export interface ChatMemory {
  pending_item?: PendingItem
  pending_variant?: PendingVariant
  awaiting_quantity?: boolean
  [key: string]: unknown
}

interface ChatState {
  // Messages
  messages: StoredChatMessage[]

  // Conversation state
  selectedProviderId?: string
  selectedProviderCategory?: string // Category of the selected provider (from providers.category)
  selectedCategory?: string // User's chosen category from quick buttons (restaurant_cafe, grocery, etc.)
  memory: ChatMemory

  // Actions
  addMessage: (message: StoredChatMessage) => void
  setMessages: (messages: StoredChatMessage[]) => void
  updateLastMessage: (updates: Partial<StoredChatMessage>) => void
  clearMessages: () => void

  // State management
  setSelectedProviderId: (id: string | undefined) => void
  setSelectedProviderCategory: (category: string | undefined) => void
  setSelectedCategory: (category: string | undefined) => void
  setMemory: (memory: ChatMemory) => void
  resetConversationState: () => void
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Create welcome message
function createWelcomeMessage(customerName?: string): StoredChatMessage {
  const greeting = customerName
    ? `أهلاً ${customerName}! 👋`
    : 'أهلاً بيك! 👋'

  return {
    id: 'welcome',
    role: 'assistant',
    content: `${greeting}\nأنا مساعد إنجزنا الذكي، معاك عشان أساعدك تطلب أكلك المفضل بأسرع وقت.\n\nعايز تطلب منين النهارده؟ 🏪`,
    timestamp: new Date(),
    suggestions: [
      '🍕 مطاعم وكافيهات',
      '🛒 سوبر ماركت',
      '☕ البن والحلويات',
      '🥬 خضروات وفواكه',
    ],
  }
}

// Custom storage that handles SSR (no sessionStorage on server)
const createNoopStorage = (): StateStorage => ({
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
})

const getStorage = () => {
  if (typeof window === 'undefined') {
    return createNoopStorage()
  }
  return sessionStorage
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      selectedProviderId: undefined,
      selectedProviderCategory: undefined,
      selectedCategory: undefined,
      memory: {},

      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, {
            ...message,
            // Ensure timestamp is serializable
            timestamp: message.timestamp instanceof Date
              ? message.timestamp
              : new Date(message.timestamp),
          }],
        })),

      setMessages: (messages) =>
        set({
          messages: messages.map(m => ({
            ...m,
            timestamp: m.timestamp instanceof Date
              ? m.timestamp
              : new Date(m.timestamp),
          })),
        }),

      updateLastMessage: (updates) =>
        set((state) => {
          const messages = [...state.messages]
          if (messages.length > 0) {
            messages[messages.length - 1] = {
              ...messages[messages.length - 1],
              ...updates,
            }
          }
          return { messages }
        }),

      clearMessages: () =>
        set({
          messages: [],
          selectedProviderId: undefined,
          selectedProviderCategory: undefined,
          selectedCategory: undefined,
          memory: {},
        }),

      setSelectedProviderId: (id) =>
        set({ selectedProviderId: id }),

      setSelectedProviderCategory: (category) =>
        set({ selectedProviderCategory: category }),

      setSelectedCategory: (category) =>
        set({ selectedCategory: category }),

      setMemory: (memory) =>
        set({ memory }),

      resetConversationState: () =>
        set({
          selectedProviderId: undefined,
          selectedProviderCategory: undefined,
          selectedCategory: undefined,
          memory: {},
        }),
    }),
    {
      name: 'engezna-chat-storage',
      storage: createJSONStorage(getStorage), // SSR-safe storage
      partialize: (state) => ({
        messages: state.messages,
        selectedProviderId: state.selectedProviderId,
        selectedProviderCategory: state.selectedProviderCategory,
        selectedCategory: state.selectedCategory,
        memory: state.memory,
      }),
      // Skip hydration warnings
      skipHydration: true,
    }
  )
)

// Helper to initialize chat with welcome message if empty
export function initializeChatIfEmpty(customerName?: string) {
  const { messages, setMessages } = useChatStore.getState()
  if (messages.length === 0) {
    setMessages([createWelcomeMessage(customerName)])
  }
}

// Helper to get fresh welcome message
export { createWelcomeMessage, generateId }

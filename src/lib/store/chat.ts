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

// Current provider context - persists after cart addition
interface CurrentProvider {
  id: string
  name_ar: string
}

export interface ChatMemory {
  pending_item?: PendingItem
  pending_variant?: PendingVariant
  pending_quantity?: number
  awaiting_quantity?: boolean
  awaiting_confirmation?: boolean
  current_provider?: CurrentProvider // Persists after cart addition for follow-up orders
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

// Provider context for customized welcome messages
interface ProviderContext {
  id: string
  name: string
}

// Get time-based greeting (synced with agent personality)
function getTimeBasedGreeting(): string {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 12) {
    return 'صباح الفل! ☀️'
  } else if (hour >= 12 && hour < 17) {
    return 'أهلاً! 🌤️'
  } else if (hour >= 17 && hour < 21) {
    return 'مساء الخير! 🌆'
  } else {
    return 'أهلاً بيك! 🌙'
  }
}

// Get time-based suggestion
function getTimeSuggestion(): string {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 12) {
    return 'فطار ولا قهوة الصبح؟'
  } else if (hour >= 12 && hour < 17) {
    return 'وقت الغدا! جعان؟'
  } else if (hour >= 17 && hour < 21) {
    return 'عشا ولا حاجة خفيفة؟'
  } else {
    return 'سهران؟ عايز تسالي ولا حاجة تاكلها؟'
  }
}

// Create welcome message - customized based on context (Ahmad personality)
function createWelcomeMessage(customerName?: string, providerContext?: ProviderContext): StoredChatMessage {
  const timeGreeting = getTimeBasedGreeting()
  const timeSuggestion = getTimeSuggestion()

  // When on a provider page, show provider-specific welcome
  if (providerContext) {
    const nameGreeting = customerName ? ` يا ${customerName}` : ''

    return {
      id: 'welcome',
      role: 'assistant',
      content: `${timeGreeting} أهلاً بيك${nameGreeting} في ${providerContext.name}! 😊\n\nأنا أحمد من إنجزنا، معاك أساعدك تطلب.\nقولي عايز ايه وأنا أجيبهولك! 🍕`,
      timestamp: new Date(),
      suggestions: [
        '📋 ورّيني المنيو',
        '🔥 العروض',
        '⭐ الأكتر طلباً',
      ],
      // Quick replies for provider page context
      quickReplies: [
        { title: '📋 ورّيني المنيو', payload: 'ورّيني المنيو' },
        { title: '🔥 العروض', payload: 'فيه عروض ايه؟' },
        { title: '⭐ الأكتر طلباً', payload: 'ايه أكتر حاجة الناس بتطلبها؟' },
      ],
    }
  }

  // Default welcome message (no provider context) - Ahmad personality + PROVIDER FIRST strategy
  const nameGreeting = customerName ? ` يا ${customerName}` : ''
  const orderQuestion = customerName
    ? `عايز تطلب منين انهارده يا ${customerName}؟`
    : 'عايز تطلب منين انهارده؟'

  return {
    id: 'welcome',
    role: 'assistant',
    content: `${timeGreeting} أهلاً بيك${nameGreeting} في إنجزنا! 😊\n\nأنا أحمد، ${orderQuestion}`,
    timestamp: new Date(),
    suggestions: [
      '🏪 عندي مكان معين',
      '🔍 ساعدني أختار',
      '🔥 اللي عندهم عروض',
    ],
    // Quick replies - PROVIDER FIRST (guide user to select where to order)
    quickReplies: [
      { title: '🏪 عندي مكان معين', payload: 'عايز أطلب من مكان معين' },
      { title: '🔍 ساعدني أختار', payload: 'ساعدني أختار مكان' },
      { title: '🔥 اللي عندهم عروض', payload: 'ورّيني الأماكن اللي عندها عروض' },
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
  // Use localStorage to persist chat across browser sessions (like cart)
  return localStorage
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

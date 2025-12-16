/**
 * Customer Memory System for AI Agent
 *
 * This module handles storing and retrieving customer preferences,
 * order history, and personalization data to make conversations more natural.
 */

import { createClient } from '@/lib/supabase/server'
import type { CustomerMemory } from './agentPrompt'

// =============================================================================
// TYPES
// =============================================================================

export interface CustomerOrderHistory {
  providerId: string
  providerName: string
  items: string[]
  date: string
  total: number
}

export interface CustomerPreferences {
  spicy?: boolean
  vegetarian?: boolean
  favoriteCategories?: string[]
  notes?: string[]
}

// =============================================================================
// MEMORY RETRIEVAL
// =============================================================================

/**
 * Fetch customer memory from database
 * Includes: last orders, favorite items, preferences
 */
export async function getCustomerMemory(customerId: string): Promise<CustomerMemory | null> {
  if (!customerId) return null

  try {
    const supabase = await createClient()

    // Fetch last 5 orders with items
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        created_at,
        total,
        provider_id,
        providers(name_ar),
        order_items(
          quantity,
          menu_items(name_ar)
        )
      `)
      .eq('customer_id', customerId)
      .in('status', ['delivered', 'completed'])
      .order('created_at', { ascending: false })
      .limit(5)

    if (ordersError) {
      console.error('[CustomerMemory] Error fetching orders:', ordersError)
      return null
    }

    // Process orders into memory format
    const lastOrders: CustomerMemory['lastOrders'] = orders?.map(order => ({
      providerId: order.provider_id,
      providerName: (order.providers as { name_ar?: string })?.name_ar || 'مطعم',
      items: (order.order_items as Array<{ quantity: number; menu_items: { name_ar?: string } | null }>)
        ?.map(item => item.menu_items?.name_ar || '')
        .filter(Boolean) || [],
      date: order.created_at
    })) || []

    // Extract favorite items (items ordered more than once)
    const itemCounts = new Map<string, number>()
    orders?.forEach(order => {
      (order.order_items as Array<{ menu_items: { name_ar?: string } | null }>)?.forEach(item => {
        const name = item.menu_items?.name_ar
        if (name) {
          itemCounts.set(name, (itemCounts.get(name) || 0) + 1)
        }
      })
    })

    const favoriteItems = Array.from(itemCounts.entries())
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name)

    // Get order count
    const { count: orderCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .in('status', ['delivered', 'completed'])

    // Get last visit
    const { data: lastActivity } = await supabase
      .from('orders')
      .select('created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return {
      lastOrders,
      favoriteItems,
      preferences: {
        // Could be expanded with customer preferences table
      },
      orderCount: orderCount || 0,
      lastVisit: lastActivity?.created_at
    }

  } catch (error) {
    console.error('[CustomerMemory] Error:', error)
    return null
  }
}

/**
 * Get personalized greeting based on customer memory
 */
export function getPersonalizedGreeting(memory: CustomerMemory | null, customerName?: string): string {
  if (!memory) {
    return customerName
      ? `أهلاً ${customerName}! 😊`
      : 'أهلاً بيك! 😊'
  }

  const { orderCount, lastOrders, favoriteItems } = memory
  const name = customerName || 'يا فندم'

  // First time customer
  if (!orderCount || orderCount === 0) {
    return `أهلاً ${name}! يا مرحب بيك في إنجزنا 🎉`
  }

  // Returning customer
  if (orderCount === 1) {
    return `أهلاً ${name}! نورتنا تاني 😊`
  }

  // Regular customer with favorites
  if (orderCount >= 3 && favoriteItems && favoriteItems.length > 0) {
    return `أهلاً ${name} يا باشا! 😊 عايز ${favoriteItems[0]} زي العادة؟`
  }

  // Regular customer
  if (orderCount >= 3) {
    return `أهلاً ${name}! نورت يا عميلنا الغالي 😊`
  }

  // Recent order - suggest reorder
  if (lastOrders && lastOrders.length > 0) {
    const lastProvider = lastOrders[0].providerName
    return `أهلاً ${name}! عايز تطلب من ${lastProvider} تاني؟ 😊`
  }

  return `أهلاً ${name}! 😊`
}

/**
 * Get smart suggestions based on customer memory
 */
export function getSmartSuggestions(memory: CustomerMemory | null): string[] {
  if (!memory) {
    return ['🏪 عندي مكان معين', '🔍 ساعدني أختار', '🔥 اللي عندهم عروض']
  }

  const suggestions: string[] = []

  // Suggest reorder from last provider
  if (memory.lastOrders && memory.lastOrders.length > 0) {
    suggestions.push(`🔄 اطلب من ${memory.lastOrders[0].providerName} تاني`)
  }

  // Suggest favorite items
  if (memory.favoriteItems && memory.favoriteItems.length > 0) {
    suggestions.push(`⭐ ${memory.favoriteItems[0]}`)
  }

  // Default suggestions
  suggestions.push('🔥 العروض')

  return suggestions.slice(0, 3)
}

/**
 * Format order history for AI context
 */
export function formatOrderHistoryForContext(memory: CustomerMemory | null): string {
  if (!memory || !memory.lastOrders || memory.lastOrders.length === 0) {
    return ''
  }

  const orders = memory.lastOrders.slice(0, 3)
  const formatted = orders.map((order, i) => {
    const items = order.items.slice(0, 3).join('، ')
    const more = order.items.length > 3 ? ` و${order.items.length - 3} تاني` : ''
    return `${i + 1}. ${order.providerName}: ${items}${more}`
  }).join('\n')

  return `\n📝 آخر طلباته:\n${formatted}`
}

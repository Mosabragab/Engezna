/**
 * Context Builder for AI Smart Assistant
 * Builds customer context from database for personalized responses
 */

import { createClient } from '@/lib/supabase/server'
import type { CustomerContext, RecentOrder, FavoriteProduct, FavoriteProvider } from '@/types/chat'

/**
 * Get current time of day in Arabic
 */
function getCurrentTimeOfDay(): 'صباح' | 'ظهر' | 'مساء' | 'ليل' {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'صباح'
  if (hour >= 12 && hour < 17) return 'ظهر'
  if (hour >= 17 && hour < 22) return 'مساء'
  return 'ليل'
}

/**
 * Get current day in Arabic
 */
function getCurrentDayArabic(): string {
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  return days[new Date().getDay()]
}

/**
 * Check if today is weekend (Friday/Saturday in Egypt)
 */
function isWeekend(): boolean {
  const day = new Date().getDay()
  return day === 5 || day === 6 // Friday or Saturday
}

/**
 * Analyze order history to extract preferences
 */
function analyzePreferences(orders: RecentOrder[]): CustomerContext['preferences'] {
  const cuisineCount: Record<string, number> = {}
  const prices: number[] = []
  const orderTimes: number[] = []

  orders.forEach(order => {
    // Collect prices
    prices.push(order.total)

    // Collect order times
    const hour = new Date(order.created_at).getHours()
    orderTimes.push(hour)
  })

  // Calculate price range
  const avgPrice = prices.length > 0
    ? prices.reduce((a, b) => a + b, 0) / prices.length
    : 0
  const priceRange: 'budget' | 'mid' | 'premium' =
    avgPrice < 50 ? 'budget' : avgPrice < 150 ? 'mid' : 'premium'

  // Calculate usual order time
  const avgHour = orderTimes.length > 0
    ? Math.round(orderTimes.reduce((a, b) => a + b, 0) / orderTimes.length)
    : 12
  const usualOrderTime =
    avgHour < 12 ? 'صباحاً' : avgHour < 17 ? 'ظهراً' : 'مساءً'

  // Get top cuisine types
  const cuisineTypes = Object.entries(cuisineCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type)

  return {
    cuisineTypes,
    priceRange,
    usualOrderTime,
    dietaryRestrictions: [], // TODO: Add dietary restrictions tracking
  }
}

/**
 * Build customer context for AI
 */
export async function buildCustomerContext(
  userId?: string,
  cityId?: string,
  governorateId?: string
): Promise<CustomerContext> {
  const supabase = await createClient()

  // Default context for guests
  const defaultContext: CustomerContext = {
    customer: null,
    orderHistory: {
      recentOrders: [],
      favoriteProducts: [],
      favoriteProviders: [],
      totalOrders: 0,
      averageOrderValue: 0,
    },
    preferences: {
      cuisineTypes: [],
      priceRange: 'mid',
      usualOrderTime: 'مساءً',
      dietaryRestrictions: [],
    },
    currentContext: {
      time: getCurrentTimeOfDay(),
      dayOfWeek: getCurrentDayArabic(),
      isWeekend: isWeekend(),
    },
  }

  if (!userId) {
    return defaultContext
  }

  try {
    // Fetch customer profile
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        city_id,
        governorate_id,
        cities (name_ar),
        governorates (name_ar)
      `)
      .eq('id', userId)
      .single()

    // Fetch recent orders with items
    const { data: orders } = await supabase
      .from('orders')
      .select(`
        id,
        provider_id,
        total,
        created_at,
        providers (name_ar),
        order_items (
          quantity,
          menu_items (id, name_ar)
        )
      `)
      .eq('customer_id', userId)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false })
      .limit(20)

    // Helper to get provider name (handles both array and object from Supabase)
    const getProviderName = (providers: unknown): string => {
      if (Array.isArray(providers)) {
        return (providers[0] as { name_ar: string })?.name_ar || 'غير معروف'
      }
      return (providers as { name_ar: string } | null)?.name_ar || 'غير معروف'
    }

    // Helper to get menu item data (handles both array and object from Supabase)
    const getMenuItemData = (menuItems: unknown): { id: string; name_ar: string } | null => {
      if (Array.isArray(menuItems)) {
        return menuItems[0] as { id: string; name_ar: string }
      }
      return menuItems as { id: string; name_ar: string } | null
    }

    // Process orders
    const recentOrders: RecentOrder[] = (orders || []).slice(0, 5).map(order => ({
      id: order.id,
      provider_id: order.provider_id,
      provider_name_ar: getProviderName(order.providers),
      total: order.total,
      items_count: (order.order_items as unknown[])?.length || 0,
      created_at: order.created_at,
    }))

    // Calculate favorite providers
    const providerCount: Record<string, { name: string; count: number }> = {}
    orders?.forEach(order => {
      const providerId = order.provider_id
      const providerName = getProviderName(order.providers)
      if (!providerCount[providerId]) {
        providerCount[providerId] = { name: providerName, count: 0 }
      }
      providerCount[providerId].count++
    })

    const favoriteProviders: FavoriteProvider[] = Object.entries(providerCount)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([id, data]) => ({
        id,
        name_ar: data.name,
        category: null,
        times_ordered: data.count,
      }))

    // Calculate favorite products
    const productCount: Record<string, { name: string; providerId: string; providerName: string; count: number }> = {}
    orders?.forEach(order => {
      const orderItems = order.order_items as Array<{
        quantity: number
        menu_items: unknown
      }>
      orderItems?.forEach(item => {
        const menuItem = getMenuItemData(item.menu_items)
        const productId = menuItem?.id
        if (productId) {
          if (!productCount[productId]) {
            productCount[productId] = {
              name: menuItem.name_ar,
              providerId: order.provider_id,
              providerName: getProviderName(order.providers),
              count: 0,
            }
          }
          productCount[productId].count += item.quantity
        }
      })
    })

    const favoriteProducts: FavoriteProduct[] = Object.entries(productCount)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([id, data]) => ({
        id,
        name_ar: data.name,
        provider_id: data.providerId,
        provider_name_ar: data.providerName,
        times_ordered: data.count,
      }))

    // Calculate statistics
    const totalOrders = orders?.length || 0
    const averageOrderValue = totalOrders > 0
      ? Math.round(orders!.reduce((sum, o) => sum + o.total, 0) / totalOrders)
      : 0

    // Analyze preferences
    const preferences = analyzePreferences(recentOrders)

    // Get city/governorate names (handle both array and object from Supabase)
    const getName = (data: unknown): string | null => {
      if (!data) return null
      if (Array.isArray(data)) {
        return (data[0] as { name_ar: string })?.name_ar || null
      }
      return (data as { name_ar: string })?.name_ar || null
    }
    const cityName = getName(profile?.cities)
    const governorateName = getName(profile?.governorates)

    return {
      customer: profile ? {
        id: profile.id,
        name: profile.full_name?.split(' ')[0] || 'عميل',
        city_id: profile.city_id || cityId || null,
        city_name: cityName,
        governorate_id: profile.governorate_id || governorateId || null,
        governorate_name: governorateName,
      } : null,
      orderHistory: {
        recentOrders,
        favoriteProducts,
        favoriteProviders,
        totalOrders,
        averageOrderValue,
      },
      preferences,
      currentContext: {
        time: getCurrentTimeOfDay(),
        dayOfWeek: getCurrentDayArabic(),
        isWeekend: isWeekend(),
      },
    }
  } catch (error) {
    console.error('Error building customer context:', error)
    return defaultContext
  }
}

/**
 * Get last order for reorder functionality
 */
export async function getLastOrder(userId: string) {
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .select(`
      id,
      provider_id,
      total,
      created_at,
      providers (id, name_ar, name_en, delivery_fee),
      order_items (
        quantity,
        unit_price,
        menu_items (id, name_ar, name_en, price, image_url)
      )
    `)
    .eq('customer_id', userId)
    .eq('status', 'delivered')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return order
}

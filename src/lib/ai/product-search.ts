/**
 * Smart Product Search for AI Assistant
 * Searches products and providers based on user intent
 */

import { createClient } from '@/lib/supabase/server'
import type { ChatProduct, ChatProvider, ParsedIntent } from '@/types/chat'

// Helper to get provider data (handles both array and object from Supabase)
type ProviderData = { id: string; name_ar: string; name_en: string | null; rating: number; city_id?: string; status?: string }
const getProviderData = (providers: unknown): ProviderData | null => {
  if (Array.isArray(providers)) return providers[0] as ProviderData
  return providers as ProviderData | null
}

/**
 * Search products based on parsed intent
 */
export async function searchProducts(
  intent: ParsedIntent,
  cityId?: string,
  limit: number = 10
): Promise<ChatProduct[]> {
  const supabase = await createClient()

  let query = supabase
    .from('menu_items')
    .select(`
      id,
      name_ar,
      name_en,
      description_ar,
      price,
      original_price,
      image_url,
      is_available,
      has_variants,
      provider_id,
      providers!inner (
        id,
        name_ar,
        name_en,
        rating,
        city_id,
        status
      )
    `)
    .eq('is_available', true)
    .in('providers.status', ['open', 'closed', 'temporarily_paused'])

  // Filter by city if provided
  if (cityId) {
    query = query.eq('providers.city_id', cityId)
  }

  // Search by product name
  if (intent.entities.products && intent.entities.products.length > 0) {
    const searchTerms = intent.entities.products
    const orConditions = searchTerms
      .map(term => `name_ar.ilike.%${term}%,name_en.ilike.%${term}%,description_ar.ilike.%${term}%`)
      .join(',')
    query = query.or(orConditions)
  }

  // Search by category
  if (intent.entities.categories && intent.entities.categories.length > 0) {
    const categoryTerms = intent.entities.categories
    const orConditions = categoryTerms
      .map(cat => `name_ar.ilike.%${cat}%`)
      .join(',')
    query = query.or(orConditions)
  }

  // Filter by price range
  if (intent.entities.priceRange) {
    if (intent.entities.priceRange.min !== undefined) {
      query = query.gte('price', intent.entities.priceRange.min)
    }
    if (intent.entities.priceRange.max !== undefined) {
      query = query.lte('price', intent.entities.priceRange.max)
    }
  }

  // Sort by preference
  if (intent.entities.sortBy === 'price') {
    query = query.order('price', { ascending: true })
  } else {
    // Default: sort by provider rating
    query = query.order('providers(rating)', { ascending: false })
  }

  query = query.limit(limit)

  const { data: products, error } = await query

  if (error) {
    console.error('Product search error:', error)
    return []
  }

  // Transform to ChatProduct format
  return (products || []).map(product => {
    const provider = getProviderData(product.providers)

    return {
      id: product.id,
      name_ar: product.name_ar,
      name_en: product.name_en,
      description_ar: product.description_ar,
      price: product.price,
      original_price: product.original_price,
      image_url: product.image_url,
      provider_id: product.provider_id,
      provider_name_ar: provider?.name_ar || 'غير معروف',
      provider_name_en: provider?.name_en || null,
      rating: provider?.rating,
      has_variants: product.has_variants,
    }
  })
}

/**
 * Search providers based on parsed intent
 */
export async function searchProviders(
  intent: ParsedIntent,
  cityId?: string,
  limit: number = 5
): Promise<ChatProvider[]> {
  const supabase = await createClient()

  let query = supabase
    .from('providers')
    .select(`
      id,
      name_ar,
      name_en,
      logo_url,
      category,
      rating,
      delivery_time_min,
      delivery_fee,
      min_order_amount,
      status
    `)
    .in('status', ['open', 'closed', 'temporarily_paused', 'on_vacation'])

  // Filter by city
  if (cityId) {
    query = query.eq('city_id', cityId)
  }

  // Search by provider name
  if (intent.entities.providers && intent.entities.providers.length > 0) {
    const searchTerms = intent.entities.providers
    const orConditions = searchTerms
      .map(term => `name_ar.ilike.%${term}%,name_en.ilike.%${term}%`)
      .join(',')
    query = query.or(orConditions)
  }

  // Sort
  if (intent.entities.sortBy === 'rating') {
    query = query.order('rating', { ascending: false })
  } else if (intent.entities.sortBy === 'delivery_time') {
    query = query.order('delivery_time_min', { ascending: true })
  } else if (intent.entities.sortBy === 'price') {
    query = query.order('delivery_fee', { ascending: true })
  } else {
    query = query.order('rating', { ascending: false })
  }

  query = query.limit(limit)

  const { data: providers, error } = await query

  if (error) {
    console.error('Provider search error:', error)
    return []
  }

  // Get review counts
  const providerIds = providers?.map(p => p.id) || []
  const { data: reviewCounts } = await supabase
    .from('reviews')
    .select('provider_id')
    .in('provider_id', providerIds)

  const reviewCountMap: Record<string, number> = {}
  reviewCounts?.forEach(r => {
    reviewCountMap[r.provider_id] = (reviewCountMap[r.provider_id] || 0) + 1
  })

  return (providers || []).map(provider => ({
    id: provider.id,
    name_ar: provider.name_ar,
    name_en: provider.name_en,
    logo_url: provider.logo_url,
    category: provider.category,
    rating: provider.rating || 0,
    reviews_count: reviewCountMap[provider.id] || 0,
    delivery_time_min: provider.delivery_time_min || 30,
    delivery_fee: provider.delivery_fee || 0,
    min_order_amount: provider.min_order_amount || 0,
    is_open: provider.status === 'open',
  }))
}

/**
 * Get popular products in city
 */
export async function getPopularProducts(
  cityId?: string,
  limit: number = 6
): Promise<ChatProduct[]> {
  const supabase = await createClient()

  // Get most ordered products from order_items
  const { data: popularItems } = await supabase
    .from('order_items')
    .select(`
      menu_item_id,
      menu_items!inner (
        id,
        name_ar,
        name_en,
        description_ar,
        price,
        original_price,
        image_url,
        is_available,
        provider_id,
        providers!inner (
          id,
          name_ar,
          name_en,
          rating,
          city_id,
          status
        )
      )
    `)
    .eq('menu_items.is_available', true)
    .in('menu_items.providers.status', ['open', 'closed', 'temporarily_paused'])
    .limit(100)

  if (!popularItems) return []

  // Helper to get menu item data (handles both array and object from Supabase)
  type MenuItemData = {
    id: string
    name_ar: string
    name_en: string | null
    description_ar: string | null
    price: number
    original_price: number | null
    image_url: string | null
    provider_id: string
    providers: unknown
  }
  const getMenuItemData = (menuItems: unknown): MenuItemData | null => {
    if (Array.isArray(menuItems)) return menuItems[0] as MenuItemData
    return menuItems as MenuItemData | null
  }

  // Count occurrences
  const countMap: Record<string, { count: number; product: ChatProduct }> = {}

  popularItems.forEach(item => {
    const menuItem = getMenuItemData(item.menu_items)
    if (!menuItem) return

    const provider = getProviderData(menuItem.providers)
    if (!provider) return

    // Filter by city if specified
    if (cityId && provider.city_id !== cityId) return

    if (!countMap[menuItem.id]) {
      countMap[menuItem.id] = {
        count: 0,
        product: {
          id: menuItem.id,
          name_ar: menuItem.name_ar,
          name_en: menuItem.name_en,
          description_ar: menuItem.description_ar,
          price: menuItem.price,
          original_price: menuItem.original_price,
          image_url: menuItem.image_url,
          provider_id: menuItem.provider_id,
          provider_name_ar: provider.name_ar,
          provider_name_en: provider.name_en,
          rating: provider.rating,
        },
      }
    }
    countMap[menuItem.id].count++
  })

  // Sort by count and return top products
  return Object.values(countMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(item => item.product)
}

/**
 * Get products with active promotions
 */
export async function getPromotionProducts(
  cityId?: string,
  limit: number = 6
): Promise<ChatProduct[]> {
  const supabase = await createClient()

  let query = supabase
    .from('menu_items')
    .select(`
      id,
      name_ar,
      name_en,
      description_ar,
      price,
      original_price,
      image_url,
      provider_id,
      providers!inner (
        id,
        name_ar,
        name_en,
        rating,
        city_id,
        status
      )
    `)
    .eq('is_available', true)
    .not('original_price', 'is', null)
    .gt('original_price', 0)
    .in('providers.status', ['open', 'closed', 'temporarily_paused'])

  if (cityId) {
    query = query.eq('providers.city_id', cityId)
  }

  query = query.limit(limit)

  const { data: products } = await query

  return (products || []).map(product => {
    const provider = getProviderData(product.providers)

    return {
      id: product.id,
      name_ar: product.name_ar,
      name_en: product.name_en,
      description_ar: product.description_ar,
      price: product.price,
      original_price: product.original_price,
      image_url: product.image_url,
      provider_id: product.provider_id,
      provider_name_ar: provider?.name_ar || 'غير معروف',
      provider_name_en: provider?.name_en || null,
      rating: provider?.rating,
    }
  })
}

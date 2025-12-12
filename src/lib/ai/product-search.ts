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
 * Uses a two-phase approach: first exact match, then fuzzy match
 */
export async function searchProducts(
  intent: ParsedIntent,
  cityId?: string,
  limit: number = 10,
  governorateId?: string
): Promise<ChatProduct[]> {
  const supabase = await createClient()

  // Get search terms from intent - combine products, categories, and attributes
  const searchTerms = [
    ...(intent.entities.products || []),
    ...(intent.entities.categories || []),
  ].filter(Boolean).map(term => term.trim())

  console.log('[AI Search] Intent:', JSON.stringify(intent))
  console.log('[AI Search] Search terms:', searchTerms, 'cityId:', cityId, 'governorateId:', governorateId)

  // First, get all providers in the location (try city_id first, then governorate_id)
  let providerIds: string[] = []

  // Try city_id first if provided
  if (cityId) {
    const { data: cityProviders } = await supabase
      .from('providers')
      .select('id')
      .eq('city_id', cityId)
      .in('status', ['open', 'closed', 'temporarily_paused'])

    providerIds = cityProviders?.map(p => p.id) || []
    console.log('[AI Search] Providers found by city_id:', providerIds.length)
  }

  // If no providers found by city, try governorate_id
  if (providerIds.length === 0 && governorateId) {
    const { data: govProviders } = await supabase
      .from('providers')
      .select('id')
      .eq('governorate_id', governorateId)
      .in('status', ['open', 'closed', 'temporarily_paused'])

    providerIds = govProviders?.map(p => p.id) || []
    console.log('[AI Search] Providers found by governorate_id:', providerIds.length)
  }

  // If still no providers, get ALL active providers (for development/testing)
  if (providerIds.length === 0) {
    const { data: allProviders } = await supabase
      .from('providers')
      .select('id')
      .in('status', ['open', 'closed', 'temporarily_paused'])
      .limit(50)

    providerIds = allProviders?.map(p => p.id) || []
    console.log('[AI Search] Using all active providers:', providerIds.length)
  }

  // If still no providers, return empty
  if (providerIds.length === 0) {
    console.log('[AI Search] No providers found at all!')
    return []
  }

  // Search products
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
      providers (
        id,
        name_ar,
        name_en,
        rating,
        city_id,
        governorate_id,
        status
      )
    `)
    .eq('is_available', true)
    .in('provider_id', providerIds)

  // Search by product name - use direct search for better Arabic support
  if (searchTerms.length > 0) {
    // For Arabic text, search directly by name_ar using ilike
    // This is more reliable than the .or() string method for Arabic
    const primarySearchTerm = searchTerms[0]
    console.log('[AI Search] Primary search term:', primarySearchTerm)

    query = query.ilike('name_ar', `%${primarySearchTerm}%`)
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

  // Sort
  if (intent.entities.sortBy === 'price') {
    query = query.order('price', { ascending: true })
  } else {
    query = query.order('price', { ascending: true })
  }

  query = query.limit(limit)

  const { data: products, error } = await query

  if (error) {
    console.error('[AI Search] Product search error:', error)
    return []
  }

  console.log('[AI Search] Found products:', products?.length || 0)
  if (products && products.length > 0) {
    console.log('[AI Search] Product names:', products.map(p => p.name_ar).join(', '))
  }

  // If no products found with search, try getting ANY available products as fallback
  if ((!products || products.length === 0) && providerIds.length > 0) {
    console.log('[AI Search] No products with search, trying fallback to any products...')

    const { data: fallbackProducts, error: fallbackError } = await supabase
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
        providers (
          id,
          name_ar,
          name_en,
          rating,
          city_id,
          governorate_id,
          status
        )
      `)
      .eq('is_available', true)
      .in('provider_id', providerIds)
      .limit(limit)

    if (fallbackError) {
      console.error('[AI Search] Fallback search error:', fallbackError)
    } else {
      console.log('[AI Search] Fallback found products:', fallbackProducts?.length || 0)
      if (fallbackProducts && fallbackProducts.length > 0) {
        return fallbackProducts.map(product => {
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
    }
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

  // Search by provider name - use direct ilike for Arabic support
  if (intent.entities.providers && intent.entities.providers.length > 0) {
    const primaryTerm = intent.entities.providers[0].trim()
    console.log('[AI Search] Searching provider:', primaryTerm)
    query = query.ilike('name_ar', `%${primaryTerm}%`)
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
 * ChatPromotion type for active promotions
 */
export type ChatPromotion = {
  id: string
  name_ar: string
  name_en: string | null
  type: 'percentage' | 'fixed' | 'buy_x_get_y'
  discount_value: number
  provider_name_ar: string
  provider_name_en: string | null
  min_order_amount?: number
  end_date: string
}

/**
 * Get active promotions from promotions table
 */
export async function getActivePromotions(
  cityId?: string,
  limit: number = 6
): Promise<ChatPromotion[]> {
  const supabase = await createClient()

  const now = new Date().toISOString()

  // First get providers in the city
  let providerIds: string[] = []
  if (cityId) {
    const { data: cityProviders } = await supabase
      .from('providers')
      .select('id')
      .eq('city_id', cityId)
      .in('status', ['open', 'closed', 'temporarily_paused'])

    providerIds = cityProviders?.map(p => p.id) || []
  }

  // Query active promotions
  let query = supabase
    .from('promotions')
    .select(`
      id,
      name_ar,
      name_en,
      type,
      discount_value,
      min_order_amount,
      end_date,
      provider_id,
      providers (
        id,
        name_ar,
        name_en,
        status
      )
    `)
    .eq('is_active', true)
    .lte('start_date', now)
    .gte('end_date', now)

  if (cityId && providerIds.length > 0) {
    query = query.in('provider_id', providerIds)
  }

  query = query.limit(limit)

  const { data: promotions, error } = await query

  if (error) {
    console.error('[AI Search] Promotions search error:', error)
    return []
  }

  console.log('[AI Search] Found promotions:', promotions?.length || 0)

  return (promotions || []).map(promo => {
    const provider = getProviderData(promo.providers)

    return {
      id: promo.id,
      name_ar: promo.name_ar,
      name_en: promo.name_en,
      type: promo.type,
      discount_value: promo.discount_value,
      provider_name_ar: provider?.name_ar || 'غير معروف',
      provider_name_en: provider?.name_en || null,
      min_order_amount: promo.min_order_amount,
      end_date: promo.end_date,
    }
  })
}

/**
 * Get products from a specific provider by name
 */
export async function getProductsFromProvider(
  providerName: string,
  limit: number = 10
): Promise<ChatProduct[]> {
  const supabase = await createClient()

  console.log('[AI Search] Getting products from provider:', providerName)

  // First find the provider
  const { data: providers } = await supabase
    .from('providers')
    .select('id, name_ar, name_en, rating')
    .ilike('name_ar', `%${providerName}%`)
    .in('status', ['open', 'closed', 'temporarily_paused'])
    .limit(1)

  if (!providers || providers.length === 0) {
    console.log('[AI Search] Provider not found:', providerName)
    return []
  }

  const provider = providers[0]
  console.log('[AI Search] Found provider:', provider.name_ar, 'id:', provider.id)

  // Get products from this provider
  const { data: products, error } = await supabase
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
      has_variants
    `)
    .eq('provider_id', provider.id)
    .eq('is_available', true)
    .order('price', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('[AI Search] Products from provider error:', error)
    return []
  }

  console.log('[AI Search] Found products from provider:', products?.length || 0)
  if (products && products.length > 0) {
    console.log('[AI Search] Product names:', products.map(p => p.name_ar).join(', '))
  }

  return (products || []).map(product => ({
    id: product.id,
    name_ar: product.name_ar,
    name_en: product.name_en,
    description_ar: product.description_ar,
    price: product.price,
    original_price: product.original_price,
    image_url: product.image_url,
    provider_id: product.provider_id,
    provider_name_ar: provider.name_ar,
    provider_name_en: provider.name_en,
    rating: provider.rating,
    has_variants: product.has_variants,
  }))
}

/**
 * Get products with active promotions (discounted products)
 */
export async function getPromotionProducts(
  cityId?: string,
  limit: number = 6
): Promise<ChatProduct[]> {
  const supabase = await createClient()

  // First get providers in the city
  let providerIds: string[] = []
  if (cityId) {
    const { data: cityProviders } = await supabase
      .from('providers')
      .select('id')
      .eq('city_id', cityId)
      .in('status', ['open', 'closed', 'temporarily_paused'])

    providerIds = cityProviders?.map(p => p.id) || []
  }

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
      providers (
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

  if (cityId && providerIds.length > 0) {
    query = query.in('provider_id', providerIds)
  }

  query = query.limit(limit)

  const { data: products, error } = await query

  if (error) {
    console.error('[AI Search] Promotion products error:', error)
    return []
  }

  // Filter by city again for safety
  const filteredProducts = (products || []).filter(product => {
    const provider = getProviderData(product.providers)
    if (!provider) return false
    if (!['open', 'closed', 'temporarily_paused'].includes(provider.status || '')) return false
    if (cityId && provider.city_id !== cityId) return false
    return true
  })

  return filteredProducts.map(product => {
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

/**
 * Comparison Engine for AI Smart Assistant
 * Compares providers and products to help customers make decisions
 */

import { createClient } from '@/lib/supabase/server'
import type { ChatProduct, ChatProvider, ProviderComparison } from '@/types/chat'

/**
 * Compare providers for a specific product
 */
export async function compareProvidersForProduct(
  productName: string,
  cityId?: string,
  limit: number = 5
): Promise<ProviderComparison | null> {
  const supabase = await createClient()

  // Search for the product across providers
  let query = supabase
    .from('menu_items')
    .select(`
      id,
      name_ar,
      name_en,
      price,
      original_price,
      image_url,
      provider_id,
      providers!inner (
        id,
        name_ar,
        name_en,
        logo_url,
        category,
        rating,
        delivery_time_min,
        delivery_fee,
        min_order_amount,
        status,
        city_id
      )
    `)
    .eq('is_available', true)
    .in('providers.status', ['open', 'closed', 'temporarily_paused'])
    .or(`name_ar.ilike.%${productName}%,name_en.ilike.%${productName}%`)

  if (cityId) {
    query = query.eq('providers.city_id', cityId)
  }

  query = query.limit(limit)

  const { data: products, error } = await query

  if (error || !products || products.length === 0) {
    return null
  }

  // Get review counts for providers (handle both array and object from Supabase)
  type ProviderData = { id: string; name_ar: string; name_en: string | null; logo_url: string | null; category: string | null; rating: number; delivery_time_min: number; delivery_fee: number; min_order_amount: number; status: string }
  const getProviderData = (p: unknown): ProviderData | null => {
    if (Array.isArray(p)) return p[0] as ProviderData
    return p as ProviderData | null
  }
  const providerIds = products.map(p => getProviderData(p.providers)?.id).filter(Boolean) as string[]
  const { data: reviewCounts } = await supabase
    .from('reviews')
    .select('provider_id')
    .in('provider_id', providerIds)

  const reviewCountMap: Record<string, number> = {}
  reviewCounts?.forEach(r => {
    reviewCountMap[r.provider_id] = (reviewCountMap[r.provider_id] || 0) + 1
  })

  // Transform data and calculate scores
  const comparisonData = products
    .map(product => {
      const provider = getProviderData(product.providers)
      if (!provider) return null

      const chatProvider: ChatProvider = {
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
      }

      const chatProduct: ChatProduct = {
        id: product.id,
        name_ar: product.name_ar,
        name_en: product.name_en,
        description_ar: null,
        price: product.price,
        original_price: product.original_price,
        image_url: product.image_url,
        provider_id: provider.id,
        provider_name_ar: provider.name_ar,
        provider_name_en: provider.name_en,
        rating: provider.rating,
      }

      // Calculate composite score
      // Higher rating = better, lower price = better, faster delivery = better
      const ratingScore = (provider.rating || 0) * 20 // 0-100
      const priceScore = Math.max(0, 100 - (product.price / 2)) // Lower price = higher score
      const deliveryScore = Math.max(0, 100 - (provider.delivery_time_min || 30)) // Faster = higher score
      const score = Math.round((ratingScore * 0.4) + (priceScore * 0.3) + (deliveryScore * 0.3))

      return {
        provider: chatProvider,
        product: chatProduct,
        score,
        badges: [] as ('cheapest' | 'best_rated' | 'fastest' | 'closest')[],
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  // Assign badges
  if (comparisonData.length > 0) {
    // Cheapest
    const cheapest = comparisonData.reduce((min, curr) =>
      curr.product.price < min.product.price ? curr : min
    )
    cheapest.badges.push('cheapest')

    // Best rated
    const bestRated = comparisonData.reduce((max, curr) =>
      curr.provider.rating > max.provider.rating ? curr : max
    )
    bestRated.badges.push('best_rated')

    // Fastest
    const fastest = comparisonData.reduce((min, curr) =>
      curr.provider.delivery_time_min < min.provider.delivery_time_min ? curr : min
    )
    fastest.badges.push('fastest')
  }

  // Sort by score
  comparisonData.sort((a, b) => b.score - a.score)

  // Generate recommendation
  const recommended = comparisonData[0]
  let recommendationReason = ''

  if (recommended.badges.includes('best_rated') && recommended.badges.includes('cheapest')) {
    recommendationReason = 'أفضل تقييم وأقل سعر!'
  } else if (recommended.badges.includes('best_rated')) {
    recommendationReason = 'الأعلى تقييماً من العملاء'
  } else if (recommended.badges.includes('cheapest')) {
    recommendationReason = 'أفضل سعر!'
  } else if (recommended.badges.includes('fastest')) {
    recommendationReason = 'الأسرع في التوصيل'
  } else {
    recommendationReason = 'أفضل توازن بين السعر والجودة والسرعة'
  }

  return {
    product_name: productName,
    providers: comparisonData,
    recommendation: {
      provider_id: recommended.provider.id,
      reason_ar: recommendationReason,
      reason_en: 'Best overall choice',
    },
  }
}

/**
 * Generate comparison text in Arabic
 */
export function generateComparisonText(comparison: ProviderComparison): string {
  const lines: string[] = []

  lines.push(`🔍 مقارنة ${comparison.product_name}:\n`)

  comparison.providers.forEach((item, index) => {
    const badges: string[] = []
    if (item.badges.includes('cheapest')) badges.push('💰')
    if (item.badges.includes('best_rated')) badges.push('⭐')
    if (item.badges.includes('fastest')) badges.push('🚀')

    const badgeText = badges.length > 0 ? ` ${badges.join('')}` : ''
    const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'

    lines.push(
      `${rank} ${item.provider.name_ar}${badgeText}\n` +
      `   ${item.product.price} ج.م | ⭐ ${item.provider.rating.toFixed(1)} | ${item.provider.delivery_time_min} د`
    )
  })

  lines.push(`\n💡 توصيتي: ${comparison.providers[0].provider.name_ar}`)
  lines.push(`   ${comparison.recommendation.reason_ar}`)

  return lines.join('\n')
}

/**
 * Compare multiple providers side by side
 */
export async function compareProviders(
  providerIds: string[]
): Promise<{
  providers: ChatProvider[]
  comparison_text: string
}> {
  const supabase = await createClient()

  const { data: providers } = await supabase
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
    .in('id', providerIds)

  if (!providers || providers.length === 0) {
    return { providers: [], comparison_text: 'لم أجد المطاعم المطلوبة' }
  }

  const chatProviders: ChatProvider[] = providers.map(p => ({
    id: p.id,
    name_ar: p.name_ar,
    name_en: p.name_en,
    logo_url: p.logo_url,
    category: p.category,
    rating: p.rating || 0,
    reviews_count: 0,
    delivery_time_min: p.delivery_time_min || 30,
    delivery_fee: p.delivery_fee || 0,
    min_order_amount: p.min_order_amount || 0,
    is_open: p.status === 'open',
  }))

  // Generate comparison text
  let text = '📊 المقارنة:\n\n'
  text += '| المطعم | التقييم | التوصيل | الحد الأدنى |\n'
  text += '|--------|---------|---------|------------|\n'

  chatProviders.forEach(p => {
    text += `| ${p.name_ar} | ⭐${p.rating.toFixed(1)} | ${p.delivery_time_min}د - ${p.delivery_fee}ج | ${p.min_order_amount}ج |\n`
  })

  return {
    providers: chatProviders,
    comparison_text: text,
  }
}

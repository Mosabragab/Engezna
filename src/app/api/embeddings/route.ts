/**
 * Embeddings API Route
 *
 * Generates embeddings for menu items on-demand.
 * Called by:
 *   1. Provider Dashboard when adding/updating products
 *   2. Admin panel for bulk regeneration
 *   3. Background jobs
 *
 * Endpoints:
 *   POST /api/embeddings
 *     - { item_id: string }        - Generate for single item
 *     - { item_ids: string[] }     - Generate for multiple items
 *     - { mode: "catchup" }        - Process all items without embeddings
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding, createMenuItemEmbeddingText } from '@/lib/ai/embeddings'

const MAX_BATCH_SIZE = 50

// ✅ Fixed: provider_categories can be object, array, or null
interface ProviderCategory {
  name_ar: string
}

interface MenuItem {
  id: string
  name_ar: string
  name_en: string | null
  description_ar: string | null
  description_en: string | null
  is_spicy: boolean | null
  is_vegetarian: boolean | null
  provider_category_id: string | null
  provider_categories: ProviderCategory | ProviderCategory[] | null
}

// ✅ Helper function to safely extract category name
function getCategoryName(categories: ProviderCategory | ProviderCategory[] | null): string | undefined {
  if (!categories) return undefined
  if (Array.isArray(categories)) {
    return categories[0]?.name_ar
  }
  return categories.name_ar
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const supabase = await createClient()

    // Verify authentication (admin or provider)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()

    let itemIds: string[] = []
    let isCatchup = false

    // Determine mode
    if (body.mode === 'catchup') {
      isCatchup = true

      // Get items without embeddings
      const { data: items, error } = await supabase
        .from('menu_items')
        .select('id')
        .is('embedding', null)
        .eq('is_available', true)
        .limit(MAX_BATCH_SIZE)

      if (error) throw error

      itemIds = items?.map(i => i.id) || []

      if (itemIds.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'All items already have embeddings',
          processed: 0,
          processingTimeMs: Date.now() - startTime
        })
      }

    } else if (body.item_id) {
      itemIds = [body.item_id]

    } else if (body.item_ids && Array.isArray(body.item_ids)) {
      itemIds = body.item_ids.slice(0, MAX_BATCH_SIZE)

    } else {
      return NextResponse.json(
        { success: false, error: 'Provide item_id, item_ids, or mode: "catchup"' },
        { status: 400 }
      )
    }

    // Fetch items with category info
    const { data: items, error: itemsError } = await supabase
      .from('menu_items')
      .select(`
        id,
        name_ar,
        name_en,
        description_ar,
        description_en,
        is_spicy,
        is_vegetarian,
        provider_category_id,
        provider_categories!provider_category_id (
          name_ar
        )
      `)
      .in('id', itemIds)

    if (itemsError) throw itemsError
    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No items found' },
        { status: 404 }
      )
    }

    // Process each item
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const item of items as MenuItem[]) {
      try {
        // ✅ Fixed: Use helper function to safely get category name
        const categoryName = getCategoryName(item.provider_categories)

        // Create embedding text
        const embeddingText = createMenuItemEmbeddingText({
          name_ar: item.name_ar,
          name_en: item.name_en || undefined,
          description_ar: item.description_ar || undefined,
          description_en: item.description_en || undefined,
          category_name_ar: categoryName,
          is_spicy: item.is_spicy || false,
          is_vegetarian: item.is_vegetarian || false
        })

        // Generate embedding
        const embedding = await generateEmbedding(embeddingText)

        // Update item
        const { error: updateError } = await supabase
          .from('menu_items')
          .update({ embedding })
          .eq('id', item.id)

        if (updateError) {
          throw updateError
        }

        successCount++

      } catch (itemError) {
        errorCount++
        errors.push(`${item.id}: ${(itemError as Error).message}`)
        console.error(`[Embeddings API] Failed for ${item.id}:`, itemError)
      }
    }

    const processingTime = Date.now() - startTime

    return NextResponse.json({
      success: errorCount === 0,
      processed: successCount,
      errors: errorCount,
      errorDetails: errors.length > 0 ? errors : undefined,
      processingTimeMs: processingTime,
      mode: isCatchup ? 'catchup' : 'direct'
    })

  } catch (error) {
    console.error('[Embeddings API] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        processingTimeMs: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check embedding stats
export async function GET() {
  try {
    const supabase = await createClient()

    // Get stats
    const { data: stats, error } = await supabase.rpc('get_embedding_stats')

    if (error) {
      // Fallback if function doesn't exist
      const { count: totalCount } = await supabase
        .from('menu_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_available', true)

      const { count: withEmbedding } = await supabase
        .from('menu_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_available', true)
        .not('embedding', 'is', null)

      return NextResponse.json({
        success: true,
        stats: {
          total_items: totalCount || 0,
          items_with_embedding: withEmbedding || 0,
          items_without_embedding: (totalCount || 0) - (withEmbedding || 0),
          coverage_percentage: totalCount
            ? Math.round(((withEmbedding || 0) / totalCount) * 100 * 100) / 100
            : 0
        }
      })
    }

    return NextResponse.json({
      success: true,
      stats: stats?.[0] || stats
    })

  } catch (error) {
    console.error('[Embeddings API] Stats error:', error)

    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}

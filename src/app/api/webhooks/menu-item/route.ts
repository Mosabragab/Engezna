/**
 * Menu Item Webhook Handler
 *
 * Receives webhook calls from Supabase Database Webhooks
 * when menu items are inserted or updated.
 *
 * Setup in Supabase Dashboard:
 *   1. Go to Database > Webhooks
 *   2. Create new webhook
 *   3. Name: "Generate Embedding on Menu Item Change"
 *   4. Table: menu_items
 *   5. Events: INSERT, UPDATE
 *   6. URL: https://your-domain.com/api/webhooks/menu-item
 *   7. HTTP Headers: { "x-webhook-secret": "your-secret" }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateEmbedding, createMenuItemEmbeddingText } from '@/lib/ai/embeddings'

// Webhook secret for verification
const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: {
    id: string
    name_ar: string
    name_en: string | null
    description_ar: string | null
    description_en: string | null
    is_spicy: boolean | null
    is_vegetarian: boolean | null
    is_available: boolean
    provider_category_id: string | null
    embedding: number[] | null
  }
  old_record?: {
    name_ar: string
    name_en: string | null
    description_ar: string | null
    description_en: string | null
    is_spicy: boolean | null
    is_vegetarian: boolean | null
    provider_category_id: string | null
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret if configured
    if (WEBHOOK_SECRET) {
      const secret = req.headers.get('x-webhook-secret')
      if (secret !== WEBHOOK_SECRET) {
        console.error('[Webhook] Invalid secret')
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    const payload: WebhookPayload = await req.json()

    console.log(`[Webhook] Received ${payload.type} for menu_items`)

    // Skip if item is not available
    if (!payload.record.is_available) {
      return NextResponse.json({
        success: true,
        message: 'Skipped - item not available',
        skipped: true
      })
    }

    // Skip if no embedding-relevant changes on UPDATE
    if (payload.type === 'UPDATE' && payload.old_record) {
      const relevantFieldsChanged =
        payload.record.name_ar !== payload.old_record.name_ar ||
        payload.record.name_en !== payload.old_record.name_en ||
        payload.record.description_ar !== payload.old_record.description_ar ||
        payload.record.description_en !== payload.old_record.description_en ||
        payload.record.is_spicy !== payload.old_record.is_spicy ||
        payload.record.is_vegetarian !== payload.old_record.is_vegetarian ||
        payload.record.provider_category_id !== payload.old_record.provider_category_id

      if (!relevantFieldsChanged) {
        return NextResponse.json({
          success: true,
          message: 'Skipped - no embedding-relevant changes',
          skipped: true
        })
      }
    }

    // Create Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch category name
    let categoryName: string | undefined

    if (payload.record.provider_category_id) {
      const { data: category } = await supabase
        .from('provider_categories')
        .select('name_ar')
        .eq('id', payload.record.provider_category_id)
        .single()

      categoryName = category?.name_ar
    }

    // Create embedding text
    const embeddingText = createMenuItemEmbeddingText({
      name_ar: payload.record.name_ar,
      name_en: payload.record.name_en || undefined,
      description_ar: payload.record.description_ar || undefined,
      category_name_ar: categoryName,
      is_spicy: payload.record.is_spicy || false,
      is_vegetarian: payload.record.is_vegetarian || false
    })

    console.log(`[Webhook] Generating embedding for: ${payload.record.name_ar}`)

    // Generate embedding
    const embedding = await generateEmbedding(embeddingText)

    // Update menu item with embedding
    const { error: updateError } = await supabase
      .from('menu_items')
      .update({ embedding })
      .eq('id', payload.record.id)

    if (updateError) {
      throw updateError
    }

    console.log(`[Webhook] Successfully updated embedding for: ${payload.record.id}`)

    return NextResponse.json({
      success: true,
      message: 'Embedding generated and saved',
      item_id: payload.record.id
    })

  } catch (error) {
    console.error('[Webhook] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message
      },
      { status: 500 }
    )
  }
}

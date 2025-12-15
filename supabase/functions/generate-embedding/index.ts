import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

/**
 * Supabase Edge Function: Generate Embedding
 *
 * Automatically generates embeddings for menu items.
 * Called by:
 *   1. Database webhook on INSERT/UPDATE
 *   2. Cron job for catch-up processing
 *   3. Manual API call
 *
 * Endpoints:
 *   POST /generate-embedding { item_id: string }           - Single item
 *   POST /generate-embedding { item_ids: string[] }        - Batch items
 *   POST /generate-embedding { mode: "catchup", limit: 50 } - Process items without embeddings
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EMBEDDING_MODEL = 'text-embedding-3-small'
const MAX_BATCH_SIZE = 100

// =============================================================================
// TYPES
// =============================================================================

interface MenuItem {
  id: string
  name_ar: string
  name_en: string | null
  description_ar: string | null
  description_en: string | null
  is_spicy: boolean | null
  is_vegetarian: boolean | null
  provider_category_id: string | null
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE'
  table: string
  record: MenuItem
  old_record?: MenuItem
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create rich text for embedding from menu item data
 */
function createEmbeddingText(
  item: MenuItem,
  categoryName?: string
): string {
  const parts: string[] = []

  // Arabic name (primary)
  parts.push(item.name_ar)

  // English name
  if (item.name_en) {
    parts.push(item.name_en)
  }

  // Description
  if (item.description_ar) {
    parts.push(item.description_ar)
  }
  if (item.description_en) {
    parts.push(item.description_en)
  }

  // Category
  if (categoryName) {
    parts.push(categoryName)
  }

  // Attributes (semantic keywords)
  const attributes: string[] = []
  if (item.is_spicy) {
    attributes.push('حار', 'حراق', 'سبايسي', 'spicy', 'hot')
  }
  if (item.is_vegetarian) {
    attributes.push('نباتي', 'خضار', 'صحي', 'vegetarian', 'vegan', 'healthy')
  }

  if (attributes.length > 0) {
    parts.push(attributes.join(' '))
  }

  return parts.join(' | ')
}

/**
 * Generate embeddings using OpenAI API
 */
async function generateEmbeddings(
  texts: string[],
  openaiKey: string
): Promise<number[][]> {
  const cleanedTexts = texts.map(t =>
    t.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
  )

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: cleanedTexts,
      encoding_format: 'float',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.data.map((d: { embedding: number[] }) => d.embedding)
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    // Validate environment
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured')
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured')
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Parse request
    const body = await req.json()

    let itemIds: string[] = []
    let isCatchup = false
    let catchupLimit = 50

    // Determine mode
    if (body.type && body.record) {
      // Database webhook trigger
      const payload = body as WebhookPayload

      // Only process if embedding-relevant fields changed
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
          return new Response(
            JSON.stringify({
              success: true,
              message: 'No embedding-relevant changes detected',
              skipped: true
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      itemIds = [payload.record.id]
      console.log(`[Webhook] Processing ${payload.type} for item: ${payload.record.id}`)

    } else if (body.mode === 'catchup') {
      // Catch-up mode: process items without embeddings
      isCatchup = true
      catchupLimit = Math.min(body.limit || 50, MAX_BATCH_SIZE)

      const { data: items, error } = await supabase
        .from('menu_items')
        .select('id')
        .is('embedding', null)
        .eq('is_available', true)
        .limit(catchupLimit)

      if (error) throw error

      itemIds = items?.map(i => i.id) || []
      console.log(`[Catchup] Found ${itemIds.length} items without embeddings`)

      if (itemIds.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'All items have embeddings',
            processed: 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

    } else if (body.item_id) {
      // Single item
      itemIds = [body.item_id]

    } else if (body.item_ids && Array.isArray(body.item_ids)) {
      // Batch items
      itemIds = body.item_ids.slice(0, MAX_BATCH_SIZE)

    } else {
      throw new Error('Invalid request: provide item_id, item_ids, or mode')
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
      throw new Error('No items found')
    }

    console.log(`Processing ${items.length} items...`)

    // Prepare texts for embedding
    const texts = items.map(item => {
      const categoryName = (item.provider_categories as any)?.name_ar
      return createEmbeddingText(item, categoryName)
    })

    // Generate embeddings
    const embeddings = await generateEmbeddings(texts, OPENAI_API_KEY)

    // Update items with embeddings
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (let i = 0; i < items.length; i++) {
      const { error: updateError } = await supabase
        .from('menu_items')
        .update({ embedding: embeddings[i] })
        .eq('id', items[i].id)

      if (updateError) {
        errorCount++
        errors.push(`${items[i].id}: ${updateError.message}`)
        console.error(`Failed to update ${items[i].id}:`, updateError.message)
      } else {
        successCount++
      }
    }

    const processingTime = Date.now() - startTime

    console.log(`Completed: ${successCount} success, ${errorCount} errors in ${processingTime}ms`)

    return new Response(
      JSON.stringify({
        success: errorCount === 0,
        processed: successCount,
        errors: errorCount,
        errorDetails: errors.length > 0 ? errors : undefined,
        processingTimeMs: processingTime,
        mode: isCatchup ? 'catchup' : 'direct',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = (error as Error).message || 'Unknown error'
    console.error('Error:', errorMessage)

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        processingTimeMs: Date.now() - startTime,
      }),
      {
        status: 200, // Return 200 to avoid Supabase error masking
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

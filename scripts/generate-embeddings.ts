#!/usr/bin/env npx ts-node
/**
 * Generate Embeddings Script for Engezna Menu Items
 *
 * This script generates vector embeddings for all menu items
 * to enable semantic search capabilities.
 *
 * Usage:
 *   npx ts-node scripts/generate-embeddings.ts
 *
 * Or with environment variables:
 *   OPENAI_API_KEY=sk-xxx SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx npx ts-node scripts/generate-embeddings.ts
 */

import OpenAI from 'openai'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// =============================================================================
// CONFIGURATION
// =============================================================================

const BATCH_SIZE = 50 // Process items in batches
const RATE_LIMIT_DELAY = 200 // ms between batches to avoid rate limits
const EMBEDDING_MODEL = 'text-embedding-3-small'

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

interface ProviderCategory {
  id: string
  name_ar: string
}

// =============================================================================
// INITIALIZATION
// =============================================================================

function getEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`❌ Missing environment variable: ${name}`)
    process.exit(1)
  }
  return value
}

const openai = new OpenAI({
  apiKey: getEnvVar('OPENAI_API_KEY')
})

const supabase: SupabaseClient = createClient(
  getEnvVar('SUPABASE_URL') || getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
  getEnvVar('SUPABASE_SERVICE_KEY') || getEnvVar('SUPABASE_SERVICE_ROLE_KEY')
)

// =============================================================================
// EMBEDDING GENERATION
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
 * Generate embedding for a single text
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.replace(/\n/g, ' ').trim(),
    encoding_format: 'float'
  })
  return response.data[0].embedding
}

/**
 * Generate embeddings for multiple texts in batch
 */
async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const cleanedTexts = texts.map(t => t.replace(/\n/g, ' ').trim())

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: cleanedTexts,
    encoding_format: 'float'
  })

  return response.data.map(d => d.embedding)
}

// =============================================================================
// MAIN PROCESS
// =============================================================================

async function main() {
  console.log('🚀 Starting Embedding Generation for Menu Items\n')
  console.log('=' .repeat(60))

  // 1. Fetch all categories for reference
  console.log('\n📂 Fetching categories...')
  const { data: categories, error: catError } = await supabase
    .from('provider_categories')
    .select('id, name_ar')

  if (catError) {
    console.error('❌ Error fetching categories:', catError)
    process.exit(1)
  }

  const categoryMap = new Map<string, string>()
  categories?.forEach(cat => categoryMap.set(cat.id, cat.name_ar))
  console.log(`   Found ${categories?.length || 0} categories`)

  // 2. Fetch all menu items that need embeddings
  console.log('\n📦 Fetching menu items...')
  const { data: items, error: itemsError } = await supabase
    .from('menu_items')
    .select('id, name_ar, name_en, description_ar, description_en, is_spicy, is_vegetarian, provider_category_id')
    .is('embedding', null) // Only items without embeddings
    .eq('is_available', true)

  if (itemsError) {
    console.error('❌ Error fetching menu items:', itemsError)
    process.exit(1)
  }

  if (!items || items.length === 0) {
    console.log('\n✅ All menu items already have embeddings!')
    return
  }

  console.log(`   Found ${items.length} items needing embeddings`)

  // 3. Process in batches
  console.log('\n⚙️  Generating embeddings...\n')

  let processed = 0
  let errors = 0
  const totalBatches = Math.ceil(items.length / BATCH_SIZE)

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1

    try {
      // Prepare texts for this batch
      const texts = batch.map(item => {
        const categoryName = item.provider_category_id
          ? categoryMap.get(item.provider_category_id)
          : undefined
        return createEmbeddingText(item, categoryName)
      })

      // Generate embeddings for batch
      const embeddings = await generateEmbeddingsBatch(texts)

      // Update database
      for (let j = 0; j < batch.length; j++) {
        const { error: updateError } = await supabase
          .from('menu_items')
          .update({ embedding: embeddings[j] })
          .eq('id', batch[j].id)

        if (updateError) {
          console.error(`   ❌ Error updating ${batch[j].name_ar}:`, updateError.message)
          errors++
        } else {
          processed++
        }
      }

      // Progress bar
      const progress = Math.round((batchNum / totalBatches) * 100)
      const bar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5))
      process.stdout.write(`\r   [${bar}] ${progress}% - Batch ${batchNum}/${totalBatches}`)

      // Rate limit delay
      if (i + BATCH_SIZE < items.length) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY))
      }

    } catch (error) {
      console.error(`\n   ❌ Batch ${batchNum} failed:`, error)
      errors += batch.length
    }
  }

  // 4. Summary
  console.log('\n\n' + '=' .repeat(60))
  console.log('\n📊 Summary:')
  console.log(`   ✅ Successfully processed: ${processed} items`)
  console.log(`   ❌ Errors: ${errors} items`)
  console.log(`   📈 Total: ${items.length} items`)

  // 5. Verify
  console.log('\n🔍 Verification...')
  const { count: embeddedCount } = await supabase
    .from('menu_items')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null)

  const { count: totalCount } = await supabase
    .from('menu_items')
    .select('*', { count: 'exact', head: true })
    .eq('is_available', true)

  console.log(`   Items with embeddings: ${embeddedCount}/${totalCount}`)

  if (embeddedCount === totalCount) {
    console.log('\n🎉 All menu items now have embeddings!')
  }

  console.log('\n✨ Done!\n')
}

// =============================================================================
// RUN
// =============================================================================

main().catch(error => {
  console.error('\n💥 Fatal error:', error)
  process.exit(1)
})

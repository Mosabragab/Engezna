/**
 * Embedding Utilities for Engezna AI Agent
 *
 * Provides semantic search capabilities using OpenAI embeddings.
 * Used for understanding customer intent beyond exact keyword matching.
 */

import OpenAI from 'openai'

// =============================================================================
// TYPES
// =============================================================================

export interface EmbeddingResult {
  embedding: number[]
  tokens: number
}

// =============================================================================
// OPENAI CLIENT (Singleton)
// =============================================================================

let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }
  return openaiClient
}

// =============================================================================
// EMBEDDING FUNCTIONS
// =============================================================================

/**
 * Generate embedding vector for a text query
 * Uses OpenAI's text-embedding-3-small model (1536 dimensions)
 *
 * @param text - The text to embed (e.g., "عايز حاجة حرشة")
 * @returns Embedding vector (1536 dimensions)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const cleanedText = text
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (!cleanedText) {
      throw new Error('Empty text provided for embedding')
    }

    const response = await getOpenAIClient().embeddings.create({
      model: 'text-embedding-3-small',
      input: cleanedText,
      encoding_format: 'float'
    })

    return response.data[0].embedding
  } catch (error) {
    console.error('[Embedding Error]:', error)
    throw error
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * More efficient than calling generateEmbedding multiple times
 *
 * @param texts - Array of texts to embed
 * @returns Array of embedding vectors
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  try {
    const cleanedTexts = texts.map(text =>
      text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
    ).filter(text => text.length > 0)

    if (cleanedTexts.length === 0) {
      return []
    }

    const response = await getOpenAIClient().embeddings.create({
      model: 'text-embedding-3-small',
      input: cleanedTexts,
      encoding_format: 'float'
    })

    return response.data.map(d => d.embedding)
  } catch (error) {
    console.error('[Batch Embedding Error]:', error)
    throw error
  }
}

/**
 * Create a rich searchable text from menu item data
 * Combines name, description, and attributes for better semantic matching
 *
 * @param item - Menu item data
 * @returns Combined text for embedding
 */
export function createMenuItemEmbeddingText(item: {
  name_ar: string
  name_en?: string
  description_ar?: string
  description_en?: string
  category_name_ar?: string
  is_spicy?: boolean
  is_vegetarian?: boolean
}): string {
  const parts: string[] = []

  // Arabic name (primary)
  parts.push(item.name_ar)

  // English name (for bilingual search)
  if (item.name_en) {
    parts.push(item.name_en)
  }

  // Description
  if (item.description_ar) {
    parts.push(item.description_ar)
  }

  // Category
  if (item.category_name_ar) {
    parts.push(item.category_name_ar)
  }

  // Attributes (add semantic keywords)
  const attributes: string[] = []
  if (item.is_spicy) {
    attributes.push('حار', 'حراق', 'spicy', 'hot')
  }
  if (item.is_vegetarian) {
    attributes.push('نباتي', 'خضار', 'vegetarian', 'vegan')
  }

  if (attributes.length > 0) {
    parts.push(attributes.join(' '))
  }

  return parts.join(' | ')
}

// =============================================================================
// SYNONYM EXPANSION (for Arabic dialects)
// =============================================================================

/**
 * Common Arabic food synonyms and dialect variations
 * Expands search query to catch dialect differences
 */
const ARABIC_SYNONYMS: Record<string, string[]> = {
  // Vegetables
  'طماطم': ['بندورة', 'قوطة', 'tomato'],
  'بندورة': ['طماطم', 'قوطة', 'tomato'],
  'بطاطس': ['بطاطا', 'potato'],
  'بصل': ['onion'],
  'خيار': ['cucumber'],

  // Drinks
  'بيبسي': ['كولا', 'بيبسى', 'pepsi', 'cola'],
  'كوكاكولا': ['كولا', 'كوكا', 'coca cola', 'coke'],
  'عصير': ['juice', 'عصاير'],
  'مشروب': ['drink', 'مشروبات'],

  // Meat
  'فراخ': ['دجاج', 'chicken'],
  'دجاج': ['فراخ', 'chicken'],
  'لحمة': ['لحم', 'meat', 'beef'],
  'كفتة': ['كفته', 'kofta'],

  // Food types
  'شاورما': ['شاورمة', 'شاورمه', 'shawarma'],
  'بيتزا': ['pizza', 'بيتزه'],
  'برجر': ['برغر', 'burger', 'همبرجر', 'همبورجر'],
  'سندوتش': ['سندويتش', 'ساندويتش', 'sandwich'],
  'حواوشي': ['حواوشى', 'hawawshi'],

  // Descriptive
  'حار': ['حراق', 'سبايسي', 'spicy', 'hot'],
  'ساقع': ['ساقعة', 'بارد', 'cold', 'مثلج'],
  'كبير': ['large', 'big', 'عائلي', 'فاميلي'],
  'صغير': ['small', 'mini', 'ميني'],
}

/**
 * Expand a search query with synonyms
 * Helps catch dialect variations in Arabic
 *
 * @param query - Original search query
 * @returns Expanded query with synonyms
 */
export function expandQueryWithSynonyms(query: string): string {
  const words = query.toLowerCase().split(/\s+/)
  const expanded: string[] = [query]

  for (const word of words) {
    const synonyms = ARABIC_SYNONYMS[word]
    if (synonyms) {
      expanded.push(...synonyms)
    }
  }

  // Return unique terms joined
  return [...new Set(expanded)].join(' ')
}

// =============================================================================
// EMBEDDING CACHE (Optional - for performance)
// =============================================================================

// Simple in-memory cache for embeddings (useful for repeated queries)
const embeddingCache = new Map<string, { embedding: number[]; timestamp: number }>()
const CACHE_TTL_MS = 1000 * 60 * 30 // 30 minutes

/**
 * Get embedding with caching
 * Reduces API calls for repeated queries
 */
export async function getEmbeddingCached(text: string): Promise<number[]> {
  const cacheKey = text.toLowerCase().trim()

  // Check cache
  const cached = embeddingCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.embedding
  }

  // Generate new embedding
  const embedding = await generateEmbedding(text)

  // Store in cache
  embeddingCache.set(cacheKey, {
    embedding,
    timestamp: Date.now()
  })

  // Clean old entries (simple LRU-like cleanup)
  if (embeddingCache.size > 1000) {
    const oldestKey = embeddingCache.keys().next().value
    if (oldestKey) {
      embeddingCache.delete(oldestKey)
    }
  }

  return embedding
}

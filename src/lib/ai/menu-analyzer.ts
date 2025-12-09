/**
 * AI Menu Analyzer Service for Engezna Platform
 * Uses Claude claude-sonnet-4-20250514 Vision API to extract menu information from images
 */

import Anthropic from '@anthropic-ai/sdk'
import {
  MENU_ANALYSIS_SYSTEM_PROMPT,
  createMenuAnalysisUserPrompt,
  type BusinessCategoryCode
} from './prompts'

// Types
export interface MenuAnalysisResult {
  success: boolean
  categories: ExtractedCategory[]
  addons: ExtractedAddon[]
  warnings: AnalysisWarning[]
  statistics: AnalysisStatistics
  rawResponse?: string
  processingTimeMs: number
  tokensUsed?: {
    input: number
    output: number
  }
  error?: string
}

export interface ExtractedCategory {
  id?: string
  name_ar: string
  name_en: string | null
  icon: string | null
  display_order: number
  products: ExtractedProduct[]
}

export interface ExtractedProduct {
  id?: string
  name_ar: string
  name_en: string | null
  description_ar: string | null
  pricing_type: 'single' | 'sizes' | 'weights' | 'options'
  price: number | null
  original_price: number | null
  variants: ProductVariant[] | null
  combo_contents_ar: string | null
  serves_count: number | null
  is_popular: boolean
  is_spicy: boolean
  is_vegetarian: boolean
  confidence: number
  needs_review: boolean
  source_note: string | null
}

export interface ProductVariant {
  name_ar: string
  name_en?: string
  price: number
  is_default: boolean
}

export interface ExtractedAddon {
  id?: string
  name_ar: string
  name_en: string | null
  price: number
  group: string | null
}

export interface AnalysisWarning {
  type: 'unclear_price' | 'possible_duplicate' | 'missing_category' | 'other'
  product_name?: string
  products?: string[]
  message: string
  severity: 'low' | 'medium' | 'high'
  suggested_action?: string
}

export interface AnalysisStatistics {
  total_categories: number
  total_products: number
  products_single_price: number
  products_with_variants: number
  products_need_review: number
  average_confidence: number
  addons_found: number
}

// Initialize Anthropic client - will be done on server side
let anthropic: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    const apiKey = process.env.CLAUDE_API_KEY
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY environment variable is not set')
    }
    anthropic = new Anthropic({
      apiKey,
    })
  }
  return anthropic
}

/**
 * Analyze menu images using Claude Vision API
 * This function should only be called from server-side code (API routes or server actions)
 */
export async function analyzeMenuImages(
  imageUrls: string[],
  businessType: BusinessCategoryCode
): Promise<MenuAnalysisResult> {
  const startTime = Date.now()

  try {
    const client = getAnthropicClient()

    // Prepare image content blocks
    const imageBlocks = await Promise.all(
      imageUrls.map(async (url) => {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${url}`)
        }

        const buffer = await response.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')

        const contentType = response.headers.get('content-type') || 'image/jpeg'
        let mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg'

        if (contentType.includes('png')) mediaType = 'image/png'
        else if (contentType.includes('webp')) mediaType = 'image/webp'
        else if (contentType.includes('gif')) mediaType = 'image/gif'

        return {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: mediaType,
            data: base64,
          },
        }
      })
    )

    // Call Claude API
    const response = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: MENU_ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            ...imageBlocks,
            {
              type: 'text',
              text: createMenuAnalysisUserPrompt(businessType),
            },
          ],
        },
      ],
    })

    const processingTimeMs = Date.now() - startTime

    // Extract text content
    const textContent = response.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI')
    }

    // Parse JSON from response
    let jsonText = textContent.text.trim()

    // Handle case where AI adds text before/after JSON
    if (!jsonText.startsWith('{')) {
      const match = jsonText.match(/\{[\s\S]*\}/)
      if (!match) {
        throw new Error('Could not find JSON in AI response')
      }
      jsonText = match[0]
    }

    const parsed = JSON.parse(jsonText)

    if (!parsed.success) {
      throw new Error(parsed.error || 'AI analysis returned success: false')
    }

    return {
      success: true,
      categories: parsed.categories || [],
      addons: parsed.addons || [],
      warnings: parsed.warnings || [],
      statistics: parsed.statistics || {
        total_categories: 0,
        total_products: 0,
        products_single_price: 0,
        products_with_variants: 0,
        products_need_review: 0,
        average_confidence: 0,
        addons_found: 0,
      },
      rawResponse: textContent.text,
      processingTimeMs,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    }
  } catch (error) {
    console.error('Menu analysis error:', error)

    return {
      success: false,
      categories: [],
      addons: [],
      warnings: [],
      statistics: {
        total_categories: 0,
        total_products: 0,
        products_single_price: 0,
        products_with_variants: 0,
        products_need_review: 0,
        average_confidence: 0,
        addons_found: 0,
      },
      processingTimeMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Validate extracted menu data
 */
export function validateExtractedData(data: MenuAnalysisResult): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!data.success) {
    errors.push('Analysis failed')
    return { isValid: false, errors }
  }

  if (!data.categories || data.categories.length === 0) {
    errors.push('No categories extracted')
  }

  // Check for products without prices
  data.categories.forEach((category, catIndex) => {
    if (!category.name_ar) {
      errors.push(`Category ${catIndex + 1} has no Arabic name`)
    }

    category.products.forEach((product, prodIndex) => {
      if (!product.name_ar) {
        errors.push(`Product ${prodIndex + 1} in category "${category.name_ar}" has no Arabic name`)
      }

      if (product.price === null && !product.needs_review) {
        errors.push(`Product "${product.name_ar}" has no price and is not marked for review`)
      }

      // Validate variants
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach((variant, varIndex) => {
          if (!variant.name_ar) {
            errors.push(`Variant ${varIndex + 1} of product "${product.name_ar}" has no Arabic name`)
          }
          if (typeof variant.price !== 'number' || variant.price <= 0) {
            errors.push(`Variant "${variant.name_ar}" of product "${product.name_ar}" has invalid price`)
          }
        })

        // Check for default variant
        const hasDefault = product.variants.some(v => v.is_default)
        if (!hasDefault) {
          errors.push(`Product "${product.name_ar}" has variants but none is marked as default`)
        }
      }
    })
  })

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Calculate statistics from extracted data
 */
export function calculateStatistics(categories: ExtractedCategory[]): AnalysisStatistics {
  let totalProducts = 0
  let productsSinglePrice = 0
  let productsWithVariants = 0
  let productsNeedReview = 0
  let totalConfidence = 0

  categories.forEach(category => {
    category.products.forEach(product => {
      totalProducts++
      totalConfidence += product.confidence

      if (product.needs_review) {
        productsNeedReview++
      }

      if (product.variants && product.variants.length > 0) {
        productsWithVariants++
      } else {
        productsSinglePrice++
      }
    })
  })

  return {
    total_categories: categories.length,
    total_products: totalProducts,
    products_single_price: productsSinglePrice,
    products_with_variants: productsWithVariants,
    products_need_review: productsNeedReview,
    average_confidence: totalProducts > 0 ? totalConfidence / totalProducts : 0,
    addons_found: 0, // Will be updated separately
  }
}

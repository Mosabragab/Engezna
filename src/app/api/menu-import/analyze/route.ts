/**
 * API Route: Menu Import - Analyze Images
 * POST /api/menu-import/analyze
 *
 * Analyzes uploaded menu images using Claude Vision API
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeMenuImages, validateExtractedData } from '@/lib/ai/menu-analyzer'
import type { BusinessCategoryCode } from '@/lib/ai/prompts'

export const maxDuration = 60 // 60 seconds timeout for AI processing

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { importId, imageUrls, businessType } = body as {
      importId: string
      imageUrls: string[]
      businessType: BusinessCategoryCode
    }

    // Validate required fields
    if (!importId) {
      return NextResponse.json(
        { success: false, error: 'Import ID is required' },
        { status: 400 }
      )
    }

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one image URL is required' },
        { status: 400 }
      )
    }

    if (!businessType) {
      return NextResponse.json(
        { success: false, error: 'Business type is required' },
        { status: 400 }
      )
    }

    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify import belongs to user's provider
    const { data: importData, error: importError } = await supabase
      .from('menu_imports')
      .select('id, provider_id, status')
      .eq('id', importId)
      .single()

    if (importError || !importData) {
      return NextResponse.json(
        { success: false, error: 'Import not found' },
        { status: 404 }
      )
    }

    // Verify provider ownership
    const { data: provider, error: providerError } = await supabase
      .from('providers')
      .select('id, owner_id, category')
      .eq('id', importData.provider_id)
      .single()

    if (providerError || !provider || provider.owner_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Update import status to processing
    await supabase
      .from('menu_imports')
      .update({
        status: 'processing',
        processing_started_at: new Date().toISOString(),
      })
      .eq('id', importId)

    // Analyze menu images using Claude
    const analysisResult = await analyzeMenuImages(imageUrls, businessType)

    if (!analysisResult.success) {
      // Update import status to failed
      await supabase
        .from('menu_imports')
        .update({
          status: 'failed',
          error_message: analysisResult.error || 'Analysis failed',
          processing_completed_at: new Date().toISOString(),
        })
        .eq('id', importId)

      return NextResponse.json(
        {
          success: false,
          error: analysisResult.error || 'Analysis failed',
          importId,
        },
        { status: 500 }
      )
    }

    // Validate extracted data
    const validation = validateExtractedData(analysisResult)

    // Calculate total items
    let totalItems = 0
    analysisResult.categories.forEach(cat => {
      totalItems += cat.products.length
    })
    totalItems += analysisResult.addons.length

    // Update import with extracted data
    const { error: updateError } = await supabase
      .from('menu_imports')
      .update({
        status: 'review',
        ai_raw_response: analysisResult.rawResponse ? { text: analysisResult.rawResponse } : null,
        ai_model_used: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
        ai_processing_time_ms: analysisResult.processingTimeMs,
        ai_tokens_used: analysisResult.tokensUsed || null,
        extracted_data: {
          categories: analysisResult.categories,
          addons: analysisResult.addons,
          warnings: [
            ...analysisResult.warnings,
            ...(!validation.isValid
              ? validation.errors.map(e => ({
                  type: 'other',
                  message: e,
                  severity: 'medium',
                }))
              : []),
          ],
          statistics: analysisResult.statistics,
        },
        total_items: totalItems,
        processing_completed_at: new Date().toISOString(),
        review_started_at: new Date().toISOString(),
      })
      .eq('id', importId)

    if (updateError) {
      console.error('Failed to update import:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to save analysis results' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      importId,
      data: {
        categories: analysisResult.categories,
        addons: analysisResult.addons,
        warnings: analysisResult.warnings,
        statistics: analysisResult.statistics,
      },
      processingTimeMs: analysisResult.processingTimeMs,
      tokensUsed: analysisResult.tokensUsed,
      validationErrors: validation.errors,
    })
  } catch (error) {
    console.error('Menu analysis API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

/**
 * API Route: Menu Import - Save to Database
 * POST /api/menu-import/save
 *
 * Saves the reviewed menu data to provider_categories and menu_items tables
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ExtractedCategory, ExtractedAddon, ExtractedVariant } from '@/types/menu-import'

export const maxDuration = 60 // 60 seconds timeout

interface SaveRequest {
  importId: string
  providerId: string
  categories: ExtractedCategory[]
  addons: ExtractedAddon[]
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveRequest = await request.json()
    const { importId, providerId, categories, addons } = body

    // Validate required fields
    if (!importId || !providerId) {
      return NextResponse.json(
        { success: false, error: 'Import ID and Provider ID are required' },
        { status: 400 }
      )
    }

    // Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Verify provider ownership
    const { data: provider, error: providerError } = await supabase
      .from('providers')
      .select('id, owner_id')
      .eq('id', providerId)
      .single()

    if (providerError || !provider || provider.owner_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
    }

    // Update import status to saving
    await supabase
      .from('menu_imports')
      .update({
        status: 'saving',
        final_data: { categories, addons },
        updated_at: new Date().toISOString(),
      })
      .eq('id', importId)

    let categoriesCreated = 0
    let productsCreated = 0
    let variantsCreated = 0
    let addonsCreated = 0
    const savedCategoryIds: string[] = []
    const savedProductIds: string[] = []

    // Create categories and products
    for (let catIndex = 0; catIndex < categories.length; catIndex++) {
      const category = categories[catIndex]

      // Create category
      const { data: createdCategory, error: categoryError } = await supabase
        .from('provider_categories')
        .insert({
          provider_id: providerId,
          name_ar: category.name_ar,
          name_en: category.name_en || null,
          icon: category.icon || null,
          display_order: category.display_order || catIndex,
          is_active: true,
          import_id: importId,
        })
        .select()
        .single()

      if (categoryError) {
        console.error('Error creating category:', categoryError)
        continue
      }

      categoriesCreated++
      savedCategoryIds.push(createdCategory.id)

      // Create products for this category
      for (let prodIndex = 0; prodIndex < category.products.length; prodIndex++) {
        const product = category.products[prodIndex]

        // Determine has_variants
        const hasVariants = product.pricing_type === 'variants' && product.variants && product.variants.length > 0

        // Get base price
        let basePrice = product.price
        if (hasVariants && product.variants && product.variants.length > 0) {
          // Use the default variant price or the first variant price
          const defaultVariant = product.variants.find((v: ExtractedVariant) => v.is_default) || product.variants[0]
          basePrice = defaultVariant.price
        }

        // Create menu item
        const { data: createdProduct, error: productError } = await supabase
          .from('menu_items')
          .insert({
            provider_id: providerId,
            category_id: createdCategory.id,
            name_ar: product.name_ar,
            name_en: product.name_en || null,
            description_ar: product.description_ar || null,
            description_en: null,
            price: basePrice || 0,
            original_price: product.original_price || null,
            has_variants: hasVariants,
            pricing_type: product.pricing_type,
            combo_contents_ar: product.combo_contents_ar || null,
            serves_count: product.serves_count || null,
            is_available: true,
            is_popular: product.is_popular || false,
            is_spicy: product.is_spicy || false,
            is_vegetarian: product.is_vegetarian || false,
            display_order: prodIndex,
            import_id: importId,
          })
          .select()
          .single()

        if (productError) {
          console.error('Error creating product:', productError)
          continue
        }

        productsCreated++
        savedProductIds.push(createdProduct.id)

        // Create variants if product has multiple pricing options
        if (hasVariants && product.variants && product.variants.length > 0) {
          const variantType = product.variant_type || 'option'

          const variantInserts = product.variants.map((variant: ExtractedVariant, varIndex: number) => ({
            product_id: createdProduct.id,
            variant_type: variantType,
            name_ar: variant.name_ar,
            name_en: variant.name_en || null,
            price: variant.price,
            original_price: variant.original_price || null,
            is_default: variant.is_default || varIndex === 0,
            display_order: variant.display_order || varIndex,
            is_available: true,
          }))

          const { data: createdVariants, error: variantsError } = await supabase
            .from('product_variants')
            .insert(variantInserts)
            .select()

          if (variantsError) {
            console.error('Error creating variants:', variantsError)
          } else {
            variantsCreated += createdVariants?.length || 0
          }
        }
      }
    }

    // Handle addons if provided (for future implementation)
    // Currently just counting them for the response
    addonsCreated = addons?.length || 0

    // Update import as completed
    await supabase
      .from('menu_imports')
      .update({
        status: 'completed',
        saved_category_ids: savedCategoryIds,
        saved_product_ids: savedProductIds,
        products_created: productsCreated,
        products_with_variants: variantsCreated > 0 ? productsCreated : 0,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', importId)

    return NextResponse.json({
      success: true,
      categoriesCreated,
      productsCreated,
      variantsCreated,
      addonsCreated,
      savedCategoryIds,
      savedProductIds,
    })
  } catch (error) {
    console.error('Menu save API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

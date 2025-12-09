/**
 * API Route: Menu Import - Save to Database
 * POST /api/menu-import/save
 *
 * Saves the reviewed menu data to provider_categories and menu_items tables
 * Supports smart duplicate detection to avoid creating duplicate categories/products
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ExtractedCategory, ExtractedAddon, ExtractedVariant } from '@/types/menu-import'

export const maxDuration = 60 // 60 seconds timeout

type ImportMode = 'create_only' | 'update_existing' | 'replace_all'

interface SaveRequest {
  importId: string
  providerId: string
  categories: ExtractedCategory[]
  addons: ExtractedAddon[]
  importMode?: ImportMode // Default: 'create_only'
}

interface ExistingCategory {
  id: string
  name_ar: string
  name_en: string | null
}

interface ExistingProduct {
  id: string
  name_ar: string
  category_id: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveRequest = await request.json()
    const { importId, providerId, categories, addons, importMode = 'create_only' } = body

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

    // ═══════════════════════════════════════════════════════════════
    // FETCH EXISTING DATA FOR DUPLICATE DETECTION
    // ═══════════════════════════════════════════════════════════════

    // Fetch existing categories for this provider
    const { data: existingCategories } = await supabase
      .from('provider_categories')
      .select('id, name_ar, name_en')
      .eq('provider_id', providerId)

    // Create a map for quick lookup (normalized name -> category)
    const categoryMap = new Map<string, ExistingCategory>()
    if (existingCategories) {
      for (const cat of existingCategories) {
        const normalizedName = cat.name_ar.trim().toLowerCase()
        categoryMap.set(normalizedName, cat)
      }
    }

    // Fetch existing products for this provider
    const { data: existingProducts } = await supabase
      .from('menu_items')
      .select('id, name_ar, category_id')
      .eq('provider_id', providerId)

    // Create a map for quick lookup (categoryId + normalized name -> product)
    const productMap = new Map<string, ExistingProduct>()
    if (existingProducts) {
      for (const prod of existingProducts) {
        const key = `${prod.category_id}:${prod.name_ar.trim().toLowerCase()}`
        productMap.set(key, prod)
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // PROCESS CATEGORIES AND PRODUCTS
    // ═══════════════════════════════════════════════════════════════

    let categoriesCreated = 0
    let categoriesReused = 0
    let productsCreated = 0
    let productsUpdated = 0
    let productsSkipped = 0
    let variantsCreated = 0
    let addonsCreated = 0
    const savedCategoryIds: string[] = []
    const savedProductIds: string[] = []
    const errors: string[] = []

    for (let catIndex = 0; catIndex < categories.length; catIndex++) {
      const category = categories[catIndex]
      const normalizedCatName = category.name_ar.trim().toLowerCase()

      let categoryId: string

      // Check if category already exists
      const existingCategory = categoryMap.get(normalizedCatName)

      if (existingCategory) {
        // Reuse existing category
        categoryId = existingCategory.id
        categoriesReused++
        savedCategoryIds.push(categoryId)
      } else {
        // Create new category
        const { data: createdCategory, error: categoryError } = await supabase
          .from('provider_categories')
          .insert({
            provider_id: providerId,
            name_ar: category.name_ar.trim(),
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
          errors.push(`فشل إنشاء القسم: ${category.name_ar}`)
          continue
        }

        categoryId = createdCategory.id
        categoriesCreated++
        savedCategoryIds.push(categoryId)

        // Add to map for subsequent lookups
        categoryMap.set(normalizedCatName, {
          id: categoryId,
          name_ar: category.name_ar,
          name_en: category.name_en || null,
        })
      }

      // Process products for this category
      for (let prodIndex = 0; prodIndex < category.products.length; prodIndex++) {
        const product = category.products[prodIndex]
        const normalizedProdName = product.name_ar.trim().toLowerCase()
        const productKey = `${categoryId}:${normalizedProdName}`

        // Check if product already exists
        const existingProduct = productMap.get(productKey)

        // Determine has_variants
        const hasVariants = product.pricing_type === 'variants' && product.variants && product.variants.length > 0

        // Get base price
        let basePrice = product.price
        if (hasVariants && product.variants && product.variants.length > 0) {
          const defaultVariant = product.variants.find((v: ExtractedVariant) => v.is_default) || product.variants[0]
          basePrice = defaultVariant.price
        }

        if (existingProduct) {
          // Product exists - decide based on import mode
          if (importMode === 'update_existing') {
            // Update existing product
            const { error: updateError } = await supabase
              .from('menu_items')
              .update({
                price: basePrice || 0,
                original_price: product.original_price || null,
                description_ar: product.description_ar || null,
                has_variants: hasVariants,
                pricing_type: product.pricing_type,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingProduct.id)

            if (updateError) {
              console.error('Error updating product:', updateError)
              errors.push(`فشل تحديث المنتج: ${product.name_ar}`)
            } else {
              productsUpdated++
              savedProductIds.push(existingProduct.id)

              // Update variants if needed
              if (hasVariants && product.variants) {
                // Delete old variants and create new ones
                await supabase
                  .from('product_variants')
                  .delete()
                  .eq('product_id', existingProduct.id)

                const variantInserts = product.variants.map((variant: ExtractedVariant, varIndex: number) => ({
                  product_id: existingProduct.id,
                  variant_type: product.variant_type || 'option',
                  name_ar: variant.name_ar,
                  name_en: variant.name_en || null,
                  price: variant.price,
                  original_price: variant.original_price || null,
                  is_default: variant.is_default || varIndex === 0,
                  display_order: variant.display_order || varIndex,
                  is_available: true,
                }))

                const { data: createdVariants } = await supabase
                  .from('product_variants')
                  .insert(variantInserts)
                  .select()

                variantsCreated += createdVariants?.length || 0
              }
            }
          } else {
            // Skip existing product in 'create_only' mode
            productsSkipped++
          }
          continue
        }

        // Create new menu item
        const { data: createdProduct, error: productError } = await supabase
          .from('menu_items')
          .insert({
            provider_id: providerId,
            category_id: categoryId,
            name_ar: product.name_ar.trim(),
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
          errors.push(`فشل إنشاء المنتج: ${product.name_ar} - ${productError.message}`)
          continue
        }

        productsCreated++
        savedProductIds.push(createdProduct.id)

        // Add to map
        productMap.set(productKey, {
          id: createdProduct.id,
          name_ar: product.name_ar,
          category_id: categoryId,
        })

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
            errors.push(`فشل إنشاء خيارات المنتج: ${product.name_ar}`)
          } else {
            variantsCreated += createdVariants?.length || 0
          }
        }
      }
    }

    // Handle addons if provided (for future implementation)
    addonsCreated = addons?.length || 0

    // Determine final status
    const hasErrors = errors.length > 0
    const finalStatus = productsCreated > 0 || productsUpdated > 0 ? 'completed' : (hasErrors ? 'failed' : 'completed')

    // Update import as completed
    await supabase
      .from('menu_imports')
      .update({
        status: finalStatus,
        saved_category_ids: savedCategoryIds,
        saved_product_ids: savedProductIds,
        products_created: productsCreated,
        products_with_variants: variantsCreated > 0 ? productsCreated : 0,
        error_message: hasErrors ? errors.join('\n') : null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', importId)

    return NextResponse.json({
      success: true,
      categoriesCreated,
      categoriesReused,
      productsCreated,
      productsUpdated,
      productsSkipped,
      variantsCreated,
      addonsCreated,
      savedCategoryIds,
      savedProductIds,
      errors: hasErrors ? errors : undefined,
      message: `تم إنشاء ${productsCreated} منتج جديد${productsUpdated > 0 ? ` وتحديث ${productsUpdated}` : ''}${productsSkipped > 0 ? ` وتخطي ${productsSkipped} موجود` : ''}`,
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

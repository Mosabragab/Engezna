/**
 * Product Variants Database Operations
 * Handles CRUD operations for product_variants table
 */

import { createClient } from './client'
import type { DBProductVariant, ExtractedVariant, VariantType, PricingType } from '@/types/menu-import'

// Determine variant type from pricing type
// Note: Now pricing_type is 'fixed', 'per_unit', or 'variants'
// The actual variant_type is stored separately on the product
export function getVariantTypeFromPricingType(pricingType: PricingType, variantType?: VariantType | null): VariantType {
  if (variantType) {
    return variantType
  }
  // Default to 'option' if no variant type specified
  return 'option'
}

// Create a single variant
export async function createProductVariant(data: {
  productId: string
  variantType: VariantType
  nameAr: string
  nameEn?: string | null
  price: number
  originalPrice?: number | null
  isDefault?: boolean
  displayOrder?: number
}): Promise<{
  data: DBProductVariant | null
  error: string | null
}> {
  const supabase = createClient()

  const { data: variant, error } = await supabase
    .from('product_variants')
    .insert({
      product_id: data.productId,
      variant_type: data.variantType,
      name_ar: data.nameAr,
      name_en: data.nameEn || null,
      price: data.price,
      original_price: data.originalPrice || null,
      is_default: data.isDefault || false,
      display_order: data.displayOrder || 0,
      is_available: true,
      metadata: {},
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating product variant:', error)
    return { data: null, error: error.message }
  }

  return { data: variant as DBProductVariant, error: null }
}

// Create multiple variants for a product (batch)
export async function createProductVariants(
  productId: string,
  variants: ExtractedVariant[],
  pricingType: PricingType
): Promise<{
  data: DBProductVariant[] | null
  error: string | null
}> {
  if (!variants || variants.length === 0) {
    return { data: [], error: null }
  }

  const supabase = createClient()
  const variantType = getVariantTypeFromPricingType(pricingType)

  const insertData = variants.map((v, index) => ({
    product_id: productId,
    variant_type: variantType,
    name_ar: v.name_ar,
    name_en: v.name_en || null,
    price: v.price,
    original_price: v.original_price || null,
    is_default: v.is_default || (index === 0),
    display_order: v.display_order !== undefined ? v.display_order : index,
    is_available: true,
    metadata: {},
  }))

  const { data, error } = await supabase
    .from('product_variants')
    .insert(insertData)
    .select()

  if (error) {
    console.error('Error creating product variants:', error)
    return { data: null, error: error.message }
  }

  return { data: data as DBProductVariant[], error: null }
}

// Get all variants for a product
export async function getProductVariants(productId: string): Promise<{
  data: DBProductVariant[] | null
  error: string | null
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .eq('is_available', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching product variants:', error)
    return { data: null, error: error.message }
  }

  return { data: data as DBProductVariant[], error: null }
}

// Get single variant
export async function getProductVariant(variantId: string): Promise<{
  data: DBProductVariant | null
  error: string | null
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('id', variantId)
    .single()

  if (error) {
    console.error('Error fetching product variant:', error)
    return { data: null, error: error.message }
  }

  return { data: data as DBProductVariant, error: null }
}

// Update variant
export async function updateProductVariant(
  variantId: string,
  updates: {
    nameAr?: string
    nameEn?: string | null
    price?: number
    originalPrice?: number | null
    isDefault?: boolean
    displayOrder?: number
    isAvailable?: boolean
  }
): Promise<{
  data: DBProductVariant | null
  error: string | null
}> {
  const supabase = createClient()

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (updates.nameAr !== undefined) updateData.name_ar = updates.nameAr
  if (updates.nameEn !== undefined) updateData.name_en = updates.nameEn
  if (updates.price !== undefined) updateData.price = updates.price
  if (updates.originalPrice !== undefined) updateData.original_price = updates.originalPrice
  if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault
  if (updates.displayOrder !== undefined) updateData.display_order = updates.displayOrder
  if (updates.isAvailable !== undefined) updateData.is_available = updates.isAvailable

  const { data, error } = await supabase
    .from('product_variants')
    .update(updateData)
    .eq('id', variantId)
    .select()
    .single()

  if (error) {
    console.error('Error updating product variant:', error)
    return { data: null, error: error.message }
  }

  return { data: data as DBProductVariant, error: null }
}

// Delete variant (soft delete)
export async function deleteProductVariant(variantId: string): Promise<{
  success: boolean
  error: string | null
}> {
  const supabase = createClient()

  const { error } = await supabase
    .from('product_variants')
    .update({
      is_available: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', variantId)

  if (error) {
    console.error('Error deleting product variant:', error)
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

// Delete all variants for a product
export async function deleteProductVariants(productId: string): Promise<{
  success: boolean
  error: string | null
}> {
  const supabase = createClient()

  const { error } = await supabase
    .from('product_variants')
    .update({
      is_available: false,
      updated_at: new Date().toISOString(),
    })
    .eq('product_id', productId)

  if (error) {
    console.error('Error deleting product variants:', error)
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

// Set default variant (and unset others)
export async function setDefaultVariant(
  productId: string,
  variantId: string
): Promise<{
  success: boolean
  error: string | null
}> {
  const supabase = createClient()

  // First, unset all defaults for this product
  const { error: unsetError } = await supabase
    .from('product_variants')
    .update({ is_default: false })
    .eq('product_id', productId)

  if (unsetError) {
    console.error('Error unsetting default variants:', unsetError)
    return { success: false, error: unsetError.message }
  }

  // Then set the new default
  const { error: setError } = await supabase
    .from('product_variants')
    .update({ is_default: true })
    .eq('id', variantId)

  if (setError) {
    console.error('Error setting default variant:', setError)
    return { success: false, error: setError.message }
  }

  return { success: true, error: null }
}

// Reorder variants
export async function reorderProductVariants(
  productId: string,
  variantIds: string[]
): Promise<{
  success: boolean
  error: string | null
}> {
  const supabase = createClient()

  const updates = variantIds.map((id, index) =>
    supabase
      .from('product_variants')
      .update({ display_order: index, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('product_id', productId)
  )

  const results = await Promise.all(updates)
  const errors = results.filter(r => r.error)

  if (errors.length > 0) {
    console.error('Error reordering variants:', errors)
    return { success: false, error: 'Failed to reorder some variants' }
  }

  return { success: true, error: null }
}

// Get default variant for a product
export async function getDefaultVariant(productId: string): Promise<{
  data: DBProductVariant | null
  error: string | null
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .eq('is_default', true)
    .eq('is_available', true)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    console.error('Error fetching default variant:', error)
    return { data: null, error: error.message }
  }

  // If no default found, return the first available variant
  if (!data) {
    const { data: firstVariant, error: firstError } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', productId)
      .eq('is_available', true)
      .order('display_order', { ascending: true })
      .limit(1)
      .single()

    if (firstError && firstError.code !== 'PGRST116') {
      return { data: null, error: firstError.message }
    }

    return { data: firstVariant as DBProductVariant | null, error: null }
  }

  return { data: data as DBProductVariant, error: null }
}

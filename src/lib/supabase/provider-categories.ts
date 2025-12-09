/**
 * Provider Categories (Menu Sections) Database Operations
 * Handles CRUD operations for provider_categories table
 */

import { createClient } from './client'
import type { DBProviderCategory, ExtractedCategory } from '@/types/menu-import'

// Create a single category
export async function createProviderCategory(data: {
  providerId: string
  nameAr: string
  nameEn?: string | null
  descriptionAr?: string | null
  descriptionEn?: string | null
  icon?: string | null
  displayOrder?: number
  importId?: string | null
}): Promise<{
  data: DBProviderCategory | null
  error: string | null
}> {
  const supabase = createClient()

  const { data: category, error } = await supabase
    .from('provider_categories')
    .insert({
      provider_id: data.providerId,
      name_ar: data.nameAr,
      name_en: data.nameEn || null,
      description_ar: data.descriptionAr || null,
      description_en: data.descriptionEn || null,
      icon: data.icon || null,
      display_order: data.displayOrder || 0,
      is_active: true,
      import_id: data.importId || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating provider category:', error)
    return { data: null, error: error.message }
  }

  return { data: category as DBProviderCategory, error: null }
}

// Create multiple categories (batch)
export async function createProviderCategories(
  providerId: string,
  categories: ExtractedCategory[],
  importId?: string
): Promise<{
  data: DBProviderCategory[] | null
  error: string | null
}> {
  const supabase = createClient()

  const insertData = categories
    .filter(cat => !cat.isDeleted)
    .map((cat, index) => ({
      provider_id: providerId,
      name_ar: cat.name_ar,
      name_en: cat.name_en || null,
      description_ar: null,
      description_en: null,
      icon: cat.icon || null,
      display_order: cat.display_order || index,
      is_active: true,
      import_id: importId || null,
    }))

  if (insertData.length === 0) {
    return { data: [], error: null }
  }

  const { data, error } = await supabase
    .from('provider_categories')
    .insert(insertData)
    .select()

  if (error) {
    console.error('Error creating provider categories:', error)
    return { data: null, error: error.message }
  }

  return { data: data as DBProviderCategory[], error: null }
}

// Get all categories for a provider
export async function getProviderCategories(providerId: string): Promise<{
  data: DBProviderCategory[] | null
  error: string | null
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('provider_categories')
    .select('*')
    .eq('provider_id', providerId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching provider categories:', error)
    return { data: null, error: error.message }
  }

  return { data: data as DBProviderCategory[], error: null }
}

// Get single category
export async function getProviderCategory(categoryId: string): Promise<{
  data: DBProviderCategory | null
  error: string | null
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('provider_categories')
    .select('*')
    .eq('id', categoryId)
    .single()

  if (error) {
    console.error('Error fetching provider category:', error)
    return { data: null, error: error.message }
  }

  return { data: data as DBProviderCategory, error: null }
}

// Update category
export async function updateProviderCategory(
  categoryId: string,
  updates: {
    nameAr?: string
    nameEn?: string | null
    descriptionAr?: string | null
    descriptionEn?: string | null
    icon?: string | null
    displayOrder?: number
    isActive?: boolean
  }
): Promise<{
  data: DBProviderCategory | null
  error: string | null
}> {
  const supabase = createClient()

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (updates.nameAr !== undefined) updateData.name_ar = updates.nameAr
  if (updates.nameEn !== undefined) updateData.name_en = updates.nameEn
  if (updates.descriptionAr !== undefined) updateData.description_ar = updates.descriptionAr
  if (updates.descriptionEn !== undefined) updateData.description_en = updates.descriptionEn
  if (updates.icon !== undefined) updateData.icon = updates.icon
  if (updates.displayOrder !== undefined) updateData.display_order = updates.displayOrder
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive

  const { data, error } = await supabase
    .from('provider_categories')
    .update(updateData)
    .eq('id', categoryId)
    .select()
    .single()

  if (error) {
    console.error('Error updating provider category:', error)
    return { data: null, error: error.message }
  }

  return { data: data as DBProviderCategory, error: null }
}

// Delete category (soft delete)
export async function deleteProviderCategory(categoryId: string): Promise<{
  success: boolean
  error: string | null
}> {
  const supabase = createClient()

  const { error } = await supabase
    .from('provider_categories')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', categoryId)

  if (error) {
    console.error('Error deleting provider category:', error)
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

// Reorder categories
export async function reorderProviderCategories(
  providerId: string,
  categoryIds: string[]
): Promise<{
  success: boolean
  error: string | null
}> {
  const supabase = createClient()

  // Update each category's display order
  const updates = categoryIds.map((id, index) =>
    supabase
      .from('provider_categories')
      .update({ display_order: index, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('provider_id', providerId)
  )

  const results = await Promise.all(updates)
  const errors = results.filter(r => r.error)

  if (errors.length > 0) {
    console.error('Error reordering categories:', errors)
    return { success: false, error: 'Failed to reorder some categories' }
  }

  return { success: true, error: null }
}

// Check if category name exists for provider
export async function categoryNameExists(
  providerId: string,
  nameAr: string,
  excludeCategoryId?: string
): Promise<boolean> {
  const supabase = createClient()

  let query = supabase
    .from('provider_categories')
    .select('id')
    .eq('provider_id', providerId)
    .eq('name_ar', nameAr)
    .eq('is_active', true)

  if (excludeCategoryId) {
    query = query.neq('id', excludeCategoryId)
  }

  const { data } = await query.single()

  return !!data
}

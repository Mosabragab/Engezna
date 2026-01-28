/**
 * Business Categories Database Utilities
 * Fetches categories from the business_categories table
 *
 * NOTE: This file is for CLIENT-SIDE use only.
 * For server-side operations, use business-categories.server.ts
 */

import { createClient } from './client';

export interface BusinessCategory {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  icon: string | null;
  color: string | null;
  display_order: number;
  is_active: boolean;
}

// Gradient mapping for UI display (can be customized per category)
export const CATEGORY_GRADIENTS: Record<string, string> = {
  restaurant_cafe: 'linear-gradient(145deg, rgba(254,243,199,0.85) 0%, rgba(254,249,195,0.7) 100%)',
  coffee_patisserie:
    'linear-gradient(145deg, rgba(245,235,220,0.9) 0%, rgba(237,224,205,0.75) 100%)',
  grocery: 'linear-gradient(145deg, rgba(224,244,255,0.9) 0%, rgba(186,230,253,0.75) 100%)',
  vegetables_fruits:
    'linear-gradient(145deg, rgba(209,250,229,0.85) 0%, rgba(167,243,208,0.7) 100%)',
  pharmacy: 'linear-gradient(145deg, rgba(252,231,243,0.9) 0%, rgba(249,168,212,0.7) 100%)',
};

// Default gradient for new categories
export const DEFAULT_GRADIENT =
  'linear-gradient(145deg, rgba(241,245,249,0.9) 0%, rgba(226,232,240,0.75) 100%)';

/**
 * Get gradient for a category code
 */
export function getCategoryGradient(code: string): string {
  return CATEGORY_GRADIENTS[code] || DEFAULT_GRADIENT;
}

/**
 * Fetch all active business categories (client-side)
 */
export async function getBusinessCategories(): Promise<BusinessCategory[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('business_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) {
    console.error('[getBusinessCategories] Error:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single business category by code (client-side)
 */
export async function getBusinessCategoryByCode(code: string): Promise<BusinessCategory | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('business_categories')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('[getBusinessCategoryByCode] Error:', error);
    return null;
  }

  return data;
}

/**
 * Get category name by code and locale
 */
export function getCategoryName(
  category: BusinessCategory | null,
  locale: 'ar' | 'en' = 'ar'
): string {
  if (!category) return '';
  return locale === 'ar' ? category.name_ar : category.name_en;
}

/**
 * Get category description by locale
 */
export function getCategoryDescription(
  category: BusinessCategory | null,
  locale: 'ar' | 'en' = 'ar'
): string {
  if (!category) return '';
  return locale === 'ar' ? category.description_ar || '' : category.description_en || '';
}

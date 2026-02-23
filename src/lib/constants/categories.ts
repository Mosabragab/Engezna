/**
 * Business Categories for Engezna Platform
 * Updated: January 2026
 *
 * IMPORTANT: This file is now a FALLBACK/TYPE DEFINITIONS file.
 * The primary source of categories is the `business_categories` database table.
 *
 * Use `@/lib/supabase/business-categories.ts` for fetching categories from the database.
 * These constants are kept for:
 * - Type definitions (BusinessCategoryCode)
 * - Fallback values when database is unavailable
 * - Icon mappings (Lucide icons for UI components)
 *
 * To add a new category:
 * 1. Add it to the `business_categories` table in Supabase
 * 2. Optionally add a Lucide icon mapping in CATEGORY_ICONS below
 */

import { UtensilsCrossed, Coffee, ShoppingCart, Apple, Pill, Soup } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const BUSINESS_CATEGORIES = {
  restaurant_cafe: {
    code: 'restaurant_cafe' as const,
    name_ar: 'مطاعم',
    name_en: 'Restaurants',
    description_ar: 'مطاعم، عصائر، وجميع خدمات الطعام',
    description_en: 'Restaurants, cafes, juice shops, and all food services',
    icon: '🍔',
    color: '#FF6B35',
  },
  coffee_patisserie: {
    code: 'coffee_patisserie' as const,
    name_ar: 'البن والحلويات',
    name_en: 'Coffee & Patisserie',
    description_ar: 'محامص البن، محلات الحلويات الشرقية والغربية',
    description_en: 'Coffee roasters, Eastern and Western pastry shops',
    icon: '☕',
    color: '#8B4513',
  },
  grocery: {
    code: 'grocery' as const,
    name_ar: 'سوبر ماركت',
    name_en: 'Supermarket',
    description_ar: 'سوبر ماركت، بقالة، مواد غذائية',
    description_en: 'Supermarkets, groceries, food supplies',
    icon: '🛒',
    color: '#4CAF50',
  },
  vegetables_fruits: {
    code: 'vegetables_fruits' as const,
    name_ar: 'خضروات وفواكه',
    name_en: 'Fruits & Vegetables',
    description_ar: 'خضروات طازجة، فواكه موسمية ومستوردة',
    description_en: 'Fresh vegetables, seasonal and imported fruits',
    icon: '🍌',
    color: '#8BC34A',
  },
  pharmacy: {
    code: 'pharmacy' as const,
    name_ar: 'صيدليات',
    name_en: 'Pharmacies',
    description_ar: 'صيدليات ومستلزمات طبية',
    description_en: 'Pharmacies and medical supplies',
    icon: '💊',
    color: '#E91E63',
  },
  home_cooked: {
    code: 'home_cooked' as const,
    name_ar: 'أكل بيتي',
    name_en: 'Home Food',
    description_ar: 'أطباق منزلية طازجة يومية',
    description_en: 'Fresh daily home-cooked meals',
    icon: '🍲',
    color: '#FF9D5C',
  },
} as const;

export type BusinessCategoryCode = keyof typeof BUSINESS_CATEGORIES;

// Export as array for iteration
export const BUSINESS_CATEGORIES_LIST = Object.values(BUSINESS_CATEGORIES);

// Helper function to get category by code
export function getBusinessCategory(code: BusinessCategoryCode) {
  return BUSINESS_CATEGORIES[code];
}

// Helper function to get category name
export function getBusinessCategoryName(code: BusinessCategoryCode, locale: 'ar' | 'en' = 'ar') {
  const category = BUSINESS_CATEGORIES[code];
  return locale === 'ar' ? category.name_ar : category.name_en;
}

// Lucide icons mapping for UI components
export const CATEGORY_ICONS: Record<BusinessCategoryCode, LucideIcon> = {
  restaurant_cafe: UtensilsCrossed,
  coffee_patisserie: Coffee,
  grocery: ShoppingCart,
  vegetables_fruits: Apple,
  pharmacy: Pill,
  home_cooked: Soup,
};

// For forms and selectors
export const BUSINESS_CATEGORY_OPTIONS = [
  { value: 'restaurant_cafe', labelAr: 'مطاعم', labelEn: 'Restaurants' },
  { value: 'coffee_patisserie', labelAr: 'البن والحلويات', labelEn: 'Coffee & Patisserie' },
  { value: 'grocery', labelAr: 'سوبر ماركت', labelEn: 'Supermarket' },
  { value: 'vegetables_fruits', labelAr: 'خضروات وفواكه', labelEn: 'Fruits & Vegetables' },
  { value: 'pharmacy', labelAr: 'صيدليات', labelEn: 'Pharmacies' },
  { value: 'home_cooked', labelAr: 'أكل بيتي', labelEn: 'Home Food' },
] as const;

// Filter categories for provider browsing
export const PROVIDER_FILTER_CATEGORIES = [
  { id: 'all', name_ar: 'الكل', name_en: 'All' },
  { id: 'restaurant_cafe', name_ar: 'مطاعم', name_en: 'Restaurants' },
  { id: 'coffee_patisserie', name_ar: 'البن والحلويات', name_en: 'Coffee & Patisserie' },
  { id: 'grocery', name_ar: 'سوبر ماركت', name_en: 'Supermarket' },
  { id: 'vegetables_fruits', name_ar: 'خضروات وفواكه', name_en: 'Fruits & Vegetables' },
  { id: 'pharmacy', name_ar: 'صيدليات', name_en: 'Pharmacies' },
  { id: 'home_cooked', name_ar: 'أكل بيتي', name_en: 'Home Food' },
] as const;

-- Migration: Fix menu_items.category_id foreign key
-- The original schema had category_id referencing the old 'categories' table
-- We need it to reference 'provider_categories' which is used by the import system

-- ============================================
-- 1. DROP OLD FOREIGN KEY CONSTRAINT
-- ============================================
ALTER TABLE public.menu_items
DROP CONSTRAINT IF EXISTS menu_items_category_id_fkey;

-- ============================================
-- 2. ADD NEW FOREIGN KEY CONSTRAINT
-- Referencing provider_categories instead of categories
-- ============================================
ALTER TABLE public.menu_items
ADD CONSTRAINT menu_items_category_id_fkey
FOREIGN KEY (category_id)
REFERENCES public.provider_categories(id)
ON DELETE SET NULL;

-- ============================================
-- 3. ADD COMMENT FOR DOCUMENTATION
-- ============================================
COMMENT ON COLUMN public.menu_items.category_id IS 'References provider_categories(id) - the provider-specific category for this menu item';

-- Quick Fix: menu_items.category_id foreign key constraint
-- Run this in Supabase SQL Editor to fix the import issue
--
-- Problem: menu_items.category_id references 'categories' table
--          but import creates categories in 'provider_categories' table
-- Solution: Change FK to reference provider_categories

-- Step 1: Drop old constraint
ALTER TABLE public.menu_items
DROP CONSTRAINT IF EXISTS menu_items_category_id_fkey;

-- Step 2: Add new constraint pointing to provider_categories
ALTER TABLE public.menu_items
ADD CONSTRAINT menu_items_category_id_fkey
FOREIGN KEY (category_id)
REFERENCES public.provider_categories(id)
ON DELETE SET NULL;

-- Step 3: Clean up orphaned categories from failed imports (optional)
DELETE FROM public.provider_categories
WHERE id NOT IN (
  SELECT DISTINCT category_id FROM public.menu_items WHERE category_id IS NOT NULL
);

-- Verify the fix
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'menu_items'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'category_id';

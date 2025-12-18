-- Migration: Add is_extras column to provider_categories
-- Purpose: Allow providers to mark a category as "extras" for cross-selling in cart
-- When is_extras is true, items from this category will be suggested in the cart page

-- Add the is_extras column with default value of false
ALTER TABLE provider_categories
ADD COLUMN IF NOT EXISTS is_extras BOOLEAN DEFAULT FALSE;

-- Add a comment explaining the purpose
COMMENT ON COLUMN provider_categories.is_extras IS 'When true, items in this category will be suggested as cross-sell additions in the cart page';

-- Create an index for quick lookups of extras categories
CREATE INDEX IF NOT EXISTS idx_provider_categories_is_extras
ON provider_categories(provider_id, is_extras)
WHERE is_extras = TRUE;

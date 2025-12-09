-- Migration: Enhanced Pricing Types System
-- Adds support for multiple pricing strategies: fixed, per_unit, variants
-- Also adds unit types for per_unit pricing (kg, piece, plate, etc.)

-- ============================================
-- 1. UPDATE MENU_ITEMS TABLE
-- Add new pricing columns
-- ============================================

-- Update pricing_type to use new values
-- Old values: 'single', 'sizes', 'weights', 'options'
-- New values: 'fixed', 'per_unit', 'variants'
ALTER TABLE public.menu_items
  ALTER COLUMN pricing_type SET DEFAULT 'fixed';

-- Add variant_type column (for variants pricing)
-- Values: 'size', 'weight', 'option', 'coffee_weight'
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS variant_type VARCHAR(50);

-- Add unit_type column (for per_unit pricing)
-- Values: 'kg', 'gram', 'liter', 'piece', 'plate', 'bottle', 'box', etc.
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS unit_type VARCHAR(50);

-- Add unit_price column (price per single unit for per_unit pricing)
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10, 2);

-- Add min_quantity column (minimum order quantity)
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS min_quantity DECIMAL(10, 2) DEFAULT 1;

-- Add quantity_step column (increment step for quantity)
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS quantity_step DECIMAL(10, 2) DEFAULT 1;

-- Add price_from column (for display: "starting from X")
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS price_from DECIMAL(10, 2);

-- ============================================
-- 2. UPDATE PRODUCT_VARIANTS TABLE
-- Add multiplier column for weight-based variants
-- ============================================

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS multiplier DECIMAL(10, 3);

-- ============================================
-- 3. MIGRATE EXISTING DATA
-- Convert old pricing_type values to new ones
-- ============================================

-- Convert 'single' to 'fixed'
UPDATE public.menu_items
SET pricing_type = 'fixed'
WHERE pricing_type = 'single';

-- Convert 'sizes' to 'variants' with variant_type = 'size'
UPDATE public.menu_items
SET pricing_type = 'variants', variant_type = 'size'
WHERE pricing_type = 'sizes';

-- Convert 'weights' to 'variants' with variant_type = 'weight'
UPDATE public.menu_items
SET pricing_type = 'variants', variant_type = 'weight'
WHERE pricing_type = 'weights';

-- Convert 'options' to 'variants' with variant_type = 'option'
UPDATE public.menu_items
SET pricing_type = 'variants', variant_type = 'option'
WHERE pricing_type = 'options';

-- ============================================
-- 4. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_menu_items_pricing_type ON menu_items(pricing_type);
CREATE INDEX IF NOT EXISTS idx_menu_items_variant_type ON menu_items(variant_type);
CREATE INDEX IF NOT EXISTS idx_menu_items_unit_type ON menu_items(unit_type);

-- ============================================
-- 5. UPDATE HELPER FUNCTION
-- Get menu items with full pricing info
-- ============================================

CREATE OR REPLACE FUNCTION get_menu_items_with_pricing(p_provider_id UUID)
RETURNS TABLE (
  id UUID,
  name_ar VARCHAR,
  name_en VARCHAR,
  description_ar TEXT,
  description_en TEXT,
  price DECIMAL,
  original_price DECIMAL,
  image_url TEXT,
  has_variants BOOLEAN,
  pricing_type VARCHAR,
  variant_type VARCHAR,
  unit_type VARCHAR,
  unit_price DECIMAL,
  min_quantity DECIMAL,
  quantity_step DECIMAL,
  price_from DECIMAL,
  variants JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mi.id,
    mi.name_ar,
    mi.name_en,
    mi.description_ar,
    mi.description_en,
    mi.price,
    mi.original_price,
    mi.image_url,
    mi.has_variants,
    mi.pricing_type,
    mi.variant_type,
    mi.unit_type,
    mi.unit_price,
    mi.min_quantity,
    mi.quantity_step,
    mi.price_from,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', pv.id,
            'variant_type', pv.variant_type,
            'name_ar', pv.name_ar,
            'name_en', pv.name_en,
            'price', pv.price,
            'original_price', pv.original_price,
            'multiplier', pv.multiplier,
            'is_default', pv.is_default,
            'is_available', pv.is_available,
            'display_order', pv.display_order
          ) ORDER BY pv.display_order
        )
        FROM product_variants pv
        WHERE pv.product_id = mi.id AND pv.is_available = true
      ),
      '[]'::jsonb
    ) as variants
  FROM menu_items mi
  WHERE mi.provider_id = p_provider_id
  ORDER BY mi.display_order, mi.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_menu_items_with_pricing(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_menu_items_with_pricing(UUID) TO anon;

-- ============================================
-- 6. CREATE FUNCTION FOR PRICE CALCULATION
-- Calculate total price based on pricing type
-- ============================================

CREATE OR REPLACE FUNCTION calculate_item_price(
  p_product_id UUID,
  p_variant_id UUID DEFAULT NULL,
  p_quantity DECIMAL DEFAULT 1
)
RETURNS DECIMAL AS $$
DECLARE
  v_pricing_type VARCHAR;
  v_base_price DECIMAL;
  v_unit_price DECIMAL;
  v_variant_price DECIMAL;
  v_total DECIMAL;
BEGIN
  -- Get product info
  SELECT pricing_type, price, unit_price
  INTO v_pricing_type, v_base_price, v_unit_price
  FROM menu_items
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  CASE v_pricing_type
    WHEN 'fixed' THEN
      -- Fixed price × quantity
      v_total := COALESCE(v_base_price, 0) * p_quantity;

    WHEN 'per_unit' THEN
      -- Unit price × quantity
      v_total := COALESCE(v_unit_price, v_base_price, 0) * p_quantity;

    WHEN 'variants' THEN
      -- Get variant price
      IF p_variant_id IS NOT NULL THEN
        SELECT price INTO v_variant_price
        FROM product_variants
        WHERE id = p_variant_id;

        v_total := COALESCE(v_variant_price, 0) * p_quantity;
      ELSE
        -- Use base price if no variant specified
        v_total := COALESCE(v_base_price, 0) * p_quantity;
      END IF;

    ELSE
      v_total := COALESCE(v_base_price, 0) * p_quantity;
  END CASE;

  RETURN ROUND(v_total, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_item_price(UUID, UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_item_price(UUID, UUID, DECIMAL) TO anon;

-- ============================================
-- 7. ADD COMMENTS
-- ============================================

COMMENT ON COLUMN menu_items.pricing_type IS 'Pricing strategy: fixed (single price), per_unit (price per kg/piece), variants (multiple options)';
COMMENT ON COLUMN menu_items.variant_type IS 'For variants pricing: size (S/M/L), weight (quarter/half/kilo), option (generic), coffee_weight (100g/250g/500g)';
COMMENT ON COLUMN menu_items.unit_type IS 'For per_unit pricing: kg, gram, liter, piece, plate, bottle, box, bag, etc.';
COMMENT ON COLUMN menu_items.unit_price IS 'Price per single unit (for per_unit pricing)';
COMMENT ON COLUMN menu_items.min_quantity IS 'Minimum order quantity (e.g., 0.25 for quarter kilo)';
COMMENT ON COLUMN menu_items.quantity_step IS 'Quantity increment step (e.g., 0.25 for kg)';
COMMENT ON COLUMN menu_items.price_from IS 'Starting price for display (for variants)';
COMMENT ON COLUMN product_variants.multiplier IS 'Multiplier relative to base unit (e.g., 0.5 for half kilo)';

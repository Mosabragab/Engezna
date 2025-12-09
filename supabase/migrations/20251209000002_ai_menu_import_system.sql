-- Migration: AI Menu Import System
-- Creates tables for menu imports, provider categories, and product variants

-- ============================================
-- 1. MENU_IMPORTS TABLE
-- Stores AI menu import sessions
-- ============================================
CREATE TABLE IF NOT EXISTS public.menu_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,

  -- Import status
  status VARCHAR(50) NOT NULL DEFAULT 'uploading', -- uploading, processing, review, saving, completed, failed

  -- Uploaded images (array of objects with storagePath, publicUrl, etc.)
  uploaded_images JSONB DEFAULT '[]'::jsonb,

  -- Extracted data from AI
  extracted_data JSONB DEFAULT '{}'::jsonb,

  -- Final reviewed/edited data
  final_data JSONB DEFAULT '{}'::jsonb,

  -- Statistics
  total_items INTEGER DEFAULT 0,
  reviewed_items INTEGER DEFAULT 0,
  products_created INTEGER DEFAULT 0,
  products_with_variants INTEGER DEFAULT 0,

  -- References to created items
  saved_category_ids UUID[] DEFAULT '{}',
  saved_product_ids UUID[] DEFAULT '{}',

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_menu_imports_provider ON menu_imports(provider_id);
CREATE INDEX IF NOT EXISTS idx_menu_imports_status ON menu_imports(status);
CREATE INDEX IF NOT EXISTS idx_menu_imports_created ON menu_imports(created_at DESC);

-- Enable RLS
ALTER TABLE menu_imports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for menu_imports
CREATE POLICY "Providers can create own imports"
  ON menu_imports FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Providers can view own imports"
  ON menu_imports FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Providers can update own imports"
  ON menu_imports FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Providers can delete own imports"
  ON menu_imports FOR DELETE
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- 2. PROVIDER_CATEGORIES TABLE
-- Stores menu sections/categories for each provider
-- ============================================
CREATE TABLE IF NOT EXISTS public.provider_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,

  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  description_ar TEXT,
  description_en TEXT,

  icon VARCHAR(100), -- Icon name or emoji
  image_url TEXT,

  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- Reference to import session (if created via AI import)
  import_id UUID REFERENCES public.menu_imports(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_provider_categories_provider ON provider_categories(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_categories_active ON provider_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_provider_categories_order ON provider_categories(display_order);

-- Enable RLS
ALTER TABLE provider_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for provider_categories
CREATE POLICY "Anyone can view active provider categories"
  ON provider_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Providers can manage own categories"
  ON provider_categories FOR ALL
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- 3. PRODUCT_VARIANTS TABLE
-- Stores variants (sizes, weights, options) for menu items
-- ============================================
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,

  variant_type VARCHAR(50) NOT NULL, -- 'size', 'weight', 'option'

  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),

  price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2), -- For discounts

  is_default BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_type ON product_variants(variant_type);
CREATE INDEX IF NOT EXISTS idx_product_variants_default ON product_variants(is_default);
CREATE INDEX IF NOT EXISTS idx_product_variants_available ON product_variants(is_available);

-- Enable RLS
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_variants
CREATE POLICY "Anyone can view available product variants"
  ON product_variants FOR SELECT
  USING (is_available = true);

CREATE POLICY "Providers can manage own product variants"
  ON product_variants FOR ALL
  USING (
    product_id IN (
      SELECT mi.id FROM menu_items mi
      JOIN providers pr ON mi.provider_id = pr.id
      WHERE pr.owner_id = auth.uid()
    )
  );

-- ============================================
-- 4. UPDATE MENU_ITEMS TABLE
-- Add columns to support variants and AI import
-- ============================================
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pricing_type VARCHAR(50) DEFAULT 'single', -- 'single', 'sizes', 'weights', 'options'
  ADD COLUMN IF NOT EXISTS combo_contents_ar TEXT,
  ADD COLUMN IF NOT EXISTS serves_count VARCHAR(50),
  ADD COLUMN IF NOT EXISTS import_id UUID REFERENCES public.menu_imports(id) ON DELETE SET NULL;

-- Index for variants and import
CREATE INDEX IF NOT EXISTS idx_menu_items_has_variants ON menu_items(has_variants);
CREATE INDEX IF NOT EXISTS idx_menu_items_import ON menu_items(import_id);

-- ============================================
-- 5. CREATE STORAGE BUCKET FOR MENU IMPORTS
-- ============================================
-- Note: This needs to be done via Supabase Dashboard or using their API
-- The bucket name should be 'menu-imports'

-- Storage policy SQL (run in Supabase SQL editor):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('menu-imports', 'menu-imports', true);
--
-- CREATE POLICY "Providers can upload menu images"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'menu-imports' AND
--     auth.uid() IN (
--       SELECT owner_id FROM providers WHERE id::text = (storage.foldername(name))[2]
--     )
--   );
--
-- CREATE POLICY "Anyone can view menu images"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'menu-imports');

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function to get menu items with their variants
CREATE OR REPLACE FUNCTION get_menu_items_with_variants(p_provider_id UUID)
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
GRANT EXECUTE ON FUNCTION get_menu_items_with_variants(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_menu_items_with_variants(UUID) TO anon;

COMMENT ON TABLE menu_imports IS 'Stores AI menu import sessions for providers';
COMMENT ON TABLE provider_categories IS 'Menu categories/sections for each provider';
COMMENT ON TABLE product_variants IS 'Product variants (sizes, weights, options)';

-- ============================================================================
-- P3: Promotions Table Documentation Migration
-- Documents the existing `promotions` table structure used by providers
-- Uses IF NOT EXISTS to be safe with existing databases
-- ============================================================================

-- The promotions table stores provider-managed promotional offers
-- (separate from promo_codes which are admin-managed discount codes)
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  type TEXT NOT NULL DEFAULT 'percentage' CHECK (type IN ('percentage', 'fixed', 'buy_x_get_y')),
  discount_value NUMERIC NOT NULL DEFAULT 0,
  buy_quantity INTEGER,
  get_quantity INTEGER,
  max_discount NUMERIC,
  min_order_amount NUMERIC DEFAULT 0,
  applies_to TEXT NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'specific')),
  product_ids UUID[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_promotions_provider ON public.promotions(provider_id);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON public.promotions(is_active) WHERE is_active = true;

-- Documentation comments
COMMENT ON TABLE public.promotions IS 'Provider-managed promotional offers (percentage, fixed, buy X get Y)';
COMMENT ON COLUMN public.promotions.type IS 'percentage = % off, fixed = EGP off, buy_x_get_y = bundle deal';
COMMENT ON COLUMN public.promotions.applies_to IS 'all = entire menu, specific = only product_ids';
COMMENT ON COLUMN public.promotions.product_ids IS 'Array of menu_item UUIDs when applies_to = specific';

-- Homepage Banners System
-- Allows admins to manage promotional banners on the homepage carousel

-- Create enum for image position
CREATE TYPE banner_image_position AS ENUM ('start', 'end', 'background');

-- Create homepage_banners table
CREATE TABLE IF NOT EXISTS homepage_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content (Bilingual)
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,

  -- Visual Assets
  image_url TEXT,                                    -- Product image (PNG transparent preferred)
  background_color TEXT DEFAULT '#009DE0',           -- Fallback solid color
  gradient_start TEXT DEFAULT '#009DE0',             -- Gradient start color
  gradient_end TEXT DEFAULT '#0077B6',               -- Gradient end color

  -- Badge/Discount Display
  badge_text_ar TEXT,                                -- e.g., "خصم ٣٠٪"
  badge_text_en TEXT,                                -- e.g., "30% OFF"
  has_glassmorphism BOOLEAN DEFAULT true,            -- Glass effect on badge

  -- CTA Button
  cta_text_ar TEXT DEFAULT 'اطلب الآن',
  cta_text_en TEXT DEFAULT 'Order Now',

  -- Link Configuration
  link_url TEXT,                                     -- Full URL or relative path
  link_type TEXT DEFAULT 'provider',                 -- provider, category, promo, external
  link_id TEXT,                                      -- Provider ID or Category slug

  -- Layout Options
  image_position banner_image_position DEFAULT 'end', -- Where to place the product image

  -- Countdown/Flash Sale
  is_countdown_active BOOLEAN DEFAULT false,          -- Show countdown timer
  countdown_end_time TIMESTAMPTZ,                     -- When countdown ends

  -- Display Control
  display_order INT DEFAULT 0,                        -- Sort order (lower = first)
  is_active BOOLEAN DEFAULT true,                     -- Enable/disable banner

  -- Scheduling
  starts_at TIMESTAMPTZ DEFAULT now(),                -- When to start showing
  ends_at TIMESTAMPTZ,                                -- When to stop showing (NULL = forever)

  -- Targeting (Optional - for future use)
  target_governorates UUID[] DEFAULT NULL,            -- Specific governorates or NULL for all
  target_categories TEXT[] DEFAULT NULL,              -- Specific categories or NULL for all

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_homepage_banners_active ON homepage_banners(is_active) WHERE is_active = true;
CREATE INDEX idx_homepage_banners_display_order ON homepage_banners(display_order);
CREATE INDEX idx_homepage_banners_schedule ON homepage_banners(starts_at, ends_at);

-- Enable RLS
ALTER TABLE homepage_banners ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone can read active banners (for the public homepage)
CREATE POLICY "Anyone can view active banners"
  ON homepage_banners FOR SELECT
  USING (
    is_active = true
    AND starts_at <= now()
    AND (ends_at IS NULL OR ends_at >= now())
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all banners"
  ON homepage_banners FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_homepage_banners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER homepage_banners_updated_at
  BEFORE UPDATE ON homepage_banners
  FOR EACH ROW
  EXECUTE FUNCTION update_homepage_banners_updated_at();

-- Insert sample banners matching brand guidelines
INSERT INTO homepage_banners (
  title_ar, title_en,
  description_ar, description_en,
  badge_text_ar, badge_text_en,
  gradient_start, gradient_end,
  cta_text_ar, cta_text_en,
  link_type, link_url,
  image_position, display_order,
  has_glassmorphism, is_active
) VALUES
(
  'عرض بيتزا السلطان',
  'Sultan Pizza Offer',
  'خصم ٣٠٪ على جميع البيتزا',
  '30% off all pizzas',
  'خصم ٣٠٪',
  '30% OFF',
  '#009DE0', '#0077B6',
  'اطلب الآن', 'Order Now',
  'category', '/providers?category=restaurants',
  'end', 1,
  true, true
),
(
  'توصيل مجاني',
  'Free Delivery',
  'على الطلبات فوق ١٠٠ ج.م من لافندر كافيه',
  'On orders over 100 EGP from Lavender Cafe',
  'توصيل مجاني',
  'Free Delivery',
  '#0088CC', '#005A8C',
  'اطلب الآن', 'Order Now',
  'category', '/providers?category=coffee_desserts',
  'end', 2,
  true, true
),
(
  'عصائر الشفا',
  'Al-Shifa Juices',
  'اشتري ١ واحصل على ١ مجاناً',
  'Buy 1 Get 1 Free on all juices',
  'اشتري ١ واحصل ١',
  'Buy 1 Get 1',
  '#0077B6', '#005580',
  'اطلب الآن', 'Order Now',
  'category', '/providers?category=vegetables_fruits',
  'end', 3,
  true, true
);

-- Comment on table
COMMENT ON TABLE homepage_banners IS 'Promotional banners for the homepage carousel, managed by admins';

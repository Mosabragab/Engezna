-- ═══════════════════════════════════════════════════════════════════════════
-- Add image_size column and 'center' position to homepage_banners
-- ═══════════════════════════════════════════════════════════════════════════

-- Add 'center' value to the banner_image_position enum
ALTER TYPE banner_image_position ADD VALUE IF NOT EXISTS 'center';

-- Create enum for image size
DO $$ BEGIN
  CREATE TYPE banner_image_size AS ENUM ('small', 'medium', 'large');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add image_size column to homepage_banners
ALTER TABLE public.homepage_banners
ADD COLUMN IF NOT EXISTS image_size banner_image_size DEFAULT 'medium';

-- Comment
COMMENT ON COLUMN public.homepage_banners.image_size IS 'Size of the product image: small, medium, large';

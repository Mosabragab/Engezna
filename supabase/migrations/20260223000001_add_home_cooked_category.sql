-- Add home_cooked category to business_categories table
-- February 2026 - أكل بيتي (Home-Cooked Food)

-- Add the new category value to the provider_category enum type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'home_cooked'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'provider_category')
  ) THEN
    ALTER TYPE provider_category ADD VALUE IF NOT EXISTS 'home_cooked';
  END IF;
END
$$;

-- Insert into business_categories table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'business_categories') THEN
    INSERT INTO business_categories (code, name_ar, name_en, description_ar, description_en, icon, color, display_order, is_active)
    VALUES (
      'home_cooked',
      'أكل بيتي',
      'Home Food',
      'أطباق منزلية طازجة يومية',
      'Fresh daily home-cooked meals',
      '🍲',
      '#FF9D5C',
      6,
      true
    )
    ON CONFLICT (code) DO NOTHING;
  END IF;
END
$$;

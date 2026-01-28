-- =============================================
-- SDUI Search Results Section Types
-- =============================================

-- Add search-related section types
DO $$
BEGIN
  -- Search header section
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'search_header'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'homepage_section_type')
  ) THEN
    ALTER TYPE homepage_section_type ADD VALUE 'search_header';
  END IF;

  -- Search input section
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'search_input'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'homepage_section_type')
  ) THEN
    ALTER TYPE homepage_section_type ADD VALUE 'search_input';
  END IF;

  -- Search tabs section (All, Stores, Products)
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'search_tabs'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'homepage_section_type')
  ) THEN
    ALTER TYPE homepage_section_type ADD VALUE 'search_tabs';
  END IF;

  -- Search stores results section
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'search_stores'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'homepage_section_type')
  ) THEN
    ALTER TYPE homepage_section_type ADD VALUE 'search_stores';
  END IF;

  -- Search products results section
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'search_products'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'homepage_section_type')
  ) THEN
    ALTER TYPE homepage_section_type ADD VALUE 'search_products';
  END IF;

  -- Search suggestions section
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'search_suggestions'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'homepage_section_type')
  ) THEN
    ALTER TYPE homepage_section_type ADD VALUE 'search_suggestions';
  END IF;

  -- Search empty state section
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'search_empty'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'homepage_section_type')
  ) THEN
    ALTER TYPE homepage_section_type ADD VALUE 'search_empty';
  END IF;
END $$;

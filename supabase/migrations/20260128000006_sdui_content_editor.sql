-- =============================================
-- SDUI Content Editor & Custom Sections
-- Phase 2.2: Rich text editor and banner designer
-- =============================================

-- Add new section types for custom content
DO $$
BEGIN
  -- Add custom_html type
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'custom_html'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'homepage_section_type')
  ) THEN
    ALTER TYPE homepage_section_type ADD VALUE 'custom_html';
  END IF;

  -- Add custom_banner type
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'custom_banner'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'homepage_section_type')
  ) THEN
    ALTER TYPE homepage_section_type ADD VALUE 'custom_banner';
  END IF;
END $$;

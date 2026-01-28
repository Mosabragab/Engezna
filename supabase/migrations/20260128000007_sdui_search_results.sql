-- =============================================
-- SDUI Search Results Page
-- Phase 2.3: Server-Driven UI for search results
-- =============================================

-- Add search_results page type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'search_results'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'sdui_page_type')
  ) THEN
    ALTER TYPE sdui_page_type ADD VALUE 'search_results';
  END IF;
END $$;

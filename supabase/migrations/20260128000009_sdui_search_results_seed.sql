-- =============================================
-- SDUI Search Results Page Seed Data
-- =============================================

-- Insert search results page sections
INSERT INTO public.homepage_sections (
  page,
  section_type,
  section_key,
  title_ar,
  title_en,
  config,
  content,
  display_order,
  is_visible
) VALUES
-- Search Header
(
  'search_results',
  'search_header',
  'search_header',
  'عنوان البحث',
  'Search Header',
  '{"showBackButton": true}'::jsonb,
  '{"title_ar": "البحث", "title_en": "Search"}'::jsonb,
  1,
  true
),
-- Search Input
(
  'search_results',
  'search_input',
  'search_input',
  'حقل البحث',
  'Search Input',
  '{"autoFocus": true, "showClearButton": true}'::jsonb,
  '{"placeholder_ar": "ابحث عن متجر أو منتج...", "placeholder_en": "Search for store or product..."}'::jsonb,
  2,
  true
),
-- Search Tabs
(
  'search_results',
  'search_tabs',
  'search_tabs',
  'تبويبات البحث',
  'Search Tabs',
  '{"defaultTab": "all"}'::jsonb,
  '{"tabs": [
    {"key": "all", "label_ar": "الكل", "label_en": "All"},
    {"key": "stores", "label_ar": "متاجر", "label_en": "Stores", "icon": "store"},
    {"key": "products", "label_ar": "منتجات", "label_en": "Products", "icon": "shopping-bag"}
  ]}'::jsonb,
  3,
  true
),
-- Search Stores Results
(
  'search_results',
  'search_stores',
  'search_stores',
  'نتائج المتاجر',
  'Stores Results',
  '{"maxItems": 3, "showViewAll": true, "cardStyle": "default"}'::jsonb,
  '{"title_ar": "المتاجر", "title_en": "Stores", "viewAllText_ar": "عرض الكل", "viewAllText_en": "View all"}'::jsonb,
  4,
  true
),
-- Search Products Results
(
  'search_results',
  'search_products',
  'search_products',
  'نتائج المنتجات',
  'Products Results',
  '{"maxItems": 4, "showViewAll": true, "showAddToCart": true}'::jsonb,
  '{"title_ar": "المنتجات", "title_en": "Products", "viewAllText_ar": "عرض الكل", "viewAllText_en": "View all"}'::jsonb,
  5,
  true
),
-- Search Suggestions (for empty state before search)
(
  'search_results',
  'search_suggestions',
  'search_suggestions',
  'اقتراحات البحث',
  'Search Suggestions',
  '{"showPopular": true, "showRecent": true, "maxSuggestions": 5}'::jsonb,
  '{"title_ar": "ابحث عن أي شيء", "title_en": "Search for anything", "description_ar": "ابحث في المتاجر والمنتجات المتاحة في منطقتك", "description_en": "Search stores and products available in your area"}'::jsonb,
  6,
  true
),
-- Search Empty State
(
  'search_results',
  'search_empty',
  'search_empty',
  'لا توجد نتائج',
  'No Results',
  '{"showSuggestions": true}'::jsonb,
  '{"title_ar": "لا توجد نتائج", "title_en": "No results found", "description_ar": "جرب كلمات أخرى", "description_en": "Try different keywords"}'::jsonb,
  7,
  true
)
ON CONFLICT (section_key) DO NOTHING;

-- Save initial version
INSERT INTO public.homepage_layout_versions (
  page,
  version_name,
  snapshot,
  created_by
)
SELECT
  'search_results',
  'Initial search page layout',
  jsonb_agg(
    jsonb_build_object(
      'id', id,
      'section_key', section_key,
      'section_type', section_type,
      'title_ar', title_ar,
      'title_en', title_en,
      'display_order', display_order,
      'is_visible', is_visible,
      'config', config,
      'content', content
    )
    ORDER BY display_order
  ),
  NULL
FROM public.homepage_sections
WHERE page = 'search_results';

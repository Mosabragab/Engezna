-- ============================================================================
-- Add Dessert/Sweet Synonyms for Better Search
-- ============================================================================
-- Problem: Searching for "حلويات" or "حلو" doesn't find sweet items like
-- فطيرة نوتيلا, فطيرة شوكولاتة, etc.
-- Solution: Add comprehensive synonyms for desserts and sweets

-- Add dessert synonyms
INSERT INTO arabic_synonyms (term, synonyms, category) VALUES
  -- حلويات = desserts/sweets
  ('حلويات', ARRAY[
    'حلو', 'حلوى', 'سويت', 'ديزرت', 'dessert', 'sweet',
    'شوكولاتة', 'شوكولاته', 'شيكولاتة', 'chocolate',
    'نوتيلا', 'nutella',
    'لوتس', 'lotus',
    'كريمة', 'قشطة', 'قشطه', 'cream',
    'عسل', 'honey',
    'سكر', 'sugar',
    'موز', 'banana',
    'فراولة', 'فراوله', 'strawberry',
    'كيك', 'كيكة', 'cake',
    'تشيز كيك', 'cheesecake',
    'بسبوسة', 'بسبوسه',
    'كنافة', 'كنافه',
    'بقلاوة', 'بقلاوه',
    'ايس كريم', 'آيس كريم', 'جيلاتي', 'ice cream',
    'بان كيك', 'بانكيك', 'pancake',
    'وافل', 'waffle',
    'كريب حلو', 'كريب سويت'
  ], 'food'),

  -- حلو = sweet (simpler synonym)
  ('حلو', ARRAY[
    'حلويات', 'حلوى', 'سويت', 'ديزرت',
    'شوكولاتة', 'نوتيلا', 'لوتس', 'قشطة', 'عسل', 'سكر'
  ], 'food'),

  -- شوكولاتة variations
  ('شوكولاتة', ARRAY['شوكولاته', 'شيكولاتة', 'شيكولاته', 'chocolate', 'نوتيلا'], 'food'),

  -- قشطة variations
  ('قشطة', ARRAY['قشطه', 'كريمة', 'كريم', 'cream'], 'food'),

  -- كريب = crepe
  ('كريب', ARRAY['كريبة', 'كريبات', 'crepe', 'crepes'], 'food'),

  -- وافل = waffle
  ('وافل', ARRAY['وافلز', 'waffle', 'waffles'], 'food'),

  -- بان كيك = pancake
  ('بان كيك', ARRAY['بانكيك', 'بان كيكس', 'pancake', 'pancakes'], 'food')

ON CONFLICT (term) DO UPDATE SET
  synonyms = EXCLUDED.synonyms,
  category = EXCLUDED.category;

-- Also add reverse lookups for common sweet ingredients
-- so searching for "نوتيلا" also finds حلويات category items
INSERT INTO arabic_synonyms (term, synonyms, category) VALUES
  ('نوتيلا', ARRAY['nutella', 'شوكولاتة', 'حلو', 'حلويات'], 'food'),
  ('لوتس', ARRAY['lotus', 'بسكويت لوتس', 'حلو', 'حلويات'], 'food'),
  ('عسل', ARRAY['honey', 'عسل نحل', 'حلو'], 'food')
ON CONFLICT (term) DO UPDATE SET
  synonyms = EXCLUDED.synonyms,
  category = EXCLUDED.category;

COMMENT ON TABLE arabic_synonyms IS 'Arabic food term synonyms for improved search. Updated 2025-12-17 with dessert/sweet synonyms.';

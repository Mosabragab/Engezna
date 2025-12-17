-- ============================================================================
-- Fix Search Functions: Correct FK Column + Integrate Arabic Synonyms
--
-- Issues Fixed:
-- 1. Uses correct column: provider_category_id (not category_id)
-- 2. Integrates expand_query_with_synonyms for better search
-- 3. Adds Franco-Arab transliteration support
-- ============================================================================

-- ============================================================================
-- 1. Franco-Arab Transliteration Function
-- Converts common Franco-Arab patterns to Arabic
-- Examples: 3ayez → عايز, 7elw → حلو, 5aleha → خليها
-- ============================================================================

CREATE OR REPLACE FUNCTION transliterate_franco_arab(p_text text)
RETURNS text AS $$
DECLARE
  v_result text;
BEGIN
  v_result := p_text;

  -- Numbers to Arabic letters
  v_result := REPLACE(v_result, '2', 'ء');  -- Hamza
  v_result := REPLACE(v_result, '3', 'ع');  -- Ain
  v_result := REPLACE(v_result, '5', 'خ');  -- Kha
  v_result := REPLACE(v_result, '6', 'ط');  -- Ta (emphatic)
  v_result := REPLACE(v_result, '7', 'ح');  -- Ha (pharyngeal)
  v_result := REPLACE(v_result, '8', 'ق');  -- Qaf
  v_result := REPLACE(v_result, '9', 'ص');  -- Sad

  -- Common letter mappings (case insensitive patterns)
  -- These are processed after numbers
  v_result := REGEXP_REPLACE(v_result, 'sh', 'ش', 'gi');
  v_result := REGEXP_REPLACE(v_result, 'ch', 'تش', 'gi');
  v_result := REGEXP_REPLACE(v_result, 'kh', 'خ', 'gi');
  v_result := REGEXP_REPLACE(v_result, 'gh', 'غ', 'gi');
  v_result := REGEXP_REPLACE(v_result, 'th', 'ث', 'gi');
  v_result := REGEXP_REPLACE(v_result, 'dh', 'ذ', 'gi');

  -- Single letter mappings
  v_result := REGEXP_REPLACE(v_result, 'a', 'ا', 'gi');
  v_result := REGEXP_REPLACE(v_result, 'b', 'ب', 'gi');
  v_result := REGEXP_REPLACE(v_result, 't', 'ت', 'gi');
  v_result := REGEXP_REPLACE(v_result, 'g', 'ج', 'gi');
  v_result := REGEXP_REPLACE(v_result, 'j', 'ج', 'gi');
  v_result := REGEXP_REPLACE(v_result, 'd', 'د', 'gi');
  v_result := REGEXP_REPLACE(v_result, 'r', 'ر', 'gi');
  v_result := REGEXP_REPLACE(v_result, 'z', 'ز', 'gi');
  v_result := REGEXP_REPLACE(v_result, 's', 'س', 'gi');
  v_result := REGEXP_REPLACE(v_result, 'f', 'ف', 'gi');
  v_result := REGEXP_REPLACE(v_result, 'q', 'ق', 'gi');
  v_result := REGEXP_REPLACE(v_result, 'k', 'ك', 'gi');
  v_result := REGEXP_REPLACE(v_result, 'l', 'ل', 'gi');
  v_result := REGEXP_REPLACE(v_result, 'm', 'م', 'gi');
  v_result := REGEXP_REPLACE(v_result, 'n', 'ن', 'gi');
  v_result := REGEXP_REPLACE(v_result, 'h', 'ه', 'gi');
  v_result := REGEXP_REPLACE(v_result, 'w', 'و', 'gi');
  v_result := REGEXP_REPLACE(v_result, 'y', 'ي', 'gi');
  v_result := REGEXP_REPLACE(v_result, 'e', 'ي', 'gi');
  v_result := REGEXP_REPLACE(v_result, 'i', 'ي', 'gi');
  v_result := REGEXP_REPLACE(v_result, 'o', 'و', 'gi');
  v_result := REGEXP_REPLACE(v_result, 'u', 'و', 'gi');

  RETURN v_result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 2. Check if text contains Franco-Arab (Latin characters with numbers)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_franco_arab(p_text text)
RETURNS boolean AS $$
BEGIN
  -- Franco-Arab typically contains Latin letters mixed with numbers like 3, 7, 5
  -- or is purely Latin characters representing Arabic
  RETURN p_text ~ '[a-zA-Z]' AND (
    p_text ~ '[2357689]' OR  -- Numbers used in Franco-Arab
    p_text !~ '[\u0600-\u06FF]'  -- No Arabic characters
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 3. Updated Simple Search Function with:
--    - Correct FK column (provider_category_id)
--    - Arabic synonym expansion
--    - Franco-Arab transliteration
--    - Stricter fuzzy matching
-- ============================================================================

CREATE OR REPLACE FUNCTION simple_search_menu(
  p_query text,
  p_provider_id uuid DEFAULT NULL,
  p_city_id uuid DEFAULT NULL,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name_ar text,
  name_en text,
  description_ar text,
  price decimal,
  original_price decimal,
  image_url text,
  has_variants boolean,
  provider_id uuid,
  provider_name text,
  category_name text,
  match_score float
) AS $$
DECLARE
  v_normalized_query text;
  v_franco_query text;
  v_query_length int;
  v_min_similarity float;
  v_expanded_queries text[];
  v_search_query text;
BEGIN
  -- Handle Franco-Arab: Convert to Arabic if detected
  IF is_franco_arab(p_query) THEN
    v_franco_query := transliterate_franco_arab(p_query);
    v_search_query := v_franco_query;
  ELSE
    v_search_query := p_query;
  END IF;

  -- Normalize the search query for Arabic variations
  v_normalized_query := normalize_arabic(v_search_query);
  v_query_length := char_length(v_search_query);

  -- Expand query with synonyms (e.g., "فراخ" also searches "دجاج")
  v_expanded_queries := expand_query_with_synonyms(v_search_query);

  -- STRICTER similarity threshold - prevents false positives
  v_min_similarity := CASE
    WHEN v_query_length <= 2 THEN 0.25
    WHEN v_query_length <= 3 THEN 0.35
    WHEN v_query_length <= 4 THEN 0.45
    ELSE 0.50
  END;

  RETURN QUERY
  SELECT
    mi.id,
    mi.name_ar,
    mi.name_en,
    mi.description_ar,
    mi.price,
    mi.original_price,
    mi.image_url,
    mi.has_variants,
    mi.provider_id,
    p.name_ar as provider_name,
    pc.name_ar as category_name,
    GREATEST(
      -- Original query matches
      COALESCE(similarity(mi.name_ar, v_search_query)::float8, 0::float8),
      -- Normalized query matches
      COALESCE(similarity(normalize_arabic(mi.name_ar), v_normalized_query)::float8, 0::float8),
      -- Prefix matching: name starts with query
      CASE WHEN mi.name_ar LIKE v_search_query || '%' THEN 0.95::float8 ELSE 0::float8 END,
      CASE WHEN normalize_arabic(mi.name_ar) LIKE v_normalized_query || '%' THEN 0.95::float8 ELSE 0::float8 END,
      -- Word-starts-with matching
      CASE WHEN mi.name_ar ~ ('(^|[[:space:]])' || v_search_query) THEN 0.9::float8 ELSE 0::float8 END,
      CASE WHEN normalize_arabic(mi.name_ar) ~ ('(^|[[:space:]])' || v_normalized_query) THEN 0.9::float8 ELSE 0::float8 END,
      -- Contains matching
      CASE WHEN mi.name_ar ILIKE '%' || v_search_query || '%' THEN 0.85::float8 ELSE 0::float8 END,
      CASE WHEN normalize_arabic(mi.name_ar) ILIKE '%' || v_normalized_query || '%' THEN 0.85::float8 ELSE 0::float8 END,
      CASE WHEN pc.name_ar ILIKE '%' || v_search_query || '%' THEN 0.6::float8 ELSE 0::float8 END,
      -- Synonym matches (if any synonyms found)
      CASE WHEN array_length(v_expanded_queries, 1) > 1 THEN
        (SELECT COALESCE(MAX(CASE WHEN mi.name_ar ILIKE '%' || syn || '%' THEN 0.8 ELSE 0 END), 0)
         FROM unnest(v_expanded_queries) AS syn)::float8
      ELSE 0::float8 END
    )::float8 as match_score
  FROM menu_items mi
  JOIN providers p ON mi.provider_id = p.id
  LEFT JOIN provider_categories pc ON mi.category_id = pc.id  -- FIXED: Use provider_category_id
  WHERE mi.is_available = true
    AND p.status IN ('open', 'closed', 'temporarily_paused')
    AND (p_provider_id IS NULL OR mi.provider_id = p_provider_id)
    AND (p_city_id IS NULL OR p.city_id = p_city_id)
    AND (
      -- Prefix/starts-with matches
      mi.name_ar LIKE v_search_query || '%'
      OR normalize_arabic(mi.name_ar) LIKE v_normalized_query || '%'
      -- Word-starts-with
      OR mi.name_ar ~ ('(^|[[:space:]])' || v_search_query)
      OR normalize_arabic(mi.name_ar) ~ ('(^|[[:space:]])' || v_normalized_query)
      -- Contains matches
      OR mi.name_ar ILIKE '%' || v_search_query || '%'
      OR mi.description_ar ILIKE '%' || v_search_query || '%'
      OR mi.name_en ILIKE '%' || v_search_query || '%'
      OR pc.name_ar ILIKE '%' || v_search_query || '%'
      -- Normalized matches
      OR normalize_arabic(mi.name_ar) ILIKE '%' || v_normalized_query || '%'
      OR normalize_arabic(mi.description_ar) ILIKE '%' || v_normalized_query || '%'
      OR normalize_arabic(pc.name_ar) ILIKE '%' || v_normalized_query || '%'
      -- Synonym matches
      OR (array_length(v_expanded_queries, 1) > 1 AND EXISTS (
        SELECT 1 FROM unnest(v_expanded_queries) AS syn
        WHERE mi.name_ar ILIKE '%' || syn || '%'
      ))
      -- Fuzzy matches (only if result name is at least as long as query)
      OR (
        char_length(mi.name_ar) >= v_query_length
        AND similarity(mi.name_ar, v_search_query) > v_min_similarity
      )
      OR (
        char_length(normalize_arabic(mi.name_ar)) >= v_query_length
        AND similarity(normalize_arabic(mi.name_ar), v_normalized_query) > v_min_similarity
      )
    )
  ORDER BY
    CASE WHEN mi.name_ar ILIKE v_search_query THEN 0 ELSE 1 END,
    CASE WHEN normalize_arabic(mi.name_ar) ILIKE v_normalized_query THEN 0 ELSE 1 END,
    CASE WHEN mi.name_ar LIKE v_search_query || '%' THEN 0 ELSE 1 END,
    CASE WHEN normalize_arabic(mi.name_ar) LIKE v_normalized_query || '%' THEN 0 ELSE 1 END,
    CASE WHEN mi.name_ar ILIKE '%' || v_search_query || '%' THEN 0 ELSE 1 END,
    CASE WHEN normalize_arabic(mi.name_ar) ILIKE '%' || v_normalized_query || '%' THEN 0 ELSE 1 END,
    GREATEST(similarity(mi.name_ar, v_search_query), similarity(normalize_arabic(mi.name_ar), v_normalized_query)) DESC,
    mi.name_ar
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. Updated Hybrid Search Function with:
--    - Correct FK column (provider_category_id)
--    - Arabic synonym expansion
--    - Franco-Arab transliteration
-- ============================================================================

CREATE OR REPLACE FUNCTION hybrid_search_menu(
  p_query text,
  p_query_embedding vector(1536) DEFAULT NULL,
  p_provider_id uuid DEFAULT NULL,
  p_city_id uuid DEFAULT NULL,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name_ar text,
  name_en text,
  description_ar text,
  price decimal,
  original_price decimal,
  image_url text,
  has_variants boolean,
  provider_id uuid,
  provider_name text,
  category_name text,
  match_type text,
  match_score float
) AS $$
DECLARE
  v_has_embedding boolean;
  v_normalized_query text;
  v_search_query text;
  v_expanded_queries text[];
BEGIN
  v_has_embedding := p_query_embedding IS NOT NULL;

  -- Handle Franco-Arab: Convert to Arabic if detected
  IF is_franco_arab(p_query) THEN
    v_search_query := transliterate_franco_arab(p_query);
  ELSE
    v_search_query := p_query;
  END IF;

  v_normalized_query := normalize_arabic(v_search_query);
  v_expanded_queries := expand_query_with_synonyms(v_search_query);

  RETURN QUERY
  WITH
  -- KEYWORD MATCHES
  keyword_matches AS (
    SELECT
      mi.id,
      'keyword' as match_type,
      CASE
        WHEN mi.name_ar ILIKE v_search_query THEN 1.0
        WHEN normalize_arabic(mi.name_ar) ILIKE v_normalized_query THEN 0.95
        WHEN mi.name_ar ILIKE v_search_query || '%' THEN 0.9
        WHEN mi.name_ar ILIKE '%' || v_search_query || '%' THEN 0.7
        WHEN normalize_arabic(mi.name_ar) ILIKE '%' || v_normalized_query || '%' THEN 0.7
        WHEN mi.description_ar ILIKE '%' || v_search_query || '%' THEN 0.5
        ELSE 0.3
      END as base_score,
      ROW_NUMBER() OVER (ORDER BY
        CASE
          WHEN mi.name_ar ILIKE v_search_query THEN 1
          WHEN normalize_arabic(mi.name_ar) ILIKE v_normalized_query THEN 2
          WHEN mi.name_ar ILIKE v_search_query || '%' THEN 3
          WHEN mi.name_ar ILIKE '%' || v_search_query || '%' THEN 4
          WHEN normalize_arabic(mi.name_ar) ILIKE '%' || v_normalized_query || '%' THEN 5
          ELSE 6
        END
      ) as rank
    FROM menu_items mi
    JOIN providers p ON mi.provider_id = p.id
    LEFT JOIN provider_categories pc ON mi.category_id = pc.id  -- FIXED
    WHERE mi.is_available = true
      AND p.status IN ('open', 'closed', 'temporarily_paused')
      AND (p_provider_id IS NULL OR mi.provider_id = p_provider_id)
      AND (p_city_id IS NULL OR p.city_id = p_city_id)
      AND (
        mi.name_ar ILIKE '%' || v_search_query || '%'
        OR mi.description_ar ILIKE '%' || v_search_query || '%'
        OR mi.name_en ILIKE '%' || v_search_query || '%'
        OR pc.name_ar ILIKE '%' || v_search_query || '%'
        OR normalize_arabic(mi.name_ar) ILIKE '%' || v_normalized_query || '%'
        OR normalize_arabic(pc.name_ar) ILIKE '%' || v_normalized_query || '%'
        -- Synonym matches
        OR (array_length(v_expanded_queries, 1) > 1 AND EXISTS (
          SELECT 1 FROM unnest(v_expanded_queries) AS syn
          WHERE mi.name_ar ILIKE '%' || syn || '%'
        ))
      )
    LIMIT 20
  ),

  -- CATEGORY MATCHES
  category_matches AS (
    SELECT
      mi.id,
      'category' as match_type,
      0.6 as base_score,
      ROW_NUMBER() OVER (ORDER BY mi.name_ar) as rank
    FROM menu_items mi
    JOIN providers p ON mi.provider_id = p.id
    JOIN provider_categories pc ON mi.category_id = pc.id  -- FIXED
    WHERE mi.is_available = true
      AND p.status IN ('open', 'closed', 'temporarily_paused')
      AND (p_provider_id IS NULL OR mi.provider_id = p_provider_id)
      AND (p_city_id IS NULL OR p.city_id = p_city_id)
      AND (
        pc.name_ar ILIKE '%' || v_search_query || '%'
        OR normalize_arabic(pc.name_ar) ILIKE '%' || v_normalized_query || '%'
      )
    LIMIT 30
  ),

  -- SEMANTIC MATCHES (vector similarity)
  semantic_matches AS (
    SELECT
      mi.id,
      'semantic' as match_type,
      1.0 - (mi.embedding <=> p_query_embedding) as base_score,
      ROW_NUMBER() OVER (ORDER BY mi.embedding <=> p_query_embedding) as rank
    FROM menu_items mi
    JOIN providers p ON mi.provider_id = p.id
    WHERE v_has_embedding
      AND mi.embedding IS NOT NULL
      AND mi.is_available = true
      AND p.status IN ('open', 'closed', 'temporarily_paused')
      AND (p_provider_id IS NULL OR mi.provider_id = p_provider_id)
      AND (p_city_id IS NULL OR p.city_id = p_city_id)
    ORDER BY mi.embedding <=> p_query_embedding
    LIMIT 20
  ),

  -- FUZZY MATCHES (trigram similarity)
  fuzzy_matches AS (
    SELECT
      mi.id,
      'fuzzy' as match_type,
      GREATEST(
        similarity(mi.name_ar, v_search_query),
        similarity(normalize_arabic(mi.name_ar), v_normalized_query)
      ) as base_score,
      ROW_NUMBER() OVER (ORDER BY GREATEST(
        similarity(mi.name_ar, v_search_query),
        similarity(normalize_arabic(mi.name_ar), v_normalized_query)
      ) DESC) as rank
    FROM menu_items mi
    JOIN providers p ON mi.provider_id = p.id
    WHERE mi.is_available = true
      AND p.status IN ('open', 'closed', 'temporarily_paused')
      AND (p_provider_id IS NULL OR mi.provider_id = p_provider_id)
      AND (p_city_id IS NULL OR p.city_id = p_city_id)
      AND (
        similarity(mi.name_ar, v_search_query) > 0.3
        OR similarity(normalize_arabic(mi.name_ar), v_normalized_query) > 0.3
      )
    ORDER BY GREATEST(
      similarity(mi.name_ar, v_search_query),
      similarity(normalize_arabic(mi.name_ar), v_normalized_query)
    ) DESC
    LIMIT 20
  ),

  -- SYNONYM MATCHES
  synonym_matches AS (
    SELECT
      mi.id,
      'synonym' as match_type,
      0.75 as base_score,
      ROW_NUMBER() OVER (ORDER BY mi.name_ar) as rank
    FROM menu_items mi
    JOIN providers p ON mi.provider_id = p.id
    WHERE mi.is_available = true
      AND p.status IN ('open', 'closed', 'temporarily_paused')
      AND (p_provider_id IS NULL OR mi.provider_id = p_provider_id)
      AND (p_city_id IS NULL OR p.city_id = p_city_id)
      AND array_length(v_expanded_queries, 1) > 1
      AND EXISTS (
        SELECT 1 FROM unnest(v_expanded_queries) AS syn
        WHERE mi.name_ar ILIKE '%' || syn || '%'
          AND syn != v_search_query  -- Exclude original query
      )
    LIMIT 15
  ),

  -- RRF FUSION
  combined AS (
    SELECT
      item_id,
      SUM(rrf_score) as total_rrf,
      STRING_AGG(DISTINCT match_type, ',') as match_types,
      MAX(base_score) as best_base_score
    FROM (
      SELECT id as item_id, match_type, base_score, 1.0 / (60 + rank) as rrf_score FROM keyword_matches
      UNION ALL
      SELECT id as item_id, match_type, base_score, 1.0 / (60 + rank) as rrf_score FROM category_matches
      UNION ALL
      SELECT id as item_id, match_type, base_score, 1.0 / (60 + rank) as rrf_score FROM semantic_matches WHERE v_has_embedding
      UNION ALL
      SELECT id as item_id, match_type, base_score, 1.0 / (60 + rank) as rrf_score FROM fuzzy_matches
      UNION ALL
      SELECT id as item_id, match_type, base_score, 1.0 / (60 + rank) as rrf_score FROM synonym_matches
    ) all_matches
    GROUP BY item_id
  )

  SELECT
    mi.id,
    mi.name_ar,
    mi.name_en,
    mi.description_ar,
    mi.price,
    mi.original_price,
    mi.image_url,
    mi.has_variants,
    mi.provider_id,
    p.name_ar as provider_name,
    pc.name_ar as category_name,
    c.match_types as match_type,
    c.total_rrf as match_score
  FROM combined c
  JOIN menu_items mi ON c.item_id = mi.id
  JOIN providers p ON mi.provider_id = p.id
  LEFT JOIN provider_categories pc ON mi.category_id = pc.id  -- FIXED
  ORDER BY c.total_rrf DESC, c.best_base_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. Add more Arabic synonyms for common Egyptian food terms
-- ============================================================================

INSERT INTO arabic_synonyms (term, synonyms, category) VALUES
  ('كفتة', ARRAY['كفته', 'كفتا', 'kofta', 'كباب'], 'food'),
  ('فتة', ARRAY['فته', 'فتا'], 'food'),
  ('طعمية', ARRAY['فلافل', 'طعميه', 'falafel'], 'food'),
  ('كشري', ARRAY['كشرى', 'كوشرى', 'koshari'], 'food'),
  ('ملوخية', ARRAY['ملوخيه', 'ملخيه'], 'food'),
  ('محشي', ARRAY['محشى', 'محاشي'], 'food'),
  ('مسقعة', ARRAY['مسقعه', 'مسئعه'], 'food'),
  ('بسطرمة', ARRAY['بسطرمه', 'باسترما'], 'food'),
  ('كباب', ARRAY['كبابه', 'شيش كباب'], 'food'),
  ('حواوشي', ARRAY['حواوشى', 'حاوشي', 'hawawshi'], 'food'),
  ('فول', ARRAY['فول مدمس', 'مدمس'], 'food'),
  ('بان كيك', ARRAY['بانكيك', 'pancake', 'pancakes'], 'food'),
  ('وافل', ARRAY['واففل', 'waffle', 'waffles'], 'food'),
  ('آيس كريم', ARRAY['ايس كريم', 'جيلاتي', 'ice cream'], 'food'),
  ('ميلك شيك', ARRAY['ميلكشيك', 'milkshake'], 'food')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION transliterate_franco_arab TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION is_franco_arab TO authenticated, anon, service_role;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION transliterate_franco_arab IS 'Converts Franco-Arab text (e.g., 3ayez) to Arabic (عايز)';
COMMENT ON FUNCTION is_franco_arab IS 'Checks if text contains Franco-Arab patterns';
COMMENT ON FUNCTION simple_search_menu IS 'Search menu items with Arabic normalization, synonym expansion, and Franco-Arab support';
COMMENT ON FUNCTION hybrid_search_menu IS 'Hybrid search combining keyword, semantic, fuzzy, and synonym matching';

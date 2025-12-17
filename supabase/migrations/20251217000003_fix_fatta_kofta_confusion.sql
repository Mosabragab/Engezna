-- ============================================================================
-- Fix Fatta/Kofta Confusion in Search
--
-- Problem: When searching for "فته", the synonym expansion was matching "كفته"
-- because the query used ILIKE '%فته%' which matches "كفته".
--
-- Solution:
-- 1. Use stricter matching (exact or word boundary)
-- 2. Add confusable pairs to exclude from each other
-- ============================================================================

-- ============================================================================
-- 1. Create confusable_terms table to track words that should NOT match each other
-- ============================================================================

CREATE TABLE IF NOT EXISTS confusable_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term1 text NOT NULL,
  term2 text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(term1, term2)
);

-- Insert known confusable pairs (bidirectional)
INSERT INTO confusable_terms (term1, term2) VALUES
  ('فتة', 'كفتة'),
  ('فته', 'كفته'),
  ('كفتة', 'فتة'),
  ('كفته', 'فته')
ON CONFLICT DO NOTHING;

GRANT SELECT ON confusable_terms TO authenticated, anon, service_role;

-- ============================================================================
-- 2. Update expand_query_with_synonyms to use STRICTER matching
--    and exclude confusable terms
-- ============================================================================

CREATE OR REPLACE FUNCTION expand_query_with_synonyms(p_query text)
RETURNS text[] AS $$
DECLARE
  v_expanded text[];
  v_syn RECORD;
  v_normalized_query text;
  v_confusables text[];
BEGIN
  v_expanded := ARRAY[p_query];
  v_normalized_query := normalize_arabic(p_query);

  -- Get terms that should NOT be included (confusable with the query)
  SELECT array_agg(DISTINCT
    CASE
      WHEN term1 = p_query OR normalize_arabic(term1) = v_normalized_query THEN term2
      WHEN term2 = p_query OR normalize_arabic(term2) = v_normalized_query THEN term1
      ELSE NULL
    END
  ) INTO v_confusables
  FROM confusable_terms
  WHERE term1 = p_query
     OR term2 = p_query
     OR normalize_arabic(term1) = v_normalized_query
     OR normalize_arabic(term2) = v_normalized_query;

  -- Check if query matches any term or synonym
  -- Use STRICTER matching: exact match on term, not partial!
  FOR v_syn IN
    SELECT term, synonyms
    FROM arabic_synonyms
    WHERE normalize_arabic(term) = v_normalized_query  -- Exact match on term
       OR p_query ILIKE ANY(synonyms)                   -- Or exact match in synonyms
       OR v_normalized_query ILIKE ANY(
            SELECT normalize_arabic(s) FROM unnest(synonyms) AS s
          )
  LOOP
    -- Only add if not in confusables list
    IF v_confusables IS NULL OR NOT (v_syn.term = ANY(v_confusables)) THEN
      v_expanded := v_expanded || v_syn.term || v_syn.synonyms;
    END IF;
  END LOOP;

  -- Filter out confusable terms from the result
  IF v_confusables IS NOT NULL THEN
    v_expanded := ARRAY(
      SELECT DISTINCT x
      FROM unnest(v_expanded) AS x
      WHERE normalize_arabic(x) NOT IN (
        SELECT normalize_arabic(c) FROM unnest(v_confusables) AS c WHERE c IS NOT NULL
      )
    );
  END IF;

  RETURN array_distinct(v_expanded);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. Update simple_search_menu to handle confusable terms
--    Prioritize EXACT matches much higher for short words
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
  v_confusables text[];
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

  -- Get confusable terms to EXCLUDE from results
  SELECT array_agg(DISTINCT
    CASE
      WHEN normalize_arabic(term1) = v_normalized_query THEN normalize_arabic(term2)
      WHEN normalize_arabic(term2) = v_normalized_query THEN normalize_arabic(term1)
      ELSE NULL
    END
  ) INTO v_confusables
  FROM confusable_terms
  WHERE normalize_arabic(term1) = v_normalized_query
     OR normalize_arabic(term2) = v_normalized_query;

  -- Expand query with synonyms (now excludes confusables)
  v_expanded_queries := expand_query_with_synonyms(v_search_query);

  -- STRICTER similarity threshold for short words
  v_min_similarity := CASE
    WHEN v_query_length <= 2 THEN 0.4   -- Raised from 0.25
    WHEN v_query_length <= 3 THEN 0.5   -- Raised from 0.35
    WHEN v_query_length <= 4 THEN 0.55  -- Raised from 0.45
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
      -- EXACT match - highest priority
      CASE WHEN normalize_arabic(mi.name_ar) = v_normalized_query THEN 1.0::float8 ELSE 0::float8 END,
      -- Starts-with match - very high priority
      CASE WHEN mi.name_ar LIKE v_search_query || '%' THEN 0.98::float8 ELSE 0::float8 END,
      CASE WHEN normalize_arabic(mi.name_ar) LIKE v_normalized_query || '%' THEN 0.98::float8 ELSE 0::float8 END,
      -- Word-starts-with matching
      CASE WHEN mi.name_ar ~ ('^' || v_search_query || '($|[[:space:]])') THEN 0.95::float8 ELSE 0::float8 END,
      CASE WHEN mi.name_ar ~ ('(^|[[:space:]])' || v_search_query || '($|[[:space:]])') THEN 0.93::float8 ELSE 0::float8 END,
      -- Contains matching (lower priority)
      CASE WHEN mi.name_ar ILIKE '%' || v_search_query || '%' THEN 0.85::float8 ELSE 0::float8 END,
      CASE WHEN normalize_arabic(mi.name_ar) ILIKE '%' || v_normalized_query || '%' THEN 0.85::float8 ELSE 0::float8 END,
      CASE WHEN pc.name_ar ILIKE '%' || v_search_query || '%' THEN 0.6::float8 ELSE 0::float8 END,
      -- Synonym matches
      CASE WHEN array_length(v_expanded_queries, 1) > 1 THEN
        (SELECT COALESCE(MAX(CASE WHEN mi.name_ar ILIKE '%' || syn || '%' THEN 0.8 ELSE 0 END), 0)
         FROM unnest(v_expanded_queries) AS syn)::float8
      ELSE 0::float8 END,
      -- Similarity (fuzzy) - lower priority now
      COALESCE(similarity(mi.name_ar, v_search_query)::float8 * 0.8, 0::float8),
      COALESCE(similarity(normalize_arabic(mi.name_ar), v_normalized_query)::float8 * 0.8, 0::float8)
    )::float8 as match_score
  FROM menu_items mi
  JOIN providers p ON mi.provider_id = p.id
  LEFT JOIN provider_categories pc ON mi.category_id = pc.id
  WHERE mi.is_available = true
    AND p.status IN ('open', 'closed', 'temporarily_paused')
    AND (p_provider_id IS NULL OR mi.provider_id = p_provider_id)
    AND (p_city_id IS NULL OR p.city_id = p_city_id)
    -- EXCLUDE confusable terms
    AND (
      v_confusables IS NULL
      OR NOT (normalize_arabic(mi.name_ar) ILIKE ANY(
        SELECT '%' || c || '%' FROM unnest(v_confusables) AS c WHERE c IS NOT NULL
      ))
      -- But INCLUDE if it's an exact match for what we're looking for
      OR normalize_arabic(mi.name_ar) ILIKE '%' || v_normalized_query || '%'
    )
    AND (
      -- Exact matches
      normalize_arabic(mi.name_ar) = v_normalized_query
      -- Prefix/starts-with matches
      OR mi.name_ar LIKE v_search_query || '%'
      OR normalize_arabic(mi.name_ar) LIKE v_normalized_query || '%'
      -- Word boundary matches
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
      -- Fuzzy matches (stricter threshold)
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
    -- Exact match first
    CASE WHEN normalize_arabic(mi.name_ar) = v_normalized_query THEN 0 ELSE 1 END,
    -- Then starts-with
    CASE WHEN mi.name_ar LIKE v_search_query || '%' THEN 0 ELSE 1 END,
    CASE WHEN normalize_arabic(mi.name_ar) LIKE v_normalized_query || '%' THEN 0 ELSE 1 END,
    -- Then contains
    CASE WHEN mi.name_ar ILIKE '%' || v_search_query || '%' THEN 0 ELSE 1 END,
    CASE WHEN normalize_arabic(mi.name_ar) ILIKE '%' || v_normalized_query || '%' THEN 0 ELSE 1 END,
    -- Then by score
    GREATEST(similarity(mi.name_ar, v_search_query), similarity(normalize_arabic(mi.name_ar), v_normalized_query)) DESC,
    mi.name_ar
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE confusable_terms IS 'Pairs of terms that look similar but are completely different foods (e.g., فتة vs كفتة)';
COMMENT ON FUNCTION expand_query_with_synonyms IS 'Expands query with synonyms while excluding confusable terms';

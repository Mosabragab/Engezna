-- ============================================================================
-- Improved Fuzzy Search with Partial Word Matching
-- Handles cases like "سج" → "سجق", "حواوش" → "حواوشي"
-- ============================================================================

-- ============================================================================
-- Updated Simple Search Function with Partial Word Matching
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
  v_query_length int;
  v_min_similarity float;
BEGIN
  -- Normalize the search query
  v_normalized_query := normalize_arabic(p_query);
  v_query_length := char_length(p_query);

  -- Dynamic similarity threshold based on query length
  -- Shorter queries need lower threshold (e.g., "سج" = 2 chars)
  v_min_similarity := CASE
    WHEN v_query_length <= 2 THEN 0.15  -- Very short: "سج"
    WHEN v_query_length <= 3 THEN 0.20  -- Short: "سجق"
    WHEN v_query_length <= 4 THEN 0.22  -- Medium: "بيتزا"
    ELSE 0.25                           -- Normal
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
      COALESCE(similarity(mi.name_ar, p_query)::float8, 0::float8),
      -- Normalized query matches
      COALESCE(similarity(normalize_arabic(mi.name_ar), v_normalized_query)::float8, 0::float8),
      -- Prefix matching: name starts with query (handles "سج" → "سجق")
      CASE WHEN mi.name_ar LIKE p_query || '%' THEN 0.9::float8 ELSE 0::float8 END,
      CASE WHEN normalize_arabic(mi.name_ar) LIKE v_normalized_query || '%' THEN 0.9::float8 ELSE 0::float8 END,
      -- Word-starts-with matching: any word in name starts with query
      CASE WHEN mi.name_ar ~ ('(^|[[:space:]])' || p_query) THEN 0.85::float8 ELSE 0::float8 END,
      CASE WHEN normalize_arabic(mi.name_ar) ~ ('(^|[[:space:]])' || v_normalized_query) THEN 0.85::float8 ELSE 0::float8 END,
      -- Contains matching
      CASE WHEN normalize_arabic(mi.name_ar) ILIKE '%' || v_normalized_query || '%' THEN 0.8::float8 ELSE 0::float8 END,
      CASE WHEN mi.name_ar ILIKE '%' || p_query || '%' THEN 0.8::float8 ELSE 0::float8 END,
      CASE WHEN pc.name_ar ILIKE '%' || p_query || '%' THEN 0.6::float8 ELSE 0::float8 END
    )::float8 as match_score
  FROM menu_items mi
  JOIN providers p ON mi.provider_id = p.id
  LEFT JOIN provider_categories pc ON mi.provider_category_id = pc.id
  WHERE mi.is_available = true
    AND p.status IN ('open', 'closed', 'temporarily_paused')
    AND (p_provider_id IS NULL OR mi.provider_id = p_provider_id)
    AND (p_city_id IS NULL OR p.city_id = p_city_id)
    AND (
      -- Prefix/starts-with matches (crucial for partial words like "سج" → "سجق")
      mi.name_ar LIKE p_query || '%'
      OR normalize_arabic(mi.name_ar) LIKE v_normalized_query || '%'
      -- Word-starts-with (e.g., "حواوشي سج%" matches "حواوشي سجق")
      OR mi.name_ar ~ ('(^|[[:space:]])' || p_query)
      OR normalize_arabic(mi.name_ar) ~ ('(^|[[:space:]])' || v_normalized_query)
      -- Contains matches
      OR mi.name_ar ILIKE '%' || p_query || '%'
      OR mi.description_ar ILIKE '%' || p_query || '%'
      OR mi.name_en ILIKE '%' || p_query || '%'
      OR pc.name_ar ILIKE '%' || p_query || '%'
      -- Normalized matches
      OR normalize_arabic(mi.name_ar) ILIKE '%' || v_normalized_query || '%'
      OR normalize_arabic(mi.description_ar) ILIKE '%' || v_normalized_query || '%'
      OR normalize_arabic(pc.name_ar) ILIKE '%' || v_normalized_query || '%'
      -- Fuzzy matches with dynamic threshold
      OR similarity(mi.name_ar, p_query) > v_min_similarity
      OR similarity(normalize_arabic(mi.name_ar), v_normalized_query) > v_min_similarity
    )
  ORDER BY
    -- Prioritize: prefix match > exact > normalized > contains > fuzzy
    CASE WHEN mi.name_ar LIKE p_query || '%' THEN 0 ELSE 1 END,
    CASE WHEN normalize_arabic(mi.name_ar) LIKE v_normalized_query || '%' THEN 0 ELSE 1 END,
    CASE WHEN mi.name_ar ILIKE p_query THEN 0 ELSE 1 END,
    CASE WHEN normalize_arabic(mi.name_ar) ILIKE v_normalized_query THEN 0 ELSE 1 END,
    CASE WHEN mi.name_ar ILIKE '%' || p_query || '%' THEN 0 ELSE 1 END,
    CASE WHEN normalize_arabic(mi.name_ar) ILIKE '%' || v_normalized_query || '%' THEN 0 ELSE 1 END,
    GREATEST(similarity(mi.name_ar, p_query), similarity(normalize_arabic(mi.name_ar), v_normalized_query)) DESC,
    mi.name_ar
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Updated Hybrid Search with Partial Word Matching
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
  v_query_length int;
  v_min_similarity float;
BEGIN
  v_has_embedding := p_query_embedding IS NOT NULL;
  v_normalized_query := normalize_arabic(p_query);
  v_query_length := char_length(p_query);

  -- Dynamic similarity threshold
  v_min_similarity := CASE
    WHEN v_query_length <= 2 THEN 0.15
    WHEN v_query_length <= 3 THEN 0.20
    WHEN v_query_length <= 4 THEN 0.22
    ELSE 0.25
  END;

  RETURN QUERY
  WITH
  -- ═══════════════════════════════════════════════════════════════════════
  -- 1. PREFIX MATCHES (handles partial words like "سج" → "سجق")
  -- ═══════════════════════════════════════════════════════════════════════
  prefix_matches AS (
    SELECT
      mi.id,
      'prefix' as match_type,
      CASE
        WHEN mi.name_ar LIKE p_query || '%' THEN 0.95
        WHEN normalize_arabic(mi.name_ar) LIKE v_normalized_query || '%' THEN 0.93
        WHEN mi.name_ar ~ ('(^|[[:space:]])' || p_query) THEN 0.90
        ELSE 0.85
      END as base_score,
      ROW_NUMBER() OVER (ORDER BY mi.name_ar) as rank
    FROM menu_items mi
    JOIN providers p ON mi.provider_id = p.id
    WHERE mi.is_available = true
      AND p.status IN ('open', 'closed', 'temporarily_paused')
      AND (p_provider_id IS NULL OR mi.provider_id = p_provider_id)
      AND (p_city_id IS NULL OR p.city_id = p_city_id)
      AND (
        mi.name_ar LIKE p_query || '%'
        OR normalize_arabic(mi.name_ar) LIKE v_normalized_query || '%'
        OR mi.name_ar ~ ('(^|[[:space:]])' || p_query)
        OR normalize_arabic(mi.name_ar) ~ ('(^|[[:space:]])' || v_normalized_query)
      )
    LIMIT 20
  ),

  -- ═══════════════════════════════════════════════════════════════════════
  -- 2. KEYWORD MATCHES (exact and partial matching)
  -- ═══════════════════════════════════════════════════════════════════════
  keyword_matches AS (
    SELECT
      mi.id,
      'keyword' as match_type,
      CASE
        WHEN mi.name_ar ILIKE p_query THEN 1.0
        WHEN normalize_arabic(mi.name_ar) ILIKE v_normalized_query THEN 0.95
        WHEN mi.name_ar ILIKE p_query || '%' THEN 0.9
        WHEN mi.name_ar ILIKE '%' || p_query || '%' THEN 0.7
        WHEN normalize_arabic(mi.name_ar) ILIKE '%' || v_normalized_query || '%' THEN 0.7
        WHEN mi.description_ar ILIKE '%' || p_query || '%' THEN 0.5
        ELSE 0.3
      END as base_score,
      ROW_NUMBER() OVER (ORDER BY
        CASE
          WHEN mi.name_ar ILIKE p_query THEN 1
          WHEN normalize_arabic(mi.name_ar) ILIKE v_normalized_query THEN 2
          WHEN mi.name_ar ILIKE p_query || '%' THEN 3
          WHEN mi.name_ar ILIKE '%' || p_query || '%' THEN 4
          ELSE 6
        END
      ) as rank
    FROM menu_items mi
    JOIN providers p ON mi.provider_id = p.id
    LEFT JOIN provider_categories pc ON mi.provider_category_id = pc.id
    WHERE mi.is_available = true
      AND p.status IN ('open', 'closed', 'temporarily_paused')
      AND (p_provider_id IS NULL OR mi.provider_id = p_provider_id)
      AND (p_city_id IS NULL OR p.city_id = p_city_id)
      AND (
        mi.name_ar ILIKE '%' || p_query || '%'
        OR mi.description_ar ILIKE '%' || p_query || '%'
        OR mi.name_en ILIKE '%' || p_query || '%'
        OR pc.name_ar ILIKE '%' || p_query || '%'
        OR normalize_arabic(mi.name_ar) ILIKE '%' || v_normalized_query || '%'
        OR normalize_arabic(pc.name_ar) ILIKE '%' || v_normalized_query || '%'
      )
    LIMIT 20
  ),

  -- ═══════════════════════════════════════════════════════════════════════
  -- 3. CATEGORY MATCHES
  -- ═══════════════════════════════════════════════════════════════════════
  category_matches AS (
    SELECT
      mi.id,
      'category' as match_type,
      0.6 as base_score,
      ROW_NUMBER() OVER (ORDER BY mi.name_ar) as rank
    FROM menu_items mi
    JOIN providers p ON mi.provider_id = p.id
    JOIN provider_categories pc ON mi.provider_category_id = pc.id
    WHERE mi.is_available = true
      AND p.status IN ('open', 'closed', 'temporarily_paused')
      AND (p_provider_id IS NULL OR mi.provider_id = p_provider_id)
      AND (p_city_id IS NULL OR p.city_id = p_city_id)
      AND (
        pc.name_ar ILIKE '%' || p_query || '%'
        OR normalize_arabic(pc.name_ar) ILIKE '%' || v_normalized_query || '%'
      )
    LIMIT 30
  ),

  -- ═══════════════════════════════════════════════════════════════════════
  -- 4. SEMANTIC MATCHES (vector similarity)
  -- ═══════════════════════════════════════════════════════════════════════
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

  -- ═══════════════════════════════════════════════════════════════════════
  -- 5. FUZZY MATCHES with dynamic threshold
  -- ═══════════════════════════════════════════════════════════════════════
  fuzzy_matches AS (
    SELECT
      mi.id,
      'fuzzy' as match_type,
      GREATEST(
        similarity(mi.name_ar, p_query),
        similarity(normalize_arabic(mi.name_ar), v_normalized_query)
      ) as base_score,
      ROW_NUMBER() OVER (ORDER BY GREATEST(
        similarity(mi.name_ar, p_query),
        similarity(normalize_arabic(mi.name_ar), v_normalized_query)
      ) DESC) as rank
    FROM menu_items mi
    JOIN providers p ON mi.provider_id = p.id
    WHERE mi.is_available = true
      AND p.status IN ('open', 'closed', 'temporarily_paused')
      AND (p_provider_id IS NULL OR mi.provider_id = p_provider_id)
      AND (p_city_id IS NULL OR p.city_id = p_city_id)
      AND (
        similarity(mi.name_ar, p_query) > v_min_similarity
        OR similarity(normalize_arabic(mi.name_ar), v_normalized_query) > v_min_similarity
      )
    ORDER BY GREATEST(
      similarity(mi.name_ar, p_query),
      similarity(normalize_arabic(mi.name_ar), v_normalized_query)
    ) DESC
    LIMIT 20
  ),

  -- ═══════════════════════════════════════════════════════════════════════
  -- 6. RRF Combination
  -- ═══════════════════════════════════════════════════════════════════════
  combined AS (
    SELECT
      item_id,
      SUM(rrf_score) as total_rrf,
      STRING_AGG(DISTINCT match_type, ',') as match_types,
      MAX(base_score) as best_base_score
    FROM (
      SELECT id as item_id, match_type, base_score, 1.0 / (60 + rank) as rrf_score
      FROM prefix_matches
      UNION ALL
      SELECT id as item_id, match_type, base_score, 1.0 / (60 + rank) as rrf_score
      FROM keyword_matches
      UNION ALL
      SELECT id as item_id, match_type, base_score, 1.0 / (60 + rank) as rrf_score
      FROM category_matches
      UNION ALL
      SELECT id as item_id, match_type, base_score, 1.0 / (60 + rank) as rrf_score
      FROM semantic_matches
      WHERE v_has_embedding
      UNION ALL
      SELECT id as item_id, match_type, base_score, 1.0 / (60 + rank) as rrf_score
      FROM fuzzy_matches
    ) all_matches
    GROUP BY item_id
  )

  -- Final output
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
  LEFT JOIN provider_categories pc ON mi.provider_category_id = pc.id
  ORDER BY c.total_rrf DESC, c.best_base_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comment
-- ============================================================================

COMMENT ON FUNCTION simple_search_menu IS 'Search menu items with improved partial word matching (e.g., "سج" finds "سجق")';
COMMENT ON FUNCTION hybrid_search_menu IS 'Hybrid search with prefix matching, keyword, semantic, and fuzzy search';

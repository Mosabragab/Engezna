-- ============================================================================
-- Arabic Text Normalization for Better Search
-- Handles common Arabic letter variations:
--   ه ↔ ة (ta marbuta)
--   ى ↔ ي (ya)
--   أ/إ/آ → ا (alef variations)
--   ؤ → و (waw with hamza)
--   ئ → ي (ya with hamza)
-- ============================================================================

-- ============================================================================
-- Arabic Normalization Function
-- ============================================================================

CREATE OR REPLACE FUNCTION normalize_arabic(p_text text)
RETURNS text AS $$
BEGIN
  RETURN REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(
                REPLACE(p_text,
                  'ه', 'ة'),  -- ta marbuta variation
                'ة', 'ه'),    -- reverse (normalize to one form)
              'ى', 'ي'),      -- alef maqsura to ya
            'أ', 'ا'),        -- alef with hamza above
          'إ', 'ا'),          -- alef with hamza below
        'آ', 'ا'),            -- alef with madda
      'ؤ', 'و'),              -- waw with hamza
    'ئ', 'ي');                -- ya with hamza
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Actually, let's normalize TO ة (ta marbuta) since that's the standard form
CREATE OR REPLACE FUNCTION normalize_arabic(p_text text)
RETURNS text AS $$
BEGIN
  -- Normalize ه at end of words to ة (ta marbuta)
  -- But we need a simpler approach - just make both forms match
  RETURN REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(p_text,
                'ة', 'ه'),    -- Normalize ة to ه (since search might use either)
              'ى', 'ي'),      -- alef maqsura to ya
            'أ', 'ا'),        -- alef with hamza above
          'إ', 'ا'),          -- alef with hamza below
        'آ', 'ا'),            -- alef with madda
      'ؤ', 'و'),              -- waw with hamza
    'ئ', 'ي');                -- ya with hamza
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Updated Simple Search Function with Arabic Normalization
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
BEGIN
  -- Normalize the search query
  v_normalized_query := normalize_arabic(p_query);

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
      -- Normalized query matches (handles ه/ة, ى/ي variations)
      COALESCE(similarity(normalize_arabic(mi.name_ar), v_normalized_query)::float8, 0::float8),
      -- Check if normalized query is contained in normalized name
      CASE WHEN normalize_arabic(mi.name_ar) ILIKE '%' || v_normalized_query || '%' THEN 0.8::float8 ELSE 0::float8 END,
      -- Original ILIKE matches
      CASE WHEN mi.name_ar ILIKE '%' || p_query || '%' THEN 0.8::float8 ELSE 0::float8 END,
      CASE WHEN pc.name_ar ILIKE '%' || p_query || '%' THEN 0.6::float8 ELSE 0::float8 END,
      -- Normalized category match
      CASE WHEN normalize_arabic(pc.name_ar) ILIKE '%' || v_normalized_query || '%' THEN 0.6::float8 ELSE 0::float8 END
    )::float8 as match_score
  FROM menu_items mi
  JOIN providers p ON mi.provider_id = p.id
  LEFT JOIN provider_categories pc ON mi.category_id = pc.id
  WHERE mi.is_available = true
    AND p.status IN ('open', 'closed', 'temporarily_paused')
    AND (p_provider_id IS NULL OR mi.provider_id = p_provider_id)
    AND (p_city_id IS NULL OR p.city_id = p_city_id)
    AND (
      -- Original matches
      mi.name_ar ILIKE '%' || p_query || '%'
      OR mi.description_ar ILIKE '%' || p_query || '%'
      OR mi.name_en ILIKE '%' || p_query || '%'
      OR pc.name_ar ILIKE '%' || p_query || '%'
      OR similarity(mi.name_ar, p_query) > 0.25
      -- Normalized matches (Arabic variations)
      OR normalize_arabic(mi.name_ar) ILIKE '%' || v_normalized_query || '%'
      OR normalize_arabic(mi.description_ar) ILIKE '%' || v_normalized_query || '%'
      OR normalize_arabic(pc.name_ar) ILIKE '%' || v_normalized_query || '%'
      OR similarity(normalize_arabic(mi.name_ar), v_normalized_query) > 0.25
    )
  ORDER BY
    -- Prioritize: exact name > normalized match > name starts with > category match > fuzzy
    CASE WHEN mi.name_ar ILIKE p_query THEN 0 ELSE 1 END,
    CASE WHEN normalize_arabic(mi.name_ar) ILIKE v_normalized_query THEN 0 ELSE 1 END,
    CASE WHEN mi.name_ar ILIKE p_query || '%' THEN 0 ELSE 1 END,
    CASE WHEN mi.name_ar ILIKE '%' || p_query || '%' THEN 0 ELSE 1 END,
    CASE WHEN normalize_arabic(mi.name_ar) ILIKE '%' || v_normalized_query || '%' THEN 0 ELSE 1 END,
    CASE WHEN pc.name_ar ILIKE '%' || p_query || '%' THEN 0 ELSE 1 END,
    GREATEST(similarity(mi.name_ar, p_query), similarity(normalize_arabic(mi.name_ar), v_normalized_query)) DESC,
    mi.name_ar
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Updated Hybrid Search Function with Arabic Normalization
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
BEGIN
  -- Check if we have an embedding to use
  v_has_embedding := p_query_embedding IS NOT NULL;
  -- Normalize the search query for Arabic variations
  v_normalized_query := normalize_arabic(p_query);

  RETURN QUERY
  WITH
  -- ═══════════════════════════════════════════════════════════════════════
  -- 1. KEYWORD MATCHES (exact and partial matching)
  -- ═══════════════════════════════════════════════════════════════════════
  keyword_matches AS (
    SELECT
      mi.id,
      'keyword' as match_type,
      CASE
        WHEN mi.name_ar ILIKE p_query THEN 1.0  -- Exact match
        WHEN normalize_arabic(mi.name_ar) ILIKE v_normalized_query THEN 0.95  -- Normalized exact
        WHEN mi.name_ar ILIKE p_query || '%' THEN 0.9  -- Starts with
        WHEN mi.name_ar ILIKE '%' || p_query || '%' THEN 0.7  -- Contains
        WHEN normalize_arabic(mi.name_ar) ILIKE '%' || v_normalized_query || '%' THEN 0.7  -- Normalized contains
        WHEN mi.description_ar ILIKE '%' || p_query || '%' THEN 0.5  -- In description
        ELSE 0.3
      END as base_score,
      ROW_NUMBER() OVER (ORDER BY
        CASE
          WHEN mi.name_ar ILIKE p_query THEN 1
          WHEN normalize_arabic(mi.name_ar) ILIKE v_normalized_query THEN 2
          WHEN mi.name_ar ILIKE p_query || '%' THEN 3
          WHEN mi.name_ar ILIKE '%' || p_query || '%' THEN 4
          WHEN normalize_arabic(mi.name_ar) ILIKE '%' || v_normalized_query || '%' THEN 5
          ELSE 6
        END
      ) as rank
    FROM menu_items mi
    JOIN providers p ON mi.provider_id = p.id
    LEFT JOIN provider_categories pc ON mi.category_id = pc.id
    WHERE mi.is_available = true
      AND p.status IN ('open', 'closed', 'temporarily_paused')
      AND (p_provider_id IS NULL OR mi.provider_id = p_provider_id)
      AND (p_city_id IS NULL OR p.city_id = p_city_id)
      AND (
        mi.name_ar ILIKE '%' || p_query || '%'
        OR mi.description_ar ILIKE '%' || p_query || '%'
        OR mi.name_en ILIKE '%' || p_query || '%'
        OR pc.name_ar ILIKE '%' || p_query || '%'
        -- Normalized matches
        OR normalize_arabic(mi.name_ar) ILIKE '%' || v_normalized_query || '%'
        OR normalize_arabic(pc.name_ar) ILIKE '%' || v_normalized_query || '%'
      )
    LIMIT 20
  ),

  -- ═══════════════════════════════════════════════════════════════════════
  -- 1.5 CATEGORY MATCHES (items in matching category)
  -- ═══════════════════════════════════════════════════════════════════════
  category_matches AS (
    SELECT
      mi.id,
      'category' as match_type,
      0.6 as base_score,
      ROW_NUMBER() OVER (ORDER BY mi.name_ar) as rank
    FROM menu_items mi
    JOIN providers p ON mi.provider_id = p.id
    JOIN provider_categories pc ON mi.category_id = pc.id
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
  -- 2. SEMANTIC MATCHES (vector similarity using embeddings)
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
  -- 3. FUZZY MATCHES (trigram similarity for typos)
  -- Now includes normalized Arabic comparison
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
        similarity(mi.name_ar, p_query) > 0.25
        OR similarity(normalize_arabic(mi.name_ar), v_normalized_query) > 0.25
      )
    ORDER BY GREATEST(
      similarity(mi.name_ar, p_query),
      similarity(normalize_arabic(mi.name_ar), v_normalized_query)
    ) DESC
    LIMIT 20
  ),

  -- ═══════════════════════════════════════════════════════════════════════
  -- 4. RRF (Reciprocal Rank Fusion) - Combine all matches
  -- ═══════════════════════════════════════════════════════════════════════
  combined AS (
    SELECT
      item_id,
      SUM(rrf_score) as total_rrf,
      STRING_AGG(DISTINCT match_type, ',') as match_types,
      MAX(base_score) as best_base_score
    FROM (
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
  LEFT JOIN provider_categories pc ON mi.category_id = pc.id
  ORDER BY c.total_rrf DESC, c.best_base_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION normalize_arabic TO authenticated, anon, service_role;

COMMENT ON FUNCTION normalize_arabic IS 'Normalizes Arabic text by converting letter variations (ه↔ة, ى↔ي, أ/إ/آ→ا)';

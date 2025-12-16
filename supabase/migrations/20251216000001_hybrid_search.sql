-- ============================================================================
-- Hybrid Search Function for AI Agent
-- Combines: Keyword matching + Semantic search (pgvector) + Fuzzy search (pg_trgm)
-- Uses RRF (Reciprocal Rank Fusion) for result merging
-- ============================================================================

-- Enable pg_trgm extension for fuzzy matching (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- Main Hybrid Search Function
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
BEGIN
  -- Check if we have an embedding to use
  v_has_embedding := p_query_embedding IS NOT NULL;

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
        WHEN mi.name_ar ILIKE p_query || '%' THEN 0.9  -- Starts with
        WHEN mi.name_ar ILIKE '%' || p_query || '%' THEN 0.7  -- Contains
        WHEN mi.description_ar ILIKE '%' || p_query || '%' THEN 0.5  -- In description
        ELSE 0.3
      END as base_score,
      ROW_NUMBER() OVER (ORDER BY
        CASE
          WHEN mi.name_ar ILIKE p_query THEN 1
          WHEN mi.name_ar ILIKE p_query || '%' THEN 2
          WHEN mi.name_ar ILIKE '%' || p_query || '%' THEN 3
          ELSE 4
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
        OR pc.name_ar ILIKE '%' || p_query || '%'  -- Search in category name
      )
    LIMIT 20
  ),

  -- ═══════════════════════════════════════════════════════════════════════
  -- 1.5 CATEGORY MATCHES (items in matching category)
  -- Finds all items in a category when query matches category name
  -- ═══════════════════════════════════════════════════════════════════════
  category_matches AS (
    SELECT
      mi.id,
      'category' as match_type,
      0.6 as base_score,  -- Category match score
      ROW_NUMBER() OVER (ORDER BY mi.name_ar) as rank
    FROM menu_items mi
    JOIN providers p ON mi.provider_id = p.id
    JOIN provider_categories pc ON mi.category_id = pc.id
    WHERE mi.is_available = true
      AND p.status IN ('open', 'closed', 'temporarily_paused')
      AND (p_provider_id IS NULL OR mi.provider_id = p_provider_id)
      AND (p_city_id IS NULL OR p.city_id = p_city_id)
      AND pc.name_ar ILIKE '%' || p_query || '%'  -- Category name matches query
    LIMIT 30
  ),

  -- ═══════════════════════════════════════════════════════════════════════
  -- 2. SEMANTIC MATCHES (vector similarity using embeddings)
  -- Only runs if p_query_embedding is provided
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
  -- Handles spelling mistakes like "بيتذا" -> "بيتزا"
  -- ═══════════════════════════════════════════════════════════════════════
  fuzzy_matches AS (
    SELECT
      mi.id,
      'fuzzy' as match_type,
      similarity(mi.name_ar, p_query) as base_score,
      ROW_NUMBER() OVER (ORDER BY similarity(mi.name_ar, p_query) DESC) as rank
    FROM menu_items mi
    JOIN providers p ON mi.provider_id = p.id
    WHERE mi.is_available = true
      AND p.status IN ('open', 'closed', 'temporarily_paused')
      AND (p_provider_id IS NULL OR mi.provider_id = p_provider_id)
      AND (p_city_id IS NULL OR p.city_id = p_city_id)
      AND similarity(mi.name_ar, p_query) > 0.25
    ORDER BY similarity(mi.name_ar, p_query) DESC
    LIMIT 20
  ),

  -- ═══════════════════════════════════════════════════════════════════════
  -- 4. RRF (Reciprocal Rank Fusion) - Combine all matches
  -- RRF formula: score = 1 / (k + rank), where k = 60 (standard constant)
  -- ═══════════════════════════════════════════════════════════════════════
  combined AS (
    SELECT
      item_id,
      -- Sum RRF scores from all sources
      SUM(rrf_score) as total_rrf,
      -- Track which match types contributed
      STRING_AGG(DISTINCT match_type, ',') as match_types,
      -- Keep best base score for tiebreaking
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

  -- ═══════════════════════════════════════════════════════════════════════
  -- Final output with full item details
  -- ═══════════════════════════════════════════════════════════════════════
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
-- Simple Search Function (without embedding - for quick searches)
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
BEGIN
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
      COALESCE(similarity(mi.name_ar, p_query)::float8, 0::float8),
      CASE WHEN mi.name_ar ILIKE '%' || p_query || '%' THEN 0.8::float8 ELSE 0::float8 END,
      CASE WHEN pc.name_ar ILIKE '%' || p_query || '%' THEN 0.6::float8 ELSE 0::float8 END  -- Category match score
    )::float8 as match_score
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
      OR pc.name_ar ILIKE '%' || p_query || '%'  -- Search in category name
      OR similarity(mi.name_ar, p_query) > 0.25
    )
  ORDER BY
    -- Prioritize: exact name > name starts with > category match > fuzzy
    CASE WHEN mi.name_ar ILIKE p_query THEN 0 ELSE 1 END,
    CASE WHEN mi.name_ar ILIKE p_query || '%' THEN 0 ELSE 1 END,
    CASE WHEN mi.name_ar ILIKE '%' || p_query || '%' THEN 0 ELSE 1 END,
    CASE WHEN pc.name_ar ILIKE '%' || p_query || '%' THEN 0 ELSE 1 END,
    similarity(mi.name_ar, p_query) DESC,
    mi.name_ar
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Arabic Synonym Mapping (for common food terms)
-- ============================================================================

CREATE TABLE IF NOT EXISTS arabic_synonyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL,
  synonyms text[] NOT NULL,
  category text,  -- 'food', 'size', 'action'
  created_at timestamp DEFAULT now()
);

-- Insert common Arabic food synonyms
INSERT INTO arabic_synonyms (term, synonyms, category) VALUES
  ('بيتزا', ARRAY['بيتذا', 'پيتزا', 'pizza'], 'food'),
  ('شاورما', ARRAY['شاورمه', 'شاورمة', 'شورما'], 'food'),
  ('برجر', ARRAY['برغر', 'burger', 'همبرجر', 'همبورجر'], 'food'),
  ('ساندويتش', ARRAY['ساندوتش', 'سندوتش', 'سندويتش', 'sandwich'], 'food'),
  ('بطاطس', ARRAY['بطاطا', 'بطاطس مقلية', 'فرايز', 'fries'], 'food'),
  ('دجاج', ARRAY['فراخ', 'فرخة', 'chicken'], 'food'),
  ('لحم', ARRAY['لحمة', 'بيف', 'beef'], 'food'),
  ('جبنة', ARRAY['جبن', 'cheese'], 'food'),
  ('سلطة', ARRAY['سلطه', 'salad'], 'food'),
  ('مشروبات', ARRAY['مشروب', 'drinks', 'عصير', 'عصاير'], 'food'),
  ('قهوة', ARRAY['قهوه', 'كافيه', 'coffee', 'كوفي'], 'food'),
  ('حلويات', ARRAY['حلو', 'dessert', 'سويت'], 'food'),
  -- Sizes
  ('صغير', ARRAY['سمول', 'small', 'S'], 'size'),
  ('وسط', ARRAY['ميديم', 'medium', 'M'], 'size'),
  ('كبير', ARRAY['لارج', 'large', 'L', 'عائلي'], 'size')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Function to expand query with synonyms
-- ============================================================================

CREATE OR REPLACE FUNCTION expand_query_with_synonyms(p_query text)
RETURNS text[] AS $$
DECLARE
  v_expanded text[];
  v_syn RECORD;
BEGIN
  v_expanded := ARRAY[p_query];

  -- Check if query matches any term or synonym
  FOR v_syn IN
    SELECT term, synonyms
    FROM arabic_synonyms
    WHERE term ILIKE '%' || p_query || '%'
       OR p_query ILIKE ANY(synonyms)
  LOOP
    v_expanded := v_expanded || v_syn.term || v_syn.synonyms;
  END LOOP;

  RETURN array_distinct(v_expanded);
END;
$$ LANGUAGE plpgsql;

-- Helper function to get distinct array elements
CREATE OR REPLACE FUNCTION array_distinct(anyarray)
RETURNS anyarray AS $$
  SELECT array_agg(DISTINCT x) FROM unnest($1) AS t(x);
$$ LANGUAGE sql;

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION hybrid_search_menu TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION simple_search_menu TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION expand_query_with_synonyms TO authenticated, anon, service_role;
GRANT SELECT ON arabic_synonyms TO authenticated, anon, service_role;

-- ============================================================================
-- Add index for faster trigram searches
-- Note: Both indexes already exist from previous migration:
--   - idx_menu_items_name_ar_trgm
--   - idx_menu_items_desc_ar_trgm (same as description_ar)
-- No need to create new indexes
-- ============================================================================

COMMENT ON FUNCTION hybrid_search_menu IS 'Hybrid search combining keyword, semantic, and fuzzy matching with RRF fusion';
COMMENT ON FUNCTION simple_search_menu IS 'Simple search using keyword and fuzzy matching (no embedding required)';

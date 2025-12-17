-- ============================================================================
-- Stricter Fuzzy Search to Prevent False Positives
-- Fixes: "فتة" appearing in "كفتة" results
-- ============================================================================

-- ============================================================================
-- Updated Simple Search Function with Stricter Matching
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

  -- STRICTER similarity threshold - prevents "فتة" from matching "كفتة"
  -- Increased thresholds to reduce false positives
  v_min_similarity := CASE
    WHEN v_query_length <= 2 THEN 0.25  -- Very short: "سج" (was 0.15)
    WHEN v_query_length <= 3 THEN 0.35  -- Short: "سجق" (was 0.20)
    WHEN v_query_length <= 4 THEN 0.45  -- Medium: "كفتة" (was 0.22)
    ELSE 0.50                           -- Normal (was 0.25)
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
      CASE WHEN mi.name_ar LIKE p_query || '%' THEN 0.95::float8 ELSE 0::float8 END,
      CASE WHEN normalize_arabic(mi.name_ar) LIKE v_normalized_query || '%' THEN 0.95::float8 ELSE 0::float8 END,
      -- Word-starts-with matching: any word in name starts with query
      CASE WHEN mi.name_ar ~ ('(^|[[:space:]])' || p_query) THEN 0.9::float8 ELSE 0::float8 END,
      CASE WHEN normalize_arabic(mi.name_ar) ~ ('(^|[[:space:]])' || v_normalized_query) THEN 0.9::float8 ELSE 0::float8 END,
      -- Contains matching - ONLY if query is properly contained (not a substring match the other way)
      CASE WHEN mi.name_ar ILIKE '%' || p_query || '%' THEN 0.85::float8 ELSE 0::float8 END,
      CASE WHEN normalize_arabic(mi.name_ar) ILIKE '%' || v_normalized_query || '%' THEN 0.85::float8 ELSE 0::float8 END,
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
      -- Contains matches - query must be INSIDE the name (not the other way around)
      OR mi.name_ar ILIKE '%' || p_query || '%'
      OR mi.description_ar ILIKE '%' || p_query || '%'
      OR mi.name_en ILIKE '%' || p_query || '%'
      OR pc.name_ar ILIKE '%' || p_query || '%'
      -- Normalized matches
      OR normalize_arabic(mi.name_ar) ILIKE '%' || v_normalized_query || '%'
      OR normalize_arabic(mi.description_ar) ILIKE '%' || v_normalized_query || '%'
      OR normalize_arabic(pc.name_ar) ILIKE '%' || v_normalized_query || '%'
      -- Fuzzy matches - ONLY if result name is at least as long as query
      -- This prevents "فتة" (3 chars) from matching "كفتة" (4 chars) query
      OR (
        char_length(mi.name_ar) >= v_query_length
        AND similarity(mi.name_ar, p_query) > v_min_similarity
      )
      OR (
        char_length(normalize_arabic(mi.name_ar)) >= v_query_length
        AND similarity(normalize_arabic(mi.name_ar), v_normalized_query) > v_min_similarity
      )
    )
  ORDER BY
    -- Prioritize: exact > prefix > contains > fuzzy
    CASE WHEN mi.name_ar ILIKE p_query THEN 0 ELSE 1 END,
    CASE WHEN normalize_arabic(mi.name_ar) ILIKE v_normalized_query THEN 0 ELSE 1 END,
    CASE WHEN mi.name_ar LIKE p_query || '%' THEN 0 ELSE 1 END,
    CASE WHEN normalize_arabic(mi.name_ar) LIKE v_normalized_query || '%' THEN 0 ELSE 1 END,
    CASE WHEN mi.name_ar ILIKE '%' || p_query || '%' THEN 0 ELSE 1 END,
    CASE WHEN normalize_arabic(mi.name_ar) ILIKE '%' || v_normalized_query || '%' THEN 0 ELSE 1 END,
    GREATEST(similarity(mi.name_ar, p_query), similarity(normalize_arabic(mi.name_ar), v_normalized_query)) DESC,
    mi.name_ar
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comment
-- ============================================================================
COMMENT ON FUNCTION simple_search_menu IS 'Search menu items with stricter fuzzy matching to prevent false positives (e.g., "فتة" no longer matches "كفتة" query)';

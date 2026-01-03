-- ============================================================================
-- Email Template Variable Audit Queries
-- Run these queries against your Supabase database to verify all variables
-- ============================================================================

-- ============================================================================
-- 1. List all templates with their declared variables
-- ============================================================================
SELECT
    slug,
    name,
    category,
    available_variables,
    is_active
FROM email_templates
ORDER BY category, slug;

-- ============================================================================
-- 2. Extract all {{variables}} used in HTML content for each template
-- This query finds all placeholders in the format {{variableName}}
-- ============================================================================
SELECT
    slug,
    name,
    category,
    -- Count of declared variables
    jsonb_array_length(COALESCE(available_variables, '[]'::jsonb)) as declared_count,
    -- Extract all {{variable}} patterns from html_content
    (
        SELECT array_agg(DISTINCT match[1])
        FROM regexp_matches(html_content, '\{\{(\w+)\}\}', 'g') as match
    ) as used_in_html,
    -- Extract all {{variable}} patterns from subject
    (
        SELECT array_agg(DISTINCT match[1])
        FROM regexp_matches(subject, '\{\{(\w+)\}\}', 'g') as match
    ) as used_in_subject
FROM email_templates
ORDER BY category, slug;

-- ============================================================================
-- 3. Find MISMATCHES: Variables used in HTML but NOT declared
-- These are the problematic cases where templates use variables that
-- might not be passed by the code
-- ============================================================================
WITH template_vars AS (
    SELECT
        slug,
        name,
        category,
        -- Get declared variables as array
        ARRAY(
            SELECT jsonb_array_elements_text(COALESCE(available_variables, '[]'::jsonb))
        ) as declared,
        -- Get used variables from html_content
        ARRAY(
            SELECT DISTINCT match[1]::text
            FROM regexp_matches(html_content, '\{\{(\w+)\}\}', 'g') as match
        ) as used_in_html,
        -- Get used variables from subject
        ARRAY(
            SELECT DISTINCT match[1]::text
            FROM regexp_matches(subject, '\{\{(\w+)\}\}', 'g') as match
        ) as used_in_subject
    FROM email_templates
)
SELECT
    slug,
    name,
    category,
    declared,
    used_in_html,
    -- Variables used in HTML but NOT declared
    (
        SELECT array_agg(v)
        FROM unnest(used_in_html) as v
        WHERE v != ALL(declared)
    ) as undeclared_html_vars,
    -- Variables used in subject but NOT declared
    (
        SELECT array_agg(v)
        FROM unnest(used_in_subject) as v
        WHERE v != ALL(declared)
    ) as undeclared_subject_vars
FROM template_vars
WHERE
    -- Filter only templates with potential issues
    EXISTS (
        SELECT 1 FROM unnest(used_in_html) as v WHERE v != ALL(declared)
    )
    OR EXISTS (
        SELECT 1 FROM unnest(used_in_subject) as v WHERE v != ALL(declared)
    )
ORDER BY category, slug;

-- ============================================================================
-- 4. Find UNUSED: Variables declared but NOT used in template
-- These are declared but never appear in the HTML/subject
-- ============================================================================
WITH template_vars AS (
    SELECT
        slug,
        name,
        category,
        -- Get declared variables as array
        ARRAY(
            SELECT jsonb_array_elements_text(COALESCE(available_variables, '[]'::jsonb))
        ) as declared,
        -- Get ALL used variables (html + subject combined)
        ARRAY(
            SELECT DISTINCT match[1]::text
            FROM (
                SELECT regexp_matches(html_content || ' ' || subject, '\{\{(\w+)\}\}', 'g') as match
            ) sub
        ) as used_all
    FROM email_templates
)
SELECT
    slug,
    name,
    category,
    declared,
    used_all as actually_used,
    -- Variables declared but NOT used
    (
        SELECT array_agg(v)
        FROM unnest(declared) as v
        WHERE v != ALL(used_all)
    ) as unused_declared_vars
FROM template_vars
WHERE EXISTS (
    SELECT 1 FROM unnest(declared) as v WHERE v != ALL(used_all)
)
ORDER BY category, slug;

-- ============================================================================
-- 5. Complete Variable Mapping for Code Verification
-- Use this to verify the resend.ts functions send correct variables
-- ============================================================================
SELECT
    slug,
    category,
    -- JSON object showing what variables are needed
    jsonb_build_object(
        'template', slug,
        'declared_variables', available_variables,
        'html_variables', (
            SELECT jsonb_agg(DISTINCT match[1])
            FROM regexp_matches(html_content, '\{\{(\w+)\}\}', 'g') as match
        ),
        'subject_variables', (
            SELECT jsonb_agg(DISTINCT match[1])
            FROM regexp_matches(subject, '\{\{(\w+)\}\}', 'g') as match
        )
    ) as variable_mapping
FROM email_templates
WHERE is_active = true
ORDER BY category, slug;

-- ============================================================================
-- 6. Summary Statistics
-- ============================================================================
SELECT
    category,
    COUNT(*) as template_count,
    COUNT(*) FILTER (WHERE is_active = true) as active_templates,
    SUM(jsonb_array_length(COALESCE(available_variables, '[]'::jsonb))) as total_variables
FROM email_templates
GROUP BY category
ORDER BY category;

-- ============================================================================
-- 7. Specific Template Variable Comparison
-- This shows the EXACT variables each template expects vs what it uses
-- ============================================================================
SELECT
    slug,
    name,
    COALESCE(available_variables, '[]'::jsonb) as should_send_these,
    (
        SELECT jsonb_agg(DISTINCT match[1] ORDER BY match[1])
        FROM regexp_matches(html_content || ' ' || subject, '\{\{(\w+)\}\}', 'g') as match
    ) as template_expects_these,
    CASE
        WHEN COALESCE(available_variables, '[]'::jsonb) @> (
            SELECT COALESCE(jsonb_agg(DISTINCT match[1]), '[]'::jsonb)
            FROM regexp_matches(html_content || ' ' || subject, '\{\{(\w+)\}\}', 'g') as match
        ) THEN 'OK'
        ELSE 'MISMATCH'
    END as status
FROM email_templates
ORDER BY
    CASE
        WHEN COALESCE(available_variables, '[]'::jsonb) @> (
            SELECT COALESCE(jsonb_agg(DISTINCT match[1]), '[]'::jsonb)
            FROM regexp_matches(html_content || ' ' || subject, '\{\{(\w+)\}\}', 'g') as match
        ) THEN 1
        ELSE 0
    END,
    category, slug;

-- ============================================================================
-- 8. Code vs Template Variable Mapping Reference
-- This is the expected mapping between resend.ts functions and templates
-- Run this and compare with your code
-- ============================================================================
SELECT
    slug as "Template Slug",
    name as "Template Name",
    category as "Category",
    available_variables as "Variables Code Should Send"
FROM email_templates
WHERE is_active = true
ORDER BY category, slug;

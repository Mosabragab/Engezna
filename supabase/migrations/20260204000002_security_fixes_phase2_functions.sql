-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ Security Fixes Phase 2 - Function Search Path                                 ║
-- ║ إصلاحات الأمان المرحلة الثانية - مسار البحث للدوال                             ║
-- ║                                                                                ║
-- ║ SAFE MIGRATION - Only adds search_path, no logic changes                      ║
-- ║ فقط يضيف search_path، بدون تغيير المنطق                                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════════════════════
-- Helper: This migration uses DO blocks to safely alter functions
-- If a function doesn't exist or has different signature, it will be skipped
-- ════════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Loop through all functions in public schema that don't have search_path set
  FOR func_record IN
    SELECT
      p.oid,
      p.proname as func_name,
      pg_get_function_identity_arguments(p.oid) as func_args,
      n.nspname as schema_name
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prokind = 'f'  -- Only functions (not procedures or aggregates)
    AND (p.proconfig IS NULL OR NOT EXISTS (
      SELECT 1 FROM unnest(p.proconfig) AS conf WHERE conf LIKE 'search_path=%'
    ))
  LOOP
    BEGIN
      -- Set search_path for each function
      EXECUTE format(
        'ALTER FUNCTION %I.%I(%s) SET search_path = public',
        func_record.schema_name,
        func_record.func_name,
        func_record.func_args
      );
      RAISE NOTICE 'Set search_path for function: %.%(%)',
        func_record.schema_name, func_record.func_name, func_record.func_args;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped function %.%(%): %',
        func_record.schema_name, func_record.func_name, func_record.func_args, SQLERRM;
    END;
  END LOOP;
END $$;

-- ════════════════════════════════════════════════════════════════════════════════
-- Also set search_path for trigger functions (prokind = 'f' but used as triggers)
-- These are already covered above, but let's be explicit for documentation
-- ════════════════════════════════════════════════════════════════════════════════

-- Verification query (run after migration to check results):
-- SELECT proname, proconfig
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
-- AND proconfig IS NOT NULL
-- ORDER BY proname;

-- ════════════════════════════════════════════════════════════════════════════════
-- SUMMARY
-- ════════════════════════════════════════════════════════════════════════════════
-- This migration automatically adds search_path = public to ALL functions
-- in the public schema that don't already have it set.
--
-- This prevents search_path injection attacks where a malicious user could
-- create objects in a schema that appears earlier in the search_path.
--
-- هذا الـ migration يضيف تلقائياً search_path = public لكل الدوال
-- في الـ public schema التي لم يتم تعيينها مسبقاً.
-- ════════════════════════════════════════════════════════════════════════════════

-- Migration: Fix Governorates RLS Policies
-- Date: December 12, 2025
-- Purpose: Add RLS policies to allow admins to manage governorates

-- ============================================================================
-- 1. Enable RLS on governorates (if not already enabled)
-- ============================================================================

ALTER TABLE governorates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Drop existing policies if any (to avoid conflicts)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can read active governorates" ON governorates;
DROP POLICY IF EXISTS "Admins can manage governorates" ON governorates;
DROP POLICY IF EXISTS "Public can read governorates" ON governorates;

-- ============================================================================
-- 3. Create new RLS policies for governorates
-- ============================================================================

-- Anyone can read governorates (for location selection dropdowns)
CREATE POLICY "Public can read governorates"
ON governorates
FOR SELECT
TO authenticated, anon
USING (true);

-- Admins can manage all governorates (insert, update, delete)
CREATE POLICY "Admins can manage governorates"
ON governorates
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- ============================================================================
-- 4. Do the same for cities table
-- ============================================================================

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read cities" ON cities;
DROP POLICY IF EXISTS "Admins can manage cities" ON cities;

CREATE POLICY "Public can read cities"
ON cities
FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Admins can manage cities"
ON cities
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- ============================================================================
-- 5. Do the same for districts table
-- ============================================================================

ALTER TABLE districts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read districts" ON districts;
DROP POLICY IF EXISTS "Admins can manage districts" ON districts;

CREATE POLICY "Public can read districts"
ON districts
FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Admins can manage districts"
ON districts
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- ============================================================================
-- Migration Complete
-- ============================================================================

COMMENT ON POLICY "Admins can manage governorates" ON governorates IS 'Allows admin users to manage all governorates';
COMMENT ON POLICY "Admins can manage cities" ON cities IS 'Allows admin users to manage all cities';
COMMENT ON POLICY "Admins can manage districts" ON districts IS 'Allows admin users to manage all districts';

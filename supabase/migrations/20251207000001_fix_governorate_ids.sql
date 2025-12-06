-- Migration: Fix governorate_id for providers and customers
-- Date: December 7, 2025
-- Purpose: Update governorate_id to enable proper analytics in Locations page

-- Step 1: Get Beni Suef governorate ID
DO $$
DECLARE
    beni_suef_id UUID;
BEGIN
    -- Get Beni Suef governorate ID
    SELECT id INTO beni_suef_id FROM governorates WHERE name_en = 'Beni Suef' OR name_ar = 'بني سويف' LIMIT 1;

    -- If Beni Suef doesn't exist, create it
    IF beni_suef_id IS NULL THEN
        INSERT INTO governorates (name_ar, name_en, is_active)
        VALUES ('بني سويف', 'Beni Suef', true)
        RETURNING id INTO beni_suef_id;

        RAISE NOTICE 'Created Beni Suef governorate with ID: %', beni_suef_id;
    END IF;

    -- Step 2: Update all providers without governorate_id to Beni Suef
    UPDATE providers
    SET governorate_id = beni_suef_id
    WHERE governorate_id IS NULL;

    RAISE NOTICE 'Updated providers with Beni Suef governorate';

    -- Step 3: Update all customer profiles without governorate_id to Beni Suef
    UPDATE profiles
    SET governorate_id = beni_suef_id
    WHERE governorate_id IS NULL
    AND role = 'customer';

    RAISE NOTICE 'Updated customer profiles with Beni Suef governorate';

    -- Step 4: Update all profiles (including non-customers) without governorate_id
    UPDATE profiles
    SET governorate_id = beni_suef_id
    WHERE governorate_id IS NULL;

    RAISE NOTICE 'Updated all profiles with Beni Suef governorate';

END $$;

-- Verification queries (run these to check the results)
-- SELECT COUNT(*) as providers_with_gov FROM providers WHERE governorate_id IS NOT NULL;
-- SELECT COUNT(*) as customers_with_gov FROM profiles WHERE governorate_id IS NOT NULL AND role = 'customer';
-- SELECT g.name_ar, COUNT(p.id) as provider_count
-- FROM governorates g
-- LEFT JOIN providers p ON p.governorate_id = g.id
-- GROUP BY g.id, g.name_ar;

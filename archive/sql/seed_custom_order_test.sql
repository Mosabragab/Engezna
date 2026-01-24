-- ============================================================================
-- CUSTOM ORDER SYSTEM - E2E Testing Seed Data
-- بيانات تجريبية لاختبار نظام الطلب المفتوح من البداية للنهاية
-- ============================================================================

-- ============================================================================
-- HOW TO USE THIS SCRIPT:
-- كيفية استخدام هذا السكريبت:
--
-- 1. Run the SQL migration first (20260109000001_custom_order_system.sql)
-- 2. Run the provider enablement migration (20260110000002_enable_custom_orders_alnajah.sql)
-- 3. Run this seed script for testing
--
-- This creates a complete test scenario you can follow through the UI
-- ============================================================================

DO $$
DECLARE
  -- Test IDs
  v_test_customer_id UUID;
  v_test_provider_id UUID;
  v_broadcast_id UUID;
  v_request_id UUID;
  v_item1_id UUID;
  v_item2_id UUID;
  v_item3_id UUID;
BEGIN
  RAISE NOTICE '🚀 Starting Custom Order E2E Test Data Seeding...';

  -- ============================================================================
  -- STEP 1: Find or Create Test Customer
  -- ============================================================================
  SELECT id INTO v_test_customer_id
  FROM profiles
  WHERE email ILIKE '%test%' OR phone LIKE '+20123%'
  LIMIT 1;

  IF v_test_customer_id IS NULL THEN
    -- Try to get any customer
    SELECT id INTO v_test_customer_id
    FROM profiles
    WHERE role = 'customer' OR role IS NULL
    LIMIT 1;
  END IF;

  IF v_test_customer_id IS NULL THEN
    RAISE NOTICE '⚠️ No test customer found. Please create a customer account first.';
    RAISE NOTICE '   Create an account at: /auth/signup';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Using test customer: %', v_test_customer_id;

  -- ============================================================================
  -- STEP 2: Find Custom Order Enabled Provider
  -- ============================================================================
  SELECT id INTO v_test_provider_id
  FROM providers
  WHERE operation_mode IN ('custom', 'hybrid')
    AND status IN ('open', 'closed', 'temporarily_paused')
  LIMIT 1;

  IF v_test_provider_id IS NULL THEN
    -- Enable custom orders for any supermarket/pharmacy
    SELECT id INTO v_test_provider_id
    FROM providers
    WHERE category IN ('سوبر ماركت', 'صيدلية', 'supermarket', 'pharmacy', 'خضروات')
      AND status IN ('open', 'closed', 'temporarily_paused')
    LIMIT 1;

    IF v_test_provider_id IS NOT NULL THEN
      -- Enable custom orders
      UPDATE providers
      SET
        operation_mode = 'hybrid',
        custom_order_settings = jsonb_build_object(
          'accepts_text', true,
          'accepts_voice', true,
          'accepts_image', true,
          'max_items_per_order', 50,
          'pricing_timeout_hours', 2,
          'customer_approval_timeout_hours', 2,
          'welcome_banner_enabled', true,
          'welcome_banner_text_ar', 'جرّب نظام الطلب المفتوح الجديد! أرسل قائمتك وسنقوم بتسعيرها',
          'welcome_banner_text_en', 'Try our new Custom Order system! Send your list and we will price it'
        )
      WHERE id = v_test_provider_id;
      RAISE NOTICE '✅ Enabled custom orders for provider: %', v_test_provider_id;
    END IF;
  END IF;

  IF v_test_provider_id IS NULL THEN
    RAISE NOTICE '⚠️ No suitable provider found. Please add a supermarket/pharmacy first.';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Using test provider: %', v_test_provider_id;

  -- ============================================================================
  -- STEP 3: Create Test Broadcast (Customer sends order request)
  -- ============================================================================
  INSERT INTO custom_order_broadcasts (
    customer_id,
    provider_ids,
    original_input_type,
    original_text,
    status,
    pricing_deadline,
    expires_at
  ) VALUES (
    v_test_customer_id,
    ARRAY[v_test_provider_id],
    'text',
    '🛒 قائمة المشتريات الأسبوعية:

1. طماطم - 2 كيلو (طازجة)
2. بطاطس - 3 كيلو
3. زيت عباد الشمس - لتر واحد (كبير)
4. أرز مصري - 2 كيلو
5. سكر - كيلو واحد

📝 ملاحظة: أرجو اختيار الخضار الطازجة
🏠 التوصيل: المنيل - شارع النيل',
    'active',
    NOW() + INTERVAL '2 hours',
    NOW() + INTERVAL '24 hours'
  )
  RETURNING id INTO v_broadcast_id;

  RAISE NOTICE '✅ Created broadcast: %', v_broadcast_id;

  -- ============================================================================
  -- STEP 4: Create Request for Provider
  -- ============================================================================
  INSERT INTO custom_order_requests (
    broadcast_id,
    provider_id,
    status,
    created_at
  ) VALUES (
    v_broadcast_id,
    v_test_provider_id,
    'pending',
    NOW()
  )
  RETURNING id INTO v_request_id;

  RAISE NOTICE '✅ Created request for provider: %', v_request_id;

  -- ============================================================================
  -- STEP 5: Simulate Merchant Pricing (After merchant reviews the order)
  -- ============================================================================

  -- Item 1: طماطم
  INSERT INTO custom_order_items (
    request_id,
    item_name_ar,
    item_name_en,
    quantity,
    unit_type,
    unit_price,
    total_price,
    availability_status,
    merchant_notes
  ) VALUES (
    v_request_id,
    'طماطم طازجة',
    'Fresh Tomatoes',
    2,
    'كيلو',
    18.00,
    36.00,
    'available',
    'طماطم بلدي طازجة من المزرعة'
  )
  RETURNING id INTO v_item1_id;

  -- Item 2: بطاطس
  INSERT INTO custom_order_items (
    request_id,
    item_name_ar,
    item_name_en,
    quantity,
    unit_type,
    unit_price,
    total_price,
    availability_status
  ) VALUES (
    v_request_id,
    'بطاطس',
    'Potatoes',
    3,
    'كيلو',
    12.00,
    36.00,
    'available'
  )
  RETURNING id INTO v_item2_id;

  -- Item 3: زيت (substituted)
  INSERT INTO custom_order_items (
    request_id,
    item_name_ar,
    item_name_en,
    quantity,
    unit_type,
    unit_price,
    total_price,
    availability_status,
    substitute_name_ar,
    substitute_name_en,
    merchant_notes
  ) VALUES (
    v_request_id,
    'زيت عباد الشمس',
    'Sunflower Oil',
    1,
    'لتر',
    95.00,
    95.00,
    'substituted',
    'زيت ذرة كريستال',
    'Crystal Corn Oil',
    'زيت عباد الشمس غير متوفر حالياً، زيت الذرة بنفس السعر'
  )
  RETURNING id INTO v_item3_id;

  -- Item 4: أرز
  INSERT INTO custom_order_items (
    request_id,
    item_name_ar,
    item_name_en,
    quantity,
    unit_type,
    unit_price,
    total_price,
    availability_status
  ) VALUES (
    v_request_id,
    'أرز مصري',
    'Egyptian Rice',
    2,
    'كيلو',
    28.00,
    56.00,
    'available'
  );

  -- Item 5: سكر
  INSERT INTO custom_order_items (
    request_id,
    item_name_ar,
    item_name_en,
    quantity,
    unit_type,
    unit_price,
    total_price,
    availability_status
  ) VALUES (
    v_request_id,
    'سكر أبيض',
    'White Sugar',
    1,
    'كيلو',
    25.00,
    25.00,
    'available'
  );

  -- Update request with totals
  UPDATE custom_order_requests
  SET
    status = 'priced',
    subtotal = 248.00,          -- 36 + 36 + 95 + 56 + 25
    delivery_fee = 15.00,
    total = 263.00,             -- 248 + 15
    items_count = 5,
    priced_at = NOW(),
    responded_at = NOW(),
    merchant_note = 'شكراً لطلبك! جميع المنتجات متوفرة ما عدا زيت عباد الشمس - تم استبداله بزيت ذرة بنفس السعر. التوصيل خلال 45 دقيقة.'
  WHERE id = v_request_id;

  RAISE NOTICE '✅ Items added and request priced';

  -- ============================================================================
  -- OUTPUT SUMMARY
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ E2E TEST DATA CREATED SUCCESSFULLY!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 TEST SCENARIO:';
  RAISE NOTICE '   Customer ID: %', v_test_customer_id;
  RAISE NOTICE '   Provider ID: %', v_test_provider_id;
  RAISE NOTICE '   Broadcast ID: %', v_broadcast_id;
  RAISE NOTICE '   Request ID: %', v_request_id;
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TESTING STEPS:';
  RAISE NOTICE '   1. Customer App: Go to provider page and see welcome banner';
  RAISE NOTICE '   2. Customer App: View custom order review at /orders/custom-review/%', v_broadcast_id;
  RAISE NOTICE '   3. Merchant App: View pending orders at /provider/orders/custom/%', v_request_id;
  RAISE NOTICE '   4. Admin Panel: Monitor at /admin/custom-orders';
  RAISE NOTICE '   5. Admin Panel: View analytics at /admin/custom-orders/analytics';
  RAISE NOTICE '';
  RAISE NOTICE '💰 ORDER DETAILS:';
  RAISE NOTICE '   Subtotal: 248 EGP';
  RAISE NOTICE '   Delivery: 15 EGP';
  RAISE NOTICE '   Total: 263 EGP';
  RAISE NOTICE '   Commission (7%%): 18.41 EGP';
  RAISE NOTICE '   Merchant Payout: 244.59 EGP';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- استعلامات التحقق
-- ============================================================================

-- Check the test broadcast
SELECT
  cob.id as broadcast_id,
  cob.status,
  cob.original_text,
  cob.pricing_deadline,
  p.name_ar as customer_name
FROM custom_order_broadcasts cob
JOIN profiles p ON cob.customer_id = p.id
WHERE cob.status = 'active'
ORDER BY cob.created_at DESC
LIMIT 5;

-- Check the test request with items
SELECT
  cor.id as request_id,
  cor.status,
  cor.subtotal,
  cor.delivery_fee,
  cor.total,
  cor.items_count,
  p.name_ar as provider_name
FROM custom_order_requests cor
JOIN providers p ON cor.provider_id = p.id
WHERE cor.status = 'priced'
ORDER BY cor.priced_at DESC
LIMIT 5;

-- Check items in the request
SELECT
  coi.item_name_ar,
  coi.quantity,
  coi.unit_type,
  coi.unit_price,
  coi.total_price,
  coi.availability_status,
  coi.substitute_name_ar
FROM custom_order_items coi
JOIN custom_order_requests cor ON coi.request_id = cor.id
WHERE cor.status = 'priced'
ORDER BY coi.created_at DESC
LIMIT 10;

-- Commission calculation check
SELECT * FROM custom_order_commission_check LIMIT 5;

-- Enabled providers
SELECT * FROM custom_order_enabled_providers;

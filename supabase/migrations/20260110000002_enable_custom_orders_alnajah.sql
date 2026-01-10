-- ============================================================================
-- PHASE 7: Enable Custom Orders for سوبر ماركت النجاح (Al-Najah Supermarket)
-- التشغيل التجريبي لنظام الطلب المفتوح
-- Date: January 2026
-- ============================================================================

-- ============================================================================
-- STEP 1: Find and Update the Provider
-- البحث عن المتجر وتحديث إعداداته
-- ============================================================================

-- First, let's create a function to safely enable custom orders for a provider
CREATE OR REPLACE FUNCTION enable_custom_orders_for_provider(
  p_provider_name_pattern TEXT,
  p_operation_mode TEXT DEFAULT 'hybrid'
)
RETURNS TABLE (
  provider_id UUID,
  provider_name TEXT,
  old_mode TEXT,
  new_mode TEXT,
  settings_updated BOOLEAN
) AS $$
DECLARE
  v_provider RECORD;
  v_count INT := 0;
BEGIN
  -- Find providers matching the pattern
  FOR v_provider IN
    SELECT id, name_ar, name_en, operation_mode
    FROM providers
    WHERE name_ar ILIKE '%' || p_provider_name_pattern || '%'
       OR name_en ILIKE '%' || p_provider_name_pattern || '%'
  LOOP
    -- Update the provider
    UPDATE providers
    SET
      operation_mode = p_operation_mode,
      custom_order_settings = jsonb_build_object(
        'accepts_text', true,
        'accepts_voice', true,
        'accepts_image', true,
        'max_items_per_order', 50,
        'pricing_timeout_hours', 2,
        'customer_approval_timeout_hours', 2,
        'auto_cancel_after_hours', 24,
        'show_price_history', true,
        'welcome_banner_enabled', true,
        'welcome_banner_text_ar', 'مرحباً! فعّلنا نظام الطلب المفتوح 🎉 أرسل طلبك بالصوت أو الصورة أو النص وسنقوم بتسعيره فوراً',
        'welcome_banner_text_en', 'Welcome! We enabled Custom Orders 🎉 Send your order via voice, image, or text and we will price it immediately',
        'enabled_at', NOW()
      ),
      updated_at = NOW()
    WHERE id = v_provider.id;

    v_count := v_count + 1;

    -- Return the result
    provider_id := v_provider.id;
    provider_name := v_provider.name_ar;
    old_mode := v_provider.operation_mode;
    new_mode := p_operation_mode;
    settings_updated := true;
    RETURN NEXT;
  END LOOP;

  -- If no providers found, raise notice
  IF v_count = 0 THEN
    RAISE NOTICE 'No providers found matching pattern: %', p_provider_name_pattern;
  ELSE
    RAISE NOTICE 'Updated % provider(s) to custom order mode', v_count;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 2: Enable Custom Orders for سوبر ماركت النجاح
-- تفعيل نظام الطلب المفتوح للسوبر ماركت
-- ============================================================================

-- Enable for "النجاح" supermarket (hybrid mode = both standard menu + custom orders)
SELECT * FROM enable_custom_orders_for_provider('النجاح', 'hybrid');

-- If not found by Arabic name, try English
SELECT * FROM enable_custom_orders_for_provider('najah', 'hybrid');
SELECT * FROM enable_custom_orders_for_provider('success', 'hybrid');

-- ============================================================================
-- STEP 3: Create Test Customer if not exists
-- إنشاء عميل تجريبي للاختبار
-- ============================================================================

-- This is for development/testing purposes
DO $$
DECLARE
  v_test_customer_id UUID;
  v_test_provider_id UUID;
BEGIN
  -- Check if test customer exists
  SELECT id INTO v_test_customer_id
  FROM profiles
  WHERE phone = '+201234567890'
  LIMIT 1;

  IF v_test_customer_id IS NULL THEN
    RAISE NOTICE 'Test customer not found. In production, use real customer accounts.';
  ELSE
    RAISE NOTICE 'Test customer found: %', v_test_customer_id;
  END IF;

  -- Find the enabled custom order provider
  SELECT id INTO v_test_provider_id
  FROM providers
  WHERE operation_mode IN ('custom', 'hybrid')
    AND custom_order_settings IS NOT NULL
  LIMIT 1;

  IF v_test_provider_id IS NOT NULL THEN
    RAISE NOTICE 'Custom order enabled provider found: %', v_test_provider_id;
  ELSE
    RAISE NOTICE 'No custom order enabled providers found yet.';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Verify the Configuration
-- التحقق من صحة الإعدادات
-- ============================================================================

-- Query to verify custom order enabled providers
CREATE OR REPLACE VIEW custom_order_enabled_providers AS
SELECT
  p.id,
  p.name_ar,
  p.name_en,
  p.operation_mode,
  p.custom_order_settings->>'accepts_text' as accepts_text,
  p.custom_order_settings->>'accepts_voice' as accepts_voice,
  p.custom_order_settings->>'accepts_image' as accepts_image,
  p.custom_order_settings->>'pricing_timeout_hours' as pricing_timeout_hours,
  p.custom_order_settings->>'welcome_banner_enabled' as welcome_banner_enabled,
  p.custom_order_settings->>'enabled_at' as enabled_at,
  p.status,
  g.name_ar as governorate,
  c.name_ar as city
FROM providers p
LEFT JOIN governorates g ON p.governorate_id = g.id
LEFT JOIN cities c ON p.city_id = c.id
WHERE p.operation_mode IN ('custom', 'hybrid')
  AND p.custom_order_settings IS NOT NULL;

COMMENT ON VIEW custom_order_enabled_providers IS 'عرض المتاجر المفعّل لها نظام الطلب المفتوح';

-- Grant access
GRANT SELECT ON custom_order_enabled_providers TO authenticated, service_role;

-- ============================================================================
-- STEP 5: Create Sample Broadcast for Testing (Development Only)
-- إنشاء بث تجريبي للاختبار (للتطوير فقط)
-- ============================================================================

-- This function creates a test broadcast - use only in development
CREATE OR REPLACE FUNCTION create_test_custom_order_broadcast(
  p_customer_id UUID,
  p_provider_id UUID,
  p_input_type custom_order_input_type DEFAULT 'text',
  p_text TEXT DEFAULT 'طلب تجريبي: 2 كيلو طماطم، 1 كيلو بطاطس، علبة زيت كبيرة'
)
RETURNS TABLE (
  broadcast_id UUID,
  request_id UUID,
  status TEXT
) AS $$
DECLARE
  v_broadcast_id UUID;
  v_request_id UUID;
BEGIN
  -- Create broadcast
  INSERT INTO custom_order_broadcasts (
    customer_id,
    provider_ids,
    original_input_type,
    original_text,
    status,
    pricing_deadline,
    expires_at
  ) VALUES (
    p_customer_id,
    ARRAY[p_provider_id],
    p_input_type,
    p_text,
    'active',
    NOW() + INTERVAL '2 hours',
    NOW() + INTERVAL '24 hours'
  )
  RETURNING id INTO v_broadcast_id;

  -- Create request for the provider
  INSERT INTO custom_order_requests (
    broadcast_id,
    provider_id,
    status
  ) VALUES (
    v_broadcast_id,
    p_provider_id,
    'pending'
  )
  RETURNING id INTO v_request_id;

  -- Return result
  broadcast_id := v_broadcast_id;
  request_id := v_request_id;
  status := 'created';
  RETURN NEXT;

  RAISE NOTICE 'Test broadcast created: %, request: %', v_broadcast_id, v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 6: Notification Testing Helper
-- مساعد اختبار الإشعارات
-- ============================================================================

-- Function to simulate pricing and trigger notification
CREATE OR REPLACE FUNCTION simulate_pricing_for_request(
  p_request_id UUID,
  p_items JSONB DEFAULT '[
    {"item_name_ar": "طماطم", "quantity": 2, "unit_type": "كيلو", "unit_price": 15.00},
    {"item_name_ar": "بطاطس", "quantity": 1, "unit_type": "كيلو", "unit_price": 12.00},
    {"item_name_ar": "زيت عباد الشمس", "quantity": 1, "unit_type": "لتر", "unit_price": 85.00}
  ]'::jsonb,
  p_delivery_fee DECIMAL DEFAULT 15.00
)
RETURNS TABLE (
  request_id UUID,
  subtotal DECIMAL,
  delivery_fee DECIMAL,
  total DECIMAL,
  items_count INT,
  status TEXT
) AS $$
DECLARE
  v_subtotal DECIMAL := 0;
  v_item JSONB;
  v_item_total DECIMAL;
  v_items_count INT := 0;
BEGIN
  -- Calculate subtotal from items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_total := (v_item->>'quantity')::DECIMAL * (v_item->>'unit_price')::DECIMAL;
    v_subtotal := v_subtotal + v_item_total;
    v_items_count := v_items_count + 1;

    -- Insert item
    INSERT INTO custom_order_items (
      request_id,
      item_name_ar,
      quantity,
      unit_type,
      unit_price,
      total_price,
      availability_status
    ) VALUES (
      p_request_id,
      v_item->>'item_name_ar',
      (v_item->>'quantity')::DECIMAL,
      v_item->>'unit_type',
      (v_item->>'unit_price')::DECIMAL,
      v_item_total,
      'available'
    );
  END LOOP;

  -- Update request with pricing
  UPDATE custom_order_requests
  SET
    status = 'priced',
    subtotal = v_subtotal,
    delivery_fee = p_delivery_fee,
    total = v_subtotal + p_delivery_fee,
    items_count = v_items_count,
    priced_at = NOW(),
    responded_at = NOW()
  WHERE id = p_request_id;

  -- Return results
  request_id := p_request_id;
  subtotal := v_subtotal;
  delivery_fee := p_delivery_fee;
  total := v_subtotal + p_delivery_fee;
  items_count := v_items_count;
  status := 'priced';
  RETURN NEXT;

  -- The trigger notify_custom_order_priced should fire automatically
  RAISE NOTICE 'Request % priced: subtotal=%, delivery=%, total=%',
    p_request_id, v_subtotal, p_delivery_fee, v_subtotal + p_delivery_fee;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: Commission Calculation Verification
-- التحقق من حساب العمولة
-- ============================================================================

-- View to check commission calculations
CREATE OR REPLACE VIEW custom_order_commission_check AS
SELECT
  cor.id as request_id,
  cor.total,
  cor.subtotal,
  cor.delivery_fee,
  -- Tiered commission calculation
  CASE
    WHEN cor.total < 500 THEN 0.07  -- 7% for orders < 500 EGP
    WHEN cor.total < 1000 THEN 0.06 -- 6% for orders 500-1000 EGP
    ELSE 0.05                        -- 5% for orders > 1000 EGP
  END as commission_rate,
  CASE
    WHEN cor.total < 500 THEN cor.total * 0.07
    WHEN cor.total < 1000 THEN cor.total * 0.06
    ELSE cor.total * 0.05
  END as platform_commission,
  cor.total - CASE
    WHEN cor.total < 500 THEN cor.total * 0.07
    WHEN cor.total < 1000 THEN cor.total * 0.06
    ELSE cor.total * 0.05
  END as merchant_payout,
  p.name_ar as provider_name,
  cor.status,
  cor.priced_at
FROM custom_order_requests cor
JOIN providers p ON cor.provider_id = p.id
WHERE cor.status IN ('priced', 'customer_approved')
ORDER BY cor.priced_at DESC;

COMMENT ON VIEW custom_order_commission_check IS 'التحقق من حسابات العمولة للطلبات المفتوحة';
GRANT SELECT ON custom_order_commission_check TO authenticated, service_role;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to check everything)
-- استعلامات التحقق
-- ============================================================================

-- Check enabled providers
-- SELECT * FROM custom_order_enabled_providers;

-- Check commission calculations
-- SELECT * FROM custom_order_commission_check;

-- Check active broadcasts
-- SELECT * FROM custom_order_broadcasts WHERE status = 'active';

-- Check pending requests for merchants
-- SELECT cor.*, p.name_ar as provider_name
-- FROM custom_order_requests cor
-- JOIN providers p ON cor.provider_id = p.id
-- WHERE cor.status = 'pending';

RAISE NOTICE '✅ Custom order system enabled for سوبر ماركت النجاح';
RAISE NOTICE '📋 Next steps:';
RAISE NOTICE '   1. Run: SELECT * FROM custom_order_enabled_providers;';
RAISE NOTICE '   2. Test broadcast creation via the customer app';
RAISE NOTICE '   3. Test pricing via the merchant dashboard';
RAISE NOTICE '   4. Verify notifications are received';

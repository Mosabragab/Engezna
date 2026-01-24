-- ============================================================================
-- تقصي حقائق: لماذا لا تتحدث العمولة بعد المرتجع؟
-- Debug: Why isn't commission updating after refund?
-- Settlement ID: 8f42ceb2-c962-42c3-b108-7a61e52c4727
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. فحص المرتجعات: هل customer_confirmed = true؟
-- Check refunds: Is customer_confirmed = true?
-- ═══════════════════════════════════════════════════════════════════════════
SELECT
  r.id as refund_id,
  r.order_id,
  r.amount,
  r.processed_amount,
  r.status,
  r.affects_settlement,
  r.customer_confirmed,          -- <<< هذا المهم!
  r.customer_confirmed_at,
  r.provider_action,
  r.created_at
FROM refunds r
WHERE r.order_id IN (
  SELECT unnest(orders_included)
  FROM settlements
  WHERE id = '8f42ceb2-c962-42c3-b108-7a61e52c4727'
)
ORDER BY r.created_at DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. فحص الطلبات: ما هي قيم العمولة؟
-- Check orders: What are the commission values?
-- ═══════════════════════════════════════════════════════════════════════════
SELECT
  o.id,
  o.order_number,
  o.total,
  o.subtotal,
  o.discount,
  o.delivery_fee,
  o.platform_commission,         -- العمولة الفعلية
  o.original_commission,         -- العمولة النظرية
  o.settlement_adjusted,         -- هل تم التعديل؟
  o.settlement_notes             -- ملاحظات التعديل
FROM orders o
WHERE o.id IN (
  SELECT unnest(orders_included)
  FROM settlements
  WHERE id = '8f42ceb2-c962-42c3-b108-7a61e52c4727'
)
ORDER BY o.order_number;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. فحص التاجر: هل في فترة سماح؟
-- Check provider: Is in grace period?
-- ═══════════════════════════════════════════════════════════════════════════
SELECT
  p.id,
  p.name_ar,
  p.commission_status,
  p.grace_period_start,
  p.grace_period_end,
  p.commission_rate,
  p.custom_commission_rate
FROM providers p
JOIN settlements s ON s.provider_id = p.id
WHERE s.id = '8f42ceb2-c962-42c3-b108-7a61e52c4727';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. فحص الـ Trigger: هل موجود؟
-- Check trigger: Does it exist?
-- ═══════════════════════════════════════════════════════════════════════════
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_refund_settlement_update';

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. إصلاح سريع: تعيين customer_confirmed = true يدوياً
-- Quick fix: Manually set customer_confirmed = true
-- ⚠️ استخدم فقط للاختبار!
-- ═══════════════════════════════════════════════════════════════════════════
/*
-- خطوة 1: اعرض المرتجعات التي لم يتم تأكيدها
SELECT id, order_id, amount, status, customer_confirmed
FROM refunds
WHERE order_id IN (
  SELECT unnest(orders_included)
  FROM settlements
  WHERE id = '8f42ceb2-c962-42c3-b108-7a61e52c4727'
)
AND (customer_confirmed = false OR customer_confirmed IS NULL);

-- خطوة 2: تحديث customer_confirmed لتشغيل الـ trigger
UPDATE refunds
SET customer_confirmed = true
WHERE id = 'REFUND_ID_HERE'  -- ضع ID المرتجع هنا
AND (customer_confirmed = false OR customer_confirmed IS NULL);
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. إعادة حساب العمولة يدوياً (إذا لزم الأمر)
-- Manual commission recalculation (if needed)
-- ═══════════════════════════════════════════════════════════════════════════
/*
WITH order_data AS (
  SELECT
    o.id as order_id,
    o.total,
    o.subtotal,
    o.discount,
    o.delivery_fee,
    o.platform_commission as current_commission,
    o.original_commission,
    COALESCE(p.custom_commission_rate, p.commission_rate, 7) as rate,
    COALESCE(r.total_refund, 0) as refund_amount
  FROM orders o
  JOIN settlements s ON o.id = ANY(s.orders_included)
  JOIN providers p ON s.provider_id = p.id
  LEFT JOIN (
    SELECT order_id, SUM(COALESCE(processed_amount, amount)) as total_refund
    FROM refunds
    WHERE status IN ('approved', 'processed')
    AND customer_confirmed = true
    GROUP BY order_id
  ) r ON r.order_id = o.id
  WHERE s.id = '8f42ceb2-c962-42c3-b108-7a61e52c4727'
)
SELECT
  order_id,
  total,
  refund_amount,
  delivery_fee,
  (total - refund_amount - COALESCE(delivery_fee, 0)) as net_for_commission,
  current_commission,
  original_commission,
  rate,
  ROUND((total - refund_amount - COALESCE(delivery_fee, 0)) * rate / 100, 2) as calculated_commission
FROM order_data;
*/

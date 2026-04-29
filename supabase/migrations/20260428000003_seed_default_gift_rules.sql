-- ═══════════════════════════════════════════════════════════════════════════════
-- Seed: Default Gift Rules for Welcome + Win-back + Stamp flows
-- ═══════════════════════════════════════════════════════════════════════════════

-- Welcome Box: new user after first successful order
INSERT INTO public.gift_rules (name, description, trigger, conditions, action, priority, is_active, budget_bucket, budget_cap_per_day, budget_cap_per_month)
VALUES (
  'welcome_first_order',
  'Welcome mystery box after first delivered order',
  'order_completed',
  '{"all": [{"fact": "total_orders", "op": "eq", "value": 1}]}',
  '{"gift_type": "mystery", "bucket": "welcome", "mystery_wrapper": true, "expiry_days": 7, "message_ar": "مبروك على أول طلب! فتحنا لك صندوق هدايا 🎁", "message_en": "Congrats on your first order! We opened a gift box for you 🎁"}',
  10,
  true,
  'welcome',
  NULL,
  200000
)
ON CONFLICT (name) DO NOTHING;

-- Win-back: customer inactive for 14+ days with 3+ previous orders
INSERT INTO public.gift_rules (name, description, trigger, conditions, action, priority, is_active, budget_bucket, budget_cap_per_day, budget_cap_per_month)
VALUES (
  'winback_14_days',
  'Win-back gift for customers inactive 14+ days',
  'daily_segment_update',
  '{"all": [{"fact": "segment", "op": "eq", "value": "at_risk"}, {"fact": "days_since_last_order", "op": "gte", "value": 14}, {"fact": "total_orders", "op": "gte", "value": 3}]}',
  '{"gift_type": "mystery", "bucket": "win_back", "mystery_wrapper": true, "expiry_days": 7, "message_ar": "افتقدناك! فتحنا لك صندوق هدايا خاص 💝", "message_en": "We missed you! Here is a special gift box 💝"}',
  20,
  true,
  'win_back',
  20000,
  300000
)
ON CONFLICT (name) DO NOTHING;

-- Delivery on us: free delivery after qualifying order (توصيل عليك وتوصيل علينا)
INSERT INTO public.gift_rules (name, description, trigger, conditions, action, priority, is_active, budget_bucket, budget_cap_per_day, budget_cap_per_month)
VALUES (
  'delivery_on_us_alternating',
  'Free delivery gift after qualifying order (your order + our delivery)',
  'order_completed',
  '{"all": [{"fact": "last_order_value", "op": "gte", "value": 15000}]}',
  '{"gift_type": "free_delivery", "bucket": "mystery", "mystery_wrapper": true, "expiry_days": 7, "message_ar": "طلبك الجاي التوصيل علينا! 🎁", "message_en": "Next order delivery is on us! 🎁"}',
  30,
  true,
  'mystery',
  NULL,
  600000
)
ON CONFLICT (name) DO NOTHING;

-- First order from new provider
INSERT INTO public.gift_rules (name, description, trigger, conditions, action, priority, is_active, budget_bucket, budget_cap_per_day, budget_cap_per_month)
VALUES (
  'first_order_new_provider',
  'Discount gift when trying a new provider for the first time',
  'order_completed',
  '{"all": [{"fact": "first_order_from_provider", "op": "eq", "value": true}, {"fact": "total_orders", "op": "gte", "value": 2}]}',
  '{"gift_type": "discount_code", "value_piasters": 1500, "bucket": "welcome", "mystery_wrapper": true, "expiry_days": 7, "message_ar": "جربت محل جديد! هديتك جاهزة 🎉", "message_en": "Tried a new store! Your gift is ready 🎉"}',
  40,
  true,
  'welcome',
  NULL,
  200000
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SDUI: Add Delivery Mode Section Data
-- ============================================================================
-- Insert delivery_mode section (requires enum to be committed first)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Insert delivery_mode section (replaces or works alongside address_selector)
-- ----------------------------------------------------------------------------
INSERT INTO public.homepage_sections (
  section_type,
  section_key,
  title_ar,
  title_en,
  description_ar,
  description_en,
  display_order,
  is_visible,
  config,
  content
)
VALUES (
  'delivery_mode',
  'delivery_mode',
  'طريقة الاستلام',
  'Delivery Mode',
  'اختيار طريقة الاستلام (توصيل أو استلام من المتجر)',
  'Choose delivery method (delivery or pickup)',
  2,  -- After hero_search, before offers_carousel
  true,
  '{"showAddress": true, "defaultMode": "delivery"}'::jsonb,
  '{
    "ar": {
      "deliveryLabel": "توصيل",
      "pickupLabel": "استلام من المتجر",
      "deliverTo": "توصيل إلى",
      "selectAddress": "اختر عنوان",
      "addAddress": "إضافة عنوان جديد",
      "loginToAddAddress": "سجل دخول لإضافة عنوان",
      "pickupInfo": "اطلب واستلم طلبك من المتجر مباشرة",
      "faster": "أسرع"
    },
    "en": {
      "deliveryLabel": "Delivery",
      "pickupLabel": "Pickup",
      "deliverTo": "Deliver to",
      "selectAddress": "Select address",
      "addAddress": "Add new address",
      "loginToAddAddress": "Login to add address",
      "pickupInfo": "Order and pick up directly from the store",
      "faster": "Faster"
    }
  }'::jsonb
)
ON CONFLICT (section_key) DO UPDATE SET
  title_ar = EXCLUDED.title_ar,
  title_en = EXCLUDED.title_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en,
  config = EXCLUDED.config,
  content = EXCLUDED.content,
  updated_at = now();

-- ----------------------------------------------------------------------------
-- Hide the old address_selector since delivery_mode replaces it
-- ----------------------------------------------------------------------------
UPDATE public.homepage_sections
SET is_visible = false
WHERE section_key = 'address_selector';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

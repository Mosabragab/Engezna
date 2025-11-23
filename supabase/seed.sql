-- ============================================================================
-- SAFE Seed Data for Engezna - Adds Menu Items to Existing Providers
-- ============================================================================
-- This file is SAFE to run multiple times - it will NOT destroy existing data
-- It uses ON CONFLICT clauses and checks to preserve your data
-- ============================================================================

-- ============================================================================
-- 1. ENSURE PROFILES EXIST FOR TEST USERS (SAFE - uses ON CONFLICT)
-- ============================================================================

-- Insert admin profile (only if user exists, won't overwrite)
insert into public.profiles (id, email, phone, full_name, role)
select
  id,
  email,
  coalesce(phone, '+201234567890'),
  coalesce(full_name, 'System Admin'),
  'admin'::user_role
from auth.users
where email = 'admin@test.com'
on conflict (id) do nothing;

-- Insert customer profile (only if user exists, won't overwrite)
insert into public.profiles (id, email, phone, full_name, role)
select
  id,
  email,
  coalesce(phone, '+201234567891'),
  coalesce(full_name, 'Test Customer'),
  'customer'::user_role
from auth.users
where email = 'customer@test.com'
on conflict (id) do nothing;

-- Insert provider profile (only if user exists, won't overwrite)
insert into public.profiles (id, email, phone, full_name, role)
select
  id,
  email,
  coalesce(phone, '+201234567892'),
  coalesce(full_name, 'Test Provider Owner'),
  'provider_owner'::user_role
from auth.users
where email = 'provider@test.com'
on conflict (id) do nothing;

-- ============================================================================
-- 2. ADD SAMPLE MENU ITEMS TO EXISTING PROVIDERS
-- ============================================================================
-- This section adds menu items ONLY to providers that don't have any yet
-- It will NOT modify or delete existing menu items
-- ============================================================================

do $$
declare
  v_provider record;
  v_category_id uuid;
  v_items_count int;
begin
  -- Get a category ID for reference
  select id into v_category_id from public.categories limit 1;

  -- Loop through all providers that don't have menu items
  for v_provider in
    select p.id, p.name_en, p.category
    from public.providers p
    left join public.menu_items m on m.provider_id = p.id
    group by p.id, p.name_en, p.category
    having count(m.id) = 0
  loop
    raise notice 'Adding sample menu items to: %', v_provider.name_en;

    -- Add sample menu items based on provider category
    if v_provider.category = 'restaurant' then
      -- Restaurant menu items
      insert into public.menu_items (
        provider_id, category_id, name_ar, name_en, description_ar, description_en,
        price, is_available, is_vegetarian, preparation_time_min, display_order
      ) values
      (v_provider.id, v_category_id, 'سلطة خضراء', 'Green Salad', 'سلطة خضراء طازجة', 'Fresh green salad', 25.00, true, true, 10, 1),
      (v_provider.id, v_category_id, 'حمص', 'Hummus', 'حمص بالطحينة', 'Hummus with tahini', 20.00, true, true, 5, 2),
      (v_provider.id, v_category_id, 'كشري', 'Koshari', 'كشري مصري أصلي', 'Traditional Egyptian Koshari', 35.00, true, true, 15, 3),
      (v_provider.id, v_category_id, 'فراخ مشوية', 'Grilled Chicken', 'فراخ مشوية بالأعشاب', 'Grilled chicken with herbs', 80.00, true, false, 30, 4),
      (v_provider.id, v_category_id, 'كفتة', 'Kofta', 'كفتة مشوية', 'Grilled kofta', 70.00, true, false, 25, 5),
      (v_provider.id, v_category_id, 'سندوتش فلافل', 'Falafel Sandwich', 'سندوتش فلافل بالطحينة', 'Falafel sandwich with tahini', 12.00, true, true, 10, 6),
      (v_provider.id, v_category_id, 'سندوتش شاورما', 'Shawarma Sandwich', 'سندوتش شاورما دجاج', 'Chicken shawarma sandwich', 25.00, true, false, 12, 7),
      (v_provider.id, v_category_id, 'برجر لحم', 'Beef Burger', 'برجر لحم بقري', 'Beef burger', 40.00, true, false, 20, 8);

    elsif v_provider.category = 'coffee_shop' then
      -- Coffee shop menu items
      insert into public.menu_items (
        provider_id, category_id, name_ar, name_en, description_ar, description_en,
        price, is_available, is_vegetarian, preparation_time_min, display_order
      ) values
      (v_provider.id, v_category_id, 'قهوة تركي', 'Turkish Coffee', 'قهوة تركي أصلي', 'Authentic Turkish coffee', 15.00, true, true, 5, 1),
      (v_provider.id, v_category_id, 'اسبريسو', 'Espresso', 'اسبريسو مركز', 'Strong espresso', 20.00, true, true, 3, 2),
      (v_provider.id, v_category_id, 'كابتشينو', 'Cappuccino', 'كابتشينو بالحليب', 'Cappuccino with milk', 25.00, true, true, 5, 3),
      (v_provider.id, v_category_id, 'لاتيه', 'Latte', 'لاتيه بالحليب', 'Latte with milk', 25.00, true, true, 5, 4),
      (v_provider.id, v_category_id, 'ايس كوفي', 'Iced Coffee', 'قهوة باردة', 'Iced coffee', 28.00, true, true, 5, 5),
      (v_provider.id, v_category_id, 'فراب', 'Frappe', 'فراب بالكراميل', 'Caramel frappe', 35.00, true, true, 7, 6),
      (v_provider.id, v_category_id, 'كرواسون', 'Croissant', 'كرواسون بالزبدة', 'Butter croissant', 15.00, true, true, 5, 7),
      (v_provider.id, v_category_id, 'كيك شوكولاتة', 'Chocolate Cake', 'كيك شوكولاتة', 'Chocolate cake', 25.00, true, true, 2, 8);

    elsif v_provider.category = 'grocery' then
      -- Grocery items
      insert into public.menu_items (
        provider_id, category_id, name_ar, name_en, description_ar, description_en,
        price, is_available, is_vegetarian, preparation_time_min, display_order
      ) values
      (v_provider.id, v_category_id, 'أرز', 'Rice', 'أرز أبيض 1 كجم', 'White rice 1kg', 15.00, true, true, 5, 1),
      (v_provider.id, v_category_id, 'سكر', 'Sugar', 'سكر أبيض 1 كجم', 'White sugar 1kg', 12.00, true, true, 5, 2),
      (v_provider.id, v_category_id, 'زيت', 'Oil', 'زيت طعام 1 لتر', 'Cooking oil 1L', 25.00, true, true, 5, 3),
      (v_provider.id, v_category_id, 'معكرونة', 'Pasta', 'معكرونة 500 جرام', 'Pasta 500g', 8.00, true, true, 5, 4),
      (v_provider.id, v_category_id, 'حليب', 'Milk', 'حليب 1 لتر', 'Milk 1L', 18.00, true, true, 5, 5),
      (v_provider.id, v_category_id, 'بيض', 'Eggs', 'بيض 12 حبة', 'Eggs 12 pieces', 30.00, true, true, 5, 6);

    elsif v_provider.category = 'vegetables_fruits' then
      -- Vegetables and fruits
      insert into public.menu_items (
        provider_id, category_id, name_ar, name_en, description_ar, description_en,
        price, is_available, is_vegetarian, preparation_time_min, display_order
      ) values
      (v_provider.id, v_category_id, 'طماطم', 'Tomatoes', 'طماطم طازجة 1 كجم', 'Fresh tomatoes 1kg', 8.00, true, true, 5, 1),
      (v_provider.id, v_category_id, 'خيار', 'Cucumbers', 'خيار طازج 1 كجم', 'Fresh cucumbers 1kg', 6.00, true, true, 5, 2),
      (v_provider.id, v_category_id, 'بطاطس', 'Potatoes', 'بطاطس 1 كجم', 'Potatoes 1kg', 7.00, true, true, 5, 3),
      (v_provider.id, v_category_id, 'برتقال', 'Oranges', 'برتقال طازج 1 كجم', 'Fresh oranges 1kg', 12.00, true, true, 5, 4),
      (v_provider.id, v_category_id, 'تفاح', 'Apples', 'تفاح 1 كجم', 'Apples 1kg', 15.00, true, true, 5, 5),
      (v_provider.id, v_category_id, 'موز', 'Bananas', 'موز 1 كجم', 'Bananas 1kg', 10.00, true, true, 5, 6);
    end if;

    get diagnostics v_items_count = row_count;
    raise notice 'Added % menu items', v_items_count;
  end loop;

  raise notice 'Menu items seed completed successfully!';
end $$;

-- ============================================================================
-- 3. VERIFICATION QUERIES (uncomment to check results)
-- ============================================================================

-- Check providers with menu item counts
-- select
--   p.name_en,
--   p.category,
--   count(m.id) as menu_items_count
-- from providers p
-- left join menu_items m on m.provider_id = p.id
-- group by p.id, p.name_en, p.category
-- order by p.name_en;

-- ============================================================================
-- END OF SAFE SEED DATA
-- ============================================================================

-- ============================================================================
-- Seed Data for Engezna - Test Users, Providers, and Menu Items
-- ============================================================================

-- IMPORTANT: This seed file assumes the following users exist in auth.users:
-- 1. admin@test.com
-- 2. customer@test.com
-- 3. provider@test.com

-- ============================================================================
-- 1. CREATE PROFILES FOR EXISTING TEST USERS
-- ============================================================================

-- Get the UUIDs from auth.users (we'll need to manually insert these)
-- You can get these by running: SELECT id, email FROM auth.users;

-- For now, we'll create profiles using a subquery to match emails
-- Note: You may need to update the UUIDs below with actual ones from your Supabase dashboard

-- Insert admin profile
insert into public.profiles (id, email, phone, full_name, role)
select
  id,
  email,
  '+201234567890',
  'System Admin',
  'admin'::user_role
from auth.users
where email = 'admin@test.com'
on conflict (id) do update set
  full_name = excluded.full_name,
  role = excluded.role,
  phone = excluded.phone;

-- Insert customer profile
insert into public.profiles (id, email, phone, full_name, role)
select
  id,
  email,
  '+201234567891',
  'Test Customer',
  'customer'::user_role
from auth.users
where email = 'customer@test.com'
on conflict (id) do update set
  full_name = excluded.full_name,
  role = excluded.role,
  phone = excluded.phone;

-- Insert provider profile
insert into public.profiles (id, email, phone, full_name, role)
select
  id,
  email,
  '+201234567892',
  'Test Provider Owner',
  'provider_owner'::user_role
from auth.users
where email = 'provider@test.com'
on conflict (id) do update set
  full_name = excluded.full_name,
  role = excluded.role,
  phone = excluded.phone;

-- ============================================================================
-- 2. CREATE TEST PROVIDERS
-- ============================================================================

-- Get provider owner ID
do $$
declare
  v_provider_owner_id uuid;
  v_provider_1_id uuid;
  v_provider_2_id uuid;
  v_category_restaurant_id uuid;
  v_category_coffee_id uuid;
begin
  -- Get provider owner user ID
  select id into v_provider_owner_id
  from auth.users
  where email = 'provider@test.com';

  -- Get category IDs
  select id into v_category_restaurant_id from public.categories where slug = 'restaurants';
  select id into v_category_coffee_id from public.categories where slug = 'coffee-shops';

  if v_provider_owner_id is null then
    raise exception 'Provider owner user not found. Please create provider@test.com user first.';
  end if;

  -- Provider 1: Test Restaurant (Arabic name: مطعم التجربة)
  insert into public.providers (
    owner_id,
    name_ar,
    name_en,
    description_ar,
    description_en,
    category,
    phone,
    address_ar,
    address_en,
    status,
    is_featured,
    rating,
    total_reviews,
    min_order_amount,
    delivery_fee,
    estimated_delivery_time_min,
    business_hours
  ) values (
    v_provider_owner_id,
    'مطعم التجربة',
    'Test Restaurant',
    'أفضل مطعم في بني سويف يقدم أشهى المأكولات',
    'The best restaurant in Beni Suef offering delicious food',
    'restaurant',
    '+201012345678',
    'شارع الجلاء، بني سويف',
    'Al-Galaa Street, Beni Suef',
    'open',
    true,
    4.5,
    127,
    30.00,
    10.00,
    30,
    jsonb_build_object(
      'saturday', jsonb_build_object('open', '10:00', 'close', '23:00', 'is_open', true),
      'sunday', jsonb_build_object('open', '10:00', 'close', '23:00', 'is_open', true),
      'monday', jsonb_build_object('open', '10:00', 'close', '23:00', 'is_open', true),
      'tuesday', jsonb_build_object('open', '10:00', 'close', '23:00', 'is_open', true),
      'wednesday', jsonb_build_object('open', '10:00', 'close', '23:00', 'is_open', true),
      'thursday', jsonb_build_object('open', '10:00', 'close', '23:00', 'is_open', true),
      'friday', jsonb_build_object('open', '14:00', 'close', '23:00', 'is_open', true)
    )
  )
  returning id into v_provider_1_id;

  -- Provider 2: Test Coffee Shop (Arabic name: كافيه التجربة)
  insert into public.providers (
    owner_id,
    name_ar,
    name_en,
    description_ar,
    description_en,
    category,
    phone,
    address_ar,
    address_en,
    status,
    is_featured,
    rating,
    total_reviews,
    min_order_amount,
    delivery_fee,
    estimated_delivery_time_min,
    business_hours
  ) values (
    v_provider_owner_id,
    'كافيه التجربة',
    'Test Coffee Shop',
    'أفضل قهوة في المدينة',
    'The best coffee in town',
    'coffee_shop',
    '+201012345679',
    'شارع سعد زغلول، بني سويف',
    'Saad Zaghloul Street, Beni Suef',
    'open',
    false,
    4.3,
    89,
    20.00,
    5.00,
    20,
    jsonb_build_object(
      'saturday', jsonb_build_object('open', '08:00', 'close', '22:00', 'is_open', true),
      'sunday', jsonb_build_object('open', '08:00', 'close', '22:00', 'is_open', true),
      'monday', jsonb_build_object('open', '08:00', 'close', '22:00', 'is_open', true),
      'tuesday', jsonb_build_object('open', '08:00', 'close', '22:00', 'is_open', true),
      'wednesday', jsonb_build_object('open', '08:00', 'close', '22:00', 'is_open', true),
      'thursday', jsonb_build_object('open', '08:00', 'close', '22:00', 'is_open', true),
      'friday', jsonb_build_object('open', '08:00', 'close', '22:00', 'is_open', true)
    )
  )
  returning id into v_provider_2_id;

  -- ============================================================================
  -- 3. CREATE MENU ITEMS FOR TEST RESTAURANT
  -- ============================================================================

  -- Restaurant Menu Items
  insert into public.menu_items (
    provider_id,
    category_id,
    name_ar,
    name_en,
    description_ar,
    description_en,
    price,
    is_available,
    is_vegetarian,
    preparation_time_min,
    display_order
  ) values
  -- Appetizers
  (v_provider_1_id, v_category_restaurant_id, 'سلطة خضراء', 'Green Salad', 'سلطة خضراء طازجة', 'Fresh green salad', 25.00, true, true, 10, 1),
  (v_provider_1_id, v_category_restaurant_id, 'حمص', 'Hummus', 'حمص بالطحينة', 'Hummus with tahini', 20.00, true, true, 5, 2),
  (v_provider_1_id, v_category_restaurant_id, 'فول مدمس', 'Foul Medames', 'فول مدمس بالزيت والليمون', 'Fava beans with oil and lemon', 15.00, true, true, 10, 3),

  -- Main Dishes
  (v_provider_1_id, v_category_restaurant_id, 'كشري', 'Koshari', 'كشري مصري أصلي', 'Traditional Egyptian Koshari', 35.00, true, true, 15, 4),
  (v_provider_1_id, v_category_restaurant_id, 'محشي', 'Mahshi', 'محشي كوسة وباذنجان', 'Stuffed zucchini and eggplant', 50.00, true, true, 25, 5),
  (v_provider_1_id, v_category_restaurant_id, 'فراخ مشوية', 'Grilled Chicken', 'فراخ مشوية بالأعشاب', 'Grilled chicken with herbs', 80.00, true, false, 30, 6),
  (v_provider_1_id, v_category_restaurant_id, 'كفتة', 'Kofta', 'كفتة مشوية', 'Grilled kofta', 70.00, true, false, 25, 7),
  (v_provider_1_id, v_category_restaurant_id, 'أرز بالخلطة', 'Rice with Mix', 'أرز بالخلطة', 'Rice with mixed vegetables', 30.00, true, true, 15, 8),

  -- Sandwiches
  (v_provider_1_id, v_category_restaurant_id, 'سندوتش فلافل', 'Falafel Sandwich', 'سندوتش فلافل بالطحينة', 'Falafel sandwich with tahini', 12.00, true, true, 10, 9),
  (v_provider_1_id, v_category_restaurant_id, 'سندوتش شاورما', 'Shawarma Sandwich', 'سندوتش شاورما دجاج', 'Chicken shawarma sandwich', 25.00, true, false, 12, 10),
  (v_provider_1_id, v_category_restaurant_id, 'برجر لحم', 'Beef Burger', 'برجر لحم بقري', 'Beef burger', 40.00, true, false, 20, 11),

  -- Desserts
  (v_provider_1_id, v_category_restaurant_id, 'كنافة', 'Kunafa', 'كنافة بالقشطة', 'Kunafa with cream', 35.00, true, true, 15, 12),
  (v_provider_1_id, v_category_restaurant_id, 'بسبوسة', 'Basbousa', 'بسبوسة بالمكسرات', 'Basbousa with nuts', 30.00, true, true, 10, 13),
  (v_provider_1_id, v_category_restaurant_id, 'أم علي', 'Om Ali', 'أم علي ساخنة', 'Hot Om Ali dessert', 40.00, true, true, 20, 14);

  -- ============================================================================
  -- 4. CREATE MENU ITEMS FOR TEST COFFEE SHOP
  -- ============================================================================

  -- Coffee Shop Menu Items
  insert into public.menu_items (
    provider_id,
    category_id,
    name_ar,
    name_en,
    description_ar,
    description_en,
    price,
    is_available,
    is_vegetarian,
    preparation_time_min,
    display_order
  ) values
  -- Hot Drinks
  (v_provider_2_id, v_category_coffee_id, 'قهوة تركي', 'Turkish Coffee', 'قهوة تركي أصلي', 'Authentic Turkish coffee', 15.00, true, true, 5, 1),
  (v_provider_2_id, v_category_coffee_id, 'قهوة فرنساوي', 'French Coffee', 'قهوة فرنساوي', 'French coffee', 18.00, true, true, 5, 2),
  (v_provider_2_id, v_category_coffee_id, 'اسبريسو', 'Espresso', 'اسبريسو مركز', 'Strong espresso', 20.00, true, true, 3, 3),
  (v_provider_2_id, v_category_coffee_id, 'كابتشينو', 'Cappuccino', 'كابتشينو بالحليب', 'Cappuccino with milk', 25.00, true, true, 5, 4),
  (v_provider_2_id, v_category_coffee_id, 'لاتيه', 'Latte', 'لاتيه بالحليب', 'Latte with milk', 25.00, true, true, 5, 5),
  (v_provider_2_id, v_category_coffee_id, 'شاي', 'Tea', 'شاي أحمر', 'Black tea', 10.00, true, true, 3, 6),
  (v_provider_2_id, v_category_coffee_id, 'نعناع', 'Mint Tea', 'شاي بالنعناع', 'Mint tea', 12.00, true, true, 5, 7),

  -- Cold Drinks
  (v_provider_2_id, v_category_coffee_id, 'ايس كوفي', 'Iced Coffee', 'قهوة باردة', 'Iced coffee', 28.00, true, true, 5, 8),
  (v_provider_2_id, v_category_coffee_id, 'فراب', 'Frappe', 'فراب بالكراميل', 'Caramel frappe', 35.00, true, true, 7, 9),
  (v_provider_2_id, v_category_coffee_id, 'عصير برتقال', 'Orange Juice', 'عصير برتقال طازج', 'Fresh orange juice', 20.00, true, true, 5, 10),
  (v_provider_2_id, v_category_coffee_id, 'ليموناضة', 'Lemonade', 'ليموناضة بالنعناع', 'Lemonade with mint', 18.00, true, true, 5, 11),

  -- Snacks
  (v_provider_2_id, v_category_coffee_id, 'كرواسون', 'Croissant', 'كرواسون بالزبدة', 'Butter croissant', 15.00, true, true, 5, 12),
  (v_provider_2_id, v_category_coffee_id, 'كيك شوكولاتة', 'Chocolate Cake', 'كيك شوكولاتة', 'Chocolate cake', 25.00, true, true, 2, 13),
  (v_provider_2_id, v_category_coffee_id, 'كوكيز', 'Cookies', 'كوكيز بالشوكولاتة', 'Chocolate cookies', 20.00, true, true, 2, 14);

  raise notice 'Seed data created successfully!';
  raise notice 'Provider 1 ID: %', v_provider_1_id;
  raise notice 'Provider 2 ID: %', v_provider_2_id;
end $$;

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================

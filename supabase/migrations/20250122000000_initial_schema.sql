-- ============================================================================
-- Initial Database Schema for Engezna (انجزنا)
-- Food Delivery Platform - Beni Suef, Egypt
-- ============================================================================
-- Version: 1.0
-- Created: 2025-01-22
-- Description: Complete database schema with all core and Phase 2 features
-- ============================================================================

-- Enable necessary extensions
create extension if not exists "pgcrypto"; -- For gen_random_uuid()
create extension if not exists "postgis"; -- For location data

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================================
-- ENUMS
-- ============================================================================

-- User roles
create type user_role as enum ('customer', 'provider_owner', 'provider_staff', 'admin');

-- Provider categories
create type provider_category as enum ('restaurant', 'coffee_shop', 'grocery', 'vegetables_fruits');

-- Provider status (granular states as per requirements)
create type provider_status as enum ('open', 'closed', 'temporarily_paused', 'on_vacation', 'pending_approval');

-- Order status
create type order_status as enum (
  'pending',           -- Order placed, waiting for provider acceptance
  'accepted',          -- Provider accepted order
  'preparing',         -- Provider is preparing the order
  'ready',             -- Order ready for pickup/delivery
  'out_for_delivery',  -- Order is being delivered (provider's own delivery)
  'delivered',         -- Order delivered successfully
  'cancelled',         -- Order cancelled
  'rejected'           -- Order rejected by provider
);

-- Payment methods
create type payment_method as enum ('cash', 'fawry', 'vodafone_cash', 'credit_card');

-- Payment status
create type payment_status as enum ('pending', 'completed', 'failed', 'refunded');

-- Chat message type
create type message_type as enum ('text', 'image', 'system');

-- Notification type
create type notification_type as enum ('order_update', 'promo', 'system', 'chat');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Profiles Table (extends Supabase auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  phone text unique,
  full_name text not null,
  avatar_url text,
  role user_role not null default 'customer',
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ----------------------------------------------------------------------------
-- Service Categories Table
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid default gen_random_uuid() primary key,
  name_ar text not null,
  name_en text not null,
  slug text unique not null,
  icon text,
  type provider_category not null,
  display_order int default 0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ----------------------------------------------------------------------------
-- Providers Table (Restaurants, Coffee Shops, Groceries, Vegetables/Fruits)
-- ----------------------------------------------------------------------------
create table if not exists public.providers (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,

  -- Basic Info
  name_ar text not null,
  name_en text not null,
  description_ar text,
  description_en text,
  category provider_category not null,
  logo_url text,
  cover_image_url text,

  -- Contact & Location
  phone text not null,
  email text,
  address_ar text not null,
  address_en text,
  location geography(point, 4326), -- PostGIS point for geospatial queries
  delivery_radius_km decimal(5,2) default 5.0,

  -- Business Info
  status provider_status default 'pending_approval',
  is_featured boolean default false,
  rating decimal(2,1) default 0.0,
  total_reviews int default 0,
  total_orders int default 0,

  -- Delivery Settings (Provider manages their own delivery)
  min_order_amount decimal(10,2) default 0,
  delivery_fee decimal(10,2) not null,
  estimated_delivery_time_min int default 30, -- in minutes

  -- Commission Settings (5-7% tiered)
  commission_rate decimal(4,2) default 7.0, -- Percentage

  -- Business Hours (stored as JSONB for flexibility)
  -- Example: {"saturday": {"open": "09:00", "close": "23:00", "is_open": true}, ...}
  business_hours jsonb,

  -- Bank Details for Payouts
  bank_name text,
  account_holder_name text,
  account_number text,
  iban text,

  -- Metadata
  metadata jsonb, -- For additional flexible data
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for geospatial queries
create index idx_providers_location on public.providers using gist(location);
create index idx_providers_category on public.providers(category);
create index idx_providers_status on public.providers(status);

-- ----------------------------------------------------------------------------
-- Provider Staff Table (Multi-user system: Owner + max 2 staff)
-- ----------------------------------------------------------------------------
create table if not exists public.provider_staff (
  id uuid default gen_random_uuid() primary key,
  provider_id uuid references public.providers(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,

  -- Role and Permissions
  role text not null default 'staff', -- 'owner' or 'staff'
  can_manage_menu boolean default true,
  can_manage_orders boolean default true,
  can_view_analytics boolean default false,

  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- Constraint: Each user can only be staff at one provider
  unique(user_id, provider_id)
);

-- Check constraint: Max 2 staff members per provider (owner + 2 staff = 3 total)
create or replace function check_provider_staff_limit()
returns trigger as $$
begin
  if (select count(*) from public.provider_staff where provider_id = new.provider_id and is_active = true) >= 3 then
    raise exception 'Maximum 3 staff members (owner + 2 staff) allowed per provider';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger enforce_provider_staff_limit
  before insert on public.provider_staff
  for each row
  execute function check_provider_staff_limit();

-- ----------------------------------------------------------------------------
-- Menu Items Table
-- ----------------------------------------------------------------------------
create table if not exists public.menu_items (
  id uuid default gen_random_uuid() primary key,
  provider_id uuid references public.providers(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete set null,

  -- Item Details (Bilingual)
  name_ar text not null,
  name_en text not null,
  description_ar text,
  description_en text,

  -- Pricing
  price decimal(10,2) not null,
  original_price decimal(10,2), -- For showing discounts

  -- Media
  image_url text,

  -- Availability
  is_available boolean default true,

  -- Inventory (Provider Responsibility - Option B)
  -- Just tracking fields, provider manages stock
  has_stock boolean default true, -- Provider manually toggles
  stock_notes text, -- Provider can add notes about stock

  -- Item Attributes
  is_vegetarian boolean default false,
  is_spicy boolean default false,
  calories int,
  preparation_time_min int default 15,

  -- Display
  display_order int default 0,

  -- Metadata
  metadata jsonb, -- For customizations, extras, etc.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_menu_items_provider on public.menu_items(provider_id);
create index idx_menu_items_category on public.menu_items(category_id);
create index idx_menu_items_available on public.menu_items(is_available);

-- ----------------------------------------------------------------------------
-- Customer Addresses Table
-- ----------------------------------------------------------------------------
create table if not exists public.addresses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,

  -- Address Details
  label text not null, -- e.g., 'Home', 'Work', 'Mom's House'
  address_line1 text not null,
  address_line2 text,
  city text not null default 'Beni Suef',
  area text, -- District/neighborhood
  building text,
  floor text,
  apartment text,
  landmark text, -- Nearby landmark for delivery instructions

  -- Location
  location geography(point, 4326),

  -- Contact
  phone text,
  delivery_instructions text,

  -- Flags
  is_default boolean default false,
  is_active boolean default true,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_addresses_user on public.addresses(user_id);
create index idx_addresses_location on public.addresses using gist(location);

-- ----------------------------------------------------------------------------
-- Orders Table
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  order_number text unique not null, -- Human-readable order number

  -- Relationships
  customer_id uuid references public.profiles(id) on delete set null,
  provider_id uuid references public.providers(id) on delete set null not null,
  address_id uuid references public.addresses(id) on delete set null,

  -- Order Status
  status order_status default 'pending' not null,

  -- Pricing
  subtotal decimal(10,2) not null,
  delivery_fee decimal(10,2) not null,
  discount decimal(10,2) default 0,
  total decimal(10,2) not null,
  platform_commission decimal(10,2) not null, -- 5-7% of subtotal

  -- Payment
  payment_method payment_method not null,
  payment_status payment_status default 'pending' not null,

  -- Delivery Info
  delivery_address jsonb not null, -- Snapshot of address at time of order
  delivery_instructions text,
  estimated_delivery_time timestamp with time zone,
  actual_delivery_time timestamp with time zone,

  -- Notes
  customer_notes text,
  provider_notes text,
  cancellation_reason text,

  -- Promo Code
  promo_code text,

  -- Modification Tracking (before preparing)
  can_modify boolean default true,
  modification_count int default 0,

  -- Metadata
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- Timestamps for each status
  accepted_at timestamp with time zone,
  preparing_at timestamp with time zone,
  ready_at timestamp with time zone,
  out_for_delivery_at timestamp with time zone,
  delivered_at timestamp with time zone,
  cancelled_at timestamp with time zone
);

create index idx_orders_customer on public.orders(customer_id);
create index idx_orders_provider on public.orders(provider_id);
create index idx_orders_status on public.orders(status);
create index idx_orders_created on public.orders(created_at desc);

-- Generate unique order number
create or replace function generate_order_number()
returns text as $$
declare
  new_order_number text;
begin
  new_order_number := 'ENG-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('order_number_seq')::text, 6, '0');
  return new_order_number;
end;
$$ language plpgsql;

create sequence if not exists order_number_seq;

-- Trigger to set order number
create or replace function set_order_number()
returns trigger as $$
begin
  if new.order_number is null then
    new.order_number := generate_order_number();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger set_order_number_trigger
  before insert on public.orders
  for each row
  execute function set_order_number();

-- ----------------------------------------------------------------------------
-- Order Items Table (Line items for each order)
-- ----------------------------------------------------------------------------
create table if not exists public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  menu_item_id uuid references public.menu_items(id) on delete set null,

  -- Item Snapshot (at time of order)
  item_name_ar text not null,
  item_name_en text not null,
  item_price decimal(10,2) not null,

  -- Quantity and Pricing
  quantity int not null default 1,
  unit_price decimal(10,2) not null,
  total_price decimal(10,2) not null,

  -- Customizations
  customizations jsonb, -- e.g., {"extra_cheese": true, "no_onions": true}
  special_instructions text,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_order_items_order on public.order_items(order_id);

-- ----------------------------------------------------------------------------
-- Reviews Table
-- ----------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null unique,
  customer_id uuid references public.profiles(id) on delete cascade not null,
  provider_id uuid references public.providers(id) on delete cascade not null,

  -- Rating (1-5 stars)
  rating int not null check (rating >= 1 and rating <= 5),

  -- Review Content
  comment text,

  -- Response from Provider
  provider_response text,
  provider_response_at timestamp with time zone,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_reviews_provider on public.reviews(provider_id);
create index idx_reviews_customer on public.reviews(customer_id);

-- Update provider rating after review
create or replace function update_provider_rating()
returns trigger as $$
begin
  update public.providers
  set
    rating = (select avg(rating)::decimal(2,1) from public.reviews where provider_id = new.provider_id),
    total_reviews = (select count(*) from public.reviews where provider_id = new.provider_id)
  where id = new.provider_id;
  return new;
end;
$$ language plpgsql;

create trigger update_provider_rating_trigger
  after insert or update on public.reviews
  for each row
  execute function update_provider_rating();

-- ============================================================================
-- PHASE 2 FEATURES (Placeholders as per requirements)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Loyalty Points Table
-- ----------------------------------------------------------------------------
create table if not exists public.loyalty_points (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,

  -- Points Balance
  points_balance int default 0 not null,
  lifetime_points int default 0 not null, -- Total points earned ever

  -- Tier System (Future)
  tier text default 'bronze', -- bronze, silver, gold, platinum

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  unique(user_id)
);

-- ----------------------------------------------------------------------------
-- Loyalty Transactions Table
-- ----------------------------------------------------------------------------
create table if not exists public.loyalty_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  order_id uuid references public.orders(id) on delete set null,

  -- Transaction Details
  points int not null, -- Positive for earn, negative for redeem
  transaction_type text not null, -- 'earned', 'redeemed', 'expired', 'bonus'
  description text,

  -- Balance After Transaction
  balance_after int not null,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_loyalty_transactions_user on public.loyalty_transactions(user_id);

-- ----------------------------------------------------------------------------
-- Referrals Table (30 EGP credit as per PRD)
-- ----------------------------------------------------------------------------
create table if not exists public.referrals (
  id uuid default gen_random_uuid() primary key,

  -- Referrer and Referee
  referrer_id uuid references public.profiles(id) on delete cascade not null,
  referee_id uuid references public.profiles(id) on delete cascade not null,

  -- Referral Code
  referral_code text unique not null,

  -- Status
  status text default 'pending', -- 'pending', 'completed', 'expired'

  -- Credits (30 EGP each as per PRD)
  referrer_credit decimal(10,2) default 30.00,
  referee_credit decimal(10,2) default 30.00,

  -- Credit Applied
  referrer_credit_applied boolean default false,
  referee_credit_applied boolean default false,

  -- Completion (when referee places first order)
  completed_at timestamp with time zone,
  referee_first_order_id uuid references public.orders(id) on delete set null,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  unique(referrer_id, referee_id)
);

create index idx_referrals_referrer on public.referrals(referrer_id);
create index idx_referrals_referee on public.referrals(referee_id);
create index idx_referrals_code on public.referrals(referral_code);

-- Generate unique referral code
create or replace function generate_referral_code()
returns text as $$
declare
  code text;
  exists boolean;
begin
  loop
    -- Generate 6-character alphanumeric code
    code := upper(substring(md5(random()::text) from 1 for 6));

    -- Check if code already exists
    exists := (select 1 from public.profiles where referral_code = code);

    exit when not exists;
  end loop;

  return code;
end;
$$ language plpgsql;

-- Add referral code to profiles
alter table public.profiles add column if not exists referral_code text unique;
alter table public.profiles add column if not exists wallet_balance decimal(10,2) default 0.00;

-- ============================================================================
-- CHAT SYSTEM (With Image Support - Option A)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Chat Conversations Table
-- ----------------------------------------------------------------------------
create table if not exists public.chat_conversations (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade unique not null,
  customer_id uuid references public.profiles(id) on delete cascade not null,
  provider_id uuid references public.providers(id) on delete cascade not null,

  -- Status
  is_active boolean default true,

  -- Last Message Info
  last_message_at timestamp with time zone,
  last_message_preview text,

  -- Unread Counts
  customer_unread_count int default 0,
  provider_unread_count int default 0,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_chat_conversations_order on public.chat_conversations(order_id);
create index idx_chat_conversations_customer on public.chat_conversations(customer_id);
create index idx_chat_conversations_provider on public.chat_conversations(provider_id);

-- ----------------------------------------------------------------------------
-- Chat Messages Table (Supports Text and Images)
-- ----------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.chat_conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete set null,

  -- Message Content
  message_type message_type default 'text' not null,
  content text, -- Text content or image caption
  image_url text, -- For image messages (Option A - Image Support)

  -- Metadata
  is_read boolean default false,
  read_at timestamp with time zone,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_chat_messages_conversation on public.chat_messages(conversation_id);
create index idx_chat_messages_created on public.chat_messages(created_at);

-- ============================================================================
-- ADDITIONAL TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Promo Codes Table
-- ----------------------------------------------------------------------------
create table if not exists public.promo_codes (
  id uuid default gen_random_uuid() primary key,

  -- Code Details
  code text unique not null,
  description_ar text,
  description_en text,

  -- Discount
  discount_type text not null, -- 'percentage', 'fixed'
  discount_value decimal(10,2) not null,
  max_discount_amount decimal(10,2), -- For percentage discounts
  min_order_amount decimal(10,2) default 0,

  -- Usage Limits
  usage_limit int, -- Total uses allowed (null = unlimited)
  usage_count int default 0,
  per_user_limit int default 1, -- Uses per user

  -- Validity
  valid_from timestamp with time zone not null,
  valid_until timestamp with time zone not null,
  is_active boolean default true,

  -- Targeting
  applicable_categories provider_category[], -- null = all categories
  applicable_providers uuid[], -- null = all providers
  first_order_only boolean default false,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_promo_codes_code on public.promo_codes(code);
create index idx_promo_codes_active on public.promo_codes(is_active);

-- ----------------------------------------------------------------------------
-- Promo Code Usage Table
-- ----------------------------------------------------------------------------
create table if not exists public.promo_code_usage (
  id uuid default gen_random_uuid() primary key,
  promo_code_id uuid references public.promo_codes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  order_id uuid references public.orders(id) on delete cascade not null,

  discount_amount decimal(10,2) not null,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,

  unique(promo_code_id, order_id)
);

create index idx_promo_usage_code on public.promo_code_usage(promo_code_id);
create index idx_promo_usage_user on public.promo_code_usage(user_id);

-- ----------------------------------------------------------------------------
-- Notifications Table
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,

  -- Notification Content
  type notification_type not null,
  title_ar text not null,
  title_en text not null,
  message_ar text not null,
  message_en text not null,

  -- Related Entities
  order_id uuid references public.orders(id) on delete cascade,
  provider_id uuid references public.providers(id) on delete cascade,

  -- Action
  action_url text, -- Deep link or URL to navigate to

  -- Status
  is_read boolean default false,
  read_at timestamp with time zone,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_notifications_user on public.notifications(user_id);
create index idx_notifications_read on public.notifications(is_read);
create index idx_notifications_created on public.notifications(created_at desc);

-- ----------------------------------------------------------------------------
-- Weekly Settlements Table (Provider Payouts)
-- ----------------------------------------------------------------------------
create table if not exists public.settlements (
  id uuid default gen_random_uuid() primary key,
  provider_id uuid references public.providers(id) on delete cascade not null,

  -- Settlement Period
  period_start timestamp with time zone not null,
  period_end timestamp with time zone not null,

  -- Financial Summary
  total_orders int not null,
  gross_revenue decimal(10,2) not null, -- Total from orders
  platform_commission decimal(10,2) not null,
  net_payout decimal(10,2) not null, -- What provider receives

  -- Status
  status text default 'pending', -- 'pending', 'approved', 'paid'
  paid_at timestamp with time zone,

  -- Payment Details
  payment_method text,
  payment_reference text,

  -- Metadata
  orders_included uuid[], -- Array of order IDs
  notes text,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_settlements_provider on public.settlements(provider_id);
create index idx_settlements_status on public.settlements(status);
create index idx_settlements_period on public.settlements(period_start, period_end);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger categories_updated_at before update on public.categories
  for each row execute function public.handle_updated_at();

create trigger providers_updated_at before update on public.providers
  for each row execute function public.handle_updated_at();

create trigger provider_staff_updated_at before update on public.provider_staff
  for each row execute function public.handle_updated_at();

create trigger menu_items_updated_at before update on public.menu_items
  for each row execute function public.handle_updated_at();

create trigger addresses_updated_at before update on public.addresses
  for each row execute function public.handle_updated_at();

create trigger orders_updated_at before update on public.orders
  for each row execute function public.handle_updated_at();

create trigger order_items_updated_at before update on public.order_items
  for each row execute function public.handle_updated_at();

create trigger reviews_updated_at before update on public.reviews
  for each row execute function public.handle_updated_at();

create trigger loyalty_points_updated_at before update on public.loyalty_points
  for each row execute function public.handle_updated_at();

create trigger referrals_updated_at before update on public.referrals
  for each row execute function public.handle_updated_at();

create trigger chat_conversations_updated_at before update on public.chat_conversations
  for each row execute function public.handle_updated_at();

create trigger chat_messages_updated_at before update on public.chat_messages
  for each row execute function public.handle_updated_at();

create trigger promo_codes_updated_at before update on public.promo_codes
  for each row execute function public.handle_updated_at();

create trigger settlements_updated_at before update on public.settlements
  for each row execute function public.handle_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.providers enable row level security;
alter table public.provider_staff enable row level security;
alter table public.menu_items enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.loyalty_points enable row level security;
alter table public.loyalty_transactions enable row level security;
alter table public.referrals enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.promo_codes enable row level security;
alter table public.promo_code_usage enable row level security;
alter table public.notifications enable row level security;
alter table public.settlements enable row level security;

-- ----------------------------------------------------------------------------
-- Profiles Policies
-- ----------------------------------------------------------------------------

-- Public profiles viewable by everyone
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- Users can insert their own profile
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- Categories Policies
-- ----------------------------------------------------------------------------

-- Categories viewable by everyone
create policy "Categories viewable by everyone"
  on public.categories for select
  using (true);

-- Only admins can modify categories
create policy "Only admins can modify categories"
  on public.categories for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- Providers Policies
-- ----------------------------------------------------------------------------

-- Active providers viewable by everyone
create policy "Active providers viewable by everyone"
  on public.providers for select
  using (status in ('open', 'closed', 'temporarily_paused', 'on_vacation'));

-- Provider owners can view their own providers
create policy "Owners can view own providers"
  on public.providers for select
  using (owner_id = auth.uid());

-- Provider staff can view their provider
create policy "Staff can view their provider"
  on public.providers for select
  using (
    exists (
      select 1 from public.provider_staff
      where provider_id = providers.id
      and user_id = auth.uid()
      and is_active = true
    )
  );

-- Provider owners can insert providers
create policy "Owners can create providers"
  on public.providers for insert
  with check (owner_id = auth.uid());

-- Owners and authorized staff can update their provider
create policy "Owners and staff can update provider"
  on public.providers for update
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.provider_staff
      where provider_id = providers.id
      and user_id = auth.uid()
      and is_active = true
    )
  );

-- Admins have full access to providers
create policy "Admins have full access to providers"
  on public.providers for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- Provider Staff Policies
-- ----------------------------------------------------------------------------

-- Staff can view their own staff record
create policy "Users can view own staff record"
  on public.provider_staff for select
  using (user_id = auth.uid());

-- Provider owners can view staff of their providers
create policy "Owners can view provider staff"
  on public.provider_staff for select
  using (
    exists (
      select 1 from public.providers
      where id = provider_staff.provider_id
      and owner_id = auth.uid()
    )
  );

-- Provider owners can manage staff
create policy "Owners can manage staff"
  on public.provider_staff for all
  using (
    exists (
      select 1 from public.providers
      where id = provider_staff.provider_id
      and owner_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- Menu Items Policies
-- ----------------------------------------------------------------------------

-- Menu items viewable by everyone (for available items)
create policy "Available menu items viewable by everyone"
  on public.menu_items for select
  using (is_available = true);

-- Provider owners and staff can view all their menu items
create policy "Providers can view own menu items"
  on public.menu_items for select
  using (
    exists (
      select 1 from public.providers
      where id = menu_items.provider_id
      and (
        owner_id = auth.uid()
        or exists (
          select 1 from public.provider_staff
          where provider_id = providers.id
          and user_id = auth.uid()
          and is_active = true
        )
      )
    )
  );

-- Providers can manage their menu items
create policy "Providers can manage menu items"
  on public.menu_items for all
  using (
    exists (
      select 1 from public.providers
      where id = menu_items.provider_id
      and (
        owner_id = auth.uid()
        or exists (
          select 1 from public.provider_staff
          where provider_id = providers.id
          and user_id = auth.uid()
          and is_active = true
          and can_manage_menu = true
        )
      )
    )
  );

-- ----------------------------------------------------------------------------
-- Addresses Policies
-- ----------------------------------------------------------------------------

-- Users can view their own addresses
create policy "Users can view own addresses"
  on public.addresses for select
  using (user_id = auth.uid());

-- Users can insert their own addresses
create policy "Users can insert own addresses"
  on public.addresses for insert
  with check (user_id = auth.uid());

-- Users can update their own addresses
create policy "Users can update own addresses"
  on public.addresses for update
  using (user_id = auth.uid());

-- Users can delete their own addresses
create policy "Users can delete own addresses"
  on public.addresses for delete
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Orders Policies
-- ----------------------------------------------------------------------------

-- Customers can view their own orders
create policy "Customers can view own orders"
  on public.orders for select
  using (customer_id = auth.uid());

-- Providers can view orders placed with them
create policy "Providers can view their orders"
  on public.orders for select
  using (
    exists (
      select 1 from public.providers
      where id = orders.provider_id
      and (
        owner_id = auth.uid()
        or exists (
          select 1 from public.provider_staff
          where provider_id = providers.id
          and user_id = auth.uid()
          and is_active = true
          and can_manage_orders = true
        )
      )
    )
  );

-- Customers can create orders
create policy "Customers can create orders"
  on public.orders for insert
  with check (customer_id = auth.uid());

-- Customers can update their own orders (before preparing)
create policy "Customers can update own orders before preparing"
  on public.orders for update
  using (
    customer_id = auth.uid()
    and can_modify = true
    and status = 'pending'
  );

-- Providers can update orders placed with them
create policy "Providers can update their orders"
  on public.orders for update
  using (
    exists (
      select 1 from public.providers
      where id = orders.provider_id
      and (
        owner_id = auth.uid()
        or exists (
          select 1 from public.provider_staff
          where provider_id = providers.id
          and user_id = auth.uid()
          and is_active = true
          and can_manage_orders = true
        )
      )
    )
  );

-- Admins can view all orders
create policy "Admins can view all orders"
  on public.orders for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- Order Items Policies
-- ----------------------------------------------------------------------------

-- Customers can view items in their orders
create policy "Customers can view own order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where id = order_items.order_id
      and customer_id = auth.uid()
    )
  );

-- Providers can view items in their orders
create policy "Providers can view their order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      join public.providers p on p.id = o.provider_id
      where o.id = order_items.order_id
      and (
        p.owner_id = auth.uid()
        or exists (
          select 1 from public.provider_staff
          where provider_id = p.id
          and user_id = auth.uid()
          and is_active = true
        )
      )
    )
  );

-- Customers can insert order items for their orders
create policy "Customers can insert own order items"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders
      where id = order_items.order_id
      and customer_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- Reviews Policies
-- ----------------------------------------------------------------------------

-- Reviews viewable by everyone
create policy "Reviews viewable by everyone"
  on public.reviews for select
  using (true);

-- Customers can create reviews for their delivered orders
create policy "Customers can create reviews"
  on public.reviews for insert
  with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.orders
      where id = reviews.order_id
      and customer_id = auth.uid()
      and status = 'delivered'
    )
  );

-- Customers can update their own reviews
create policy "Customers can update own reviews"
  on public.reviews for update
  using (customer_id = auth.uid());

-- Providers can respond to reviews
create policy "Providers can respond to reviews"
  on public.reviews for update
  using (
    exists (
      select 1 from public.providers
      where id = reviews.provider_id
      and owner_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- Loyalty Points Policies
-- ----------------------------------------------------------------------------

-- Users can view their own loyalty points
create policy "Users can view own loyalty points"
  on public.loyalty_points for select
  using (user_id = auth.uid());

-- System can manage loyalty points
create policy "System can manage loyalty points"
  on public.loyalty_points for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- Loyalty Transactions Policies
-- ----------------------------------------------------------------------------

-- Users can view their own loyalty transactions
create policy "Users can view own loyalty transactions"
  on public.loyalty_transactions for select
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Referrals Policies
-- ----------------------------------------------------------------------------

-- Users can view their own referrals (as referrer or referee)
create policy "Users can view own referrals"
  on public.referrals for select
  using (referrer_id = auth.uid() or referee_id = auth.uid());

-- Users can create referrals as referrer
create policy "Users can create referrals"
  on public.referrals for insert
  with check (referrer_id = auth.uid());

-- System can update referrals
create policy "System can update referrals"
  on public.referrals for update
  using (true); -- Will be controlled by RPC functions

-- ----------------------------------------------------------------------------
-- Chat Conversations Policies
-- ----------------------------------------------------------------------------

-- Customers can view conversations for their orders
create policy "Customers can view own conversations"
  on public.chat_conversations for select
  using (customer_id = auth.uid());

-- Providers can view conversations for their orders
create policy "Providers can view their conversations"
  on public.chat_conversations for select
  using (
    exists (
      select 1 from public.providers
      where id = chat_conversations.provider_id
      and (
        owner_id = auth.uid()
        or exists (
          select 1 from public.provider_staff
          where provider_id = providers.id
          and user_id = auth.uid()
          and is_active = true
        )
      )
    )
  );

-- System can create conversations
create policy "System can create conversations"
  on public.chat_conversations for insert
  with check (true);

-- Participants can update conversations
create policy "Participants can update conversations"
  on public.chat_conversations for update
  using (
    customer_id = auth.uid()
    or exists (
      select 1 from public.providers
      where id = chat_conversations.provider_id
      and (
        owner_id = auth.uid()
        or exists (
          select 1 from public.provider_staff
          where provider_id = providers.id
          and user_id = auth.uid()
          and is_active = true
        )
      )
    )
  );

-- ----------------------------------------------------------------------------
-- Chat Messages Policies
-- ----------------------------------------------------------------------------

-- Users can view messages in their conversations
create policy "Users can view conversation messages"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.chat_conversations
      where id = chat_messages.conversation_id
      and (
        customer_id = auth.uid()
        or exists (
          select 1 from public.providers
          where id = chat_conversations.provider_id
          and (
            owner_id = auth.uid()
            or exists (
              select 1 from public.provider_staff
              where provider_id = providers.id
              and user_id = auth.uid()
              and is_active = true
            )
          )
        )
      )
    )
  );

-- Users can send messages in their conversations
create policy "Users can send messages"
  on public.chat_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.chat_conversations
      where id = chat_messages.conversation_id
      and (
        customer_id = auth.uid()
        or exists (
          select 1 from public.providers
          where id = chat_conversations.provider_id
          and (
            owner_id = auth.uid()
            or exists (
              select 1 from public.provider_staff
              where provider_id = providers.id
              and user_id = auth.uid()
              and is_active = true
            )
          )
        )
      )
    )
  );

-- Users can update their own messages (mark as read)
create policy "Users can update messages"
  on public.chat_messages for update
  using (
    exists (
      select 1 from public.chat_conversations
      where id = chat_messages.conversation_id
      and (
        customer_id = auth.uid()
        or exists (
          select 1 from public.providers
          where id = chat_conversations.provider_id
          and owner_id = auth.uid()
        )
      )
    )
  );

-- ----------------------------------------------------------------------------
-- Promo Codes Policies
-- ----------------------------------------------------------------------------

-- Active promo codes viewable by everyone
create policy "Active promo codes viewable by everyone"
  on public.promo_codes for select
  using (is_active = true and now() between valid_from and valid_until);

-- Admins can manage promo codes
create policy "Admins can manage promo codes"
  on public.promo_codes for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- Promo Code Usage Policies
-- ----------------------------------------------------------------------------

-- Users can view their own promo code usage
create policy "Users can view own promo usage"
  on public.promo_code_usage for select
  using (user_id = auth.uid());

-- System can insert promo code usage
create policy "System can insert promo usage"
  on public.promo_code_usage for insert
  with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Notifications Policies
-- ----------------------------------------------------------------------------

-- Users can view their own notifications
create policy "Users can view own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

-- System can create notifications
create policy "System can create notifications"
  on public.notifications for insert
  with check (true);

-- Users can update their own notifications (mark as read)
create policy "Users can update own notifications"
  on public.notifications for update
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Settlements Policies
-- ----------------------------------------------------------------------------

-- Providers can view their own settlements
create policy "Providers can view own settlements"
  on public.settlements for select
  using (
    exists (
      select 1 from public.providers
      where id = settlements.provider_id
      and owner_id = auth.uid()
    )
  );

-- Admins can manage all settlements
create policy "Admins can manage settlements"
  on public.settlements for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================================
-- INITIAL SEED DATA
-- ============================================================================

-- Insert default categories
insert into public.categories (name_ar, name_en, slug, type, display_order, icon) values
  ('المطاعم', 'Restaurants', 'restaurants', 'restaurant', 1, '🍽️'),
  ('الكافيهات', 'Coffee Shops', 'coffee-shops', 'coffee_shop', 2, '☕'),
  ('البقالة', 'Groceries', 'groceries', 'grocery', 3, '🛒'),
  ('الخضار والفواكه', 'Vegetables & Fruits', 'vegetables-fruits', 'vegetables_fruits', 4, '🥬')
on conflict (slug) do nothing;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

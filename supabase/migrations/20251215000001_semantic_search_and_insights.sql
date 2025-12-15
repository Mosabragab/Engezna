-- ============================================================================
-- Semantic Search & User Insights Migration
-- Engezna AI Agent Enhancement
-- ============================================================================
-- Version: 1.0.0
-- Created: 2025-12-15
-- Description: Adds pgvector for semantic search and user_insights for personalization
-- ============================================================================

-- 1. Enable pgvector extension for semantic search
create extension if not exists vector;

-- 2. Add embedding column to menu_items for semantic search
-- Using 1536 dimensions for OpenAI text-embedding-3-small model
alter table menu_items
add column if not exists embedding vector(1536);

-- 3. Create index for fast vector similarity search
create index if not exists idx_menu_items_embedding
on menu_items
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- 4. Create the hybrid search function for menu items
-- Combines vector similarity with keyword matching
create or replace function match_menu_items(
  query_embedding vector(1536),
  match_threshold float default 0.65,
  match_count int default 10,
  provider_filter uuid default null,
  city_filter uuid default null
)
returns table (
  id uuid,
  name_ar text,
  name_en text,
  description_ar text,
  price decimal,
  original_price decimal,
  image_url text,
  has_variants boolean,
  is_available boolean,
  provider_id uuid,
  provider_name_ar text,
  category_name_ar text,
  similarity float
)
language plpgsql
security definer
as $$
begin
  return query
  select
    mi.id,
    mi.name_ar,
    mi.name_en,
    mi.description_ar,
    mi.price,
    mi.original_price,
    mi.image_url,
    mi.has_variants,
    mi.is_available,
    mi.provider_id,
    p.name_ar as provider_name_ar,
    pc.name_ar as category_name_ar,
    1 - (mi.embedding <=> query_embedding) as similarity
  from menu_items mi
  join providers p on mi.provider_id = p.id
  left join provider_categories pc on mi.provider_category_id = pc.id
  where
    mi.embedding is not null
    and mi.is_available = true
    and 1 - (mi.embedding <=> query_embedding) > match_threshold
    and (provider_filter is null or mi.provider_id = provider_filter)
    and (city_filter is null or p.city_id = city_filter)
    and p.status in ('open', 'closed', 'temporarily_paused')
  order by similarity desc
  limit match_count;
end;
$$;

-- 5. Create user_insights table for storing learned customer preferences
create table if not exists user_insights (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,

  -- Learned preferences (JSON for flexibility)
  preferences jsonb default '{}'::jsonb not null,
  -- Example structure:
  -- {
  --   "likes": ["spicy", "cheese"],
  --   "dislikes": ["onion", "mushroom"],
  --   "dietary": {"vegetarian": false, "keto": false},
  --   "allergies": ["nuts"],
  --   "favorite_items": ["uuid1", "uuid2"],
  --   "favorite_providers": ["uuid1"],
  --   "notes": ["يفضل الطلبات الكبيرة", "بيحب التوصيل السريع"]
  -- }

  -- Conversation patterns
  conversation_style jsonb default '{}'::jsonb,
  -- Example: {"formal": false, "emoji_preference": "moderate"}

  -- Tracking
  insights_count int default 0,
  last_updated timestamp with time zone default now(),
  created_at timestamp with time zone default now(),

  -- One record per user
  unique(user_id)
);

-- 6. Create index for fast lookups
create index if not exists idx_user_insights_user_id on user_insights(user_id);

-- 7. Create function to upsert user insights (merge new insights with existing)
create or replace function upsert_user_insights(
  p_user_id uuid,
  p_new_preferences jsonb default null,
  p_new_style jsonb default null
)
returns void
language plpgsql
security definer
as $$
begin
  insert into user_insights (user_id, preferences, conversation_style, insights_count)
  values (
    p_user_id,
    coalesce(p_new_preferences, '{}'::jsonb),
    coalesce(p_new_style, '{}'::jsonb),
    1
  )
  on conflict (user_id) do update set
    preferences = user_insights.preferences || coalesce(p_new_preferences, '{}'::jsonb),
    conversation_style = user_insights.conversation_style || coalesce(p_new_style, '{}'::jsonb),
    insights_count = user_insights.insights_count + 1,
    last_updated = now();
end;
$$;

-- 8. RLS Policies for user_insights
alter table user_insights enable row level security;

-- Users can only see their own insights
create policy "Users can view own insights"
  on user_insights for select
  using (auth.uid() = user_id);

-- System can insert/update insights
create policy "Service role can manage insights"
  on user_insights for all
  using (true)
  with check (true);

-- 9. Add helper function for fuzzy text search (fallback when no embeddings)
create or replace function fuzzy_search_menu_items(
  search_query text,
  provider_filter uuid default null,
  result_limit int default 10
)
returns table (
  id uuid,
  name_ar text,
  price decimal,
  image_url text,
  has_variants boolean,
  provider_id uuid,
  provider_name_ar text,
  match_score float
)
language plpgsql
security definer
as $$
begin
  return query
  select
    mi.id,
    mi.name_ar,
    mi.price,
    mi.image_url,
    mi.has_variants,
    mi.provider_id,
    p.name_ar as provider_name_ar,
    greatest(
      similarity(mi.name_ar, search_query),
      similarity(coalesce(mi.description_ar, ''), search_query)
    ) as match_score
  from menu_items mi
  join providers p on mi.provider_id = p.id
  where
    mi.is_available = true
    and (provider_filter is null or mi.provider_id = provider_filter)
    and p.status in ('open', 'closed', 'temporarily_paused')
    and (
      mi.name_ar % search_query
      or mi.description_ar % search_query
      or mi.name_ar ilike '%' || search_query || '%'
    )
  order by match_score desc
  limit result_limit;
end;
$$;

-- Enable pg_trgm for fuzzy search
create extension if not exists pg_trgm;

-- Create trigram indexes for fuzzy search
create index if not exists idx_menu_items_name_ar_trgm
on menu_items using gin (name_ar gin_trgm_ops);

create index if not exists idx_menu_items_desc_ar_trgm
on menu_items using gin (description_ar gin_trgm_ops);

-- 10. Grant permissions
grant execute on function match_menu_items to authenticated, anon;
grant execute on function fuzzy_search_menu_items to authenticated, anon;
grant execute on function upsert_user_insights to service_role;

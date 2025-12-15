-- ============================================================================
-- Automatic Embedding Generation Migration
-- Engezna AI Agent Enhancement
-- ============================================================================
-- Version: 1.0.0
-- Created: 2025-12-15
-- Description: Adds triggers and scheduled jobs for auto-generating embeddings
-- ============================================================================

-- 1. Enable pg_net extension for HTTP calls from database
create extension if not exists pg_net with schema extensions;

-- 2. Enable pg_cron for scheduled jobs
create extension if not exists pg_cron;

-- 3. Create function to call embedding Edge Function via webhook
create or replace function notify_embedding_generation()
returns trigger
language plpgsql
security definer
as $$
declare
  edge_function_url text;
  service_role_key text;
  payload jsonb;
begin
  -- Get Edge Function URL from vault or use default
  edge_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/generate-embedding';

  -- Build webhook payload
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', to_jsonb(NEW),
    'old_record', case when TG_OP = 'UPDATE' then to_jsonb(OLD) else null end
  );

  -- Call Edge Function asynchronously (fire and forget)
  perform net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := payload
  );

  return NEW;
exception
  when others then
    -- Log error but don't block the insert/update
    raise notice 'Embedding webhook failed: %', SQLERRM;
    return NEW;
end;
$$;

-- 4. Create trigger on menu_items for INSERT
drop trigger if exists trigger_generate_embedding_on_insert on menu_items;
create trigger trigger_generate_embedding_on_insert
  after insert on menu_items
  for each row
  when (NEW.is_available = true)
  execute function notify_embedding_generation();

-- 5. Create trigger on menu_items for UPDATE (only relevant fields)
drop trigger if exists trigger_generate_embedding_on_update on menu_items;
create trigger trigger_generate_embedding_on_update
  after update on menu_items
  for each row
  when (
    NEW.is_available = true AND (
      OLD.name_ar IS DISTINCT FROM NEW.name_ar OR
      OLD.name_en IS DISTINCT FROM NEW.name_en OR
      OLD.description_ar IS DISTINCT FROM NEW.description_ar OR
      OLD.description_en IS DISTINCT FROM NEW.description_en OR
      OLD.is_spicy IS DISTINCT FROM NEW.is_spicy OR
      OLD.is_vegetarian IS DISTINCT FROM NEW.is_vegetarian OR
      OLD.provider_category_id IS DISTINCT FROM NEW.provider_category_id
    )
  )
  execute function notify_embedding_generation();

-- 6. Create function for catch-up job (processes items without embeddings)
create or replace function process_missing_embeddings()
returns void
language plpgsql
security definer
as $$
declare
  edge_function_url text;
  items_without_embedding uuid[];
begin
  edge_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/generate-embedding';

  -- Get IDs of items without embeddings (max 50 per run)
  select array_agg(id)
  into items_without_embedding
  from (
    select id
    from menu_items
    where embedding is null
      and is_available = true
    order by created_at desc
    limit 50
  ) sub;

  -- Skip if no items need processing
  if items_without_embedding is null or array_length(items_without_embedding, 1) is null then
    raise notice 'No items need embedding generation';
    return;
  end if;

  raise notice 'Processing % items for embeddings', array_length(items_without_embedding, 1);

  -- Call Edge Function with catch-up mode
  perform net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'mode', 'catchup',
      'limit', 50
    )
  );
end;
$$;

-- 7. Schedule catch-up job to run every 5 minutes
-- This ensures any missed items get processed
select cron.schedule(
  'process-missing-embeddings',
  '*/5 * * * *',  -- Every 5 minutes
  $$select process_missing_embeddings()$$
);

-- 8. Create helper function to manually trigger embedding for a specific item
create or replace function regenerate_embedding(item_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  edge_function_url text;
begin
  edge_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/generate-embedding';

  -- Clear existing embedding
  update menu_items set embedding = null where id = item_id;

  -- Trigger regeneration
  perform net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('item_id', item_id)
  );
end;
$$;

-- 9. Create function to check embedding coverage
create or replace function get_embedding_stats()
returns table (
  total_items bigint,
  items_with_embedding bigint,
  items_without_embedding bigint,
  coverage_percentage numeric
)
language sql
security definer
as $$
  select
    count(*) as total_items,
    count(*) filter (where embedding is not null) as items_with_embedding,
    count(*) filter (where embedding is null) as items_without_embedding,
    round(
      (count(*) filter (where embedding is not null)::numeric / nullif(count(*), 0)) * 100,
      2
    ) as coverage_percentage
  from menu_items
  where is_available = true;
$$;

-- 10. Grant permissions
grant execute on function regenerate_embedding to service_role;
grant execute on function get_embedding_stats to authenticated, service_role;
grant execute on function process_missing_embeddings to service_role;

-- 11. Add comment
comment on function notify_embedding_generation is
  'Trigger function that calls Edge Function to generate embeddings for new/updated menu items';

comment on function process_missing_embeddings is
  'Scheduled function that processes menu items without embeddings (catch-up job)';

comment on function regenerate_embedding is
  'Manually trigger embedding regeneration for a specific menu item';

comment on function get_embedding_stats is
  'Returns statistics about embedding coverage across menu items';

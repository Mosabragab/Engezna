# Database Migrations

This directory contains SQL migration files for the Engezna database.

## File Naming Convention

Migrations should be named with a timestamp prefix:
- Format: `YYYYMMDDHHMMSS_description.sql`
- Example: `20250122120000_create_users_table.sql`

## Running Migrations

### Option 1: Using Supabase CLI (Recommended)
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref cmxpvzqrmptfnuymhxmr

# Run migrations
supabase db push
```

### Option 2: Using SQL Editor in Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/cmxpvzqrmptfnuymhxmr/sql
2. Copy and paste the SQL from migration files
3. Execute the queries

### Option 3: Using the migration script
```bash
npm run db:migrate
```

## Creating New Migrations

1. Create a new file in this directory with timestamp prefix
2. Write your SQL DDL/DML statements
3. Test in development first
4. Run the migration

## Example Migration

```sql
-- Create a new table
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.users enable row level security;

-- Create policies
create policy "Users can view their own data"
  on public.users for select
  using (auth.uid() = id);
```

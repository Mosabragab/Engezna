# Database Migrations

This directory contains SQL migration files for the Engezna database.

**Last Updated:** December 1, 2025

## Migration Status Overview

| Category | Status | Description |
|----------|--------|-------------|
| Core Schema | ✅ Deployed | Initial schema with providers, orders, menu_items, etc. |
| Location System | ✅ Deployed | Governorates, cities, districts, neighborhoods |
| Admin Dashboard | ✅ Deployed | Admin users, tasks, approvals, messages, announcements |
| Permission System | ✅ Deployed | RBAC + ABAC with roles and permissions |
| Invitation System | ✅ Deployed | Admin invitation and registration flow |

---

## Complete Migration List

### Core Schema

| Migration | Date | Description | Status |
|-----------|------|-------------|--------|
| `20250122000000_initial_schema.sql` | Jan 22 | Core tables: providers, menu_items, orders, order_items, users, profiles, addresses, governorates, cities, districts, neighborhoods | ✅ Deployed |
| `20250123000000_add_profile_trigger.sql` | Jan 23 | Auto-create profile when user signs up | ✅ Deployed |

### Location System

| Migration | Date | Description | Status |
|-----------|------|-------------|--------|
| `20250125000001_cleanup_districts_remove_centers.sql` | Jan 25 | Remove centers, keep districts only | ✅ Deployed |
| `20250125000002_addresses_with_fullname_view.sql` | Jan 25 | Create view for addresses with full location names | ✅ Deployed |
| `20250125000003_add_governorate_city_to_profiles.sql` | Jan 25 | Add governorate_id and city_id to profiles table | ✅ Deployed |
| `20250126000001_add_location_ids_to_addresses.sql` | Jan 26 | Add location IDs (district_id, neighborhood_id) to addresses | ✅ Deployed |
| `20250131000000_add_district_to_profiles.sql` | Jan 31 | Add district_id to profiles | ✅ Deployed |

### Admin Dashboard Schema

| Migration | Date | Description | Status |
|-----------|------|-------------|--------|
| `20250130000000_admin_dashboard_schema.sql` | Jan 30 | Admin users, tasks, approvals, internal messages, announcements tables | ✅ Deployed |
| `20251130000000_add_assigned_regions_to_admin_users.sql` | Nov 30 | Add assigned_regions JSONB column for geographic access control | ✅ Deployed |
| `20251130100000_admin_invitations.sql` | Nov 30 | Admin invitation system with tokens and expiry | ✅ Deployed |
| `20251130200000_fix_internal_messages_rls.sql` | Nov 30 | Fix RLS policies for internal messages | ✅ Deployed |
| `20251130300000_fix_task_number_generation.sql` | Nov 30 | Fix task number auto-generation | ✅ Deployed |
| `20251130400000_create_admin_notifications.sql` | Nov 30 | Create admin notifications table | ✅ Deployed |

### Permission System (RBAC + ABAC)

| Migration | Date | Description | Status |
|-----------|------|-------------|--------|
| `20251130500000_create_advanced_permissions.sql` | Nov 30 | Create roles table with system roles | ✅ Deployed |
| `20251201000000_auto_create_admin_users.sql` | Dec 1 | Auto-create admin_users record on profile creation | ✅ Deployed |
| `20251201100000_advanced_permissions_enhancement.sql` | Dec 1 | Add permissions table with constraints (geographic, amount, time-based) | ✅ Deployed |
| `20251201200000_add_new_roles.sql` | Dec 1 | Add 5 new roles (general_moderator, store_supervisor, operations_supervisor, customer_support, financial_auditor) | ✅ Deployed |
| `20251201300000_add_role_id_to_admin_invitations.sql` | Dec 1 | Add role_id foreign key to admin_invitations | ✅ Deployed |

---

## Quick Fix Files

These SQL files are for manual fixes when needed:

| File | Purpose | When to Use |
|------|---------|-------------|
| `quick_fix_messages.sql` | Fix internal messages visibility | If messages don't appear |
| `quick_fix_task_number.sql` | Fix task number sequence | If task numbers are wrong |
| `quick_fix_admin_notifications.sql` | Create notifications table | If notifications missing |
| `quick_fix_messages_permission.sql` | Fix message send permissions | If can't send messages |

### Diagnostic Files

| File | Purpose |
|------|---------|
| `diagnose_messages.sql` | Debug internal messages issues |
| `diagnose_tasks.sql` | Debug tasks visibility issues |
| `fix_admin_users_sync.sql` | Sync admin_users with profiles |
| `fix_tasks_visibility.sql` | Fix task access issues |
| `create_sample_task.sql` | Create test task data |
| `sync_admin_users_to_roles.sql` | Sync admin users with roles |
| `verify_and_seed_roles.sql` | Verify roles exist and seed if missing |

---

## File Naming Convention

Migrations should be named with a timestamp prefix:
- Format: `YYYYMMDDHHMMSS_description.sql`
- Example: `20250122120000_create_users_table.sql`

## Running Migrations

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard/project/cmxpvzqrmptfnuymhxmr/sql
2. Copy and paste the SQL from migration files
3. Execute the queries in order by timestamp

### Option 2: Using Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref cmxpvzqrmptfnuymhxmr

# Run migrations
supabase db push
```

### Option 3: Using the migration script
```bash
npm run db:migrate
```

---

## Database Tables Overview

### Core Tables
- `profiles` - User profiles with location and settings
- `providers` - Restaurants, cafes, grocery stores
- `menu_items` - Products/items for each provider
- `orders` - Customer orders
- `order_items` - Items within orders
- `addresses` - User delivery addresses

### Location Tables
- `governorates` - Egyptian governorates
- `cities` - Cities within governorates
- `districts` - Districts within cities
- `neighborhoods` - Neighborhoods within districts

### Admin Tables
- `admin_users` - Admin team members
- `roles` - Permission roles (system and custom)
- `permissions` - Granular permissions with constraints
- `admin_tasks` - Task management
- `admin_approvals` - Approval workflow
- `internal_messages` - Team messaging
- `announcements` - Team announcements
- `admin_notifications` - Admin notifications
- `admin_invitations` - Invitation tokens for new admins

---

## Creating New Migrations

1. Create a new file in this directory with timestamp prefix
2. Write your SQL DDL/DML statements
3. Test in development first (use Supabase dashboard SQL editor)
4. Document the migration in this README
5. Run the migration

## Example Migration

```sql
-- Migration: Create a new feature table
-- Date: YYYY-MM-DD
-- Description: Brief description of what this migration does

-- Create a new table
create table if not exists public.example_table (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.example_table enable row level security;

-- Create policies
create policy "Users can view their own data"
  on public.example_table for select
  using (auth.uid() = user_id);

-- Create indexes for performance
create index if not exists idx_example_table_name
  on public.example_table(name);
```

---

## ✅ Storage Bucket Setup (COMPLETED Dec 1, 2025)

The Supabase Storage bucket has been configured:
- ✅ Bucket `public` created with 2MB file size limit
- ✅ Allowed MIME types: jpeg, png, webp, gif
- ✅ Storage policies active (Public Read, Auth Upload/Update/Delete)
- ✅ Logo and product image uploads functional

---

## Troubleshooting

### RLS Policy Issues
- Check that user is authenticated
- Verify policy conditions match expected data
- Test with `supabase.rpc()` to bypass RLS for debugging

### Migration Failures
- Verify SQL syntax is correct
- Check for foreign key constraint violations
- Ensure dependent tables exist before referencing

### Missing Tables
- Run migrations in chronological order
- Check Supabase dashboard Table Editor for existing tables
- Use `CREATE TABLE IF NOT EXISTS` to make migrations idempotent

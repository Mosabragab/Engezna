# Supabase Integration Setup

This document explains the Supabase integration setup for the Engezna project.

## ✅ Setup Complete

Your Supabase integration has been configured with the following components:

### 1. Environment Variables

Location: `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=https://cmxpvzqrmptfnuymhxmr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Supabase Clients

Multiple client configurations for different use cases:

#### Browser Client (`src/lib/supabase/client.ts`)

For use in Client Components:

```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
const { data } = await supabase.from('your_table').select('*');
```

#### Server Client (`src/lib/supabase/server.ts`)

For use in Server Components, Server Actions, and Route Handlers:

```typescript
import { createClient } from '@/lib/supabase/server';

const supabase = await createClient();
const { data } = await supabase.from('your_table').select('*');
```

#### Middleware Client (`src/lib/supabase/middleware.ts`)

For session management in middleware:

```typescript
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}
```

#### Admin Client (`src/lib/supabase/admin.ts`)

For server-side operations that bypass RLS:

```typescript
import { createAdminClient } from '@/lib/supabase/admin';

// ⚠️ Use with caution - bypasses Row Level Security
const supabase = createAdminClient();
```

### 3. Database Utilities

Location: `src/lib/db/index.ts`

Helper functions for common database operations:

```typescript
import { query, checkConnection, getDatabaseStats } from '@/lib/db';

// Generic query helper
const { data, error } = await query('users', {
  filter: { email: 'user@example.com' },
  orderBy: { column: 'created_at', ascending: false },
  limit: 10,
});

// Check database connection
const { connected } = await checkConnection();
```

### 4. Migration System

Location: `supabase/migrations/`

#### Creating Migrations

1. Create a new file with timestamp prefix:

   ```
   supabase/migrations/YYYYMMDDHHMMSS_description.sql
   ```

2. Write your SQL:

   ```sql
   -- Example migration
   create table if not exists public.users (
     id uuid primary key default gen_random_uuid(),
     email text unique not null,
     created_at timestamp with time zone default now()
   );

   alter table public.users enable row level security;
   ```

#### Key Migrations

| Migration                                                | Description                                        |
| -------------------------------------------------------- | -------------------------------------------------- |
| `20250122000000_initial_schema.sql`                      | Core tables (providers, orders, customers, etc.)   |
| `20250130000000_admin_dashboard_schema.sql`              | Admin tables (admin_users, tasks, approvals, etc.) |
| `20251130000000_add_assigned_regions_to_admin_users.sql` | Geographic region assignments for supervisors      |
| `20251130100000_admin_invitations.sql`                   | Admin invitation system                            |

#### Running Migrations

**Option 1: Supabase Dashboard (Recommended)**

1. Go to [SQL Editor](https://supabase.com/dashboard/project/cmxpvzqrmptfnuymhxmr/sql)
2. Copy and paste your migration SQL
3. Execute

**Option 2: Supabase CLI**

```bash
# Install CLI
npm install -g supabase

# Link project
supabase link --project-ref cmxpvzqrmptfnuymhxmr

# Run migrations
supabase db push
```

**Option 3: Migration Script**

```bash
npm run db:migrate          # Run all migrations
npm run db:migrate:file <filename.sql>  # Run specific migration
```

### 5. NPM Scripts

```json
{
  "scripts": {
    "db:migrate": "Run all pending migrations",
    "db:migrate:file": "Run a specific migration file",
    "db:test": "Test database connection"
  }
}
```

## 📚 Common Patterns

### Server Component Example

```typescript
// app/users/page.tsx
import { createClient } from '@/lib/supabase/server'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: users } = await supabase.from('users').select('*')

  return (
    <div>
      {users?.map(user => (
        <div key={user.id}>{user.email}</div>
      ))}
    </div>
  )
}
```

### Client Component Example

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function UsersList() {
  const [users, setUsers] = useState([])
  const supabase = createClient()

  useEffect(() => {
    async function loadUsers() {
      const { data } = await supabase.from('users').select('*')
      setUsers(data || [])
    }
    loadUsers()
  }, [])

  return (
    <div>
      {users.map(user => (
        <div key={user.id}>{user.email}</div>
      ))}
    </div>
  )
}
```

### Server Action Example

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createUser(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from('users').insert({
    email: formData.get('email'),
    name: formData.get('name'),
  });

  if (error) throw error;

  revalidatePath('/users');
}
```

### API Route Example

```typescript
// app/api/users/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('users').select('*');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

## 🔐 Security Best Practices

1. **Never expose service role key**: Keep `SUPABASE_SERVICE_ROLE_KEY` in server-side code only
2. **Use Row Level Security (RLS)**: Enable RLS on all tables
3. **Validate input**: Always validate and sanitize user input
4. **Use prepared statements**: Avoid SQL injection by using Supabase query builder
5. **Audit policies**: Regularly review your RLS policies

## 🔗 Useful Links

- **Project Dashboard**: https://supabase.com/dashboard/project/cmxpvzqrmptfnuymhxmr
- **SQL Editor**: https://supabase.com/dashboard/project/cmxpvzqrmptfnuymhxmr/sql
- **Table Editor**: https://supabase.com/dashboard/project/cmxpvzqrmptfnuymhxmr/editor
- **API Settings**: https://supabase.com/dashboard/project/cmxpvzqrmptfnuymhxmr/settings/api
- **Supabase Docs**: https://supabase.com/docs

## 🔐 Permission System (RBAC + ABAC)

The admin panel uses a comprehensive Role-Based Access Control (RBAC) combined with Attribute-Based Access Control (ABAC) system.

### Permission Types

```typescript
import { usePermissions } from '@/lib/permissions/use-permissions';

// In any admin component
const { can, canSync, hasResource, isSuperAdmin } = usePermissions();

// Async check with context
const result = await can('providers', 'approve', { governorateId: '...' });
if (result.allowed) {
  // Perform action
}

// Sync check (no context)
if (canSync('orders', 'refund')) {
  // Show refund button
}

// Check resource access
if (hasResource('finance')) {
  // Show finance menu
}
```

### Key Concepts

1. **Resources**: What can be accessed (providers, orders, customers, finance, etc.)
2. **Actions**: What can be done (view, create, update, delete, approve, refund, etc.)
3. **Constraints**: Conditions that limit permissions:
   - **Geographic**: Limit access to specific governorates/cities/districts
   - **Amount Limits**: Max amount for financial operations
   - **Own Only**: Can only access items they created
   - **Assigned Only**: Can only access items assigned to them
   - **Time Restrictions**: Limit access to specific hours/days
   - **Requires Approval**: Actions above threshold need approval

### Admin Layout

All admin pages are wrapped with `PermissionsProvider`:

```tsx
// src/app/[locale]/admin/layout.tsx
'use client';
import { PermissionsProvider } from '@/lib/permissions/use-permissions';

export default function AdminLayout({ children }) {
  return <PermissionsProvider>{children}</PermissionsProvider>;
}
```

### Roles Management

Access the roles management page at `/admin/roles` to:

- Create and edit roles
- Assign permissions to roles
- Set constraints per permission
- View and manage role members

## 🚀 Next Steps

1. Design your database schema
2. Create migration files in `supabase/migrations/`
3. Run migrations via Supabase Dashboard or CLI
4. Implement your application logic using the Supabase clients
5. Set up authentication if needed
6. Configure storage buckets for file uploads

## 🛠️ Troubleshooting

### Connection Issues

- Verify credentials in `.env.local`
- Check Supabase project is active
- Ensure no firewall blocking connections

### RLS Issues

- Check RLS policies are correctly configured
- Verify user authentication state
- Test with admin client to isolate RLS issues

### Migration Issues

- Verify SQL syntax
- Check for foreign key constraints
- Ensure migrations are idempotent (can be run multiple times)
